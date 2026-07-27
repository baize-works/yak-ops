import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Modal, Space, type MenuProps } from "antd";

import type { SystemUser } from "@/services/security/users";

interface UserRowActionsProps {
  user: SystemUser;
  currentUserName?: string;
  onDetail: (user: SystemUser) => void;
  onEdit: (user: SystemUser) => void;
  onAssignRole: (user: SystemUser) => void;
  onResetPassword: (user: SystemUser) => void;
  onDeleted: () => void;
}

type ActionKey = "assignRole" | "resetPassword" | "delete";

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

  /**
   * 这里调用你原来 UserRowActions 中的删除接口。
   * 删除成功后执行 onDeleted() 刷新列表。
   */
  const deleteUser = async () => {
    // 保留你现有的删除请求，例如：
    //
    // await removeUser(user.id);
    // message.success('删除成功');
    // onDeleted();

    onDeleted();
  };

  const confirmDelete = () => {
    Modal.confirm({
      title: "删除用户",
      content: (
        <div>
          确定删除用户
          <span className="mx-1 font-medium text-slate-900">
            {user.realName || user.userName}
          </span>
          吗？
        </div>
      ),
      okText: "删除",
      cancelText: "取消",
      okButtonProps: {
        danger: true,
      },
      centered: true,
      onOk: deleteUser,
    });
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "assignRole",
      icon: <SafetyCertificateOutlined />,
      label: "分配角色",
    },
    {
      key: "resetPassword",
      icon: <KeyOutlined />,
      label: "重置密码",
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "删除用户",
      danger: true,
      disabled: isCurrentUser,
    },
  ];

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    switch (key as ActionKey) {
      case "assignRole":
        onAssignRole(user);
        break;

      case "resetPassword":
        onResetPassword(user);
        break;

      case "delete":
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
        trigger={["click"]}
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
