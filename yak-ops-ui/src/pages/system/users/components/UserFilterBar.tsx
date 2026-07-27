import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Input, Select, Tooltip } from 'antd';
import { useState } from 'react';

import { PermissionGuard } from '@/components/security';

import type { RoleOption } from '../shared';

export interface UserFilterValues {
  id?: number;
  userName?: string;
  realName?: string;
  roleId?: number;
}

type UserSearchField = 'userName' | 'realName' | 'id';

interface UserFilterBarProps {
  roleOptions: RoleOption[];
  onSearch: (values: UserFilterValues) => void;
  onRefresh: () => void;
  onCreate: () => void;
}

const SEARCH_FIELD_OPTIONS: Array<{
  label: string;
  value: UserSearchField;
}> = [
  { label: '用户名', value: 'userName' },
  { label: '真实姓名', value: 'realName' },
  { label: '用户 ID', value: 'id' },
];

const SEARCH_PLACEHOLDERS: Record<UserSearchField, string> = {
  userName: '请输入用户名',
  realName: '请输入真实姓名',
  id: '请输入用户 ID',
};

const userPermission = (action: string): string =>
  `security:user:${action}`;

const clean = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized || undefined;
};

export default function UserFilterBar({
  roleOptions,
  onSearch,
  onRefresh,
  onCreate,
}: UserFilterBarProps) {
  const [activeRoleId, setActiveRoleId] = useState<number>();
  const [searchField, setSearchField] =
    useState<UserSearchField>('userName');
  const [keyword, setKeyword] = useState('');

  const createFilters = (
    nextKeyword = keyword,
    nextSearchField = searchField,
    nextRoleId = activeRoleId,
  ): UserFilterValues => {
    const normalizedKeyword = clean(nextKeyword);
    const filters: UserFilterValues = {
      roleId: nextRoleId,
    };

    if (!normalizedKeyword) return filters;

    if (nextSearchField === 'id') {
      const id = Number(normalizedKeyword);
      if (Number.isSafeInteger(id) && id > 0) {
        filters.id = id;
      }
      return filters;
    }

    filters[nextSearchField] = normalizedKeyword;
    return filters;
  };

  const changeRole = (roleId?: number) => {
    setActiveRoleId(roleId);
    onSearch(createFilters(keyword, searchField, roleId));
  };

  const changeSearchField = (field: UserSearchField) => {
    setSearchField(field);
    setKeyword('');
    onSearch({ roleId: activeRoleId });
  };

  return (
    <div className="mb-4 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
        {[{ label: '全部', value: undefined }, ...roleOptions].map(
          (role) => {
            const active = activeRoleId === role.value;

            return (
              <button
                key={role.value ?? 'all'}
                type="button"
                className={[
                  'shrink-0 rounded px-3 py-1 text-sm font-medium leading-5 transition-colors',
                  active
                    ? 'bg-[#f2f2f4] text-[#FE2C55]'
                    : 'bg-[#f2f4f7] text-[#667085] hover:bg-[#e8eaef]',
                ].join(' ')}
                onClick={() => changeRole(role.value)}
              >
                {role.label}
              </button>
            );
          },
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex h-8 w-[330px] max-w-full overflow-hidden rounded-md bg-[#f2f2f4]">
          <Select<UserSearchField>
            value={searchField}
            options={SEARCH_FIELD_OPTIONS}
            variant="borderless"
            popupMatchSelectWidth={120}
            className="h-8 w-[100px] shrink-0 [&_.ant-select-selection-item]:!leading-[30px] [&_.ant-select-selector]:!h-8 [&_.ant-select-selector]:!bg-transparent [&_.ant-select-selector]:!px-3"
            onChange={changeSearchField}
          />

          <div className="my-2 w-px shrink-0 bg-slate-200" />

          <Input
            allowClear
            value={keyword}
            variant="borderless"
            inputMode={searchField === 'id' ? 'numeric' : 'text'}
            placeholder={SEARCH_PLACEHOLDERS[searchField]}
            suffix={
              <SearchOutlined
                className="cursor-pointer text-slate-400 transition-colors hover:text-slate-700"
                onClick={() => onSearch(createFilters())}
              />
            }
            className="!h-8 min-w-0 flex-1 !bg-transparent !py-0 !shadow-none [&_.ant-input]:!bg-transparent"
            onChange={(event) => {
              const value = event.target.value;
              setKeyword(value);
              if (!value) {
                onSearch({ roleId: activeRoleId });
              }
            }}
            onPressEnter={() => onSearch(createFilters())}
          />
        </div>

        <Tooltip title="刷新用户列表">
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
          />
        </Tooltip>

        <PermissionGuard
          mode="one"
          permission={userPermission('create')}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            新增用户
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );
}
