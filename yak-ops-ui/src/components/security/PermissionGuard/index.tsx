import { useModel } from '@umijs/max';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { type PermissionRequirement, satisfiesPermissionRequirement } from '@/utils/security/permission';

export type PermissionGuardProps = PermissionRequirement & {
  children: ReactNode;
  fallback?: ReactNode;
  behavior?: 'hide' | 'disable';
  /** Primarily useful for isolated components and tests. */
  permissionCodes?: readonly string[];
};

/**
 * Hides UI that the current user cannot operate. This is not a security
 * boundary: the corresponding backend endpoint must still enforce permission.
 */
export default function PermissionGuard({
  children,
  fallback = null,
  behavior = 'hide',
  permissionCodes,
  ...requirement
}: PermissionGuardProps) {
  const { initialState } = useModel('@@initialState');
  const granted = permissionCodes ?? initialState?.currentUser?.permissionCodes;
  const allowed = satisfiesPermissionRequirement(granted, requirement);

  if (allowed) return <>{children}</>;
  if (behavior === 'hide') return <>{fallback}</>;

  if (isValidElement(children)) {
    return cloneElement(children as ReactElement<Record<string, unknown>>, {
      disabled: true,
      'aria-disabled': true,
    });
  }

  return <span aria-disabled="true">{children}</span>;
}
