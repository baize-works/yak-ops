import { render, screen } from '@testing-library/react';
import RouteAccessBoundary from '.';

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
  useLocation: () => ({ pathname: '/sync/batch-link-up' }),
  useModel: () => ({ initialState: { currentUser: { permissionCodes: [] } } }),
}));

describe('RouteAccessBoundary', () => {
  it('renders 403 instead of a denied direct URL', () => {
    render(
      <RouteAccessBoundary>
        <div>secret page</div>
      </RouteAccessBoundary>,
    );
    expect(screen.getByText('403')).toBeTruthy();
    expect(screen.queryByText('secret page')).toBeNull();
  });
});
