import HttpUtils from '@/utils/HttpUtils';
import type {
  CommonApiResponse,
  WorkflowCreatePayload,
  WorkflowDefinitionRecord,
  WorkflowTaskPluginRecord,
  WorkflowUpdatePayload,
} from './types';

const WORKFLOW_API_PREFIX = '/api/v1/workflows';

export async function fetchWorkflowList(): Promise<
  CommonApiResponse<WorkflowDefinitionRecord[]>
> {
  return HttpUtils.get(WORKFLOW_API_PREFIX);
}

export async function fetchWorkflowDetail(
  workflowId: string | number,
): Promise<CommonApiResponse<WorkflowDefinitionRecord>> {
  return HttpUtils.get(`${WORKFLOW_API_PREFIX}/${workflowId}`);
}

export async function fetchTaskPluginList(): Promise<
  CommonApiResponse<WorkflowTaskPluginRecord[]>
> {
  return HttpUtils.get(`${WORKFLOW_API_PREFIX}/task-plugins`);
}

export async function createWorkflow(
  payload: WorkflowCreatePayload,
): Promise<CommonApiResponse<{ workflowId: number }>> {
  return HttpUtils.post(WORKFLOW_API_PREFIX, payload);
}

export async function updateWorkflow(
  workflowId: string | number,
  payload: WorkflowUpdatePayload,
): Promise<CommonApiResponse<boolean>> {
  return HttpUtils.put(`${WORKFLOW_API_PREFIX}/${workflowId}`, payload);
}

export async function deleteWorkflow(
  workflowId: string | number,
): Promise<CommonApiResponse<boolean>> {
  return HttpUtils.delete(`${WORKFLOW_API_PREFIX}/${workflowId}`);
}
