import type { PermissionTreeNode } from '@/services/security/roles';

import { collectCapabilityCheckedKeys } from './RoleCapabilityTree';

const tree = (
  menuHas: boolean,
  actionHas: boolean,
): PermissionTreeNode => ({
  id: 0,
  nodeType: 'ROOT',
  childList: [
    {
      id: -1,
      permissionName: '菜单与操作权限',
      nodeType: 'MENU_GROUP',
      childList: [
        {
          id: -11,
          permissionName: '用户管理',
          nodeType: 'MENU',
          has: menuHas,
          active: true,
          childList: [
            {
              id: 101,
              permissionName: '新增用户',
              permissionCode: 'security:user:create',
              nodeType: 'ACTION',
              menuCode: 'system-users',
              has: actionHas,
              active: true,
            },
          ],
        },
      ],
    },
  ],
});

describe('RoleCapabilityTree', () => {
  it('adds the containing menu when an action is selected', () => {
    expect(collectCapabilityCheckedKeys(tree(false, true)))
      .toEqual(expect.arrayContaining([-11, 101]));
  });

  it('does not grant actions when only the menu is selected', () => {
    const keys = collectCapabilityCheckedKeys(tree(true, false));

    expect(keys).toContain(-11);
    expect(keys).not.toContain(101);
  });
});
