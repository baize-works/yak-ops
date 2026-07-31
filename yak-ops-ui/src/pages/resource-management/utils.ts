import type { ResourceId, ResourceItem } from './types';

export const ROOT_RESOURCE_ID = 0;

export const EDITABLE_SUFFIXES = new Set([
  'txt',
  'log',
  'sql',
  'json',
  'xml',
  'yaml',
  'yml',
  'conf',
  'properties',
  'sh',
  'py',
  'java',
  'js',
  'ts',
  'tsx',
  'md',
  'csv',
  'hocon',
]);

export const resourceKey = (id?: ResourceId) => String(id ?? '');

export const isDirectory = (resource?: ResourceItem | null) =>
  resource?.nodeType === 'DIRECTORY';

export const isEditableResource = (resource?: ResourceItem | null) => {
  if (!resource || resource.nodeType !== 'FILE') return false;
  return EDITABLE_SUFFIXES.has(String(resource.suffix || '').toLowerCase());
};

export const formatFileSize = (bytes?: number) => {
  const value = Number(bytes || 0);
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  const normalized = value / 1024 ** unitIndex;
  const precision = normalized >= 100 || unitIndex === 0 ? 0 : normalized >= 10 ? 1 : 2;
  return `${normalized.toFixed(precision)} ${units[unitIndex]}`;
};

export const flattenResources = (resources: ResourceItem[]) => {
  const result: ResourceItem[] = [];
  const visit = (items: ResourceItem[]) => {
    items.forEach((item) => {
      result.push(item);
      if (item.children?.length) visit(item.children);
    });
  };
  visit(resources);
  return result;
};

export const findResource = (
  resources: ResourceItem[],
  id: ResourceId,
): ResourceItem | undefined =>
  flattenResources(resources).find((item) => resourceKey(item.id) === resourceKey(id));

export const getResourceBreadcrumbs = (
  resources: ResourceItem[],
  id: ResourceId,
): ResourceItem[] => {
  if (resourceKey(id) === resourceKey(ROOT_RESOURCE_ID)) return [];
  const flattened = flattenResources(resources);
  const byId = new Map(flattened.map((item) => [resourceKey(item.id), item]));
  const breadcrumbs: ResourceItem[] = [];
  const visited = new Set<string>();
  let current = byId.get(resourceKey(id));

  while (current && !visited.has(resourceKey(current.id))) {
    visited.add(resourceKey(current.id));
    breadcrumbs.unshift(current);
    if (resourceKey(current.parentId) === resourceKey(ROOT_RESOURCE_ID)) break;
    current = byId.get(resourceKey(current.parentId));
  }

  return breadcrumbs;
};

export interface DirectoryTreeNode {
  key: string;
  title: string;
  value: ResourceId;
  resource?: ResourceItem;
  children?: DirectoryTreeNode[];
  disabled?: boolean;
  selectable?: boolean;
}

const hasResourceInSubtree = (resource: ResourceItem, targetId: ResourceId) => {
  if (resourceKey(resource.id) === resourceKey(targetId)) return true;
  return Boolean(
    resource.children?.some((child) => hasResourceInSubtree(child, targetId)),
  );
};

export const buildDirectoryTree = (
  resources: ResourceItem[],
  options?: { movingResource?: ResourceItem },
): DirectoryTreeNode[] => {
  const movingResource = options?.movingResource;
  const build = (items: ResourceItem[]): DirectoryTreeNode[] =>
    items
      .filter(isDirectory)
      .map((item) => ({
        key: resourceKey(item.id),
        title: item.name,
        value: item.id,
        resource: item,
        disabled: movingResource
          ? hasResourceInSubtree(movingResource, item.id)
          : false,
        children: build(item.children || []),
      }));

  return [
    {
      key: resourceKey(ROOT_RESOURCE_ID),
      title: '全部资源',
      value: ROOT_RESOURCE_ID,
      children: build(resources),
    },
  ];
};

export const getResourceSummary = (resources: ResourceItem[]) => {
  const flattened = flattenResources(resources);
  return flattened.reduce(
    (summary, item) => {
      if (isDirectory(item)) {
        summary.directories += 1;
      } else {
        summary.files += 1;
        summary.totalBytes += Number(item.fileSize || 0);
      }
      return summary;
    },
    { directories: 0, files: 0, totalBytes: 0 },
  );
};
