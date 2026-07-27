import { permissionTreeNodes, retainMatchedAncestors } from './tree';
import type { PermissionVO } from '@/services/security/permissions';

const tree: PermissionVO[] = [
  {
    id: 1,
    name: '系统',
    code: 'system',
    type: 'MENU',
    children: [{ id: '2', name: '查看权限', code: 'system:permission:read', type: 'API' }],
  },
];

test('search result keeps its ancestor chain and supports mixed id types', () => {
  expect(retainMatchedAncestors(tree, [tree[0].children![0]])).toEqual(tree);
  expect(permissionTreeNodes(tree)[0].children?.[0].searchText).toContain('system:permission:read');
});

test('cycle-like duplicate node in a path is ignored', () => {
  const cyclic: any = { id: 1, name: 'A', code: 'a', type: 'MENU', children: [] };
  cyclic.children.push(cyclic);
  expect(permissionTreeNodes([cyclic])[0].children).toEqual([]);
});
