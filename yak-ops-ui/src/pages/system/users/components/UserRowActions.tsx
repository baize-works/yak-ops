import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  Button,
  Dropdown,
  Modal,
  Space,
  message,
  type MenuProps,
} from 'antd';

import {
  deleteUser as deleteSystemUser,
  type SystemUser,
} from '@/services/security/users';

import { errorText } from '../shared';

interface UserRowActionsProps {
  user: SystemUser;
  currentUserName?: string;
  onDetail: (user: SystemUser) => void;
  onEdit: (user: SystemUser) => void;
  onAssignRole: (user: SystemUser) => void;
  onResetPassword: (user: SystemUser) => void;
  onDeleted: () => void;
}

type ActionKey = 'assignRole' | 'resetPassword' | 'delete';

export default function UserRowActions({
  user,
  currentUserName,
  onDetail,
  onEdit,
  onAssignRole,
  onResetPassword,
  onDeleted,
}: UserRowActionsProps) {
  const isCurrentUser = user.userName === currentUserName;

  const remove = async () => {
    try {
      await deleteSystemUser(user.id);
      message.success('用户已删除');
      onDeleted();
    } catch (error) {
      message.error(errorText(error, '用户删除失败'));
      throw error;
    }
  };

  const confirmDelete = () => {
    Modal.confirm({
      title: '删除用户',
      content: (
        <div>
          确定删除用户
          <span className="mx-1 font-medium text-slate-900">
            {user.realName || user.userName}
          </span>
          吗？
        </div>
      ),
      okText: '删除',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      centered: true,
      onOk: remove,
    });
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'assignRole',
      icon: <SafetyCertificateOutlined />,
      label: '分配角色',
    },
    {
      key: 'resetPassword',
      icon: <KeyOutlined />,
      label: '重置密码',
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除用户',
      danger: true,
      disabled: isCurrentUser,
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key as ActionKey) {
      case 'assignRole':
        onAssignRole(user);
        break;
      case 'resetPassword':
        onResetPassword(user);
        break;
      case 'delete':
        confirmDelete();
        break;
      default:
        break;
    }
  };

  return (
    <Space size={2}>
      <Button
        type="link"
        size="small"
        icon={<EyeOutlined />}
        className="!px-1.5 !text-slate-600 hover:!text-slate-900"
        onClick={() => onDetail(user)}
      >
        详情
      </Button>

      <Button
        type="link"
        size="small"
        icon={<EditOutlined />}
        className="!px-1.5 !text-slate-600 hover:!text-slate-900"
        onClick={() => onEdit(user)}
      >
        编辑
      </Button>

      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: menuItems,
          onClick: handleMenuClick,
        }}
      >
        <Button
          type="link"
          size="small"
          className="!px-1.5 !text-slate-600 hover:!text-slate-900"
        >
          更多
          <DownOutlined className="ml-1 text-[10px]" />
        </Button>
      </Dropdown>
    </Space>
  );
}
