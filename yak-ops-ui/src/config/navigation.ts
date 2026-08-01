import {
  type PermissionRequirement,
  satisfiesPermissionRequirement,
} from '../utils/security/permission';

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
  | 'insight'
  | 'system';

/**
 * 主菜单业务区域：
 *
 * task：任务创建、数据同步、数据开发和流程编排；
 * management：资源、质量及运行管理；
 * system：系统与权限管理。
 */
export type NavigationSectionKey = 'task' | 'management' | 'system';

interface NavigationRouteBase {
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
  quickCreateRequirement?: PermissionRequirement;
}

/**
 * A route is either explicitly public, explicitly protected, or a child that
 * inherits its parent route's requirement. There is deliberately no implicit
 * default for new root routes, so migrations cannot accidentally expose them.
 */
export type NavigationRoute = NavigationRouteBase &
  (PermissionRequirement | { parentId: string; mode?: never });

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

const sortByOrder = <T extends { order?: number }>(left: T, right: T) =>
  (left.order ?? 0) - (right.order ?? 0);

const DATA_DEVELOPMENT_READ_PERMISSIONS = [
  'task:batch:read',
  'task:realtime:read',
] as const;

/**
 * 主菜单顺序：
 *
 * 首页
 * ────────────────
 * 数据集成
 * 数据开发
 * 流程编排
 * ────────────────
 * 资源管理
 * 数据质量
 * 运维中心
 * 系统管理
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
    id: 'development',
    title: '数据开发',
    iconKey: 'api',
    section: 'task',
    order: 20,
  },
  {
    id: 'workflow',
    title: '流程编排',
    iconKey: 'workflow',
    section: 'task',
    order: 30,
  },
  {
    id: 'resources',
    title: '资源管理',
    iconKey: 'database',
    section: 'management',
    order: 40,
  },
  {
    id: 'quality',
    title: '数据质量',
    iconKey: 'quality',
    section: 'management',
    order: 50,
  },
  {
    id: 'operations',
    title: '运维中心',
    iconKey: 'monitor',
    section: 'management',
    order: 60,
  },
  {
    id: 'system',
    title: '系统管理',
    iconKey: 'system',
    section: 'system',
    order: 70,
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
    mode: 'public',
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
    mode: 'one',
    permission: 'task:batch:read',
    path: '/sync/batch-link-up',
    title: '离线同步',
    component: './batch-link-up',
    iconKey: 'sync',
    menuGroup: 'integration',
    order: 10,
    quickCreateRequirement: {
      mode: 'one',
      permission: 'task:batch:create',
    },
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
    mode: 'one',
    permission: 'task:realtime:read',
    path: '/sync/realtime-link-up',
    title: '实时同步',
    component: './realtime-link-up',
    iconKey: 'realtime',
    menuGroup: 'integration',
    order: 20,
    quickCreateRequirement: {
      mode: 'one',
      permission: 'task:realtime:create',
    },
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
  // 数据开发
  // ---------------------------------------------------------------------------

  {
    id: 'data-development-workbench',
    mode: 'any',
    permissions: DATA_DEVELOPMENT_READ_PERMISSIONS,
    path: '/data-development/workbench',
    title: '工作台',
    component: './data-development',
    iconKey: 'insight',
    menuGroup: 'development',
    order: 10,
  },
  {
    id: 'data-development-instances',
    mode: 'any',
    permissions: DATA_DEVELOPMENT_READ_PERMISSIONS,
    path: '/data-development/instances',
    title: '运行实例',
    component: './data-development/instances',
    iconKey: 'instance',
    menuGroup: 'development',
    order: 20,
  },
  {
    id: 'data-development-udf',
    mode: 'any',
    permissions: DATA_DEVELOPMENT_READ_PERMISSIONS,
    path: '/data-development/udf',
    title: 'UDF 函数',
    component: './data-development/udf',
    iconKey: 'api',
    menuGroup: 'development',
    order: 30,
  },
  {
    id: 'data-development-legacy',
    path: '/data-development',
    title: '数据开发',
    component: './data-development/redirect',
    hidden: true,
    parentId: 'data-development-workbench',
  },

  // ---------------------------------------------------------------------------
  // 流程编排
  // ---------------------------------------------------------------------------

  {
    id: 'workflow-project',
    mode: 'one',
    permission: 'workflow:project:read',
    path: '/workflow-project',
    title: '工作流项目',
    component: './workflow-project',
    iconKey: 'project',
    menuGroup: 'workflow',
    order: 10,
  },
  {
    id: 'workflow-project-detail',
    path: '/workflow-project/:id/detail',
    title: '工作流项目详情',
    component: './workflow-project/detail',
    hidden: true,
    parentId: 'workflow-project',
  },
  {
    id: 'workflow-management',
    mode: 'one',
    permission: 'workflow:definition:read',
    path: '/workflow-management',
    title: '工作流管理',
    component: './workflow-management',
    iconKey: 'workflow',
    menuGroup: 'workflow',
    order: 20,
    quickCreateRequirement: {
      mode: 'one',
      permission: 'workflow:definition:create',
    },
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
    mode: 'one',
    permission: 'workflow:instance:read',
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
    mode: 'one',
    permission: 'resource:data-source:read',
    path: '/data-source',
    title: '数据源管理',
    component: './data-source',
    iconKey: 'database',
    order: 10,
  },
  {
    id: 'resource-management',
    mode: 'one',
    permission: 'resource:view',
    path: '/resource-management',
    title: '文件资源',
    component: './resource-management',
    iconKey: 'database',
    menuGroup: 'resources',
    order: 10,
  },
  {
    id: 'client',
    mode: 'one',
    permission: 'resource:client:read',
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
    mode: 'one',
    permission: 'resource:connector:read',
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
    mode: 'one',
    permission: 'quality:rule:read',
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
    mode: 'one',
    permission: 'quality:report:read',
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
    mode: 'one',
    permission: 'operations:metrics:read',
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
    mode: 'one',
    permission: 'operations:alarm:read',
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
    mode: 'one',
    permission: 'knowledge:read',
    path: '/knowledge-management',
    title: '知识管理',
    component: './knowledge-management',
    iconKey: 'knowledge',
    hidden: true,
  },

  // ---------------------------------------------------------------------------
  // 系统管理（权限编码来自阶段 0 合同矩阵）
  // ---------------------------------------------------------------------------

  {
    id: 'system-users',
    mode: 'one',
    permission: 'security:user:read',
    path: '/system/users',
    title: '用户管理',
    component: './system/users',
    iconKey: 'system',
    menuGroup: 'system',
    order: 10,
  },
  {
    id: 'system-roles',
    mode: 'one',
    permission: 'security:role:read',
    path: '/system/roles',
    title: '角色管理',
    component: './system/roles',
    iconKey: 'system',
    menuGroup: 'system',
    order: 20,
  },
  {
    id: 'system-permissions',
    mode: 'one',
    permission: 'security:permission:read',
    path: '/system/permissions',
    title: '权限管理',
    component: './system/permissions',
    iconKey: 'system',
    menuGroup: 'system',
    order: 30,
  },
  {
    id: 'system-departments',
    mode: 'one',
    permission: 'security:department:read',
    path: '/system/departments',
    title: '部门管理',
    component: './system/departments',
    iconKey: 'system',
    menuGroup: 'system',
    order: 40,
  },
  {
    id: 'system-security-projects',
    mode: 'one',
    permission: 'security:project:read',
    path: '/system/projects',
    title: 'Security 授权项目',
    component: './system/security-projects',
    iconKey: 'system',
    menuGroup: 'system',
    order: 50,
  },
  {
    id: 'system-resource-permissions',
    mode: 'one',
    permission: 'security:resource-permission:read',
    path: '/system/resource-permissions',
    title: '资源授权',
    component: './system/resource-permissions',
    iconKey: 'system',
    menuGroup: 'system',
    order: 60,
  },
  {
    id: 'system-configs',
    mode: 'one',
    permission: 'security:config:read',
    path: '/system/configs',
    title: '系统配置',
    component: './system/configs',
    iconKey: 'system',
    menuGroup: 'system',
    order: 70,
  },
  {
    id: 'system-operation-logs',
    mode: 'one',
    permission: 'security:operation-log:read',
    path: '/system/oplogs',
    title: '操作日志',
    component: './system/oplogs',
    iconKey: 'system',
    menuGroup: 'system',
    order: 80,
  },
  {
    id: 'system-messages',
    mode: 'public',
    path: '/system/messages',
    title: '消息中心',
    component: './system/messages',
    iconKey: 'system',
    hidden: true,
    order: 90,
  },
];

const routeMap = new Map(appRoutes.map((route) => [route.id, route]));

/**
 * Applies the same permission decision to routes and their parent navigation
 * item. This prevents a permitted child from activating an inaccessible parent.
 */
export const canAccessNavigationRoute = (
  route: NavigationRoute,
  permissionCodes: readonly string[] | null | undefined,
) => {
  const visited = new Set<string>();
  let candidate: NavigationRoute | undefined = route;

  while (candidate && !visited.has(candidate.id)) {
    visited.add(candidate.id);
    if (
      candidate.mode &&
      !satisfiesPermissionRequirement(
        permissionCodes,
        candidate as PermissionRequirement,
      )
    ) {
      return false;
    }
    candidate = candidate.parentId
      ? routeMap.get(candidate.parentId)
      : undefined;
  }

  return true;
};

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

export const getActiveNavigationId = (
  pathname: string,
  permissionCodes?: readonly string[] | null,
) => {
  const route = getRouteMetadata(pathname);

  if (!route || !canAccessNavigationRoute(route, permissionCodes)) {
    return undefined;
  }

  return route.parentId ?? route.id;
};

export const getActiveNavigationGroupId = (
  pathname: string,
  permissionCodes?: readonly string[] | null,
) => {
  const activeId = getActiveNavigationId(pathname, permissionCodes);

  return activeId ? routeMap.get(activeId)?.menuGroup : undefined;
};

/**
 * 首页等独立一级菜单。
 */
export const getStandaloneNavigationRoutes = (
  permissionCodes?: readonly string[] | null,
) =>
  appRoutes
    .filter(
      (route) =>
        !route.hidden &&
        !route.menuGroup &&
        canAccessNavigationRoute(route, permissionCodes),
    )
    .sort(sortByOrder);

/**
 * 分组菜单。
 */
export const getMainNavigationGroups = (
  permissionCodes?: readonly string[] | null,
): NavigationGroupWithRoutes[] =>
  [...navigationGroups]
    .sort(sortByOrder)
    .map((group) => ({
      ...group,
      routes: appRoutes
        .filter(
          (route) =>
            !route.hidden &&
            route.menuGroup === group.id &&
            canAccessNavigationRoute(route, permissionCodes),
        )
        .sort(sortByOrder),
    }))
    .filter((group) => group.routes.length > 0);

/**
 * 快速创建下拉菜单。
 */
export const getQuickCreateRoutes = (
  permissionCodes?: readonly string[] | null,
) =>
  appRoutes
    .filter(
      (route) =>
        Boolean(route.quickCreateLabel) &&
        canAccessNavigationRoute(route, permissionCodes) &&
        (!route.quickCreateRequirement ||
          satisfiesPermissionRequirement(
            permissionCodes,
            route.quickCreateRequirement,
          )),
    )
    .sort(sortByOrder);
