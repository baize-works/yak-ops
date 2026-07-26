import {
  canAccessNavigationRoute,
  getActiveNavigationId,
  type NavigationRoute,
} from './navigation';

describe('permission-aware navigation', () => {
  it('uses route permission metadata for route decisions', () => {
    const route: NavigationRoute = {
      id: 'protected-test-route',
      path: '/protected-test-route',
      title: 'Protected',
      component: './protected',
      anyPermissions: ['protected:read', 'protected:admin'],
    };

    expect(canAccessNavigationRoute(route, ['protected:read'])).toBe(true);
    expect(canAccessNavigationRoute(route, ['unrelated:read'])).toBe(false);
  });

  it('does not activate a route whose metadata denies access', () => {
    expect(getActiveNavigationId('/home', [])).toBe('home');
  });
});
