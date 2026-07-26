import {
  hasAllPermissions as checkAllPermissions,
  hasAnyPermission as checkAnyPermission,
  hasPermission as checkPermission,
} from '@/utils/security/permission';

/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  const permissionCodes = currentUser?.permissionCodes ?? [];
  return {
    canAdmin: Boolean(currentUser && currentUser.access === 'admin'),
    hasPermission: (permission: string) =>
      checkPermission(permissionCodes, permission),
    hasAnyPermission: (permissions: readonly string[]) =>
      checkAnyPermission(permissionCodes, permissions),
    hasAllPermissions: (permissions: readonly string[]) =>
      checkAllPermissions(permissionCodes, permissions),
  };
}

export {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from '@/utils/security/permission';
