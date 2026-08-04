import HttpUtils from '@/utils/HttpUtils';

const API_PREFIX = '/api/v1/data-development/tasks/library';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
  message?: string;
}

export type WorkflowTaskLibrarySortBy =
  | 'UPDATED_AT'
  | 'PUBLISHED_AT'
  | 'RECENTLY_USED';

export interface WorkflowTaskLibraryQuery {
  projectId?: string;
  folderId?: string;
  taskType?: string;
  keyword?: string;
  favoriteOnly?: boolean;
  recentlyUsed?: boolean;
  sortBy?: WorkflowTaskLibrarySortBy;
  offset?: number;
  limit?: number;
}

export interface WorkflowPublishedTask {
  taskId: string;
  name: string;
  description?: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  folderId?: string;
  folderName?: string;
  taskType: string;
  engineType?: string;
  publishedVersionId: string;
  publishedVersionNumber: number;
  pluginVersion: string;
  schemaVersion: number;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  contentDigest: string;
  publishedBy?: string;
  publishedAt: string;
  updatedAt: string;
  favorite: boolean;
  lastUsedAt?: string;
}

export interface WorkflowPublishedTaskPage {
  items: WorkflowPublishedTask[];
  total: number;
  offset: number;
  limit: number;
}

export interface WorkflowPublishedTaskVersion {
  taskId: string;
  taskName: string;
  projectId: string;
  projectName: string;
  taskType: string;
  engineType?: string;
  versionId: string;
  versionNumber: number;
  pluginVersion: string;
  schemaVersion: number;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  contentDigest: string;
  publishedBy?: string;
  publishedAt: string;
  currentVersion: boolean;
}

const unwrap = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 && response.code !== 200) {
    throw new Error(response.message ?? response.msg ?? '工作流任务资源接口调用失败');
  }
  return response.data;
};

const append = (
  params: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined,
) => {
  if (value === undefined || value === '') return;
  params.set(key, String(value));
};

const queryString = (query: WorkflowTaskLibraryQuery) => {
  const params = new URLSearchParams();
  append(params, 'projectId', query.projectId);
  append(params, 'folderId', query.folderId);
  append(params, 'taskType', query.taskType?.trim());
  append(params, 'keyword', query.keyword?.trim());
  append(params, 'favoriteOnly', query.favoriteOnly);
  append(params, 'recentlyUsed', query.recentlyUsed);
  append(params, 'sortBy', query.sortBy);
  append(params, 'offset', query.offset);
  append(params, 'limit', query.limit);
  const value = params.toString();
  return value ? `?${value}` : '';
};

export const workflowTaskLibraryRepository = {
  async search(
    query: WorkflowTaskLibraryQuery = {},
  ): Promise<WorkflowPublishedTaskPage> {
    return unwrap(
      await HttpUtils.get<WorkflowPublishedTaskPage>(
        `${API_PREFIX}${queryString(query)}`,
      ),
    );
  },

  async getPublishedVersion(
    taskId: string,
    versionId: string,
  ): Promise<WorkflowPublishedTaskVersion> {
    return unwrap(
      await HttpUtils.get<WorkflowPublishedTaskVersion>(
        `${API_PREFIX}/${encodeURIComponent(taskId)}/versions/${encodeURIComponent(versionId)}`,
      ),
    );
  },
};
