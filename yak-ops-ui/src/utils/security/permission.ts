export type PermissionCode = string;

export type PermissionRequirement =
  | { mode: 'public' }
  | { mode: 'one'; permission: PermissionCode }
  | { mode: 'any'; permissions: readonly PermissionCode[] }
  | { mode: 'all'; permissions: readonly PermissionCode[] };

type GrantedPermissions =
  | readonly PermissionCode[]
  | null
  | undefined;

/**
 * Yak Security 超级管理员权限。
 */
const ROOT_PERMISSION = 'security:root';

const permissionSet = (
  permissions: GrantedPermissions,
) => new Set(permissions ?? []);

const isRoot = (
  permissions: GrantedPermissions,
): boolean =>
  permissionSet(permissions).has(ROOT_PERMISSION);

export const hasPermission = (
  permissions: GrantedPermissions,
  permission: PermissionCode,
): boolean => {
  if (isRoot(permissions)) {
    return true;
  }

  return (
    permission.length > 0 &&
    permissionSet(permissions).has(permission)
  );
};

export const hasAnyPermission = (
  permissions: GrantedPermissions,
  requiredPermissions: readonly PermissionCode[],
): boolean => {
  if (requiredPermissions.length === 0) {
    return false;
  }

  if (isRoot(permissions)) {
    return true;
  }

  const granted = permissionSet(permissions);

  return requiredPermissions.some((permission) =>
    granted.has(permission),
  );
};

export const hasAllPermissions = (
  permissions: GrantedPermissions,
  requiredPermissions: readonly PermissionCode[],
): boolean => {
  if (isRoot(permissions)) {
    return true;
  }

  const granted = permissionSet(permissions);

  return requiredPermissions.every((permission) =>
    granted.has(permission),
  );
};

export const satisfiesPermissionRequirement = (
  permissions: GrantedPermissions,
  requirement: PermissionRequirement,
): boolean => {
  switch (requirement.mode) {
    case 'public':
      return true;

    case 'one':
      return hasPermission(
        permissions,
        requirement.permission,
      );

    case 'any':
      return hasAnyPermission(
        permissions,
        requirement.permissions,
      );

    case 'all':
      return hasAllPermissions(
        permissions,
        requirement.permissions,
      );
  }
};