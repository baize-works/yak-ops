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

  it('keeps explicitly public navigation available', () => {
    expect(getActiveNavigationId('/home', [])).toBe('home');
  });
});
