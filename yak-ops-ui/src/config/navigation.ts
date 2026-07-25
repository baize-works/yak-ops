export type NavigationIconKey =
  | 'home'
  | 'database'
  | 'sync'
  | 'client'
  | 'workflow'
  | 'quality'
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

const sortByOrder = <T extends { order?: number }>(left: T, right: T) =>
  (left.order ?? 0) - (right.order ?? 0);

/**
 * 尚未包含页面的分组不会展示。
 * 后续只需增加对应路由，菜单分组便会自动出现。
 */
export const navigationGroups: readonly NavigationGroup[] = [
  {
    id: 'resources',
    title: '资源管理',
    iconKey: 'database',
    order: 10,
  },
  {
    id: 'integration',
    title: '数据集成',
    iconKey: 'sync',
    order: 20,
  },
  {
    id: 'workflow',
    title: '流程编排',
    iconKey: 'workflow',
    order: 30,
  },
  {
    id: 'quality',
    title: '数据质量',
    iconKey: 'quality',
    order: 40,
  },
  {
    id: 'operations',
    title: '运维中心',
    iconKey: 'monitor',
    order: 50,
  },
];

/**
 * 路由、菜单和快速创建共用一份元数据。
 *
 * 没有 menuGroup 且未隐藏的路由，会作为一级独立菜单展示，
 * 例如首页。
 */
export const appRoutes: readonly NavigationRoute[] = [
  {
    id: 'home',
    path: '/home',
    title: '首页',
    component: './home',
    iconKey: 'home',
    order: 0,
  },

  // 资源管理
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

  // 数据集成
  {
    id: 'batch-link-up',
    path: '/sync/batch-link-up',
    title: '离线同步',
    component: './batch-link-up',
    iconKey: 'sync',
    menuGroup: 'integration',
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

  // 流程编排
  {
    id: 'workflow-management',
    path: '/workflow-management',
    title: '流程管理',
    component: './workflow-management',
    iconKey: 'workflow',
    menuGroup: 'workflow',
    order: 10,
  },

  // 数据质量
  {
    id: 'data-quality',
    path: '/data-quality',
    title: '质量管理',
    component: './data-quality',
    iconKey: 'quality',
    menuGroup: 'quality',
    order: 10,
  },

  // 运维中心
  {
    id: 'metrics',
    path: '/metrics',
    title: '运行监控',
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

  // 非主菜单页面
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

const routeMap = new Map(appRoutes.map((route) => [route.id, route]));

const normalizePath = (path: string) =>
  path.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';

const matchesRoute = (pattern: string, pathname: string) => {
  const patternParts = normalizePath(pattern).split('/').filter(Boolean);
  const pathParts = normalizePath(pathname).split('/').filter(Boolean);

  return (
    patternParts.length === pathParts.length &&
    patternParts.every(
      (part, index) => part.startsWith(':') || part === pathParts[index],
    )
  );
};

export const getRouteMetadata = (pathname: string) =>
  appRoutes.find((route) => matchesRoute(route.path, pathname));

export const getActiveNavigationId = (pathname: string) => {
  const route = getRouteMetadata(pathname);
  return route?.parentId ?? route?.id;
};

export const getActiveNavigationGroupId = (pathname: string) => {
  const activeId = getActiveNavigationId(pathname);
  return activeId ? routeMap.get(activeId)?.menuGroup : undefined;
};

/**
 * 首页等独立一级菜单。
 */
export const getStandaloneNavigationRoutes = () =>
  appRoutes
    .filter((route) => !route.hidden && !route.menuGroup)
    .sort(sortByOrder);

/**
 * 分组菜单。
 */
export const getMainNavigationGroups = (): NavigationGroupWithRoutes[] =>
  [...navigationGroups]
    .sort(sortByOrder)
    .map((group) => ({
      ...group,
      routes: appRoutes
        .filter((route) => !route.hidden && route.menuGroup === group.id)
        .sort(sortByOrder),
    }))
    .filter((group) => group.routes.length);

/**
 * 快速创建下拉菜单。
 */
export const getQuickCreateRoutes = () =>
  appRoutes
    .filter((route) => Boolean(route.quickCreateLabel))
    .sort(sortByOrder);
