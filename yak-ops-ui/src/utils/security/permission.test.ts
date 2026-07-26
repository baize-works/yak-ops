import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  satisfiesPermissionRequirement,
} from './permission';

describe('permission helpers', () => {
  const granted = ['task:read', 'task:create'];

  it('checks a single permission', () => {
    expect(hasPermission(granted, 'task:read')).toBe(true);
    expect(hasPermission(granted, 'task:delete')).toBe(false);
  });

  it('checks any and all permissions with explicit empty-set semantics', () => {
    expect(hasAnyPermission(granted, ['task:delete', 'task:create'])).toBe(true);
    expect(hasAnyPermission(granted, [])).toBe(false);
    expect(hasAllPermissions(granted, ['task:read', 'task:create'])).toBe(true);
    expect(hasAllPermissions(granted, [])).toBe(true);
  });

  it('combines configured requirement types with AND', () => {
    expect(
      satisfiesPermissionRequirement(granted, {
        permission: 'task:read',
        anyPermissions: ['task:create', 'task:delete'],
        allPermissions: ['task:read', 'task:create'],
      }),
    ).toBe(true);
    expect(
      satisfiesPermissionRequirement(granted, {
        permission: 'task:read',
        anyPermissions: [],
      }),
    ).toBe(false);
  });
});
