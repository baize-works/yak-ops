export type PermissionCode = string;

export type PermissionRequirement =
  | { mode: 'public' }
  | { mode: 'one'; permission: PermissionCode }
  | { mode: 'any'; permissions: readonly PermissionCode[] }
  | { mode: 'all'; permissions: readonly PermissionCode[] };

type GrantedPermissions = readonly PermissionCode[] | null | undefined;

const permissionSet = (permissions: GrantedPermissions) => new Set(permissions ?? []);

export const hasPermission = (permissions: GrantedPermissions, permission: PermissionCode): boolean =>
  permission.length > 0 && permissionSet(permissions).has(permission);

export const hasAnyPermission = (
  permissions: GrantedPermissions,
  requiredPermissions: readonly PermissionCode[],
): boolean => {
  if (requiredPermissions.length === 0) return false;

  const granted = permissionSet(permissions);
  return requiredPermissions.some((permission) => granted.has(permission));
};

export const hasAllPermissions = (
  permissions: GrantedPermissions,
  requiredPermissions: readonly PermissionCode[],
): boolean => {
  const granted = permissionSet(permissions);
  return requiredPermissions.every((permission) => granted.has(permission));
};

/**
 * Evaluates every configured constraint. An empty requirement is public; when
 * multiple constraint types are supplied they are combined with AND.
 *
 * This browser-side result only controls presentation and interaction. The API
 * serving the protected operation must independently authorize every request.
 */
export const satisfiesPermissionRequirement = (
  permissions: GrantedPermissions,
  requirement: PermissionRequirement,
): boolean => {
  switch (requirement.mode) {
    case 'public':
      return true;
    case 'one':
      return hasPermission(permissions, requirement.permission);
    case 'any':
      return hasAnyPermission(permissions, requirement.permissions);
    case 'all':
      return hasAllPermissions(permissions, requirement.permissions);
  }
};
