import { request } from '@umijs/max';
import type { ApiResponse } from '@/services/http/response';

export type WorkflowMockResult = 'SUCCESS' | 'FAILED';

export interface WorkflowNodePayload {
  id: string;
  name: string;
  type: string;
  mockResult?: WorkflowMockResult;
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
}

export interface WorkflowNodeInstance {
  id: string;
  name: string;
  type: string;
  status: string;
  errorMessage?: string;
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  name: string;
  status: string;
  startedAt: string;
  endedAt?: string;
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

export const activateWorkflowInstance = async (executionId: string) => {
  const response = await request<ApiResponse<WorkflowInstance>>(
    `/api/v1/workflows/instances/${encodeURIComponent(executionId)}/activate`,
    { method: 'POST' },
  );
  return response.data;
};

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
    ...instance.nodes.map((node) => `${node.id}:${node.status}:${node.errorMessage || ''}`),
  ].join('|');

/**
 * SSE 为主，短周期查询作为兜底。
 *
 * 原生 EventSource 无法复用 Umi request 的请求拦截器/自定义 Header，
 * 因此保留 authenticated request 轮询，可避免 SSE 被代理或认证链路阻断时
 * 画布只能看到最终状态。
 */
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
      const snapshot = JSON.parse(
        (event as MessageEvent<string>).data,
      ) as WorkflowInstance;
      deliver(snapshot);
    } catch {
      // 单次异常事件不关闭连接，继续等待后续快照。
    }
  };

  source.addEventListener('workflow', handleWorkflowEvent);

  const poll = async () => {
    if (closed || polling) return;
    polling = true;
    try {
      deliver(await getWorkflowInstance(executionId));
    } catch {
      // SSE 正常时无需把兜底查询异常暴露给页面。
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
