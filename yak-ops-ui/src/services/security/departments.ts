import {
  securityGetData,
  securityPostData,
} from './client';

const DEPARTMENT_API = '/api/v1/dept';

/** Department tree node returned by Yak Security. */
export interface DepartmentVO {
  id: number;
  deptName?: string;
  description?: string | null;
  parentId?: number | null;
  leaf?: boolean;
  childList?: DepartmentVO[];
}

/** DTO accepted by POST /dept/import. */
export interface DepartmentImportItem {
  deptName: string;
  description?: string;
  childDeptDTOList?: DepartmentImportItem[];
}

/** Query the complete department tree, including the backend virtual root. */
export const getDepartmentTree = (): Promise<DepartmentVO> =>
  securityGetData<DepartmentVO>(`${DEPARTMENT_API}/tree`);

/** Import a JSON department DTO tree. */
export const importDepartments = (
  departments: DepartmentImportItem[],
): Promise<void> =>
  securityPostData<void>(
    `${DEPARTMENT_API}/import`,
    departments,
  );
