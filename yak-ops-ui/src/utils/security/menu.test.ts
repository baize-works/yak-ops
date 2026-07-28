import { hasRouteMenuAccess } from './menu';

describe('route menu authorization', () => {
  const protectedRoute = {
    id: 'batch-link-up',
    mode: 'one' as const,
  };

  it('enforces menu codes when the backend contract is present', () => {
    expect(
      hasRouteMenuAccess(['batch-link-up'], protectedRoute, []),
    ).toBe(true);
    expect(
      hasRouteMenuAccess(['client'], protectedRoute, []),
    ).toBe(false);
    expect(hasRouteMenuAccess([], protectedRoute, [])).toBe(false);
  });

  it('inherits the parent grant for hidden detail routes', () => {
    expect(
      hasRouteMenuAccess(
        ['batch-link-up'],
        {
          id: 'batch-link-up-detail',
          parentId: 'batch-link-up',
        },
        [],
      ),
    ).toBe(true);
  });

  it('keeps public, root, and staggered deployments compatible', () => {
    expect(
      hasRouteMenuAccess([], { id: 'home', mode: 'public' }, []),
    ).toBe(true);
    expect(
      hasRouteMenuAccess([], protectedRoute, ['security:root']),
    ).toBe(true);
    expect(
      hasRouteMenuAccess(undefined, protectedRoute, []),
    ).toBe(true);
  });
});
