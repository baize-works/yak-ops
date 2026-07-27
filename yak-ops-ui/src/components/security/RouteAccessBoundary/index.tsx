import { useLocation, useModel } from '@umijs/max';
import type { ReactNode } from 'react';
import { canAccessNavigationRoute, getRouteMetadata, type NavigationRoute } from '@/config/navigation';
import ForbiddenPage from '@/pages/403';

export interface RouteAccessBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  route?: NavigationRoute;
  /** Primarily useful for isolated components and tests. */
  permissionCodes?: readonly string[];
}

const defaultFallback = <ForbiddenPage />;

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
  // A failed identity request is not evidence of missing permission. The app
  // keeps the URL in that case and lets its existing retry/error UI take over.
  const identityPending = !initialState?.currentUser && initialState?.currentUserLoadError;
  const allowed = identityPending || !metadata || canAccessNavigationRoute(metadata, granted);

  return <>{allowed ? children : fallback}</>;
}
