export type NavigationIconKey =
  | 'home'
  | 'database'
  | 'sync'
  | 'realtime'
  | 'client'
  | 'connector'
  | 'workflow'
  | 'project'
  | 'instance'
  | 'quality'
  | 'report'
  | 'monitor'
  | 'alarm'
  | 'knowledge'
  | 'api'
  | 'insight';

/**
 * 主菜单业务区域：
 *
 * task：任务创建、数据同步和流程编排；
 * management：资源、质量及运行管理。
 */
export type NavigationSectionKey = 'task' | 'management';

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
  section: NavigationSectionKey;
  order: number;
}

export interface NavigationGroupWithRoutes extends NavigationGroup {
  routes: NavigationRoute[];
}

const sortByOrder = <T extends { order?: number }>(
  left: T,
  right: T,
) => (left.order ?? 0) - (right.order ?? 0);

/**
 * 主菜单顺序：
 *
 * 首页
 * ────────────────
 * 数据集成
 * 流程编排
 * ────────────────
 * 资源管理
 * 数据质量
 * 运维中心
 *
 * 尚未包含页面的分组不会展示。
 * 后续只需增加对应路由，菜单分组便会自动出现。
 */
export const navigationGroups: readonly NavigationGroup[] = [
  {
    id: 'integration',
    title: '数据集成',
    iconKey: 'sync',
    section: 'task',
    order: 10,
  },
  {
    id: 'workflow',
    title: '流程编排',
    iconKey: 'workflow',
    section: 'task',
    order: 20,
  },
  {
    id: 'resources',
    title: '资源管理',
    iconKey: 'database',
    section: 'management',
    order: 30,
  },
  {
    id: 'quality',
    title: '数据质量',
    iconKey: 'quality',
    section: 'management',
    order: 40,
  },
  {
    id: 'operations',
    title: '运维中心',
    iconKey: 'monitor',
    section: 'management',
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

  // ---------------------------------------------------------------------------
  // 数据集成
  // ---------------------------------------------------------------------------

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
    title: '离线同步详情',
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
    id: 'realtime-link-up',
    path: '/sync/realtime-link-up',
    title: '实时同步',
    component: './realtime-link-up',
    iconKey: 'realtime',
    menuGroup: 'integration',
    order: 20,
    quickCreateLabel: '新建实时同步',
  },
  {
    id: 'realtime-link-up-detail',
    path: '/sync/realtime-link-up/:id/detail',
    title: '实时同步详情',
    component: './realtime-link-up/detail',
    hidden: true,
    parentId: 'realtime-link-up',
  },
  {
    id: 'realtime-link-up-config',
    path: '/sync/realtime-link-up/:id/config',
    title: '实时同步配置',
    component: './realtime-link-up/config',
    hidden: true,
    parentId: 'realtime-link-up',
  },

  // ---------------------------------------------------------------------------
  // 流程编排
  // ---------------------------------------------------------------------------

  {
    id: 'workflow-project',
    path: '/workflow-project',
    title: '项目管理',
    component: './workflow-project',
    iconKey: 'project',
    menuGroup: 'workflow',
    order: 10,
  },
  {
    id: 'workflow-project-detail',
    path: '/workflow-project/:id/detail',
    title: '项目详情',
    component: './workflow-project/detail',
    hidden: true,
    parentId: 'workflow-project',
  },

  {
    id: 'workflow-management',
    path: '/workflow-management',
    title: '工作流管理',
    component: './workflow-management',
    iconKey: 'workflow',
    menuGroup: 'workflow',
    order: 20,
    quickCreateLabel: '新建工作流',
  },
  {
    id: 'workflow-designer',
    path: '/workflow-management/:id/designer',
    title: '工作流设计',
    component: './workflow-management/designer',
    hidden: true,
    parentId: 'workflow-management',
  },
  {
    id: 'workflow-detail',
    path: '/workflow-management/:id/detail',
    title: '工作流详情',
    component: './workflow-management/detail',
    hidden: true,
    parentId: 'workflow-management',
  },

  {
    id: 'workflow-instance',
    path: '/workflow-instance',
    title: '工作流实例',
    component: './workflow-instance',
    iconKey: 'instance',
    menuGroup: 'workflow',
    order: 30,
  },
  {
    id: 'workflow-instance-detail',
    path: '/workflow-instance/:id/detail',
    title: '工作流实例详情',
    component: './workflow-instance/detail',
    hidden: true,
    parentId: 'workflow-instance',
  },

  // ---------------------------------------------------------------------------
  // 资源管理
  // ---------------------------------------------------------------------------

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
    id: 'data-source-detail',
    path: '/data-source/:id/detail',
    title: '数据源详情',
    component: './data-source/detail',
    hidden: true,
    parentId: 'data-source',
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
    id: 'client-detail',
    path: '/client/:id/detail',
    title: '客户端详情',
    component: './client/detail',
    hidden: true,
    parentId: 'client',
  },

  {
    id: 'connector',
    path: '/connector',
    title: '连接器管理',
    component: './connector',
    iconKey: 'connector',
    menuGroup: 'resources',
    order: 30,
  },
  {
    id: 'connector-detail',
    path: '/connector/:id/detail',
    title: '连接器详情',
    component: './connector/detail',
    hidden: true,
    parentId: 'connector',
  },

  // ---------------------------------------------------------------------------
  // 数据质量
  // ---------------------------------------------------------------------------

  {
    id: 'data-quality',
    path: '/data-quality',
    title: '质量规则',
    component: './data-quality',
    iconKey: 'quality',
    menuGroup: 'quality',
    order: 10,
  },
  {
    id: 'data-quality-detail',
    path: '/data-quality/:id/detail',
    title: '质量规则详情',
    component: './data-quality/detail',
    hidden: true,
    parentId: 'data-quality',
  },

  {
    id: 'data-quality-report',
    path: '/data-quality/report',
    title: '质量报告',
    component: './data-quality/report',
    iconKey: 'report',
    menuGroup: 'quality',
    order: 20,
  },
  {
    id: 'data-quality-report-detail',
    path: '/data-quality/report/:id/detail',
    title: '质量报告详情',
    component: './data-quality/report/detail',
    hidden: true,
    parentId: 'data-quality-report',
  },

  // ---------------------------------------------------------------------------
  // 运维中心
  // ---------------------------------------------------------------------------

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
    id: 'metrics-detail',
    path: '/metrics/:id/detail',
    title: '运行详情',
    component: './metrics/detail',
    hidden: true,
    parentId: 'metrics',
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

  // ---------------------------------------------------------------------------
  // 非主菜单页面
  // ---------------------------------------------------------------------------

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

const routeMap = new Map(
  appRoutes.map((route) => [route.id, route]),
);

const normalizePath = (path: string) =>
  path.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';

const matchesRoute = (
  pattern: string,
  pathname: string,
) => {
  const patternParts = normalizePath(pattern)
    .split('/')
    .filter(Boolean);

  const pathParts = normalizePath(pathname)
    .split('/')
    .filter(Boolean);

  return (
    patternParts.length === pathParts.length &&
    patternParts.every(
      (part, index) =>
        part.startsWith(':') ||
        part === pathParts[index],
    )
  );
};

export const getRouteMetadata = (
  pathname: string,
) =>
  appRoutes.find((route) =>
    matchesRoute(route.path, pathname),
  );

export const getActiveNavigationId = (
  pathname: string,
) => {
  const route = getRouteMetadata(pathname);

  return route?.parentId ?? route?.id;
};

export const getActiveNavigationGroupId = (
  pathname: string,
) => {
  const activeId = getActiveNavigationId(pathname);

  return activeId
    ? routeMap.get(activeId)?.menuGroup
    : undefined;
};

/**
 * 首页等独立一级菜单。
 */
export const getStandaloneNavigationRoutes = () =>
  appRoutes
    .filter(
      (route) =>
        !route.hidden &&
        !route.menuGroup,
    )
    .sort(sortByOrder);

/**
 * 分组菜单。
 */
export const getMainNavigationGroups =
  (): NavigationGroupWithRoutes[] =>
    [...navigationGroups]
      .sort(sortByOrder)
      .map((group) => ({
        ...group,
        routes: appRoutes
          .filter(
            (route) =>
              !route.hidden &&
              route.menuGroup === group.id,
          )
          .sort(sortByOrder),
      }))
      .filter(
        (group) =>
          group.routes.length > 0,
      );

/**
 * 快速创建下拉菜单。
 */
export const getQuickCreateRoutes = () =>
  appRoutes
    .filter(
      (route) =>
        Boolean(route.quickCreateLabel),
    )
    .sort(sortByOrder);