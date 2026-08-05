import {
  buildProjectFolderPaths,
  type ProjectFolder,
} from './project-folder.repository';

const folder = (
  id: string,
  name: string,
  parentId: string | null,
  sortOrder = 0,
): ProjectFolder => ({
  id,
  projectId: '1',
  parentId,
  name,
  sortOrder,
  updatedBy: 'tester',
  createdAt: '2026-08-05T00:00:00',
  updatedAt: '2026-08-05T00:00:00',
});

describe('buildProjectFolderPaths', () => {
  it('builds selectable paths for nested folders', () => {
    const paths = buildProjectFolderPaths([
      folder('2', '明细', '1'),
      folder('1', '订单', null),
    ]);

    expect(paths.map((item) => [item.id, item.path])).toEqual([
      ['1', '/订单'],
      ['2', '/订单/明细'],
    ]);
  });
});
