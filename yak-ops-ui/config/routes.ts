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
        redirect: '/home',
      },
      ...appRoutes.map(({ path, component, hidden }) => ({
        path,
        component,
        ...(hidden ? { hideInMenu: true, hideInBreadcrumb: true } : {}),
      })),
    ],
  },
  {
    path: '*',
    layout: false,
    component: './404',
  },
];
