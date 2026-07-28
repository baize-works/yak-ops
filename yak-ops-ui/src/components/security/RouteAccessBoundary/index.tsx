import {
  Outlet,
  useLocation,
  useModel,
} from '@umijs/max';
import type { ReactNode } from 'react';

import {
  canAccessNavigationRoute,
  getRouteMetadata,
  type NavigationRoute,
} from '@/config/navigation';
import ForbiddenPage from '@/pages/403';
import { hasRouteMenuAccess } from '@/utils/security/menu';

export interface RouteAccessBoundaryProps {
  /**
   * 手动包装组件时传入。
   *
   * 通过 Umi wrappers 使用时通常没有 children，
   * 此时使用 Outlet 渲染内部路由。
   */
  children?: ReactNode;
  fallback?: ReactNode;
  route?: NavigationRoute;

  /**
   * 主要用于独立组件和单元测试。
   */
  permissionCodes?: readonly string[];

  /**
   * 数据库返回的角色菜单编码，主要用于独立组件和单元测试。
   */
  menuCodes?: readonly string[];
}

const defaultFallback = <ForbiddenPage />;

/**
 * 路由权限边界。
 *
 * 同时支持：
 * 1. Umi routes.wrappers；
 * 2. React 组件手动包装。
 */
export default function RouteAccessBoundary({
  children,
  fallback = defaultFallback,
  route,
  permissionCodes,
  menuCodes,
}: RouteAccessBoundaryProps) {
  const location = useLocation();
  const { initialState } = useModel('@@initialState');

  const metadata =
    route ?? getRouteMetadata(location.pathname);

  const granted =
    permissionCodes ??
    initialState?.currentUser?.permissionCodes;
  const grantedMenus =
    menuCodes ?? initialState?.currentUser?.menuCodes;

  /*
   * 当前用户信息加载失败不等于无权限，
   * 保留当前页面，让上层错误处理或重试逻辑接管。
   */
  const identityPending =
    !initialState?.currentUser &&
    initialState?.currentUserLoadError;

  const allowed =
    identityPending ||
    !metadata ||
    (
      canAccessNavigationRoute(
        metadata,
        granted,
      ) &&
      hasRouteMenuAccess(
        grantedMenus,
        metadata,
        granted,
      )
    );

  if (!allowed) {
    return <>{fallback}</>;
  }

  /*
   * Umi wrappers 不一定传递 children，
   * 必须使用 Outlet 渲染被包装的页面路由。
   */
  return <>{children ?? <Outlet />}</>;
}
