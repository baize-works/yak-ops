import {
  type PermissionRequirement,
  satisfiesPermissionRequirement,
} from '../utils/security/permission';

export type NavigationIconKey =
  | 'home' | 'database' | 'sync' | 'realtime' | 'client' | 'connector'
  | 'workflow' | 'project' | 'instance' | 'quality' | 'report' | 'monitor' | 'alarm'
  | 'knowledge' | 'api' | 'insight' | 'system';
export type NavigationSectionKey = 'task' | 'management' | 'system';

interface NavigationRouteBase {
  id: string; path: string; title: string; component: string;
  iconKey?: NavigationIconKey; menuGroup?: string; order?: number;
  hidden?: boolean; parentId?: string; quickCreateLabel?: string;
  quickCreateRequirement?: PermissionRequirement;
}
export type NavigationRoute = NavigationRouteBase &
  (PermissionRequirement | { parentId: string; mode?: never });
export interface NavigationGroup {
  id: string; title: string; iconKey: NavigationIconKey;
  section: NavigationSectionKey; order: number;
}
export interface NavigationGroupWithRoutes extends NavigationGroup {
  routes: NavigationRoute[];
}

export const navigationGroups: readonly NavigationGroup[] = [
  { id: 'integration', title: '数据集成', iconKey: 'sync', section: 'task', order: 10 },
  { id: 'workflow', title: '工作流', iconKey: 'workflow', section: 'task', order: 20 },
  { id: 'resources', title: '资源管理', iconKey: 'database', section: 'management', order: 20 },
  { id: 'data-quality', title: '数据质量', iconKey: 'quality', section: 'management', order: 30 },
  { id: 'system', title: '系统管理', iconKey: 'system', section: 'system', order: 40 },
];

export const appRoutes: readonly NavigationRoute[] = [
  { id: 'data-source', mode: 'one', permission: 'resource:data-source:read', path: '/data-source', title: '数据源管理', component: './data-source', iconKey: 'database', order: 10 },
  {
    id: 'batch-link-up', mode: 'one', permission: 'task:batch:read',
    path: '/sync/batch-link-up', title: '离线同步', component: './batch-link-up',
    iconKey: 'sync', menuGroup: 'integration', order: 10,
    quickCreateRequirement: { mode: 'one', permission: 'task:batch:create' },
    quickCreateLabel: '新建离线同步',
  },
  { id: 'batch-link-up-detail', path: '/sync/batch-link-up/:id/detail', title: '离线同步详情', component: './batch-link-up/detail', hidden: true, parentId: 'batch-link-up' },
  { id: 'batch-link-up-single', path: '/sync/batch-link-up/:id/config/single', title: '单表同步配置', component: './batch-link-up/config/single', hidden: true, parentId: 'batch-link-up' },
  { id: 'batch-link-up-multi', path: '/sync/batch-link-up/:id/config/multi', title: '多表同步配置', component: './batch-link-up/config/multi', hidden: true, parentId: 'batch-link-up' },
  { id: 'batch-link-up-script', path: '/sync/batch-link-up/:id/config/script', title: '脚本同步配置', component: './batch-link-up/config/script', hidden: true, parentId: 'batch-link-up' },
  { id: 'workflow-definition', mode: 'public', path: '/workflow/definitions', title: '工作流定义', component: './workflow/management', iconKey: 'workflow', menuGroup: 'workflow', order: 10 },
  { id: 'workflow-definition-editor', path: '/workflow/definition/:id', title: '工作流配置', component: './workflow/definition', hidden: true, parentId: 'workflow-definition' },
  { id: 'workflow-instances', mode: 'public', path: '/workflow/instances', title: '工作流实例', component: './workflow/instances', iconKey: 'instance', menuGroup: 'workflow', order: 20 },
  { id: 'resource-management', mode: 'one', permission: 'resource:view', path: '/resource-management', title: '文件资源', component: './resource-management', iconKey: 'database', menuGroup: 'resources', order: 10 },
  { id: 'data-quality-table-config', mode: 'one', permission: 'quality:monitor:read', path: '/data-quality/table-config', title: '数据表监控', component: './data-quality/table-config', iconKey: 'quality', menuGroup: 'data-quality', order: 10 },
  { id: 'data-quality-monitor-create', path: '/data-quality/monitor/create', title: '新增监控', component: './data-quality/monitor/editor', hidden: true, parentId: 'data-quality-table-config' },
  { id: 'data-quality-monitor-detail', path: '/data-quality/monitor/:id', title: '规则管理', component: './data-quality/monitor/detail', hidden: true, parentId: 'data-quality-table-config' },
  { id: 'data-quality-monitor-edit', path: '/data-quality/monitor/:id/edit', title: '编辑监控', component: './data-quality/monitor/editor', hidden: true, parentId: 'data-quality-table-config' },
  { id: 'data-quality-execution', mode: 'one', permission: 'quality:execution:read', path: '/data-quality/execution', title: '运行记录', component: './data-quality/execution', iconKey: 'report', menuGroup: 'data-quality', order: 20 },
  { id: 'data-quality-execution-detail', path: '/data-quality/execution/:executionNo', title: '运行记录详情', component: './data-quality/execution/detail', hidden: true, parentId: 'data-quality-execution' },
  { id: 'data-quality-rule-template', mode: 'one', permission: 'quality:template:read', path: '/data-quality/rule-template', title: '规则模板库', component: './data-quality/rule-template', iconKey: 'quality', menuGroup: 'data-quality', order: 30 },
  { id: 'system-users', mode: 'one', permission: 'security:user:read', path: '/system/users', title: '用户管理', component: './system/users', iconKey: 'system', menuGroup: 'system', order: 10 },
  { id: 'system-roles', mode: 'one', permission: 'security:role:read', path: '/system/roles', title: '角色管理', component: './system/roles', iconKey: 'system', menuGroup: 'system', order: 20 },
  { id: 'system-permissions', mode: 'one', permission: 'security:permission:read', path: '/system/permissions', title: '权限管理', component: './system/permissions', iconKey: 'system', menuGroup: 'system', order: 30 },
  { id: 'system-departments', mode: 'one', permission: 'security:department:read', path: '/system/departments', title: '部门管理', component: './system/departments', iconKey: 'system', menuGroup: 'system', order: 40 },
  { id: 'system-security-projects', mode: 'one', permission: 'security:project:read', path: '/system/projects', title: 'Security 授权项目', component: './system/security-projects', iconKey: 'system', menuGroup: 'system', order: 50 },
  { id: 'system-resource-permissions', mode: 'one', permission: 'security:resource-permission:read', path: '/system/resource-permissions', title: '资源授权', component: './system/resource-permissions', iconKey: 'system', menuGroup: 'system', order: 60 },
  { id: 'system-configs', mode: 'one', permission: 'security:config:read', path: '/system/configs', title: '系统配置', component: './system/configs', iconKey: 'system', menuGroup: 'system', order: 70 },
  { id: 'system-operation-logs', mode: 'one', permission: 'security:operation-log:read', path: '/system/oplogs', title: '操作日志', component: './system/oplogs', iconKey: 'system', menuGroup: 'system', order: 80 },
  { id: 'system-messages', mode: 'public', path: '/system/messages', title: '消息中心', component: './system/messages', iconKey: 'system', hidden: true, order: 90 },
];

const sortByOrder = <T extends { order?: number }>(left: T, right: T) =>
  (left.order ?? 0) - (right.order ?? 0);
const routeMap = new Map(appRoutes.map((route) => [route.id, route]));

export const canAccessNavigationRoute = (
  route: NavigationRoute,
  permissionCodes: readonly string[] | null | undefined,
) => {
  const visited = new Set<string>();
  let candidate: NavigationRoute | undefined = route;
  while (candidate && !visited.has(candidate.id)) {
    visited.add(candidate.id);
    if (candidate.mode && !satisfiesPermissionRequirement(
      permissionCodes,
      candidate as PermissionRequirement,
    )) return false;
    candidate = candidate.parentId ? routeMap.get(candidate.parentId) : undefined;
  }
  return true;
};

export const getNavigationGroups = (
  permissionCodes?: readonly string[] | null,
): NavigationGroupWithRoutes[] =>
  navigationGroups
    .map((group) => ({
      ...group,
      routes: appRoutes
        .filter((route) => route.menuGroup === group.id && !route.hidden
          && canAccessNavigationRoute(route, permissionCodes))
        .sort(sortByOrder),
    }))
    .filter((group) => group.routes.length > 0)
    .sort(sortByOrder);
export const getMainNavigationGroups = getNavigationGroups;
export const getQuickCreateRoutes = (
  permissionCodes?: readonly string[] | null,
) => appRoutes
  .filter((route) => Boolean(route.quickCreateLabel)
    && canAccessNavigationRoute(route, permissionCodes)
    && (!route.quickCreateRequirement || satisfiesPermissionRequirement(
      permissionCodes,
      route.quickCreateRequirement,
    )))
  .sort(sortByOrder);
export const getStandaloneNavigationRoutes = (
  permissionCodes?: readonly string[] | null,
) => appRoutes
  .filter((route) => !route.menuGroup && !route.hidden
    && canAccessNavigationRoute(route, permissionCodes))
  .sort(sortByOrder);

const normalizePath = (path: string) =>
  path.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
const matchesRoute = (pattern: string, pathname: string) => {
  const patternParts = normalizePath(pattern).split('/').filter(Boolean);
  const pathParts = normalizePath(pathname).split('/').filter(Boolean);
  return patternParts.length === pathParts.length
    && patternParts.every((part, index) => part.startsWith(':') || part === pathParts[index]);
};
export const getRouteMetadata = (pathname: string) =>
  appRoutes.find((route) => matchesRoute(route.path, pathname));
export const getActiveNavigationId = (
  pathname: string,
  permissionCodes?: readonly string[] | null,
) => {
  const route = getRouteMetadata(pathname);
  if (!route || !canAccessNavigationRoute(route, permissionCodes)) return undefined;
  return route.parentId ?? route.id;
};
export const getActiveNavigationGroupId = (
  pathname: string,
  permissionCodes?: readonly string[] | null,
) => {
  const activeId = getActiveNavigationId(pathname, permissionCodes);
  return activeId ? routeMap.get(activeId)?.menuGroup : undefined;
};
