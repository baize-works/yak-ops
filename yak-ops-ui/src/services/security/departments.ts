import { securityGetData, securityUploadData } from './client';
import type { ImportReport, TreeId } from './permissions';

const DEPARTMENT_API = '/api/v1/department';

export interface DepartmentVO {
  id: TreeId;
  name: string;
  code?: string | null;
  parentId?: TreeId | null;
  leader?: string | null;
  children?: DepartmentVO[];
}

const queryString = (params: { name?: string; code?: string }) => {
  const query = new URLSearchParams();
  if (params.name?.trim()) query.set('name', params.name.trim());
  if (params.code?.trim()) query.set('code', params.code.trim());
  const value = query.toString();
  return value ? `?${value}` : '';
};

export const getDepartmentTree = (): Promise<DepartmentVO[]> =>
  securityGetData<DepartmentVO[]>(`${DEPARTMENT_API}/tree`);

export const searchDepartments = (params: { name?: string; code?: string }): Promise<DepartmentVO[]> =>
  securityGetData<DepartmentVO[]>(`${DEPARTMENT_API}/search${queryString(params)}`);

export const getDepartmentDetail = (id: TreeId): Promise<DepartmentVO> =>
  securityGetData<DepartmentVO>(`${DEPARTMENT_API}/${encodeURIComponent(String(id))}`);

export const importDepartments = (file: File): Promise<ImportReport> =>
  securityUploadData<ImportReport>(`${DEPARTMENT_API}/import`, file);
