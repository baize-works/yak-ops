import { getRouteMetadata, canAccessNavigationRoute, type NavigationRoute } from '@/config/navigation';
import { Result } from 'antd';
import { useLocation, useModel } from '@umijs/max';
import type { ReactNode } from 'react';

export interface RouteAccessBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  route?: NavigationRoute;
  /** Primarily useful for isolated components and tests. */
  permissionCodes?: readonly string[];
}

const defaultFallback = (
  <Result
    status="403"
    title="403"
    subTitle="抱歉，您没有权限访问此页面。"
  />
);

/**
 * Blocks rendering for inaccessible route metadata. It complements, but never
 * replaces, authorization checks on every backend API endpoint.
 */
export default function RouteAccessBoundary({
  children,
  fallback = defaultFallback,
  route,
  permissionCodes,
}: RouteAccessBoundaryProps) {
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const metadata = route ?? getRouteMetadata(location.pathname);
  const granted = permissionCodes ?? initialState?.currentUser?.permissionCodes;
  const allowed = !metadata || canAccessNavigationRoute(metadata, granted);

  return <>{allowed ? children : fallback}</>;
}
