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

export interface ProjectFolderPath {
  id: string;
  parentId: string | null;
  name: string;
  path: string;
  depth: number;
  sortOrder: number;
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

export const sortProjectFolders = (folders: ProjectFolder[]) =>
  folders.slice().sort((left, right) => {
    const order = left.sortOrder - right.sortOrder;
    return order || left.name.localeCompare(right.name);
  });

export const buildProjectFolderPaths = (
  folders: ProjectFolder[],
): ProjectFolderPath[] => {
  const sorted = sortProjectFolders(folders);
  const childrenByParent = new Map<string | null, ProjectFolder[]>();
  sorted.forEach((folder) => {
    const siblings = childrenByParent.get(folder.parentId) ?? [];
    siblings.push(folder);
    childrenByParent.set(folder.parentId, siblings);
  });

  const result: ProjectFolderPath[] = [];
  const visited = new Set<string>();

  const visit = (
    parentId: string | null,
    parentPath: string,
    depth: number,
  ) => {
    const children = childrenByParent.get(parentId) ?? [];
    children.forEach((folder) => {
      if (visited.has(folder.id)) return;
      visited.add(folder.id);
      const path = `${parentPath}/${folder.name}`.replaceAll('//', '/');
      result.push({
        id: folder.id,
        parentId: folder.parentId,
        name: folder.name,
        path,
        depth,
        sortOrder: folder.sortOrder,
      });
      visit(folder.id, path, depth + 1);
    });
  };

  visit(null, '', 0);

  sorted.forEach((folder) => {
    if (visited.has(folder.id)) return;
    result.push({
      id: folder.id,
      parentId: folder.parentId,
      name: folder.name,
      path: `/${folder.name}`,
      depth: 0,
      sortOrder: folder.sortOrder,
    });
  });

  return result;
};

export const projectFolderRepository = {
  async list(projectId: string): Promise<ProjectFolder[]> {
    const resources = unwrap(
      await HttpUtils.get<ApiResource[]>(
        `${API_PREFIX}/projects/${projectId}/resources`,
      ),
    );
    return sortProjectFolders(
      resources
        .filter((resource) => resource.resourceKind === 'FOLDER')
        .map(mapFolder),
    );
  },

  async create(
    projectId: string,
    name: string,
    parentId: string | null = null,
  ): Promise<ProjectFolder> {
    const resource = unwrap(
      await HttpUtils.post<ApiResource>(
        `${API_PREFIX}/projects/${projectId}/folders`,
        {
          parentId: parentId ? Number(parentId) : null,
          name: name.trim(),
          description: '',
          sortOrder: 0,
        },
      ),
    );
    return mapFolder(resource);
  },
};
