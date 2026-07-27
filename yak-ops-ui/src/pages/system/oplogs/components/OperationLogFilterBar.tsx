import {
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  DatePicker,
  Input,
  Popover,
  Select,
  Space,
} from 'antd';
import type { Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';

import type { OperationLogOptions } from '@/services/security/operationLogs';

export interface OperationLogFilterValues {
  operateType?: string;
  operatePage?: string;
  operationMethods?: string;
  operator?: string;
  operatorIp?: string;
  target?: string;
  targetType?: string;
  detail?: string;
  startTime?: number;
  endTime?: number;
}

type SearchField =
  | 'operator'
  | 'target'
  | 'detail'
  | 'operatorIp';

interface OperationLogFilterBarProps {
  options: OperationLogOptions;
  loading?: boolean;
  onSearch: (values: OperationLogFilterValues) => void;
  onRefresh: () => void;
}

interface AdvancedFilters {
  operateType?: string;
  operatePage?: string;
  targetType?: string;
  timeRange?: [Dayjs, Dayjs];
}

const SEARCH_FIELDS: Array<{
  label: string;
  value: SearchField;
}> = [
  { label: '操作人', value: 'operator' },
  { label: '操作目标', value: 'target' },
  { label: '操作详情', value: 'detail' },
  { label: 'IP 地址', value: 'operatorIp' },
];

const SEARCH_PLACEHOLDERS: Record<SearchField, string> = {
  operator: '请输入操作人',
  target: '请输入操作目标',
  detail: '请输入详情关键字',
  operatorIp: '请输入 IP 地址',
};

const clean = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized || undefined;
};

const selectOptions = (values: string[]) =>
  values.map((value) => ({ label: value, value }));

export default function OperationLogFilterBar({
  options,
  loading = false,
  onSearch,
  onRefresh,
}: OperationLogFilterBarProps) {
  const [searchField, setSearchField] =
    useState<SearchField>('operator');
  const [keyword, setKeyword] = useState('');
  const [method, setMethod] = useState<string>();
  const [advanced, setAdvanced] =
    useState<AdvancedFilters>({});
  const [draftAdvanced, setDraftAdvanced] =
    useState<AdvancedFilters>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const methodOptions = useMemo(
    () => Array.from(new Set(options.operationMethods)),
    [options.operationMethods],
  );

  const createFilters = (
    nextKeyword = keyword,
    nextField = searchField,
    nextMethod = method,
    nextAdvanced = advanced,
  ): OperationLogFilterValues => {
    const values: OperationLogFilterValues = {
      operationMethods: nextMethod,
      operateType: nextAdvanced.operateType,
      operatePage: nextAdvanced.operatePage,
      targetType: nextAdvanced.targetType,
      startTime: nextAdvanced.timeRange?.[0]
        ?.startOf('second')
        .valueOf(),
      endTime: nextAdvanced.timeRange?.[1]
        ?.endOf('second')
        .valueOf(),
    };

    const normalizedKeyword = clean(nextKeyword);
    if (normalizedKeyword) {
      values[nextField] = normalizedKeyword;
    }

    return values;
  };

  const submit = () => onSearch(createFilters());

  const changeMethod = (nextMethod?: string) => {
    setMethod(nextMethod);
    onSearch(
      createFilters(keyword, searchField, nextMethod, advanced),
    );
  };

  const changeSearchField = (field: SearchField) => {
    setSearchField(field);
    setKeyword('');
    onSearch(createFilters('', field, method, advanced));
  };

  const applyAdvanced = () => {
    setAdvanced(draftAdvanced);
    setAdvancedOpen(false);
    onSearch(
      createFilters(
        keyword,
        searchField,
        method,
        draftAdvanced,
      ),
    );
  };

  const resetAdvanced = () => {
    const empty: AdvancedFilters = {};
    setAdvanced(empty);
    setDraftAdvanced(empty);
    setAdvancedOpen(false);
    onSearch(
      createFilters(keyword, searchField, method, empty),
    );
  };

  const advancedCount = [
    advanced.operateType,
    advanced.operatePage,
    advanced.targetType,
    advanced.timeRange,
  ].filter(Boolean).length;

  const advancedContent = (
    <div className="w-[360px] max-w-[calc(100vw-48px)] space-y-4 p-1">
      <div>
        <div className="mb-1.5 text-sm text-slate-600">
          操作类型
        </div>
        <Select
          allowClear
          showSearch
          value={draftAdvanced.operateType}
          options={selectOptions(options.operateTypes)}
          placeholder="全部操作类型"
          className="w-full"
          onChange={(value) =>
            setDraftAdvanced((current) => ({
              ...current,
              operateType: value,
            }))
          }
        />
      </div>

      <div>
        <div className="mb-1.5 text-sm text-slate-600">
          操作页面
        </div>
        <Select
          allowClear
          showSearch
          value={draftAdvanced.operatePage}
          options={selectOptions(options.operatePages)}
          placeholder="全部操作页面"
          className="w-full"
          onChange={(value) =>
            setDraftAdvanced((current) => ({
              ...current,
              operatePage: value,
            }))
          }
        />
      </div>

      <div>
        <div className="mb-1.5 text-sm text-slate-600">
          目标类型
        </div>
        <Select
          allowClear
          showSearch
          value={draftAdvanced.targetType}
          options={selectOptions(options.targetTypes)}
          placeholder="全部目标类型"
          className="w-full"
          onChange={(value) =>
            setDraftAdvanced((current) => ({
              ...current,
              targetType: value,
            }))
          }
        />
      </div>

      <div>
        <div className="mb-1.5 text-sm text-slate-600">
          操作时间
        </div>
        <DatePicker.RangePicker
          showTime
          value={draftAdvanced.timeRange}
          className="w-full"
          onChange={(value) =>
            setDraftAdvanced((current) => ({
              ...current,
              timeRange:
                value?.[0] && value?.[1]
                  ? [value[0], value[1]]
                  : undefined,
            }))
          }
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
        <Button onClick={resetAdvanced}>重置</Button>
        <Button type="primary" onClick={applyAdvanced}>
          应用筛选
        </Button>
      </div>
    </div>
  );

  return (
    <div className="mb-4 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
        {[undefined, ...methodOptions].map((value) => {
          const active = method === value;
          return (
            <button
              key={value ?? 'all'}
              type="button"
              className={[
                'shrink-0 rounded px-3 py-1 text-sm font-medium leading-5 transition-colors',
                active
                  ? 'bg-[#f2f2f4] text-[#FE2C55]'
                  : 'bg-[#f2f4f7] text-[#667085] hover:bg-[#e8eaef]',
              ].join(' ')}
              onClick={() => changeMethod(value)}
            >
              {value ?? '全部'}
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex h-8 w-[330px] max-w-full overflow-hidden rounded-md bg-[#f2f2f4]">
          <Select<SearchField>
            value={searchField}
            options={SEARCH_FIELDS}
            variant="borderless"
            popupMatchSelectWidth={120}
            className="h-8 w-[104px] shrink-0"
            onChange={changeSearchField}
          />
          <div className="my-2 w-px shrink-0 bg-slate-200" />
          <Input
            allowClear
            value={keyword}
            variant="borderless"
            placeholder={SEARCH_PLACEHOLDERS[searchField]}
            suffix={
              <SearchOutlined
                className="cursor-pointer text-slate-400 hover:text-slate-700"
                onClick={submit}
              />
            }
            className="min-w-0 flex-1 !h-8 !bg-transparent !shadow-none"
            onChange={(event) => {
              const value = event.target.value;
              setKeyword(value);
              if (!value) {
                onSearch(
                  createFilters('', searchField, method, advanced),
                );
              }
            }}
            onPressEnter={submit}
          />
        </div>

        <Popover
          trigger="click"
          placement="bottomRight"
          open={advancedOpen}
          content={advancedContent}
          onOpenChange={(open) => {
            setAdvancedOpen(open);
            if (open) setDraftAdvanced(advanced);
          }}
        >
          <Button icon={<FilterOutlined />}>
            高级筛选
            {advancedCount > 0 ? ` (${advancedCount})` : ''}
          </Button>
        </Popover>

        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={onRefresh}
        >
          刷新
        </Button>
      </div>
    </div>
  );
}
