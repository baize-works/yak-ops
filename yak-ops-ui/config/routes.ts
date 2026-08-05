import { appRoutes } from '../src/config/navigation';

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
        redirect: '/data-source',
      },
      ...appRoutes.map(({ path, component, hidden }) => ({
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
