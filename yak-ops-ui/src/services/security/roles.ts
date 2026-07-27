import {
  securityDeleteData,
  securityGetData,
  securityPostData,
  securityPutData,
} from './client';

const ROLE_API = '/api/v1/role';
const PERMISSION_API = '/api/v1/permission';

export interface PermissionTreeNode {
  id?: number;
  has?: boolean;
  permissionCode?: string;
  permissionName?: string;
  parentId?: number;
  leaf?: boolean;
  description?: string;
  active?: boolean;
  declared?: boolean;
  childList?: PermissionTreeNode[];
}

export interface SystemRole {
  id: number;
  roleName: string;
  roleCode?: string;
  description?: string;
  authedUserCnt?: number;
  authedUsers?: string[];
  lastReviser?: string;
  createTime?: string;
  updateTime?: string;
  permissionTreeVO?: PermissionTreeNode;
}

export interface RolePageQuery {
  pageNum: number;
  pageSize: number;
  id?: number;
  roleCode?: string;
  roleName?: string;
  description?: string;
}

export interface RoleInput {
  id?: number;
  roleName: string;
  description?: string;
  permissionIdList: number[];
}

export interface RoleAssignmentInfo {
  id: number;
  name: string;
  has: boolean;
}

export interface RoleDeleteCheck {
  roleId: number;
  userNameList?: string[];
}

interface BackendPagingData<T> {
  bizData?: T[];
  pagination?: {
    total?: number;
    pages?: number;
    pageNo?: number;
    pageSize?: number;
  };
}

export interface RolePage {
  records: SystemRole[];
  total: number;
}

export const pageRoles = async (
  params: RolePageQuery,
): Promise<RolePage> => {
  const data = await securityPostData<
    BackendPagingData<SystemRole>
  >(`${ROLE_API}/page`, {
    page: params.pageNum,
    size: params.pageSize,
    id: params.id,
    roleCode: params.roleCode,
    roleName: params.roleName,
    description: params.description,
  });

  return {
    records: Array.isArray(data?.bizData)
      ? data.bizData
      : [],
    total: Number(data?.pagination?.total ?? 0),
  };
};

export const getRoleDetail = (
  roleId: number,
): Promise<SystemRole> =>
  securityGetData<SystemRole>(
    `${ROLE_API}/${encodeURIComponent(String(roleId))}`,
  );

export const createRole = (
  body: RoleInput,
): Promise<void> =>
  securityPostData<void>(ROLE_API, body);

export const updateRole = (
  body: RoleInput,
): Promise<void> =>
  securityPutData<void>(ROLE_API, body);

export const getPermissionTree = (): Promise<PermissionTreeNode> =>
  securityGetData<PermissionTreeNode>(
    `${PERMISSION_API}/tree`,
  );

export const getRoleUserAssignments = (
  roleId: number,
): Promise<RoleAssignmentInfo[]> =>
  securityGetData<RoleAssignmentInfo[]>(
    `${ROLE_API}/assign/list/${encodeURIComponent(
      String(roleId),
    )}`,
  );

export const assignUsersToRole = (
  roleId: number,
  userIds: number[],
): Promise<void> =>
  securityPostData<void>(`${ROLE_API}/assign`, {
    id: roleId,
    idList: userIds,
    flag: false,
  });

export const checkRoleBeforeDelete = (
  roleId: number,
): Promise<RoleDeleteCheck> =>
  securityDeleteData<RoleDeleteCheck>(
    `${ROLE_API}/delete/check/${encodeURIComponent(
      String(roleId),
    )}`,
  );

export const deleteRole = (
  roleId: number,
): Promise<void> =>
  securityDeleteData<void>(
    `${ROLE_API}/${encodeURIComponent(String(roleId))}`,
  );
