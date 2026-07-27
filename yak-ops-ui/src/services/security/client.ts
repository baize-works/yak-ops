import type { ApiResponse } from '@/services/http/response';
import request from '@/utils/request';
import type { SecurityProjectContext } from './types/common';

const SECURITY_NAMESPACE = '/yak-security';

export type SecurityRequestOptions = RequestInit & {
  project?: SecurityProjectContext;
  skipErrorHandler?: boolean;
  data?: unknown;
};

export const securityRequest = <T>(
  path: string,
  options: SecurityRequestOptions = {},
): Promise<ApiResponse<T>> => {
  const { project, headers: suppliedHeaders, ...requestOptions } = options;
  const headers = new Headers(suppliedHeaders);
  if (project) headers.set(project.headerName, String(project.projectId));

  return request<ApiResponse<T>>(`${SECURITY_NAMESPACE}${path}`, {
    ...requestOptions,
    headers,
    credentials: 'include',
    protocol: 'security',
  });
};

export const securityGetData = async <T>(
  path: string,
  options?: SecurityRequestOptions,
): Promise<T> => (await securityRequest<T>(path, { ...options, method: 'GET' })).data;

export const securityPostData = async <T>(
  path: string,
  data?: unknown,
  options?: SecurityRequestOptions,
): Promise<T> =>
  (
    await securityRequest<T>(path, {
      ...options,
      method: 'POST',
      data,
    })
  ).data;

export const securityPutData = async <T>(
  path: string,
  data?: unknown,
  options?: SecurityRequestOptions,
): Promise<T> =>
  (
    await securityRequest<T>(path, {
      ...options,
      method: 'PUT',
      data,
    })
  ).data;

export const securityDeleteData = async <T>(
  path: string,
  options?: SecurityRequestOptions,
): Promise<T> => (await securityRequest<T>(path, { ...options, method: 'DELETE' })).data;

/** Send an import file without forcing a JSON content type or serialising FormData. */
export const securityUploadData = async <T>(path: string, file: File): Promise<T> => {
  const body = new FormData();
  body.append('file', file);
  return (await securityRequest<T>(path, { method: 'POST', body })).data;
};
