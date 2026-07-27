import {
  securityDeleteData,
  securityGetData,
  securityPostData,
  securityPutData,
} from './client';

const USER_API = '/api/v1/user';
const ROLE_API = '/api/v1/role';

export type TreeId = string | number;

/**
 * 后端唯一性检查类型：
 *
 * 1：用户名
 * 2：手机号
 * 3：邮箱
 */
export type UserCheckType = 1 | 2 | 3;

export interface RoleBrief {
  id: number;
  roleName: string;
}

export interface ProjectBrief {
  id: number;
  projectCode?: string;
  projectName?: string;
}

export interface SystemUser {
  id: number;
  userName: string;
  realName?: string;
  phone?: string;
  email?: string;
  createTime?: string;
  updateTime?: string;
  roleList?: RoleBrief[];
  projectList?: ProjectBrief[];
  permissionTreeVO?: unknown;
}

export interface UserPageQuery {
  pageNum: number;
  pageSize: number;
  id?: number;
  roleId?: number;
  userName?: string;
  realName?: string;
}

export interface UserInput {
  userName: string;
  pw?: string;
  realName?: string;
  phone?: string;
  email?: string;
  roleIds?: number[];
}

export interface AssignInfo {
  id: number;
  name: string;
  has: boolean;
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

export interface UserPage {
  records: SystemUser[];
  total: number;
}

/**
 * 分页查询用户。
 */
export const pageUsers = async (
  params: UserPageQuery,
): Promise<UserPage> => {
  const data =
    await securityPostData<
      BackendPagingData<SystemUser>
    >(`${USER_API}/page`, {
      page: params.pageNum,
      size: params.pageSize,
      id: params.id,
      roleId: params.roleId,
      userName: params.userName,
      realName: params.realName,
    });

  return {
    records: Array.isArray(data?.bizData)
      ? data.bizData
      : [],
    total: Number(
      data?.pagination?.total ?? 0,
    ),
  };
};

/**
 * 查询用户详情。
 */
export const getUserDetail = (
  userId: number,
): Promise<SystemUser> =>
  securityGetData<SystemUser>(
    `${USER_API}/${encodeURIComponent(
      String(userId),
    )}`,
  );

/**
 * 新增用户。
 */
export const createUser = (
  body: UserInput,
): Promise<void> =>
  securityPutData<void>(
    `${USER_API}/add`,
    body,
  );

/**
 * 编辑用户。
 *
 * pw 为空时，后端保持原密码不变。
 */
export const updateUser = (
  body: UserInput,
): Promise<void> =>
  securityPostData<void>(
    `${USER_API}/edit`,
    body,
  );

/**
 * 删除用户。
 */
export const deleteUser = (
  userId: number,
): Promise<void> =>
  securityDeleteData<void>(
    `${USER_API}/${encodeURIComponent(
      String(userId),
    )}`,
  );

/**
 * 校验用户名、手机号或邮箱是否可用。
 */
export const checkUserField = (
  type: UserCheckType,
  value: string,
): Promise<void> =>
  securityGetData<void>(
    `${USER_API}/${type}/${encodeURIComponent(
      value,
    )}/check`,
  );

/**
 * 查询全部角色。
 */
export const listRoles = (
  keyword?: string,
): Promise<RoleBrief[]> => {
  const value = keyword?.trim();

  return securityGetData<RoleBrief[]>(
    value
      ? `${ROLE_API}/list/${encodeURIComponent(
          value,
        )}`
      : `${ROLE_API}/list`,
  );
};

/**
 * 查询用户的角色分配情况。
 */
export const getUserRoleAssignments = (
  userId: number,
): Promise<AssignInfo[]> =>
  securityGetData<AssignInfo[]>(
    `${USER_API}/assign/list/${encodeURIComponent(
      String(userId),
    )}`,
  );

/**
 * 保存用户角色。
 *
 * flag=true：为用户分配角色。
 */
export const assignRolesToUser = (
  userId: number,
  roleIds: number[],
): Promise<void> =>
  securityPostData<void>(
    `${ROLE_API}/assign`,
    {
      id: userId,
      idList: roleIds,
      flag: true,
    },
  );

/**
 * 管理员重置密码。
 *
 * 当前后端没有独立重置密码接口，因此先读取完整用户详情，
 * 再复用编辑接口，仅替换 pw，其他信息和角色保持不变。
 */
export const resetUserPassword = async (
  userId: number,
  password: string,
): Promise<void> => {
  const detail =
    await getUserDetail(userId);

  await updateUser({
    userName: detail.userName,
    realName: detail.realName,
    phone: detail.phone,
    email: detail.email,
    pw: password,
    roleIds: Array.isArray(
      detail.roleList,
    )
      ? detail.roleList
          .map((role) =>
            Number(role.id),
          )
          .filter(Number.isFinite)
      : [],
  });
};