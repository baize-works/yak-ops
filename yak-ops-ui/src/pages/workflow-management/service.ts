import HttpUtils, { type ApiResponse } from '@/utils/HttpUtils';
import type {
  CommonApiResponse,
  WorkflowCreatePayload,
  WorkflowDefinitionRecord,
  WorkflowTaskPluginRecord,
  WorkflowUpdatePayload,
} from './types';

const WORKFLOW_API_PREFIX = '/api/v1/workflows';

/** Normalize message fields without rewriting the backend business code. */
export const normalizeWorkflowResponse = <T>(
  response: ApiResponse<T>,
): CommonApiResponse<T> => ({
  code: response.code,
  data: response.data,
  message: response.message ?? response.msg,
});

export async function fetchWorkflowList(): Promise<
  CommonApiResponse<WorkflowDefinitionRecord[]>
> {
  return normalizeWorkflowResponse(
    await HttpUtils.get<WorkflowDefinitionRecord[]>(WORKFLOW_API_PREFIX),
  );
}

export async function fetchWorkflowDetail(
  workflowId: string | number,
): Promise<CommonApiResponse<WorkflowDefinitionRecord>> {
  return normalizeWorkflowResponse(
    await HttpUtils.get<WorkflowDefinitionRecord>(
      `${WORKFLOW_API_PREFIX}/${workflowId}`,
    ),
  );
}

export async function fetchTaskPluginList(): Promise<
  CommonApiResponse<WorkflowTaskPluginRecord[]>
> {
  return normalizeWorkflowResponse(
    await HttpUtils.get<WorkflowTaskPluginRecord[]>(
      `${WORKFLOW_API_PREFIX}/task-plugins`,
    ),
  );
}

export async function createWorkflow(
  payload: WorkflowCreatePayload,
): Promise<CommonApiResponse<{ workflowId: number }>> {
  return normalizeWorkflowResponse(
    await HttpUtils.post<{ workflowId: number }>(WORKFLOW_API_PREFIX, payload),
  );
}

export async function updateWorkflow(
  workflowId: string | number,
  payload: WorkflowUpdatePayload,
): Promise<CommonApiResponse<boolean>> {
  return normalizeWorkflowResponse(
    await HttpUtils.put<boolean>(
      `${WORKFLOW_API_PREFIX}/${workflowId}`,
      payload,
    ),
  );
}

export async function deleteWorkflow(
  workflowId: string | number,
): Promise<CommonApiResponse<boolean>> {
  return normalizeWorkflowResponse(
    await HttpUtils.delete<boolean>(`${WORKFLOW_API_PREFIX}/${workflowId}`),
  );
}
