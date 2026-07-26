import { toCurrentUser } from './currentIdentity';

describe('current identity normalization', () => {
  it('fails closed when optional authorization context is absent', () => {
    expect(toCurrentUser({ id: 7, userName: 'yak' })).toMatchObject({
      id: 7,
      userName: 'yak',
      name: 'yak',
      userid: '7',
      deptId: null,
      roleList: [],
      permissionCodes: [],
      projectList: [],
    });
  });

  it('uses only values supplied by the current-account response', () => {
    const user = toCurrentUser({
      id: 8,
      userName: 'operator',
      realName: ' Yak Operator ',
      deptId: 12,
      roleList: [{ id: 2, roleName: 'operator' }],
      permissionCodes: ['task:read'],
      projectList: [{ id: 3, projectCode: 'SEC', projectName: 'Security' }],
    });

    expect(user).toMatchObject({
      name: 'Yak Operator',
      deptId: 12,
      permissionCodes: ['task:read'],
      projectList: [{ id: 3, projectCode: 'SEC' }],
    });
  });
});
