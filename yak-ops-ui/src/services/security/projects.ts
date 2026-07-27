import {
  securityDeleteData,
  securityGetData,
  securityPostData,
  securityPutData,
} from './client';

const PROJECT_API = '/api/v1/project';

export type SecurityProjectStatus = 'ENABLED' | 'DISABLED';
export type SecurityProjectId = number;

export interface SecurityProjectUser {
  id: number;
  userName: string;
  realName?: string | null;
  nickName?: string | null;
}

export interface SecurityProjectSummary {
  id: SecurityProjectId;
  projectCode: string;
  projectName: string;
  description?: string | null;
  owner?: SecurityProjectUser | null;
  owners: SecurityProjectUser[];
  members: SecurityProjectUser[];
  memberCount: number;
  status: SecurityProjectStatus;
  deptId?: number | null;
  deptPath?: string[];
  createTime?: string;
  updateTime?: string;
}

export type SecurityProjectDetail = SecurityProjectSummary;

export interface SecurityProjectPageQuery {
  pageNum: number;
  pageSize: number;
  projectCode?: string;
  projectName?: string;
  ownerName?: string;
  status?: SecurityProjectStatus;
}

export interface SecurityProjectPage {
  records: SecurityProjectSummary[];
  total: number;
}

export interface SecurityProjectInput {
  projectName: string;
  description?: string;
  deptId?: number;
}

export interface SecurityProjectDeleteCheck {
  deletable: boolean;
  reason?: string;
  resourceNameList: string[];
  references?: Record<string, number>;
}

interface BackendUserBrief {
  id: number;
  userName: string;
  realName?: string | null;
}

interface BackendDeptBrief {
  id: number;
  deptName?: string | null;
}

interface BackendProjectVO {
  id: number;
  projectCode?: string | null;
  projectName?: string | null;
  userList?: BackendUserBrief[];
  ownerList?: BackendUserBrief[];
  description?: string | null;
  running?: boolean | null;
  deptList?: BackendDeptBrief[];
  deptId?: number | null;
  createTime?: string;
  updateTime?: string;
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

interface BackendDeleteCheck {
  projectId: number;
  deletable?: boolean;
  resourceNameList?: string[];
}

const idPath = (id: SecurityProjectId) =>
  `${PROJECT_API}/${encodeURIComponent(String(id))}`;

const toUser = (user: BackendUserBrief): SecurityProjectUser => ({
  id: Number(user.id),
  userName: user.userName,
  realName: user.realName,
  nickName: user.realName,
});

const toUsers = (users?: BackendUserBrief[]): SecurityProjectUser[] =>
  Array.isArray(users) ? users.map(toUser) : [];

const toProject = (
  project: BackendProjectVO,
): SecurityProjectSummary => {
  const owners = toUsers(project.ownerList);
  const members = toUsers(project.userList);

  return {
    id: Number(project.id),
    projectCode: project.projectCode ?? '',
    projectName: project.projectName ?? '',
    description: project.description,
    owner: owners[0] ?? null,
    owners,
    members,
    memberCount: members.length,
    status:
      project.running === false
        ? 'DISABLED'
        : 'ENABLED',
    deptId: project.deptId,
    deptPath: Array.isArray(project.deptList)
      ? project.deptList
          .map((dept) => dept.deptName?.trim())
          .filter((name): name is string => Boolean(name))
      : [],
    createTime: project.createTime,
    updateTime: project.updateTime,
  };
};

const uniqueUsers = (
  users: SecurityProjectUser[],
): SecurityProjectUser[] => {
  const result = new Map<number, SecurityProjectUser>();
  users.forEach((user) => result.set(user.id, user));
  return Array.from(result.values());
};

/** Project management endpoints are deliberately project-header free. */
export const pageSecurityProjects = async (
  params: SecurityProjectPageQuery,
): Promise<SecurityProjectPage> => {
  const data =
    await securityPostData<
      BackendPagingData<BackendProjectVO>
    >(`${PROJECT_API}/page`, {
      page: params.pageNum,
      size: params.pageSize,
      projectCode: params.projectCode,
      projectName: params.projectName,
      chargeUsername: params.ownerName,
      running:
        params.status === undefined
          ? undefined
          : params.status === 'ENABLED',
    });

  return {
    records: Array.isArray(data?.bizData)
      ? data.bizData.map(toProject)
      : [],
    total: Number(
      data?.pagination?.total ?? 0,
    ),
  };
};

export const getSecurityProject = async (
  id: SecurityProjectId,
): Promise<SecurityProjectDetail> =>
  toProject(
    await securityGetData<BackendProjectVO>(
      idPath(id),
    ),
  );

export const createSecurityProject = async (
  body: SecurityProjectInput,
): Promise<SecurityProjectSummary> =>
  toProject(
    await securityPostData<BackendProjectVO>(
      PROJECT_API,
      {
        ...body,
        running: true,
      },
    ),
  );

export const updateSecurityProject = (
  id: SecurityProjectId,
  body: SecurityProjectInput,
): Promise<void> =>
  securityPutData<void>(PROJECT_API, {
    id,
    ...body,
  });

export const assignSecurityProjectOwner = (
  id: SecurityProjectId,
  ownerIds: SecurityProjectId[],
): Promise<void> =>
  securityPutData<void>(`${idPath(id)}/owners`, {
    userIdList: ownerIds,
  });

export const assignSecurityProjectMembers = (
  id: SecurityProjectId,
  memberIds: SecurityProjectId[],
): Promise<void> =>
  securityPutData<void>(`${idPath(id)}/users`, {
    userIdList: memberIds,
  });

export const getSecurityProjectMemberCandidates = async (
  id: SecurityProjectId,
): Promise<SecurityProjectUser[]> => {
  const [detail, unassigned] = await Promise.all([
    getSecurityProject(id),
    securityGetData<BackendUserBrief[]>(
      `${PROJECT_API}/unassigned?id=${encodeURIComponent(
        String(id),
      )}`,
    ),
  ]);

  return uniqueUsers([
    ...detail.owners,
    ...detail.members,
    ...toUsers(unassigned),
  ]);
};

export const updateSecurityProjectStatus = (
  id: SecurityProjectId,
  status: SecurityProjectStatus,
): Promise<void> =>
  securityPutData<void>(`${idPath(id)}/status`, {
    running: status === 'ENABLED',
  });

export const checkSecurityProjectDeletion = async (
  id: SecurityProjectId,
): Promise<SecurityProjectDeleteCheck> => {
  const result =
    await securityGetData<BackendDeleteCheck>(
      `${PROJECT_API}/delete/check/${encodeURIComponent(
        String(id),
      )}`,
    );

  const resourceNameList = Array.isArray(
    result?.resourceNameList,
  )
    ? result.resourceNameList
    : [];
  const deletable =
    result?.deletable ??
    resourceNameList.length === 0;

  return {
    deletable,
    resourceNameList,
    reason: deletable
      ? undefined
      : `项目仍关联 ${resourceNameList.length} 个资源，不能删除。`,
    references: {
      resources: resourceNameList.length,
    },
  };
};

export const deleteSecurityProject = (
  id: SecurityProjectId,
): Promise<void> =>
  securityDeleteData<void>(idPath(id));

export const toSecurityProjectBrief = (
  project: SecurityProjectSummary,
): API.ProjectBrief => ({
  id: project.id,
  projectCode: project.projectCode,
  projectName: project.projectName,
});
