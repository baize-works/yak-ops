import { request } from '@umijs/max';
import type { ApiResponse } from '@/services/http/response';

export interface WorkflowNodePayload {
  id: string;
  name: string;
  type: string;
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

export const subscribeWorkflowEvents = (
  executionId: string,
  onSnapshot: (instance: WorkflowInstance) => void,
) => {
  const source = new EventSource(
    `/api/v1/workflows/instances/${encodeURIComponent(executionId)}/events`,
  );

  const handleWorkflowEvent = (event: Event) => {
    const snapshot = JSON.parse((event as MessageEvent<string>).data) as WorkflowInstance;
    onSnapshot(snapshot);
    if (isWorkflowTerminal(snapshot.status)) {
      source.close();
    }
  };

  source.addEventListener('workflow', handleWorkflowEvent);

  return () => {
    source.removeEventListener('workflow', handleWorkflowEvent);
    source.close();
  };
};
