import {
  hasAllPermissions as checkAllPermissions,
  hasAnyPermission as checkAnyPermission,
  hasPermission as checkPermission,
} from '@/utils/security/permission';

/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(initialState: { currentUser?: API.CurrentUser } | undefined) {
  const { currentUser } = initialState ?? {};
  const permissionCodes = currentUser?.permissionCodes ?? [];
  return {
    // Compatibility alias for legacy Umi routes. Security decisions below only
    // consume permissionCodes and must never infer authority from access/role.
    canAdmin: checkPermission(permissionCodes, 'admin'),
    isAuthenticated: Boolean(currentUser),
    hasPermission: (permission: string) => checkPermission(permissionCodes, permission),
    hasAnyPermission: (permissions: readonly string[]) => checkAnyPermission(permissionCodes, permissions),
    hasAllPermissions: (permissions: readonly string[]) => checkAllPermissions(permissionCodes, permissions),
  };
}

export {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from '@/utils/security/permission';
