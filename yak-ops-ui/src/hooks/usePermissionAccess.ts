import { useModel } from '@umijs/max';
import { useCallback, useMemo } from 'react';

import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  type PermissionCode,
} from '@/utils/security/permission';

/**
 * 当前登录用户的按钮级权限访问器。
 *
 * 与 KnowStreaming 的全局 hasPermission 思路一致，但保留 Umi 初始状态作为
 * 唯一权限来源，并复用可单测的纯函数，避免页面自行读取和解释权限数组。
 */
export const usePermissionAccess = () => {
  const { initialState } = useModel('@@initialState');

  const permissionCodes = useMemo<readonly PermissionCode[]>(
    () => initialState?.currentUser?.permissionCodes ?? [],
    [initialState?.currentUser?.permissionCodes],
  );

  const can = useCallback(
    (permission: PermissionCode) =>
      hasPermission(permissionCodes, permission),
    [permissionCodes],
  );

  const canAny = useCallback(
    (permissions: readonly PermissionCode[]) =>
      hasAnyPermission(permissionCodes, permissions),
    [permissionCodes],
  );

  const canAll = useCallback(
    (permissions: readonly PermissionCode[]) =>
      hasAllPermissions(permissionCodes, permissions),
    [permissionCodes],
  );

  return {
    permissionCodes,
    can,
    canAny,
    canAll,
  };
};

export default usePermissionAccess;
