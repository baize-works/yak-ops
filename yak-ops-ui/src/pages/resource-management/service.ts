import HttpUtils, { type ApiResponse } from '@/utils/HttpUtils';
import request from '@/utils/request';

import type {
  CreateDirectoryPayload,
  CreateTextResourcePayload,
  MoveResourcePayload,
  ResourceContent,
  ResourceId,
  ResourceItem,
  ResourcePageResult,
  ResourceQueryParams,
  ResourceStoragePlugin,
  UpdateResourcePayload,
} from './types';

const RESOURCE_API_PREFIX = '/api/v1/resources';

const queryString = (params: Record<string, unknown>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      search.set(key, String(value));
    }
  });
  const result = search.toString();
  return result ? `?${result}` : '';
};

export async function fetchResourceTree(): Promise<ApiResponse<ResourceItem[]>> {
  return HttpUtils.get<ResourceItem[]>(`${RESOURCE_API_PREFIX}/tree`);
}

export async function fetchResourceList(
  parentId: ResourceId = 0,
  keyword?: string,
): Promise<ApiResponse<ResourceItem[]>> {
  return HttpUtils.get<ResourceItem[]>(
    `${RESOURCE_API_PREFIX}/list${queryString({ parentId, keyword })}`,
  );
}

export async function fetchResourcePage(
  params: ResourceQueryParams,
): Promise<ApiResponse<ResourcePageResult>> {
  return HttpUtils.post<ResourcePageResult>(
    `${RESOURCE_API_PREFIX}/page`,
    params,
  );
}

export async function fetchResourceDetail(
  id: ResourceId,
): Promise<ApiResponse<ResourceItem>> {
  return HttpUtils.get<ResourceItem>(`${RESOURCE_API_PREFIX}/${id}`);
}

export async function fetchResourceContent(
  id: ResourceId,
  skipLineNum = 0,
  limit = 2000,
): Promise<ApiResponse<ResourceContent>> {
  return HttpUtils.get<ResourceContent>(
    `${RESOURCE_API_PREFIX}/${id}/content${queryString({
      skipLineNum,
      limit,
    })}`,
  );
}

export async function fetchStoragePlugins(): Promise<
  ApiResponse<ResourceStoragePlugin[]>
> {
  return HttpUtils.get<ResourceStoragePlugin[]>(
    `${RESOURCE_API_PREFIX}/storage-plugins`,
  );
}

export async function createDirectory(
  payload: CreateDirectoryPayload,
): Promise<ApiResponse<ResourceItem>> {
  return HttpUtils.post<ResourceItem>(
    `${RESOURCE_API_PREFIX}/directory`,
    payload,
  );
}

export async function createTextResource(
  payload: CreateTextResourcePayload,
): Promise<ApiResponse<ResourceItem>> {
  return HttpUtils.post<ResourceItem>(
    `${RESOURCE_API_PREFIX}/online-create`,
    payload,
  );
}

export async function uploadResource(
  parentId: ResourceId,
  file: File,
  options?: { name?: string; description?: string },
): Promise<ApiResponse<ResourceItem>> {
  const formData = new FormData();
  formData.append('parentId', String(parentId));
  formData.append('file', file);
  if (options?.name) formData.append('name', options.name);
  if (options?.description) {
    formData.append('description', options.description);
  }
  return HttpUtils.postForm<ResourceItem>(RESOURCE_API_PREFIX, formData);
}

export async function updateResource(
  id: ResourceId,
  payload: UpdateResourcePayload,
): Promise<ApiResponse<ResourceItem>> {
  return HttpUtils.put<ResourceItem>(`${RESOURCE_API_PREFIX}/${id}`, payload);
}

export async function replaceResourceFile(
  id: ResourceId,
  file: File,
): Promise<ApiResponse<ResourceItem>> {
  const formData = new FormData();
  formData.append('file', file);
  return request<ApiResponse<ResourceItem>>(
    `${RESOURCE_API_PREFIX}/${id}/file`,
    {
      method: 'PUT',
      data: formData,
      businessErrorMode: 'resolve',
    },
  );
}

export async function updateResourceContent(
  id: ResourceId,
  content: string,
): Promise<ApiResponse<ResourceContent>> {
  return HttpUtils.put<ResourceContent>(
    `${RESOURCE_API_PREFIX}/${id}/content`,
    { content },
  );
}

export async function moveResource(
  id: ResourceId,
  payload: MoveResourcePayload,
): Promise<ApiResponse<ResourceItem>> {
  return HttpUtils.post<ResourceItem>(
    `${RESOURCE_API_PREFIX}/${id}/move`,
    payload,
  );
}

export async function deleteResource(
  id: ResourceId,
): Promise<ApiResponse<boolean>> {
  return HttpUtils.delete<boolean>(`${RESOURCE_API_PREFIX}/${id}`);
}

const readDownloadName = (value?: string | null) => {
  if (!value) return undefined;
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const basicMatch = value.match(/filename="?([^";]+)"?/i);
  return basicMatch?.[1];
};

export async function downloadResource(
  id: ResourceId,
  fallbackName: string,
): Promise<void> {
  const result = await HttpUtils.download(
    `${RESOURCE_API_PREFIX}/${id}/download`,
  );
  const blob = result?.data instanceof Blob ? result.data : result;
  if (!(blob instanceof Blob)) {
    throw new Error('下载响应不是有效文件');
  }

  const disposition = result?.response?.headers?.get?.('content-disposition');
  const fileName = readDownloadName(disposition) || fallbackName;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
