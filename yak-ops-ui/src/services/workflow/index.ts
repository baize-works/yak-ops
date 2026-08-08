import { request } from '@umijs/max';
import type { ApiResponse } from '@/services/http/response';

export type WorkflowMockResult = 'SUCCESS' | 'FAILED';
export type WorkflowFailureStrategy =
  | 'FAIL_FAST'
  | 'CONTINUE_INDEPENDENT_BRANCHES'
  | 'TERMINATE_ALL';
export type WorkflowTriggerRule =
  | 'ALL_SUCCESS'
  | 'ALL_DONE'
  | 'NONE_FAILED'
  | 'ONE_SUCCESS'
  | 'ALWAYS';
export type WorkflowNodeFailurePolicy =
  | 'FAIL_WORKFLOW'
  | 'BLOCK_BRANCH'
  | 'IGNORE_FAILURE';

export interface WorkflowNodePayload {
  id: string;
  name: string;
  type: string;
  mockResult?: WorkflowMockResult;
  maxAttempts?: number;
  retryDelaySeconds?: number;
  dispatchTimeoutSeconds?: number;
  executionTimeoutSeconds?: number;
  inputMapping?: Record<string, string>;
  triggerRule?: WorkflowTriggerRule;
  failurePolicy?: WorkflowNodeFailurePolicy;
}

export interface WorkflowEdgePayload {
  source: string;
  target: string;
}

export interface WorkflowRunPayload {
  name: string;
  nodes: WorkflowNodePayload[];
  edges: WorkflowEdgePayload[];
  input?: Record<string, unknown>;
  workflowTimeoutSeconds?: number;
  failureStrategy?: WorkflowFailureStrategy;
}

export interface WorkflowAttempt {
  id: string;
  attemptNumber: number;
  status: string;
  failureReason?: string;
  errorMessage?: string;
  availableAt?: string;
  startedAt?: string;
  pausedAt?: string;
  pausedMillis: number;
  endedAt?: string;
}

export interface WorkflowNodeInstance {
  id: string;
  name: string;
  type: string;
  status: string;
  triggerRule: WorkflowTriggerRule;
  failurePolicy: WorkflowNodeFailurePolicy;
  errorMessage?: string;
  failureReason?: string;
  continuedAfterFailure: boolean;
  attemptCount: number;
  currentAttemptId?: string;
  currentAttemptNumber?: number;
  retryMaxAttempts: number;
  retryDelaySeconds: number;
  dispatchTimeoutSeconds: number;
  executionTimeoutSeconds: number;
  inputMapping: Record<string, string>;
  input: Record<string, unknown>;
  predecessorOutputs: Record<string, Record<string, unknown>>;
  output: Record<string, unknown>;
  attempts: WorkflowAttempt[];
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  sourceExecutionId?: string;
  name: string;
  status: string;
  failureStrategy: WorkflowFailureStrategy;
  startedAt: string;
  runStartedAt?: string;
  endedAt?: string;
  workflowTimeoutSeconds: number;
  input: Record<string, unknown>;
  nodeCount: number;
  edgeCount: number;
  nodes: WorkflowNodeInstance[];
}

const TERMINAL_STATUSES = new Set([
  'SUCCESS',
  'SUCCESS_WITH_WARNINGS',
  'FAILED',
  'WARNING',
  'CANCELED',
  'TIMED_OUT',
]);

export const isWorkflowTerminal = (status?: string) =>
  Boolean(status && TERMINAL_STATUSES.has(status));

export const runWorkflow = async (payload: WorkflowRunPayload) => {
  const response = await request<ApiResponse<WorkflowInstance>>(
    '/api/v1/workflows/run',
    {
      method: 'POST',
      data: payload,
    },
  );
  return response.data;
};

const postInstanceAction = async (
  executionId: string,
  action: string,
) => {
  const response = await request<ApiResponse<WorkflowInstance>>(
    `/api/v1/workflows/instances/${encodeURIComponent(executionId)}/${action}`,
    { method: 'POST' },
  );
  return response.data;
};

export const activateWorkflowInstance = (executionId: string) =>
  postInstanceAction(executionId, 'activate');

export const pauseWorkflowInstance = (executionId: string) =>
  postInstanceAction(executionId, 'pause');

export const resumeWorkflowInstance = (executionId: string) =>
  postInstanceAction(executionId, 'resume');

export const cancelWorkflowInstance = (executionId: string) =>
  postInstanceAction(executionId, 'cancel');

export const retryWorkflowFailedNodes = (executionId: string) =>
  postInstanceAction(executionId, 'retry-failed');

export const restartWorkflowInstance = (executionId: string) =>
  postInstanceAction(executionId, 'restart');

export const continueWorkflowAfterFailure = async (
  executionId: string,
  nodeId: string,
) => {
  const response = await request<ApiResponse<WorkflowInstance>>(
    `/api/v1/workflows/instances/${encodeURIComponent(executionId)}/nodes/${encodeURIComponent(nodeId)}/continue`,
    { method: 'POST' },
  );
  return response.data;
};

export const retryWorkflowFailedNode = async (
  executionId: string,
  nodeId: string,
) => {
  const response = await request<ApiResponse<WorkflowInstance>>(
    `/api/v1/workflows/instances/${encodeURIComponent(executionId)}/nodes/${encodeURIComponent(nodeId)}/retry`,
    { method: 'POST' },
  );
  return response.data;
};

export const rerunWorkflowFromNode = async (
  executionId: string,
  nodeId: string,
) => {
  const response = await request<ApiResponse<WorkflowInstance>>(
    `/api/v1/workflows/instances/${encodeURIComponent(executionId)}/nodes/${encodeURIComponent(nodeId)}/rerun`,
    { method: 'POST' },
  );
  return response.data;
};

export const getWorkflowInstances = async () => {
  const response = await request<ApiResponse<WorkflowInstance[]>>(
    '/api/v1/workflows/instances',
  );
  return response.data;
};

export const getWorkflowInstance = async (executionId: string) => {
  const response = await request<ApiResponse<WorkflowInstance>>(
    `/api/v1/workflows/instances/${encodeURIComponent(executionId)}`,
  );
  return response.data;
};

const snapshotSignature = (instance: WorkflowInstance) =>
  [
    instance.status,
    ...instance.nodes.map((node) =>
      [
        node.id,
        node.status,
        node.currentAttemptId || '',
        node.attemptCount,
        node.failureReason || '',
        node.errorMessage || '',
      ].join(':'),
    ),
  ].join('|');

/** SSE 为主，500ms authenticated request 作为代理/认证链路下的状态同步兜底。 */
export const subscribeWorkflowEvents = (
  executionId: string,
  onSnapshot: (instance: WorkflowInstance) => void,
) => {
  let closed = false;
  let lastSignature = '';
  let polling = false;

  const deliver = (snapshot: WorkflowInstance) => {
    if (closed) return;
    const signature = snapshotSignature(snapshot);
    if (signature === lastSignature) return;
    lastSignature = signature;
    onSnapshot(snapshot);
    if (isWorkflowTerminal(snapshot.status)) {
      cleanup();
    }
  };

  const source = new EventSource(
    `/api/v1/workflows/instances/${encodeURIComponent(executionId)}/events`,
  );

  const handleWorkflowEvent = (event: Event) => {
    try {
      deliver(
        JSON.parse((event as MessageEvent<string>).data) as WorkflowInstance,
      );
    } catch {
      // 单次异常事件不关闭连接。
    }
  };

  source.addEventListener('workflow', handleWorkflowEvent);

  const poll = async () => {
    if (closed || polling) return;
    polling = true;
    try {
      deliver(await getWorkflowInstance(executionId));
    } catch {
      // SSE 正常时不把兜底查询异常暴露给页面。
    } finally {
      polling = false;
    }
  };

  const timer = window.setInterval(() => {
    void poll();
  }, 500);

  function cleanup() {
    if (closed) return;
    closed = true;
    window.clearInterval(timer);
    source.removeEventListener('workflow', handleWorkflowEvent);
    source.close();
  }

  void poll();
  return cleanup;
};
