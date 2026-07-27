import {
  securityDeleteData,
  securityGetData,
  securityPostData,
  securityPutData,
} from './client';

const DEPARTMENT_API = '/api/v1/dept';

/** Department tree node returned by Yak Security. */
export interface DepartmentVO {
  id: number;
  deptName?: string;
  description?: string | null;
  parentId?: number | null;
  leaf?: boolean;
  level?: number;
  childDeptCount?: number;
  userCount?: number;
  childList?: DepartmentVO[];
}

export interface DepartmentInput {
  id?: number;
  deptName: string;
  description?: string;
  parentId?: number;
}

export interface DepartmentDeleteCheck {
  deptId: number;
  deletable: boolean;
  childDeptNameList?: string[];
  userNameList?: string[];
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

export const getDepartmentDetail = (
  deptId: number,
): Promise<DepartmentVO> =>
  securityGetData<DepartmentVO>(
    `${DEPARTMENT_API}/${encodeURIComponent(String(deptId))}`,
  );

export const createDepartment = (
  body: DepartmentInput,
): Promise<void> =>
  securityPostData<void>(DEPARTMENT_API, body);

export const updateDepartment = (
  body: DepartmentInput,
): Promise<void> =>
  securityPutData<void>(DEPARTMENT_API, body);

export const checkDepartmentBeforeDelete = (
  deptId: number,
): Promise<DepartmentDeleteCheck> =>
  securityDeleteData<DepartmentDeleteCheck>(
    `${DEPARTMENT_API}/delete/check/${encodeURIComponent(
      String(deptId),
    )}`,
  );

export const deleteDepartment = (
  deptId: number,
): Promise<void> =>
  securityDeleteData<void>(
    `${DEPARTMENT_API}/${encodeURIComponent(String(deptId))}`,
  );

/** Import a JSON department DTO tree. */
export const importDepartments = (
  departments: DepartmentImportItem[],
): Promise<void> =>
  securityPostData<void>(
    `${DEPARTMENT_API}/import`,
    departments,
  );
