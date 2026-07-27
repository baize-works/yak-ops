import type { TableColumnsType } from 'antd';
import { Avatar, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';

import type { SystemUser } from '@/services/security/users';

import UserRowActions from '../components/UserRowActions';
import type { RoleOption } from '../shared';

interface UseUserColumnsOptions {
  roleOptions: RoleOption[];
  currentUserName?: string;
  onDetail: (user: SystemUser) => void;
  onEdit: (user: SystemUser) => void;
  onAssignRole: (user: SystemUser) => void;
  onResetPassword: (user: SystemUser) => void;
  onDeleted: () => void;
}

type UserPresentation = SystemUser & {
  avatar?: string;
  motto?: string;
  signature?: string;
};

/**
 * 普通角色标签：
 * 使用浅灰背景和中性灰文字，避免跟页面品牌色抢视觉焦点。
 */
const roleTagStyle: CSSProperties = {
  marginInlineEnd: 0,
  color: '#475569',
  background: '#f1f5f9',
  borderColor: '#e2e8f0',
};

/**
 * 当前用户标签稍微加深边框，但仍保持中性色。
 */
const currentUserTagStyle: CSSProperties = {
  marginInlineEnd: 0,
  color: '#334155',
  background: '#f8fafc',
  borderColor: '#cbd5e1',
};

/**
 * 默认头像使用深灰色。
 */
const avatarStyle: CSSProperties = {
  color: '#ffffff',
  backgroundColor: '#475569',
};

const getAvatarText = (user: SystemUser): string => {
  const source = user.realName || user.userName || 'U';
  return source.slice(0, 1).toUpperCase();
};

const formatDateTime = (value?: string): string => {
  if (!value) {
    return '-';
  }

  const date = dayjs(value);

  return date.isValid()
    ? date.format('YYYY-MM-DD HH:mm:ss')
    : value;
};

export function useUserColumns({
  roleOptions,
  currentUserName,
  onDetail,
  onEdit,
  onAssignRole,
  onResetPassword,
  onDeleted,
}: UseUserColumnsOptions): TableColumnsType<SystemUser> {
  return useMemo<TableColumnsType<SystemUser>>(
    () => [
      {
        title: '用户',
        dataIndex: 'userName',
        key: 'userName',
        width: 300,
        render: (_, row) => {
          const presentation = row as UserPresentation;
          const motto =
            presentation.motto || presentation.signature;

          return (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                size={40}
                src={presentation.avatar}
                style={avatarStyle}
                className="shrink-0 font-semibold"
              >
                {getAvatarText(row)}
              </Avatar>

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Typography.Text
                    strong
                    ellipsis
                    className="max-w-40 !text-slate-800"
                  >
                    {row.realName || row.userName}
                  </Typography.Text>

                  {row.userName === currentUserName && (
                    <Tag style={currentUserTagStyle}>
                      当前用户
                    </Tag>
                  )}
                </div>

                <div className="mt-1 truncate text-xs text-slate-500">
                  @{row.userName}

                  <span className="mx-1 text-slate-300">
                    ·
                  </span>

                  ID {row.id}
                </div>

                <div className="mt-1 max-w-64 truncate text-xs text-slate-400">
                  {motto || '暂无个性签名'}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        title: '联系方式',
        dataIndex: 'contact',
        key: 'contact',
        width: 220,
        render: (_, row) => (
          <div className="min-w-0">
            <div className="truncate text-sm text-slate-700">
              {row.email || '未设置邮箱'}
            </div>

            <div className="mt-1 truncate text-xs text-slate-400">
              {row.phone || '未设置手机号'}
            </div>
          </div>
        ),
      },
      {
        title: '角色',
        dataIndex: 'roleId',
        key: 'roleId',
        width: 220,
        render: (_, row) => {
          const roles = Array.isArray(row.roleList)
            ? row.roleList
            : [];

          if (roles.length === 0) {
            const role = roleOptions.find(
              (item) => item.value === row.roleId,
            );

            if (role) {
              return (
                <Tag style={roleTagStyle}>
                  {role.label}
                </Tag>
              );
            }

            return (
              <Typography.Text
                type="secondary"
                className="!text-slate-400"
              >
                未分配角色
              </Typography.Text>
            );
          }

          const visibleRoles = roles.slice(0, 2);
          const remainingCount =
            roles.length - visibleRoles.length;

          return (
            <Space size={[4, 6]} wrap>
              {visibleRoles.map((role) => (
                <Tag
                  key={role.id}
                  style={roleTagStyle}
                >
                  {role.roleName}
                </Tag>
              ))}

              {remainingCount > 0 && (
                <Tag style={roleTagStyle}>
                  +{remainingCount}
                </Tag>
              )}
            </Space>
          );
        },
      },
      {
        title: '最近更新',
        dataIndex: 'updateTime',
        key: 'updateTime',
        width: 190,
        render: (_, row) => (
          <div>
            <div className="text-sm text-slate-700">
              {formatDateTime(
                row.updateTime || row.createTime,
              )}
            </div>

            <div className="mt-1 text-xs text-slate-400">
              创建于 {formatDateTime(row.createTime)}
            </div>
          </div>
        ),
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 170,
        align: 'center',
        render: (_, row) => (
          <UserRowActions
            user={row}
            currentUserName={currentUserName}
            onDetail={onDetail}
            onEdit={onEdit}
            onAssignRole={onAssignRole}
            onResetPassword={onResetPassword}
            onDeleted={onDeleted}
          />
        ),
      },
    ],
    [
      roleOptions,
      currentUserName,
      onDetail,
      onEdit,
      onAssignRole,
      onResetPassword,
      onDeleted,
    ],
  );
}