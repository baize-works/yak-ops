import { securityDeleteData, securityGetData, securityUploadData } from './client';

const PERMISSION_API = '/api/v1/permission';

export type TreeId = string | number;

export interface PermissionVO {
  id: TreeId;
  name: string;
  code: string;
  type: string;
  parentId?: TreeId | null;
  resource?: string | null;
  description?: string | null;
  sort?: number | null;
  status?: string | number | boolean | null;
  children?: PermissionVO[];
}

export interface PermissionSearchParams {
  name?: string;
  code?: string;
  type?: string;
}

export interface ImportReport {
  successCount: number;
  failureCount: number;
  failures?: Array<{ row?: number; code?: string; message: string }>;
}

const queryString = (params: PermissionSearchParams) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value?.trim()) query.set(key, value.trim());
  const value = query.toString();
  return value ? `?${value}` : '';
};

export const getPermissionTree = (): Promise<PermissionVO[]> =>
  securityGetData<PermissionVO[]>(`${PERMISSION_API}/tree`);

export const searchPermissions = (params: PermissionSearchParams): Promise<PermissionVO[]> =>
  securityGetData<PermissionVO[]>(`${PERMISSION_API}/search${queryString(params)}`);

export const getPermissionDetail = (id: TreeId): Promise<PermissionVO> =>
  securityGetData<PermissionVO>(`${PERMISSION_API}/${encodeURIComponent(String(id))}`);

export const importPermissions = (file: File): Promise<ImportReport> =>
  securityUploadData<ImportReport>(`${PERMISSION_API}/import`, file);

export const deletePermission = (id: TreeId): Promise<void> =>
  securityDeleteData<void>(`${PERMISSION_API}/${encodeURIComponent(String(id))}`);
