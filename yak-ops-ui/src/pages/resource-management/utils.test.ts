import type { ResourceItem } from './types';
import {
  buildDirectoryTree,
  formatFileSize,
  getResourceBreadcrumbs,
  getResourceSummary,
  isEditableResource,
} from './utils';

const tree: ResourceItem[] = [
  {
    id: 1,
    parentId: 0,
    name: 'scripts',
    fullPath: '/scripts',
    nodeType: 'DIRECTORY',
    storageType: 'MINIO',
    children: [
      {
        id: 2,
        parentId: 1,
        name: 'daily',
        fullPath: '/scripts/daily',
        nodeType: 'DIRECTORY',
        storageType: 'MINIO',
        children: [
          {
            id: 3,
            parentId: 2,
            name: 'sync.sql',
            fullPath: '/scripts/daily/sync.sql',
            nodeType: 'FILE',
            storageType: 'MINIO',
            suffix: 'sql',
            fileSize: 2048,
          },
        ],
      },
    ],
  },
];

describe('resource management utils', () => {
  it('formats resource file sizes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1.00 KB');
    expect(formatFileSize(10 * 1024)).toBe('10.0 KB');
  });

  it('builds directory breadcrumbs', () => {
    expect(getResourceBreadcrumbs(tree, 2).map((item) => item.name)).toEqual([
      'scripts',
      'daily',
    ]);
  });

  it('matches the backend editable suffix allowlist', () => {
    expect(isEditableResource(tree[0].children?.[0].children?.[0])).toBe(true);
    expect(
      isEditableResource({
        ...tree[0].children?.[0].children?.[0],
        id: 4,
        name: 'archive.zip',
        suffix: 'zip',
      } as ResourceItem),
    ).toBe(false);
  });

  it('summarizes directories, files and capacity', () => {
    expect(getResourceSummary(tree)).toEqual({
      directories: 2,
      files: 1,
      totalBytes: 2048,
    });
  });

  it('disables a moving directory and its descendants', () => {
    const directories = buildDirectoryTree(tree, { movingResource: tree[0] });
    expect(directories[0].disabled).toBeFalsy();
    expect(directories[0].children?.[0].disabled).toBe(true);
    expect(directories[0].children?.[0].children?.[0].disabled).toBe(true);
  });
});
