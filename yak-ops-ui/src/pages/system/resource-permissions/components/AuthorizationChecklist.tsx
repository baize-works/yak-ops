import {
  ArrowRightOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Empty,
  Input,
  Space,
  Spin,
  Tag,
} from 'antd';
import { useMemo, useState } from 'react';

import type { ResourceOwnershipLevel } from '@/services/security/resourcePermissions';

export interface AuthorizationChecklistItem {
  id: number;
  label: string;
  description?: string;
  hasLevel: ResourceOwnershipLevel;
}

interface AuthorizationChecklistProps {
  items: AuthorizationChecklistItem[];
  selectedIds: number[];
  partialIds: number[];
  loading?: boolean;
  disabled?: boolean;
  emptyText?: string;
  searchPlaceholder?: string;
  drillLabel?: string;
  onChange: (selectedIds: number[], partialIds: number[]) => void;
  onDrill?: (item: AuthorizationChecklistItem) => void;
}

const unique = (ids: number[]): number[] =>
  Array.from(new Set(ids.filter(Number.isFinite)));

export default function AuthorizationChecklist({
  items,
  selectedIds,
  partialIds,
  loading = false,
  disabled = false,
  emptyText = '暂无可授权数据',
  searchPlaceholder = '搜索名称',
  drillLabel = '进入下一级',
  onChange,
  onDrill,
}: AuthorizationChecklistProps) {
  const [keyword, setKeyword] = useState('');

  const selected = useMemo(
    () => new Set(selectedIds),
    [selectedIds],
  );
  const partial = useMemo(
    () => new Set(partialIds),
    [partialIds],
  );

  const visible = useMemo(() => {
    const query = keyword.trim().toLocaleLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      `${item.label} ${item.description ?? ''}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [items, keyword]);

  const visibleIds = visible.map((item) => item.id);
  const allVisibleChecked =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selected.has(id));
  const someVisibleChecked =
    visibleIds.some((id) => selected.has(id) || partial.has(id)) &&
    !allVisibleChecked;

  const toggle = (id: number, checked: boolean) => {
    const nextSelected = new Set(selected);
    const nextPartial = new Set(partial);

    if (checked) {
      nextSelected.add(id);
      nextPartial.delete(id);
    } else {
      nextSelected.delete(id);
      nextPartial.delete(id);
    }

    onChange(
      unique(Array.from(nextSelected)),
      unique(Array.from(nextPartial)),
    );
  };

  const toggleVisible = (checked: boolean) => {
    const nextSelected = new Set(selected);
    const nextPartial = new Set(partial);

    visibleIds.forEach((id) => {
      if (checked) nextSelected.add(id);
      else nextSelected.delete(id);
      nextPartial.delete(id);
    });

    onChange(
      unique(Array.from(nextSelected)),
      unique(Array.from(nextPartial)),
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
        <Input
          allowClear
          value={keyword}
          prefix={<SearchOutlined className="text-slate-400" />}
          placeholder={searchPlaceholder}
          className="min-w-[220px] flex-1"
          onChange={(event) => setKeyword(event.target.value)}
        />

        <Checkbox
          checked={allVisibleChecked}
          indeterminate={someVisibleChecked}
          disabled={disabled || visibleIds.length === 0}
          onChange={(event) => toggleVisible(event.target.checked)}
        >
          全选当前结果
        </Checkbox>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <Spin spinning={loading}>
          {!loading && visible.length === 0 ? (
            <Empty
              className="my-16"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={emptyText}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {visible.map((item) => {
                const checked = selected.has(item.id);
                const indeterminate = partial.has(item.id);

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70"
                  >
                    <Checkbox
                      checked={checked}
                      indeterminate={indeterminate}
                      disabled={disabled}
                      onChange={(event) =>
                        toggle(item.id, event.target.checked)
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-slate-700">
                          {item.label}
                        </span>
                        {checked && <Tag color="processing">全部授权</Tag>}
                        {indeterminate && <Tag color="warning">部分授权</Tag>}
                        {!checked && !indeterminate && <Tag>未授权</Tag>}
                      </div>
                      {item.description && (
                        <div className="mt-1 truncate text-xs text-slate-400">
                          {item.description}
                        </div>
                      )}
                    </div>

                    {onDrill && (
                      <Button
                        type="link"
                        size="small"
                        icon={<ArrowRightOutlined />}
                        iconPosition="end"
                        onClick={() => onDrill(item)}
                      >
                        {drillLabel}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Spin>
      </div>

      <Space className="mt-3 shrink-0 text-xs text-slate-400" wrap>
        <span>全部授权：{selectedIds.length}</span>
        <span>部分授权：{partialIds.length}</span>
        <span>当前显示：{visible.length}</span>
      </Space>
    </div>
  );
}
