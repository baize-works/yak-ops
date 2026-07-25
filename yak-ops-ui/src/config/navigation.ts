export type NavigationIconKey =
  | 'database'
  | 'sync'
  | 'client'
  | 'monitor'
  | 'alarm'
  | 'knowledge'
  | 'api'
  | 'insight';

export interface NavigationRoute {
  id: string;
  path: string;
  title: string;
  component: string;
  iconKey?: NavigationIconKey;
  menuGroup?: string;
  order?: number;
  hidden?: boolean;
  parentId?: string;
  quickCreateLabel?: string;
}

export interface NavigationGroup {
  id: string;
  title: string;
  iconKey: NavigationIconKey;
  order: number;
}

export interface NavigationGroupWithRoutes extends NavigationGroup {
  routes: NavigationRoute[];
}

export const navigationGroups: readonly NavigationGroup[] = [
  {
    id: 'resources',
    title: '资源管理',
    iconKey: 'database',
    order: 10,
  },
  {
    id: 'sync',
    title: '数据同步',
    iconKey: 'sync',
    order: 20,
  },
  {
    id: 'operations',
    title: '运维中心',
    iconKey: 'monitor',
    order: 30,
  },
];

/**
 * 页面路由与左侧导航共用同一份元数据，避免路由和菜单分别维护。
 */
export const appRoutes: readonly NavigationRoute[] = [
  {
    id: 'data-source',
    path: '/data-source',
    title: '数据源管理',
    component: './data-source',
    iconKey: 'database',
    menuGroup: 'resources',
    order: 10,
  },
  {
    id: 'client',
    path: '/client',
    title: '客户端管理',
    component: './client',
    iconKey: 'client',
    menuGroup: 'resources',
    order: 20,
  },
  {
    id: 'batch-link-up',
    path: '/sync/batch-link-up',
    title: '离线同步',
    component: './batch-link-up',
    iconKey: 'sync',
    menuGroup: 'sync',
    order: 10,
    quickCreateLabel: '新建离线同步',
  },
  {
    id: 'batch-link-up-detail',
    path: '/sync/batch-link-up/:id/detail',
    title: '同步任务详情',
    component: './batch-link-up/detail',
    hidden: true,
    parentId: 'batch-link-up',
  },
  {
    id: 'batch-link-up-single',
    path: '/sync/batch-link-up/:id/config/single',
    title: '单表同步配置',
    component: './batch-link-up/config/single',
    hidden: true,
    parentId: 'batch-link-up',
  },
  {
    id: 'batch-link-up-multi',
    path: '/sync/batch-link-up/:id/config/multi',
    title: '多表同步配置',
    component: './batch-link-up/config/multi',
    hidden: true,
    parentId: 'batch-link-up',
  },
  {
    id: 'batch-link-up-script',
    path: '/sync/batch-link-up/:id/config/script',
    title: '脚本同步配置',
    component: './batch-link-up/config/script',
    hidden: true,
    parentId: 'batch-link-up',
  },
  {
    id: 'metrics',
    path: '/metrics',
    title: '监控指标',
    component: './metrics',
    iconKey: 'monitor',
    menuGroup: 'operations',
    order: 10,
  },
  {
    id: 'alarm',
    path: '/alarm',
    title: '告警管理',
    component: './alarm',
    iconKey: 'alarm',
    menuGroup: 'operations',
    order: 20,
  },
  {
    id: 'knowledge-management',
    path: '/knowledge-management',
    title: '知识管理',
    component: './knowledge-management',
    iconKey: 'knowledge',
    hidden: true,
  },
  {
    id: 'open-api',
    path: '/open-api',
    title: 'Open API',
    component: './open-api',
    iconKey: 'api',
    hidden: true,
  },
  {
    id: 'bi',
    path: '/bi',
    title: '数据洞察',
    component: './bi',
    iconKey: 'insight',
    hidden: true,
  },
];

const normalizePath = (path: string) => {
  const pathname = path.split(/[?#]/, 1)[0].replace(/\/+$/, '');
  return pathname || '/';
};

const matchesRoute = (pattern: string, pathname: string) => {
  const patternSegments = normalizePath(pattern).split('/').filter(Boolean);
  const pathSegments = normalizePath(pathname).split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return false;
  }

  return patternSegments.every((segment, index) => {
    return segment.startsWith(':') || segment === pathSegments[index];
  });
};

export const getRouteMetadata = (pathname: string) => {
  return appRoutes.find((route) => matchesRoute(route.path, pathname));
};

export const getActiveNavigationId = (pathname: string) => {
  const route = getRouteMetadata(pathname);
  return route?.parentId ?? route?.id;
};

export const getActiveNavigationGroupId = (pathname: string) => {
  const activeId = getActiveNavigationId(pathname);
  return appRoutes.find((route) => route.id === activeId)?.menuGroup;
};

export const getMainNavigationGroups = (): NavigationGroupWithRoutes[] => {
  return [...navigationGroups]
    .sort((left, right) => left.order - right.order)
    .map((group) => ({
      ...group,
      routes: appRoutes
        .filter((route) => !route.hidden && route.menuGroup === group.id)
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    }))
    .filter((group) => group.routes.length > 0);
};

export const getQuickCreateRoutes = () => {
  return appRoutes.filter((route) => Boolean(route.quickCreateLabel));
};
