import { render, screen } from '@testing-library/react';

import { SECURITY_PERMISSIONS } from '@/constants/securityPermissions';
import type { SystemUser } from '@/services/security/users';

import UserRowActions from './UserRowActions';

const mockUseModel = jest.fn();

jest.mock('@umijs/max', () => ({
  useModel: (...args: unknown[]) => mockUseModel(...args),
}));

const user: SystemUser = {
  id: 2,
  userName: 'tester',
  realName: '测试用户',
};

const renderActions = () =>
  render(
    <UserRowActions
      user={user}
      currentUserName="admin"
      onDetail={jest.fn()}
      onEdit={jest.fn()}
      onAssignRole={jest.fn()}
      onResetPassword={jest.fn()}
      onDeleted={jest.fn()}
    />,
  );

describe('UserRowActions permissions', () => {
  beforeEach(() => {
    mockUseModel.mockReset();
  });

  it('keeps read-only users from seeing write actions', () => {
    mockUseModel.mockReturnValue({
      initialState: {
        currentUser: {
          permissionCodes: [SECURITY_PERMISSIONS.user.read],
        },
      },
    });

    renderActions();

    expect(screen.getByText('详情')).toBeInTheDocument();
    expect(screen.queryByText('编辑')).not.toBeInTheDocument();
    expect(screen.queryByText('更多')).not.toBeInTheDocument();
  });

  it('shows only actions granted to the current user', () => {
    mockUseModel.mockReturnValue({
      initialState: {
        currentUser: {
          permissionCodes: [
            SECURITY_PERMISSIONS.user.read,
            SECURITY_PERMISSIONS.user.update,
            SECURITY_PERMISSIONS.user.resetPassword,
          ],
        },
      },
    });

    renderActions();

    expect(screen.getByText('编辑')).toBeInTheDocument();
    expect(screen.getByText('更多')).toBeInTheDocument();
  });

  it('lets the security root identity see every action entry', () => {
    mockUseModel.mockReturnValue({
      initialState: {
        currentUser: {
          permissionCodes: ['security:root'],
        },
      },
    });

    renderActions();

    expect(screen.getByText('编辑')).toBeInTheDocument();
    expect(screen.getByText('更多')).toBeInTheDocument();
  });
});
