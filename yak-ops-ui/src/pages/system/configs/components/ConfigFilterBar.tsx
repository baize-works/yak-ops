import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Input, Select, Tooltip } from 'antd';
import { useState } from 'react';

import { PermissionGuard } from '@/components/security';
import type { ConfigStatus } from '@/services/security/configs';

export interface ConfigFilterValues {
  id?: number;
  valueGroup?: string;
  valueName?: string;
  status?: ConfigStatus;
  memo?: string;
  operator?: string;
}

type ConfigSearchField =
  | 'valueName'
  | 'memo'
  | 'operator'
  | 'id';

interface ConfigFilterBarProps {
  groups: string[];
  loading?: boolean;
  onSearch: (values: ConfigFilterValues) => void;
  onRefresh: () => void;
  onCreate: () => void;
}

const CONFIG_STATUS_ENABLED: ConfigStatus = 1;
const CONFIG_STATUS_DISABLED: ConfigStatus = 2;

const SEARCH_FIELD_OPTIONS: Array<{
  label: string;
  value: ConfigSearchField;
}> = [
  { label: '配置名称', value: 'valueName' },
  { label: '备注', value: 'memo' },
  { label: '操作人', value: 'operator' },
  { label: '配置 ID', value: 'id' },
];

const SEARCH_PLACEHOLDERS: Record<ConfigSearchField, string> = {
  valueName: '请输入配置名称',
  memo: '请输入备注关键字',
  operator: '请输入操作人',
  id: '请输入配置 ID',
};

const configPermission = (action: string): string =>
  `security:config:${action}`;

const clean = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized || undefined;
};

export default function ConfigFilterBar({
  groups,
  loading = false,
  onSearch,
  onRefresh,
  onCreate,
}: ConfigFilterBarProps) {
  const [status, setStatus] = useState<ConfigStatus>();
  const [valueGroup, setValueGroup] = useState<string>();
  const [searchField, setSearchField] =
    useState<ConfigSearchField>('valueName');
  const [keyword, setKeyword] = useState('');

  const createFilters = (
    nextKeyword = keyword,
    nextField = searchField,
    nextStatus = status,
    nextGroup = valueGroup,
  ): ConfigFilterValues => {
    const filters: ConfigFilterValues = {
      status: nextStatus,
      valueGroup: nextGroup,
    };
    const normalizedKeyword = clean(nextKeyword);

    if (!normalizedKeyword) return filters;

    if (nextField === 'id') {
      const id = Number(normalizedKeyword);
      if (Number.isSafeInteger(id) && id > 0) {
        filters.id = id;
      }
      return filters;
    }

    filters[nextField] = normalizedKeyword;
    return filters;
  };

  const changeStatus = (nextStatus?: ConfigStatus) => {
    setStatus(nextStatus);
    onSearch(
      createFilters(keyword, searchField, nextStatus, valueGroup),
    );
  };

  const changeGroup = (nextGroup?: string) => {
    setValueGroup(nextGroup);
    onSearch(
      createFilters(keyword, searchField, status, nextGroup),
    );
  };

  const changeSearchField = (nextField: ConfigSearchField) => {
    setSearchField(nextField);
    setKeyword('');
    onSearch({ status, valueGroup });
  };

  const changeKeyword = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextKeyword = event.target.value;
    setKeyword(nextKeyword);

    if (!nextKeyword) {
      onSearch({ status, valueGroup });
    }
  };

  const submit = () => {
    onSearch(createFilters());
  };

  const statusOptions: Array<{
    key: string;
    label: string;
    value?: ConfigStatus;
  }> = [
    { key: 'all', label: '全部', value: undefined },
    {
      key: 'enabled',
      label: '已启用',
      value: CONFIG_STATUS_ENABLED,
    },
    {
      key: 'disabled',
      label: '已停用',
      value: CONFIG_STATUS_DISABLED,
    },
  ];

  return (
    <div className="mb-4 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
        {statusOptions.map((option) => {
          const active = status === option.value;

          return (
            <button
              key={option.key}
              type="button"
              className={[
                'shrink-0 rounded px-3 py-1 text-sm font-medium leading-5 transition-colors',
                active
                  ? 'bg-[#f2f2f4] text-[#FE2C55]'
                  : 'bg-[#f2f4f7] text-[#667085] hover:bg-[#e8eaef]',
              ].join(' ')}
              onClick={() => changeStatus(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Select<string>
          allowClear
          showSearch
          value={valueGroup}
          placeholder="全部分组"
          optionFilterProp="label"
          className="w-[150px]"
          options={groups.map((group) => ({
            value: group,
            label: group,
          }))}
          onChange={changeGroup}
        />

        <div className="flex h-8 w-[330px] max-w-full overflow-hidden rounded-md bg-[#f2f2f4]">
          <Select<ConfigSearchField>
            value={searchField}
            options={SEARCH_FIELD_OPTIONS}
            variant="borderless"
            popupMatchSelectWidth={120}
            className="h-8 w-[105px] shrink-0 [&_.ant-select-selection-item]:!leading-[30px] [&_.ant-select-selector]:!h-8 [&_.ant-select-selector]:!bg-transparent [&_.ant-select-selector]:!px-3"
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
                onClick={submit}
              />
            }
            className="!h-8 min-w-0 flex-1 !bg-transparent !py-0 !shadow-none [&_.ant-input]:!bg-transparent"
            onChange={changeKeyword}
            onPressEnter={submit}
          />
        </div>

        <Tooltip title="刷新配置列表">
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={onRefresh}
          />
        </Tooltip>

        <PermissionGuard
          mode="one"
          permission={configPermission('create')}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            新增配置
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );
}
