import { useModel } from '@umijs/max';
import type { ReactNode } from 'react';
import {
  satisfiesPermissionRequirement,
  type PermissionRequirement,
} from '@/utils/security/permission';

export interface PermissionGuardProps extends PermissionRequirement {
  children: ReactNode;
  fallback?: ReactNode;
  /** Primarily useful for isolated components and tests. */
  permissionCodes?: readonly string[];
}

/**
 * Hides UI that the current user cannot operate. This is not a security
 * boundary: the corresponding backend endpoint must still enforce permission.
 */
export default function PermissionGuard({
  children,
  fallback = null,
  permissionCodes,
  permission,
  anyPermissions,
  allPermissions,
  permissions,
  permissionMode,
}: PermissionGuardProps) {
  const { initialState } = useModel('@@initialState');
  const granted = permissionCodes ?? initialState?.currentUser?.permissionCodes;
  const allowed = satisfiesPermissionRequirement(granted, {
    permission,
    anyPermissions,
    allPermissions,
    permissions,
    permissionMode,
  });

  return <>{allowed ? children : fallback}</>;
}
