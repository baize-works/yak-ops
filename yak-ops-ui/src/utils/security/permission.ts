export type PermissionCode = string;

export interface PermissionRequirement {
  /** A permission that must be present. */
  permission?: PermissionCode;
  /** At least one of these permissions must be present. */
  anyPermissions?: readonly PermissionCode[];
  /** Every one of these permissions must be present. */
  allPermissions?: readonly PermissionCode[];
  /** A compact route-friendly list, evaluated using permissionMode. */
  permissions?: readonly PermissionCode[];
  permissionMode?: 'any' | 'all';
}

type GrantedPermissions = readonly PermissionCode[] | null | undefined;

const permissionSet = (permissions: GrantedPermissions) =>
  new Set(permissions ?? []);

export const hasPermission = (
  permissions: GrantedPermissions,
  permission: PermissionCode,
): boolean => permission.length > 0 && permissionSet(permissions).has(permission);

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
): boolean =>
  (!requirement.permission ||
    hasPermission(permissions, requirement.permission)) &&
  (!requirement.anyPermissions ||
    hasAnyPermission(permissions, requirement.anyPermissions)) &&
  (!requirement.allPermissions ||
    hasAllPermissions(permissions, requirement.allPermissions)) &&
  (!requirement.permissions ||
    (requirement.permissionMode === 'all'
      ? hasAllPermissions(permissions, requirement.permissions)
      : hasAnyPermission(permissions, requirement.permissions)));
