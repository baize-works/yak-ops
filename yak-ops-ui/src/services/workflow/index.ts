import { request } from '@umijs/max';
import type { ApiResponse } from '@/services/http/response';

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

export interface WorkflowTaskDefinition {
  id: string;
  name: string;
  type: string;
}

export interface WorkflowNodePayload {
  id: string;
  taskId: string;
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
  taskId: string;
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

interface WorkflowEventSubscription {
  onSnapshot: (instance: WorkflowInstance) => void;
  lastSignature: string;
  stopped: boolean;
  closeActive?: () => void;
}

const TERMINAL_STATUSES = new Set([
  'SUCCESS',
  'SUCCESS_WITH_WARNINGS',
  'FAILED',
  'WARNING',
  'CANCELED',
  'TIMED_OUT',
]);

const workflowEventSubscriptions = new Map<
  string,
  WorkflowEventSubscription
>();

export const isWorkflowTerminal = (status?: string) =>
  Boolean(status && TERMINAL_STATUSES.has(status));

export const getWorkflowTasks = async () => {
  const response = await request<ApiResponse<WorkflowTaskDefinition[]>>(
    '/api/v1/tasks',
  );
  return response.data;
};

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
  resumeWorkflowEventsIfNeeded(executionId, response.data);
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
  resumeWorkflowEventsIfNeeded(executionId, response.data);
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
  resumeWorkflowEventsIfNeeded(executionId, response.data);
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

const openWorkflowEventSubscription = (
  executionId: string,
  subscription: WorkflowEventSubscription,
) => {
  if (subscription.stopped) return;
  subscription.closeActive?.();

  let activeClosed = false;
  let polling = false;

  const deliver = (snapshot: WorkflowInstance) => {
    if (activeClosed || subscription.stopped) return;
    const signature = snapshotSignature(snapshot);
    if (signature === subscription.lastSignature) return;
    subscription.lastSignature = signature;
    subscription.onSnapshot(snapshot);
    if (isWorkflowTerminal(snapshot.status)) {
      cleanupActive();
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
    if (activeClosed || subscription.stopped || polling) return;
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

  function cleanupActive() {
    if (activeClosed) return;
    activeClosed = true;
    window.clearInterval(timer);
    source.removeEventListener('workflow', handleWorkflowEvent);
    source.close();
    if (subscription.closeActive === cleanupActive) {
      subscription.closeActive = undefined;
    }
  }

  subscription.closeActive = cleanupActive;
  void poll();
};

function resumeWorkflowEventsIfNeeded(
  executionId: string,
  snapshot: WorkflowInstance,
) {
  if (snapshot.id !== executionId || isWorkflowTerminal(snapshot.status)) return;
  const subscription = workflowEventSubscriptions.get(executionId);
  if (!subscription || subscription.stopped || subscription.closeActive) return;
  openWorkflowEventSubscription(executionId, subscription);
}

/**
 * SSE 为主，500ms authenticated request 作为代理/认证链路下的状态同步兜底。
 *
 * 终态只关闭当前网络连接，保留订阅句柄；失败节点被人工重试或放行后，
 * service 层会自动恢复同一个 executionId 的 SSE + polling。
 */
export const subscribeWorkflowEvents = (
  executionId: string,
  onSnapshot: (instance: WorkflowInstance) => void,
) => {
  const existing = workflowEventSubscriptions.get(executionId);
  if (existing) {
    existing.stopped = true;
    existing.closeActive?.();
  }

  const subscription: WorkflowEventSubscription = {
    onSnapshot,
    lastSignature: '',
    stopped: false,
  };
  workflowEventSubscriptions.set(executionId, subscription);
  openWorkflowEventSubscription(executionId, subscription);

  return () => {
    subscription.stopped = true;
    subscription.closeActive?.();
    if (workflowEventSubscriptions.get(executionId) === subscription) {
      workflowEventSubscriptions.delete(executionId);
    }
  };
};
