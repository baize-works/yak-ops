import React, {useMemo, useState} from 'react';
import {Button, Empty, Input} from 'antd';
import {SearchOutlined} from '@ant-design/icons';

import DatabaseIcons from '../icon/DatabaseIcons';
import {COMMON_DB_OPTIONS} from '../constants';
import type {DataSourceGroup} from '../types';

interface DataSourceTypeSelectorProps {
  dataSourceGroups: DataSourceGroup[];
  onSelect: (dbType: string) => void;
}

const DataSourceTypeSelector: React.FC<DataSourceTypeSelectorProps> = ({
                                                                         dataSourceGroups,
                                                                         onSelect,
                                                                       }) => {
  const [query, setQuery] = useState('');
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);

  const keyword = query.trim().toLowerCase();

  const totalDatasourceCount = useMemo(() => {
    return dataSourceGroups.reduce(
      (total, group) => total + group.datasourceList.length,
      0,
    );
  }, [dataSourceGroups]);

  const flatDatasourceList = useMemo(() => {
    return dataSourceGroups.flatMap((group) =>
      group.datasourceList.map((item) => ({
        ...item,
        groupName: group.groupName,
        searchText: `${item.dbType} ${item.connectorType || ''} ${item.type || ''} ${group.groupName}`.toLowerCase(),
      })),
    );
  }, [dataSourceGroups]);

  const filteredDatasourceList = useMemo(() => {
    return flatDatasourceList.filter((item) => {
      const matchGroup =
        selectedGroupName === null || item.groupName === selectedGroupName;
      const matchKeyword = !keyword || item.searchText.includes(keyword);

      return matchGroup && matchKeyword;
    });
  }, [flatDatasourceList, keyword, selectedGroupName]);

  const suggestedDatasourceList = useMemo(() => {
    return COMMON_DB_OPTIONS.map((common) => {
      const matched = flatDatasourceList.find(
        (item) =>
          item.dbType === common.value ||
          item.dbType === common.label ||
          item.dbType?.toLowerCase() === common.value?.toLowerCase() ||
          item.dbType?.toLowerCase() === common.label?.toLowerCase(),
      );

      return {
        ...common,
        dbType: matched?.dbType || common.value,
        connectorType: matched?.connectorType,
        groupName: matched?.groupName,
      };
    }).filter((item) => item.dbType).slice(0, 3);
    ;
  }, [flatDatasourceList]);

  const showSuggested = !keyword && suggestedDatasourceList.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Input
          allowClear
          prefix={<SearchOutlined className="text-[#98A2B3]"/>}
          placeholder="搜索数据源类型，例如 MySQL、PostgreSQL、Oracle..."
          value={query}
          className={[
            '!h-11 !rounded-[24px] !border-[#EAECF0] !bg-white !px-3',
            'hover:!border-[hsl(231_48%_48%/0.45)]',
            'focus-within:!border-[hsl(231_48%_48%)]',
            'focus-within:!shadow-[0_0_0_3px_hsl(231_48%_48%/0.10)]',
          ].join(' ')}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-medium text-[#344054]">
            类型：
          </span>

          <Button
            type={selectedGroupName === null ? 'primary' : 'default'}
            size="small"
            className={[
              '!h-8 !rounded-full !px-3 !text-xs !font-medium',
              selectedGroupName === null
                ? '!border-[hsl(231_48%_48%)] !bg-[hsl(231_48%_48%)]'
                : '!border-[#EAECF0] !text-[#475467] hover:!border-[hsl(231_48%_48%/0.45)] hover:!text-[hsl(231_48%_48%)]',
            ].join(' ')}
            onClick={() => setSelectedGroupName(null)}
          >
            全部
            <span
              className={[
                'ml-1 inline-flex min-w-[18px] justify-center rounded-full px-1.5 text-[11px]',
                selectedGroupName === null
                  ? 'bg-white/20 text-white'
                  : 'bg-[#F2F4F7] text-[#667085]',
              ].join(' ')}
            >
              {totalDatasourceCount}
            </span>
          </Button>

          {dataSourceGroups.map((group) => {
            const active = selectedGroupName === group.groupName;

            return (
              <Button
                key={group.groupName}
                type={active ? 'primary' : 'default'}
                size="small"
                className={[
                  '!h-8 !rounded-full !px-3 !text-xs !font-medium',
                  active
                    ? '!border-[hsl(231_48%_48%)] !bg-[hsl(231_48%_48%)]'
                    : '!border-[#EAECF0] !text-[#475467] hover:!border-[hsl(231_48%_48%/0.45)] hover:!text-[hsl(231_48%_48%)]',
                ].join(' ')}
                onClick={() =>
                  setSelectedGroupName((prev) =>
                    prev === group.groupName ? null : group.groupName,
                  )
                }
              >
                {group.groupName}
                <span
                  className={[
                    'ml-1 inline-flex min-w-[18px] justify-center rounded-full px-1.5 text-[11px]',
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-[#F2F4F7] text-[#667085]',
                  ].join(' ')}
                >
                  {group.datasourceList.length}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {showSuggested && (
        <section className="rounded-2xl border border-[hsl(231_48%_48%/0.10)] bg-[hsl(231_48%_48%/0.06)] p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-[#101828]">
              推荐数据源
            </div>
            <div className="text-xs text-[#667085]">
              常用连接器，点击即可创建
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {suggestedDatasourceList.map((item) => (
              <button
                key={item.dbType}
                type="button"
                className={[
                  'group flex min-h-[66px] items-center gap-3 rounded-xl',
                  'border border-[#EAECF0] bg-white px-4 py-3 text-left',
                  'shadow-[0_6px_14px_rgba(16,24,40,0.05)]',
                  'transition-all duration-200 ease-out',
                  'hover:-translate-y-0.5 hover:border-[hsl(231_48%_48%/0.35)]',
                  'hover:shadow-[0_10px_22px_rgba(15,23,42,0.08)]',
                ].join(' ')}
                onClick={() => onSelect(item.dbType)}
              >
                <div
                  className={[
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    'border border-[#EEF2F6] bg-[#F9FAFB]',
                    'transition-all duration-200 ease-out',
                    'group-hover:bg-[hsl(231_48%_48%/0.06)]',
                  ].join(' ')}
                >
                  <DatabaseIcons dbType={item.dbType} width="18px" height="18px"/>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#344054] group-hover:text-[hsl(231_48%_48%)]">
                    {item.label}
                  </div>
                  <div className="mt-1 truncate text-xs text-[#98A2B3]">
                    {item.connectorType || item.groupName || '快速选择'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-[#101828]">
            数据源类型
          </div>
          <div className="text-xs text-[#667085]">
            {filteredDatasourceList.length} 个连接器
          </div>
        </div>

        {filteredDatasourceList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-[#FCFCFD] px-6 py-10 text-center">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="未找到匹配的数据源类型"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDatasourceList.map((item) => (
              <button
                key={`${item.groupName}-${item.dbType}-${item.connectorType || item.type || ''}`}
                type="button"
                className={[
                  'group relative flex min-h-[76px] items-center justify-between gap-3',
                  'rounded-2xl border border-[#EAECF0] bg-white px-4 py-3 text-left',
                  'transition-all duration-200 ease-out',
                  'hover:-translate-y-0.5 hover:border-[hsl(231_48%_48%/0.35)]',
                  'hover:bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFBFF_100%)]',
                  'hover:shadow-[0_10px_22px_rgba(15,23,42,0.07)]',
                ].join(' ')}
                onClick={() => onSelect(item.dbType)}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className={[
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      'border border-[#EEF2F6] bg-[#F9FAFB]',
                      'transition-all duration-200 ease-out',
                      'group-hover:border-[hsl(231_48%_48%/0.18)]',
                      'group-hover:bg-[hsl(231_48%_48%/0.06)]',
                    ].join(' ')}
                  >
                    <DatabaseIcons dbType={item.dbType} width="17px" height="17px"/>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-sm font-semibold text-[#344054] transition-colors group-hover:text-[hsl(231_48%_48%)]"
                      title={item.dbType}
                    >
                      {item.dbType}
                    </div>

                    <div className="mt-1 truncate text-xs text-[#98A2B3]">
                      {item.connectorType || item.type || '数据源连接器'}
                    </div>
                  </div>
                </div>

                <div
                  className={[
                    'max-w-[96px] shrink-0 truncate rounded-full',
                    'bg-[#F2F4F7] px-2.5 py-1 text-xs font-medium text-[#667085]',
                    'transition-all duration-200 ease-out',
                    'group-hover:bg-[hsl(231_48%_48%/0.08)]',
                    'group-hover:text-[hsl(231_48%_48%)]',
                  ].join(' ')}
                  title={item.groupName}
                >
                  {item.groupName}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DataSourceTypeSelector;
