import { useLocation } from '@umijs/max';

import type { NavigationRoute } from '@/config/navigation';
import RouteAccessBoundary from '../RouteAccessBoundary';

const readRoute: NavigationRoute = {
  id: 'workflow-designer-versioned',
  mode: 'one',
  permission: 'workflow:definition:read',
  path: '/workflow-management/:id/designer',
  title: '工作流设计',
  component: './workflow-management/designer-router',
  hidden: true,
  parentId: 'workflow-management',
};

const createRoute: NavigationRoute = {
  ...readRoute,
  id: 'workflow-designer-v2-create',
  permission: 'workflow:definition:create',
};

export default function WorkflowDefinitionRouteBoundary() {
  const location = useLocation();
  const createMode = /\/workflow-management\/(?:v2\/)?create\/designer$/.test(
    location.pathname,
  );
  return <RouteAccessBoundary route={createMode ? createRoute : readRoute} />;
}
