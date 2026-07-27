import { render, screen } from '@testing-library/react';
import PermissionGuard from '.';

jest.mock('@umijs/max', () => ({ useModel: () => ({ initialState: { currentUser: { permissionCodes: [] } } }) }));

describe('PermissionGuard', () => {
  it('hides denied children by default', () => {
    render(
      <PermissionGuard mode="one" permission="task:create">
        <button type="button">Create</button>
      </PermissionGuard>,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('disables denied interactive children when requested', () => {
    render(
      <PermissionGuard mode="one" permission="task:create" behavior="disable">
        <button type="button">Create</button>
      </PermissionGuard>,
    );
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });
});
