import {
  appRoutes,
  canAccessNavigationRoute,
  getActiveNavigationId,
  getMainNavigationGroups,
  getQuickCreateRoutes,
} from './navigation';

describe('permission-aware navigation', () => {
  const batchRead = ['task:batch:read'];

  it('uses route permission metadata and lets details inherit their parent', () => {
    const list = appRoutes.find((route) => route.id === 'batch-link-up')!;
    const detail = appRoutes.find((route) => route.id === 'batch-link-up-detail')!;
    expect(canAccessNavigationRoute(list, batchRead)).toBe(true);
    expect(canAccessNavigationRoute(list, [])).toBe(false);
    expect(canAccessNavigationRoute(detail, batchRead)).toBe(true);
    expect(canAccessNavigationRoute(detail, [])).toBe(false);
    expect(getActiveNavigationId('/sync/batch-link-up/42/detail', batchRead)).toBe('batch-link-up');
  });

  it('removes empty groups and filters quick-create independently', () => {
    expect(getMainNavigationGroups([])).toEqual([]);
    expect(getMainNavigationGroups(batchRead).map((group) => group.id)).toEqual(['integration']);
    expect(getQuickCreateRoutes(batchRead)).toEqual([]);
    expect(getQuickCreateRoutes([...batchRead, 'task:batch:create']).map((route) => route.id)).toEqual(['batch-link-up']);
  });

  it('registers the data-quality MVP pages and hidden monitor routes', () => {
    const qualityPermissions = [
      'quality:monitor:read',
      'quality:execution:read',
      'quality:template:read',
    ];
    const groups = getMainNavigationGroups(qualityPermissions);
    expect(groups.map((group) => group.id)).toEqual(['data-quality']);
    expect(groups[0].routes.map((route) => route.id)).toEqual([
      'data-quality-table-config',
      'data-quality-execution',
      'data-quality-rule-template',
    ]);
    expect(getActiveNavigationId('/data-quality/monitor/create', qualityPermissions)).toBe(
      'data-quality-table-config',
    );
    expect(getActiveNavigationId('/data-quality/monitor/42', qualityPermissions)).toBe(
      'data-quality-table-config',
    );
    expect(getActiveNavigationId('/data-quality/execution', qualityPermissions)).toBe(
      'data-quality-execution',
    );
    expect(
      getActiveNavigationId('/data-quality/execution/QM-20260807095619-ABC123', qualityPermissions),
    ).toBe('data-quality-execution');
  });

  it('does not expose removed modules', () => {
    expect(getActiveNavigationId('/home', [])).toBeUndefined();
    expect(getActiveNavigationId('/sync/realtime-link-up', ['task:realtime:read'])).toBeUndefined();
    expect(getActiveNavigationId('/data-development/workbench', batchRead)).toBeUndefined();
    expect(getActiveNavigationId('/data-quality/report', ['quality:report:read'])).toBeUndefined();
  });
});
