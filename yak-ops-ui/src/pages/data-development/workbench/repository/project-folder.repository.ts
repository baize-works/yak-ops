import HttpUtils from '@/utils/HttpUtils';

const API_PREFIX = '/api/v1/data-development';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
  message?: string;
}

interface ApiResource {
  id: number;
  projectId: number;
  parentId?: number | null;
  resourceKind: 'FOLDER' | 'TASK' | 'ASSET';
  name: string;
  description?: string;
  sortOrder: number;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFolder {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  description?: string;
  sortOrder: number;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 && response.code !== 200) {
    throw new Error(response.message ?? response.msg ?? '目录接口调用失败');
  }
  return response.data;
};

const mapFolder = (resource: ApiResource): ProjectFolder => ({
  id: String(resource.id),
  projectId: String(resource.projectId),
  parentId: resource.parentId ? String(resource.parentId) : null,
  name: resource.name,
  description: resource.description,
  sortOrder: resource.sortOrder,
  updatedBy: resource.updatedBy ?? 'system',
  createdAt: resource.createdAt,
  updatedAt: resource.updatedAt,
});

const sortFolders = (folders: ProjectFolder[]) =>
  folders.slice().sort((left, right) => {
    const order = left.sortOrder - right.sortOrder;
    return order || left.name.localeCompare(right.name);
  });

export const projectFolderRepository = {
  async list(projectId: string): Promise<ProjectFolder[]> {
    const resources = unwrap(
      await HttpUtils.get<ApiResource[]>(
        `${API_PREFIX}/projects/${projectId}/resources`,
      ),
    );
    return sortFolders(
      resources
        .filter((resource) => resource.resourceKind === 'FOLDER')
        .map(mapFolder),
    );
  },

  async create(projectId: string, name: string): Promise<ProjectFolder> {
    const resource = unwrap(
      await HttpUtils.post<ApiResource>(
        `${API_PREFIX}/projects/${projectId}/folders`,
        {
          parentId: null,
          name: name.trim(),
          description: '',
          sortOrder: 0,
        },
      ),
    );
    return mapFolder(resource);
  },
};
