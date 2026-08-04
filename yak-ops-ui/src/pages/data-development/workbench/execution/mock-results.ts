import type {
  DevelopmentResource,
  NodePluginDefinition,
} from '../core/types';
import type {
  ExecutionLogEntry,
  ExecutionResultPayload,
  ExecutionSession,
} from './types';

const createTimestamp = () =>
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());

const createLog = (
  id: string,
  message: string,
  level: ExecutionLogEntry['level'] = 'INFO',
): ExecutionLogEntry => ({
  id,
  level,
  timestamp: createTimestamp(),
  message,
});

export const createRunningExecutionSession = (
  resource: DevelopmentResource,
  plugin: NodePluginDefinition,
): ExecutionSession => {
  const now = new Date().toISOString();
  const id = `RUN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    resourceId: resource.id,
    resourceType: resource.resourceType,
    resourceName: resource.name,
    engine: resource.engine,
    status: 'RUNNING',
    submittedAt: now,
    startedAt: now,
    logs: [
      createLog(`${id}-1`, `提交 ${plugin.metadata.label} 运行请求`),
      createLog(`${id}-2`, `运行环境：开发环境 · 引擎：${resource.engine}`),
      createLog(`${id}-3`, '正在申请执行资源并初始化运行上下文'),
    ],
  };
};

const createTableResult = (): ExecutionResultPayload => ({
  kind: 'table',
  columns: [
    { key: 'user_id', title: 'user_id', dataType: 'BIGINT' },
    { key: 'event_type', title: 'event_type', dataType: 'STRING' },
    { key: 'event_time', title: 'event_time', dataType: 'TIMESTAMP' },
    { key: 'dt', title: 'dt', dataType: 'STRING' },
  ],
  rows: [
    {
      user_id: 10001,
      event_type: 'LOGIN',
      event_time: '2026-08-04 14:42:56',
      dt: '20260804',
    },
    {
      user_id: 10002,
      event_type: 'VIEW_PRODUCT',
      event_time: '2026-08-04 14:43:02',
      dt: '20260804',
    },
    {
      user_id: 10003,
      event_type: 'SUBMIT_ORDER',
      event_time: '2026-08-04 14:43:05',
      dt: '20260804',
    },
  ],
  affectedRows: 3,
});

const createJsonResult = (): ExecutionResultPayload => ({
  kind: 'json',
  statusCode: 200,
  statusText: 'OK',
  elapsedMs: 286,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'x-request-id': `yak-${Date.now()}`,
    server: 'yak-ops-gateway',
  },
  body: {
    code: 0,
    message: 'success',
    data: {
      userId: 10001,
      userName: '张三',
      userLevel: 'VIP',
      tags: ['高活跃', '高价值'],
    },
  },
});

const createTerminalResult = (
  resource: DevelopmentResource,
): ExecutionResultPayload => ({
  kind: 'terminal',
  exitCode: 0,
  stdout: [
    `$ ${resource.name}`,
    'initializing runtime context...',
    'loading environment variables...',
    'processing task...',
    'task completed successfully',
  ],
  stderr: [],
});

const createNotebookResult = (): ExecutionResultPayload => ({
  kind: 'notebook',
  cells: [
    {
      id: 'cell-1',
      label: 'Cell 1',
      status: 'SUCCESS',
      durationMs: 184,
      output: 'SparkSession available as spark',
    },
    {
      id: 'cell-2',
      label: 'Cell 2',
      status: 'SUCCESS',
      durationMs: 712,
      output: 'DataFrame[user_level: string, count: bigint]\nVIP  1284\nNORMAL  6382',
    },
  ],
});

const createPipelineResult = (): ExecutionResultPayload => ({
  kind: 'pipeline',
  processedRows: 128430,
  writtenRows: 128426,
  rejectedRows: 4,
  throughput: 12680,
  stages: [
    {
      id: 'source',
      label: '读取 MySQL',
      status: 'SUCCESS',
      rows: 128430,
      durationMs: 2410,
    },
    {
      id: 'transform',
      label: '字段清洗与映射',
      status: 'SUCCESS',
      rows: 128426,
      durationMs: 1160,
    },
    {
      id: 'sink',
      label: '写入 ODPS',
      status: 'SUCCESS',
      rows: 128426,
      durationMs: 3260,
    },
  ],
});

export const createMockExecutionResult = (
  resource: DevelopmentResource,
): ExecutionResultPayload => {
  switch (resource.resourceType) {
    case 'SQL':
    case 'FLINK_SQL':
      return createTableResult();
    case 'HTTP':
      return createJsonResult();
    case 'SHELL':
    case 'PYTHON':
      return createTerminalResult(resource);
    case 'NOTEBOOK':
      return createNotebookResult();
    case 'DATA_INTEGRATION':
      return createPipelineResult();
    default:
      return {
        kind: 'text',
        title: '运行结果',
        value: `${resource.name} 已完成处理，当前节点未声明专属结果渲染器。`,
      };
  }
};

export const completeMockExecutionSession = (
  session: ExecutionSession,
  resource: DevelopmentResource,
): ExecutionSession => {
  const finishedAt = new Date().toISOString();
  const durationMs = Math.max(
    1,
    new Date(finishedAt).getTime() - new Date(session.startedAt).getTime(),
  );

  return {
    ...session,
    status: 'SUCCESS',
    finishedAt,
    durationMs,
    logs: [
      ...session.logs,
      createLog(`${session.id}-4`, '执行资源准备完成'),
      createLog(`${session.id}-5`, '节点执行成功，正在整理结果'),
      createLog(`${session.id}-6`, `运行完成，总耗时 ${durationMs} ms`),
    ],
    result: createMockExecutionResult(resource),
  };
};
