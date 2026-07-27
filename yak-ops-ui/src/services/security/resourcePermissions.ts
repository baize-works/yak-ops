import {
  securityGetData,
  securityPostData,
  securityPutData,
} from './client';

const RESOURCE_API = '/api/v1/resource';

export type ResourceControlLevel = 1 | 2;
export type ResourceShowLevel = 1 | 2 | 3;
export type ResourceOwnershipLevel = 0 | 1 | 2;

export interface ResourceTypeOption {
  id: number;
  typeName: string;
  description?: string | null;
}

export interface ResourceDepartmentBrief {
  id: number;
  deptName?: string | null;
}

export interface ResourcePermissionUserSummary {
  userId: number;
  userName: string;
  realName?: string | null;
  deptList?: ResourceDepartmentBrief[];
  adminResourceCnt?: number;
  viewResourceCnt?: number;
}

export interface ResourcePermissionResourceSummary {
  projectId: number;
  projectCode?: string | null;
  projectName?: string | null;
  resourceTypeId?: number | null;
  resourceTypeName?: string | null;
  resourceId?: number | null;
  resourceName?: string | null;
  adminUserCnt?: number;
  viewUserCnt?: number;
}

export interface ResourcePermissionNode {
  id: number;
  name: string;
  hasLevel: ResourceOwnershipLevel;
}

export interface ResourcePermissionUserOption {
  userId: number;
  userName: string;
  realName?: string | null;
  hasLevel: ResourceOwnershipLevel;
}

export interface ResourcePermissionPage<T> {
  records: T[];
  total: number;
}

export interface ByUserPageQuery {
  pageNum: number;
  pageSize: number;
  deptId?: number;
  deptName?: string;
  userName?: string;
  realName?: string;
}

export interface ByResourcePageQuery {
  pageNum: number;
  pageSize: number;
  showLevel: ResourceShowLevel;
  projectId?: number;
  resourceTypeId?: number;
  name?: string;
}

export interface UserPermissionDataQuery {
  userId: number;
  projectId?: number;
  resourceTypeId?: number;
  showLevel: ResourceShowLevel;
  controlLevel: ResourceControlLevel;
  batch?: boolean;
}

export interface ResourcePermissionDataQuery {
  projectId: number;
  resourceTypeId?: number;
  resourceId?: number;
  controlLevel: ResourceControlLevel;
  batch?: boolean;
}

export interface AssignResourcesToUserInput {
  userId: number;
  projectId?: number;
  resourceTypeId?: number;
  idList: number[];
  excludeIdList: number[];
  controlLevel: ResourceControlLevel;
}

export interface AssignUsersToResourceInput {
  projectId: number;
  resourceTypeId?: number;
  resourceId?: number;
  userIdList: number[];
  excludeUserIdList: number[];
  controlLevel: ResourceControlLevel;
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

const toPage = <T>(data?: BackendPagingData<T>): ResourcePermissionPage<T> => ({
  records: Array.isArray(data?.bizData) ? data.bizData : [],
  total: Number(data?.pagination?.total ?? 0),
});

export const getResourceViewControlStatus = (): Promise<boolean> =>
  securityGetData<boolean>(`${RESOURCE_API}/view-control/status`);

export const setResourceViewControlStatus = (
  enabled: boolean,
): Promise<void> =>
  securityPutData<void>(`${RESOURCE_API}/view-control/status`, {
    enabled,
  });

export const listResourceTypes = async (): Promise<ResourceTypeOption[]> => {
  const data = await securityGetData<ResourceTypeOption[]>(
    `${RESOURCE_API}/type/list`,
  );
  return Array.isArray(data) ? data : [];
};

export const pageResourcePermissionUsers = async (
  query: ByUserPageQuery,
): Promise<ResourcePermissionPage<ResourcePermissionUserSummary>> =>
  toPage(
    await securityPostData<
      BackendPagingData<ResourcePermissionUserSummary>
    >(`${RESOURCE_API}/by-user/page`, {
      page: query.pageNum,
      size: query.pageSize,
      deptId: query.deptId,
      deptName: query.deptName,
      userName: query.userName,
      realName: query.realName,
    }),
  );

export const pageResourcePermissionResources = async (
  query: ByResourcePageQuery,
): Promise<ResourcePermissionPage<ResourcePermissionResourceSummary>> =>
  toPage(
    await securityPostData<
      BackendPagingData<ResourcePermissionResourceSummary>
    >(`${RESOURCE_API}/by-resource/page`, {
      page: query.pageNum,
      size: query.pageSize,
      showLevel: query.showLevel,
      projectId: query.projectId,
      resourceTypeId: query.resourceTypeId,
      name: query.name,
    }),
  );

export const listResourcesForUser = async (
  query: UserPermissionDataQuery,
): Promise<ResourcePermissionNode[]> => {
  const data = await securityPostData<ResourcePermissionNode[]>(
    `${RESOURCE_API}/by-user/data`,
    {
      ...query,
      batch: query.batch ?? false,
    },
  );
  return Array.isArray(data) ? data : [];
};

export const listUsersForResource = async (
  query: ResourcePermissionDataQuery,
): Promise<ResourcePermissionUserOption[]> => {
  const data = await securityPostData<ResourcePermissionUserOption[]>(
    `${RESOURCE_API}/by-resource/data`,
    {
      ...query,
      batch: query.batch ?? false,
    },
  );
  return Array.isArray(data) ? data : [];
};

export const assignResourcesToUser = (
  input: AssignResourcesToUserInput,
): Promise<void> =>
  securityPutData<void>(`${RESOURCE_API}/by-user/assign`, input);

export const assignUsersToResource = (
  input: AssignUsersToResourceInput,
): Promise<void> =>
  securityPutData<void>(`${RESOURCE_API}/by-resource/assign`, input);
