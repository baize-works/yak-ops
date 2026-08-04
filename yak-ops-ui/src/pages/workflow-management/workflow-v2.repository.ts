import HttpUtils, { type ApiResponse } from '@/utils/HttpUtils';
import type { CommonApiResponse } from './types';
import type { WorkflowV2Dag } from './workflow-v2.types';

const API_PREFIX = '/api/v1/workflows';

export type WorkflowSchemaVersion = 1 | 2;
export type WorkflowFailureStrategy = 'FAIL_FAST' | 'CONTINUE';

export interface WorkflowV2CreatePayload {
  code: string;
  name: string;
  description?: string;
  failureStrategy: WorkflowFailureStrategy;
  maxParallelism: number;
  dag: WorkflowV2Dag;
}

export type WorkflowV2UpdatePayload = Omit<WorkflowV2CreatePayload, 'code'>;

export interface WorkflowDefinitionDocument {
  id: number;
  code: string;
  name: string;
  description?: string;
  state: 'DRAFT' | 'PUBLISHED';
  currentVersion?: number;
  failureStrategy: WorkflowFailureStrategy;
  maxParallelism: number;
  schemaVersion: WorkflowSchemaVersion;
  draft?: unknown;
  draftV2?: WorkflowV2Dag;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowVersionDocument {
  id: number;
  workflowId: number;
  version: number;
  schemaVersion: WorkflowSchemaVersion;
  dag?: unknown;
  dagV2?: WorkflowV2Dag;
  contentHash: string;
  publishedBy?: string;
  publishedAt?: string;
}

const normalize = <T>(response: ApiResponse<T>): CommonApiResponse<T> => ({
  code: response.code,
  data: response.data,
  message: response.message ?? response.msg,
});

export const workflowV2Repository = {
  async create(
    payload: WorkflowV2CreatePayload,
  ): Promise<CommonApiResponse<{ workflowId: number }>> {
    return normalize(
      await HttpUtils.post<{ workflowId: number }>(`${API_PREFIX}/v2`, payload),
    );
  },

  async update(
    workflowId: string | number,
    payload: WorkflowV2UpdatePayload,
  ): Promise<CommonApiResponse<boolean>> {
    return normalize(
      await HttpUtils.put<boolean>(
        `${API_PREFIX}/${workflowId}/draft/v2`,
        payload,
      ),
    );
  },

  async detail(
    workflowId: string | number,
  ): Promise<CommonApiResponse<WorkflowDefinitionDocument>> {
    return normalize(
      await HttpUtils.get<WorkflowDefinitionDocument>(
        `${API_PREFIX}/${workflowId}`,
      ),
    );
  },

  async publish(
    workflowId: string | number,
  ): Promise<CommonApiResponse<WorkflowVersionDocument>> {
    return normalize(
      await HttpUtils.post<WorkflowVersionDocument>(
        `${API_PREFIX}/${workflowId}/publish`,
        {},
      ),
    );
  },

  async version(
    workflowId: string | number,
    version: number,
  ): Promise<CommonApiResponse<WorkflowVersionDocument>> {
    return normalize(
      await HttpUtils.get<WorkflowVersionDocument>(
        `${API_PREFIX}/${workflowId}/versions/${version}`,
      ),
    );
  },
};
