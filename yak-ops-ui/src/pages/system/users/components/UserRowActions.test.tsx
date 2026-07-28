import { render, screen } from '@testing-library/react';
import { useModel } from '@umijs/max';

import { SECURITY_PERMISSIONS } from '@/constants/securityPermissions';
import type { SystemUser } from '@/services/security/users';

import UserRowActions from './UserRowActions';

jest.mock('@umijs/max', () => ({
  useModel: jest.fn(),
}));

const mockedUseModel = useModel as unknown as jest.Mock;

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
    mockedUseModel.mockReset();
  });

  it('keeps read-only users from seeing write actions', () => {
    mockedUseModel.mockReturnValue({
      initialState: {
        currentUser: {
          permissionCodes: [SECURITY_PERMISSIONS.user.read],
        },
      },
    });

    renderActions();

    expect(screen.getByText('详情')).toBeTruthy();
    expect(screen.queryByText('编辑')).toBeNull();
    expect(screen.queryByText('更多')).toBeNull();
  });

  it('shows only actions granted to the current user', () => {
    mockedUseModel.mockReturnValue({
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

    expect(screen.getByText('编辑')).toBeTruthy();
    expect(screen.getByText('更多')).toBeTruthy();
  });

  it('lets the security root identity see every action entry', () => {
    mockedUseModel.mockReturnValue({
      initialState: {
        currentUser: {
          permissionCodes: ['security:root'],
        },
      },
    });

    renderActions();

    expect(screen.getByText('编辑')).toBeTruthy();
    expect(screen.getByText('更多')).toBeTruthy();
  });
});
