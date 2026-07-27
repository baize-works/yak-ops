import { departmentTreeNodes } from './tree';

test('department nodes are searchable by name and optional code', () => {
  const nodes = departmentTreeNodes([{ id: '10', name: '研发部', code: 'RD' }]);
  expect(nodes[0]).toMatchObject({ key: '10', searchText: '研发部 RD' });
});

test('empty department tree stays empty', () => expect(departmentTreeNodes([])).toEqual([]));
