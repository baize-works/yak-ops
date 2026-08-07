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
