import { appRoutes } from '../src/config/navigation';

const applicationRoutes = appRoutes.filter(
  ({ id }) => id !== 'workflow-designer',
);

const protectedHiddenRoute = (path: string, component: string) => ({
  path,
  component,
  access: 'isAuthenticated',
  wrappers: ['@/components/security/WorkflowDefinitionRouteBoundary'],
  hideInMenu: true,
  hideInBreadcrumb: true,
});

/**
 * 站内页面统一使用自定义 SiteLayout。
 * 登录页和异常页保持独立，不进入后台导航框架。
 */
export default [
  {
    name: 'Login',
    path: '/login',
    component: './login',
    layout: false,
    hideInMenu: true,
  },
  {
    path: '/',
    layout: false,
    component: '@/layouts/SiteLayout',
    routes: [
      {
        path: '/',
        redirect: '/home',
      },
      {
        path: '/data-development/platform',
        component: './data-development/platform',
        access: 'isAuthenticated',
        wrappers: ['@/components/security/RouteAccessBoundary'],
        hideInMenu: true,
        hideInBreadcrumb: true,
      },
      protectedHiddenRoute(
        '/workflow-management/v1/:id/designer',
        './workflow-management/designer',
      ),
      protectedHiddenRoute(
        '/workflow-management/v2/:id/designer',
        './workflow-management/designer-v2',
      ),
      protectedHiddenRoute(
        '/workflow-management/:id/designer',
        './workflow-management/designer-router',
      ),
      ...applicationRoutes.map(({ path, component, hidden }) => ({
        path,
        component,
        access: 'isAuthenticated',
        wrappers: ['@/components/security/RouteAccessBoundary'],
        ...(hidden ? { hideInMenu: true, hideInBreadcrumb: true } : {}),
      })),
    ],
  },
  {
    path: '/403',
    component: './403',
    layout: false,
    hideInMenu: true,
  },
  {
    path: '*',
    layout: false,
    component: './404',
  },
];
