import HttpUtils from '@/utils/HttpUtils';
import type { ExecutionStatus } from '../core/types';
import type {
  ExecutionLogEntry,
  ExecutionResultPayload,
  ExecutionSession,
} from './types';

const API_PREFIX = '/api/v1/data-development';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
  message?: string;
}

export type ApiExecutionStatus =
  | 'CREATED'
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'TIMED_OUT'
  | 'LOST';

interface ApiExecution {
  id: number;
  taskId: number;
  taskType: string;
  status: ApiExecutionStatus;
  currentAttemptNo: number;
  createdBy?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface ApiExecutionAttempt {
  id: number;
  attemptNo: number;
  externalExecutionId?: string;
  status: ApiExecutionStatus;
  exitCode?: number;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface ApiExecutionEvent {
  id: number;
  executionId: number;
  attemptId?: number;
  sequenceNo: number;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

interface ApiExecutionResult {
  id: number;
  resultKind: 'TABLE' | 'JSON' | 'TERMINAL' | 'NOTEBOOK' | 'PIPELINE' | 'TEXT';
  summary: Record<string, unknown>;
  payload: Record<string, unknown>;
  truncated: boolean;
  createdAt: string;
}

export interface ApiExecutionDetail {
  execution: ApiExecution;
  taskName: string;
  engineType: string;
  attempts: ApiExecutionAttempt[];
  events: ApiExecutionEvent[];
  results: ApiExecutionResult[];
}

export interface ExecutionSummaryItem {
  id: number;
  taskId: number;
  taskName: string;
  taskType: string;
  engineType: string;
  sourceType: string;
  status: ApiExecutionStatus;
  currentAttemptNo: number;
  createdBy?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
}

export interface ExecutionPage {
  items: ExecutionSummaryItem[];
  total: number;
  offset: number;
  limit: number;
}

const unwrap = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 && response.code !== 200) {
    throw new Error(response.message ?? response.msg ?? '执行接口调用失败');
  }
  return response.data;
};

export const toWorkbenchExecutionStatus = (
  status: ApiExecutionStatus,
): ExecutionStatus => {
  switch (status) {
    case 'CREATED':
    case 'QUEUED':
      return 'QUEUED';
    case 'RUNNING':
      return 'RUNNING';
    case 'SUCCEEDED':
      return 'SUCCESS';
    case 'CANCELED':
      return 'STOPPED';
    case 'FAILED':
    case 'TIMED_OUT':
    case 'LOST':
      return 'FAILED';
  }
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown, fallback = '') =>
  value === undefined || value === null ? fallback : String(value);

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBody = (value: unknown) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const formatLogTime = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value));

const mapLogs = (events: ApiExecutionEvent[]): ExecutionLogEntry[] =>
  events
    .filter((event) => event.eventType === 'LOG')
    .map((event) => ({
      id: String(event.id),
      level:
        event.payload.level === 'ERROR'
          ? 'ERROR'
          : event.payload.level === 'WARN'
            ? 'WARN'
            : 'INFO',
      timestamp: formatLogTime(event.occurredAt),
      message: asString(event.payload.line),
    }));

const mapHeaders = (value: unknown): Record<string, string> => {
  const source = asRecord(value);
  return Object.fromEntries(
    Object.entries(source).map(([key, item]) => [
      key,
      Array.isArray(item) ? item.map(String).join(', ') : asString(item),
    ]),
  );
};

const mapResult = (
  detail: ApiExecutionDetail,
  logs: ExecutionLogEntry[],
): ExecutionResultPayload | undefined => {
  const result = detail.results.at(-1);
  if (!result) return undefined;
  const payload = asRecord(result.payload);
  const summary = asRecord(result.summary);

  if (detail.execution.taskType === 'HTTP' || result.resultKind === 'JSON') {
    const statusCode = asNumber(payload.statusCode);
    return {
      kind: 'json',
      statusCode,
      statusText: statusCode ? `HTTP ${statusCode}` : 'HTTP 响应',
      elapsedMs: asNumber(summary.durationMs),
      headers: mapHeaders(payload.headers),
      body: parseBody(payload.body),
    };
  }

  if (detail.execution.taskType === 'SHELL' || result.resultKind === 'TERMINAL') {
    return {
      kind: 'terminal',
      exitCode: asNumber(payload.exitCode),
      stdout: logs
        .filter((log) => log.level !== 'ERROR')
        .map((log) => log.message),
      stderr: logs
        .filter((log) => log.level === 'ERROR')
        .map((log) => log.message),
    };
  }

  return {
    kind: 'text',
    title: result.resultKind,
    value: JSON.stringify(payload, null, 2),
  };
};

export const toExecutionSession = (
  detail: ApiExecutionDetail,
): ExecutionSession => {
  const execution = detail.execution;
  const logs = mapLogs(detail.events);
  const startedAt = execution.startedAt ?? execution.createdAt;
  const finishedAt = execution.finishedAt;
  return {
    id: String(execution.id),
    resourceId: String(execution.taskId),
    resourceType: execution.taskType,
    resourceName: detail.taskName,
    engine: detail.engineType,
    status: toWorkbenchExecutionStatus(execution.status),
    submittedAt: execution.createdAt,
    startedAt,
    finishedAt,
    durationMs:
      finishedAt && startedAt
        ? Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime())
        : undefined,
    logs,
    result: mapResult(detail, logs),
    errorMessage: execution.errorMessage,
  };
};

export const executionRepository = {
  async getDetail(executionId: string, after = 0) {
    return unwrap(
      await HttpUtils.get<ApiExecutionDetail>(
        `${API_PREFIX}/executions/${executionId}/detail?after=${after}`,
      ),
    );
  },

  async list(params: {
    status?: string;
    taskType?: string;
    keyword?: string;
    offset?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).length > 0) {
        query.set(key, String(value));
      }
    });
    return unwrap(
      await HttpUtils.get<ExecutionPage>(
        `${API_PREFIX}/executions${query.size ? `?${query.toString()}` : ''}`,
      ),
    );
  },

  watch(
    executionId: string,
    after: number,
    onEvent: (event: ApiExecutionEvent) => void,
    onError?: () => void,
  ) {
    const source = new EventSource(
      `${API_PREFIX}/executions/${executionId}/events/stream?after=${Math.max(0, after)}`,
      { withCredentials: true },
    );
    source.addEventListener('execution-event', (event) => {
      try {
        onEvent(JSON.parse((event as MessageEvent<string>).data));
      } catch {
        onError?.();
      }
    });
    source.onerror = () => onError?.();
    return () => source.close();
  },
};
