import type { ApiResponse } from '@/services/http/response';
import { request } from '@umijs/max';
import type {
  WorkflowFailureStrategy,
  WorkflowNodeFailurePolicy,
  WorkflowTriggerRule,
} from './index';

export type WorkflowDefinitionStatus = 'DRAFT' | 'ONLINE' | 'OFFLINE';

export interface WorkflowDefinitionNode {
  id: string;
  taskId: string;
  positionX: number;
  positionY: number;
  maxAttempts: number;
  retryDelaySeconds: number;
  dispatchTimeoutSeconds: number;
  executionTimeoutSeconds: number;
  inputMapping: Record<string, string>;
  triggerRule: WorkflowTriggerRule;
  failurePolicy: WorkflowNodeFailurePolicy;
}

export interface WorkflowDefinitionEdge {
  source: string;
  target: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  status: WorkflowDefinitionStatus;
  nodeCount: number;
  edgeCount: number;
  nodes: WorkflowDefinitionNode[];
  edges: WorkflowDefinitionEdge[];
  input: Record<string, unknown>;
  workflowTimeoutSeconds: number;
  failureStrategy: WorkflowFailureStrategy;
  latestExecutionId?: string;
  latestExecutionStatus?: string;
  createTime: string;
  updateTime: string;
}

export interface WorkflowDefinitionCreatePayload {
  name: string;
  description?: string;
}

export interface WorkflowDefinitionUpdatePayload {
  name: string;
  description?: string;
  nodes: WorkflowDefinitionNode[];
  edges: WorkflowDefinitionEdge[];
  input: Record<string, unknown>;
  workflowTimeoutSeconds: number;
  failureStrategy: WorkflowFailureStrategy;
}

const definitionAction = async (id: string, action: string) => {
  const response = await request<ApiResponse<WorkflowDefinition>>(
    `/api/v1/workflows/definitions/${encodeURIComponent(id)}/${action}`,
    { method: 'POST' },
  );
  return response.data;
};

export const listWorkflowDefinitions = async (params?: {
  keyword?: string;
  status?: WorkflowDefinitionStatus;
}) => {
  const response = await request<ApiResponse<WorkflowDefinition[]>>(
    '/api/v1/workflows/definitions',
    { params },
  );
  return response.data || [];
};

export const createWorkflowDefinition = async (
  payload: WorkflowDefinitionCreatePayload,
) => {
  const response = await request<ApiResponse<WorkflowDefinition>>(
    '/api/v1/workflows/definitions',
    { method: 'POST', data: payload },
  );
  return response.data;
};

export const getWorkflowDefinition = async (id: string) => {
  const response = await request<ApiResponse<WorkflowDefinition>>(
    `/api/v1/workflows/definitions/${encodeURIComponent(id)}`,
  );
  return response.data;
};

export const updateWorkflowDefinition = async (
  id: string,
  payload: WorkflowDefinitionUpdatePayload,
) => {
  const response = await request<ApiResponse<WorkflowDefinition>>(
    `/api/v1/workflows/definitions/${encodeURIComponent(id)}`,
    { method: 'PUT', data: payload },
  );
  return response.data;
};

export const deleteWorkflowDefinition = async (id: string) => {
  await request<ApiResponse<boolean>>(
    `/api/v1/workflows/definitions/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
};

export const onlineWorkflowDefinition = (id: string) =>
  definitionAction(id, 'online');

export const offlineWorkflowDefinition = (id: string) =>
  definitionAction(id, 'offline');

export const runWorkflowDefinition = (id: string) =>
  definitionAction(id, 'run');

export const pauseWorkflowDefinition = (id: string) =>
  definitionAction(id, 'pause');

export const resumeWorkflowDefinition = (id: string) =>
  definitionAction(id, 'resume');
