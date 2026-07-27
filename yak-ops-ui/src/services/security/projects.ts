import { securityDeleteData, securityGetData, securityPostData, securityPutData } from './client';

const PROJECT_API = '/api/v1/project';

export type SecurityProjectStatus = 'ENABLED' | 'DISABLED';
export type SecurityProjectId = number;

export interface SecurityProjectUser {
  id: SecurityProjectId;
  userName: string;
  nickName?: string | null;
}

export interface SecurityProjectSummary {
  id: SecurityProjectId;
  projectCode: string;
  projectName: string;
  owner?: SecurityProjectUser | null;
  memberCount: number;
  status: SecurityProjectStatus;
  createTime?: string;
  updateTime?: string;
}

export interface SecurityProjectDetail extends SecurityProjectSummary {
  members: SecurityProjectUser[];
  resourceStatistics?: Record<string, number>;
}

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
  projectCode: string;
  projectName: string;
}

export interface SecurityProjectDeleteCheck {
  deletable: boolean;
  reason?: string;
  references?: Record<string, number>;
}

const query = (values: object) => {
  const params = new URLSearchParams();
  Object.entries(values as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.toString();
};
const idPath = (id: SecurityProjectId) => `${PROJECT_API}/${encodeURIComponent(String(id))}`;

/** Project management endpoints are deliberately project-header free. */
export const pageSecurityProjects = (params: SecurityProjectPageQuery) =>
  securityGetData<SecurityProjectPage>(`${PROJECT_API}/page?${query(params)}`);
export const getSecurityProject = (id: SecurityProjectId) =>
  securityGetData<SecurityProjectDetail>(idPath(id));
export const createSecurityProject = (body: SecurityProjectInput) =>
  securityPostData<SecurityProjectSummary>(PROJECT_API, body);
export const updateSecurityProject = (id: SecurityProjectId, body: SecurityProjectInput) =>
  securityPutData<SecurityProjectSummary>(idPath(id), body);
export const assignSecurityProjectOwner = (id: SecurityProjectId, ownerId: SecurityProjectId) =>
  securityPutData<void>(`${idPath(id)}/owner`, { ownerId });
export const assignSecurityProjectMembers = (id: SecurityProjectId, memberIds: SecurityProjectId[]) =>
  securityPutData<void>(`${idPath(id)}/members`, { memberIds });
export const getSecurityProjectMemberCandidates = (id: SecurityProjectId) =>
  securityGetData<SecurityProjectUser[]>(`${idPath(id)}/member-candidates`);
export const updateSecurityProjectStatus = (id: SecurityProjectId, status: SecurityProjectStatus) =>
  securityPutData<void>(`${idPath(id)}/status`, { status });
export const checkSecurityProjectDeletion = (id: SecurityProjectId) =>
  securityGetData<SecurityProjectDeleteCheck>(`${idPath(id)}/delete-check`);
export const deleteSecurityProject = (id: SecurityProjectId) =>
  securityDeleteData<void>(idPath(id));

export const toSecurityProjectBrief = (project: SecurityProjectSummary): API.ProjectBrief => ({
  id: project.id,
  projectCode: project.projectCode,
  projectName: project.projectName,
});
