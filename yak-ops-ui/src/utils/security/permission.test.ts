import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  satisfiesPermissionRequirement,
} from './permission';

describe('permission helpers', () => {
  const granted = ['task:read', 'task:create'];

  it('checks one, any, and all modes', () => {
    expect(hasPermission(granted, 'task:read')).toBe(true);
    expect(hasPermission(granted, 'task:delete')).toBe(false);
    expect(hasAnyPermission(granted, ['task:delete', 'task:create'])).toBe(true);
    expect(hasAllPermissions(granted, ['task:read', 'task:create'])).toBe(true);
    expect(satisfiesPermissionRequirement(granted, { mode: 'one', permission: 'task:read' })).toBe(true);
    expect(satisfiesPermissionRequirement(granted, { mode: 'any', permissions: ['missing', 'task:create'] })).toBe(true);
    expect(satisfiesPermissionRequirement(granted, { mode: 'all', permissions: ['task:read', 'task:create'] })).toBe(true);
  });

  it('uses fail-closed empty-set semantics while public remains public', () => {
    expect(hasAnyPermission(granted, [])).toBe(false);
    expect(hasAllPermissions(granted, [])).toBe(true);
    expect(satisfiesPermissionRequirement([], { mode: 'one', permission: 'task:read' })).toBe(false);
    expect(satisfiesPermissionRequirement([], { mode: 'any', permissions: [] })).toBe(false);
    expect(satisfiesPermissionRequirement([], { mode: 'all', permissions: [] })).toBe(true);
    expect(satisfiesPermissionRequirement(undefined, { mode: 'public' })).toBe(true);
  });
});
