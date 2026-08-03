import { SearchOutlined } from '@ant-design/icons';
import { Button, Empty, Input } from 'antd';
import { useMemo, useState } from 'react';

import { COMMON_DB_OPTIONS } from '../constants';
import DatabaseIcons from '../icon/DatabaseIcons';
import type { DataSourceGroup } from '../types';

interface DataSourceTypeSelectorProps {
  dataSourceGroups: DataSourceGroup[];
  onSelect: (dbType: string) => void;
}

const DataSourceTypeSelector = ({
  dataSourceGroups,
  onSelect,
}: DataSourceTypeSelectorProps) => {
  const [query, setQuery] = useState('');
  const [selectedGroupName, setSelectedGroupName] =
    useState<string | null>(null);

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
        searchText: [
          item.dbType,
          item.connectorType,
          item.type,
          group.groupName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      })),
    );
  }, [dataSourceGroups]);

  const filteredDatasourceList = useMemo(() => {
    return flatDatasourceList.filter((item) => {
      const matchGroup =
        selectedGroupName === null ||
        item.groupName === selectedGroupName;

      const matchKeyword =
        !keyword || item.searchText.includes(keyword);

      return matchGroup && matchKeyword;
    });
  }, [flatDatasourceList, keyword, selectedGroupName]);

  const suggestedDatasourceList = useMemo(() => {
    return COMMON_DB_OPTIONS.map((common) => {
      const matched = flatDatasourceList.find((item) => {
        const dbType = item.dbType?.toLowerCase();
        const value = common.value?.toLowerCase();
        const label = common.label?.toLowerCase();

        return dbType === value || dbType === label;
      });

      return {
        ...common,
        dbType: matched?.dbType || common.value,
        groupName: matched?.groupName,
      };
    })
      .filter((item) => Boolean(item.dbType))
      .slice(0, 3);
  }, [flatDatasourceList]);

  const showSuggested =
    !keyword &&
    selectedGroupName === null &&
    suggestedDatasourceList.length > 0;

  const renderCount = (count: number, active: boolean) => {
    return (
      <span
        className={[
          'ml-1 inline-flex min-w-[16px] justify-center rounded-full px-1',
          'text-[10px] leading-4',
          active
            ? 'bg-white/20 text-white'
            : 'bg-[#f2f4f7] text-[#8a8f99]',
        ].join(' ')}
      >
        {count}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Input
          allowClear
          variant="filled"
          prefix={<SearchOutlined className="text-[#98a2b3]" />}
          placeholder="搜索 MySQL、PostgreSQL、Oracle..."
          value={query}
          className="!h-8 !rounded-lg"
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="mt-2.5 flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-[#667085]">
            类型
          </span>

          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
            <Button
              type={selectedGroupName === null ? 'primary' : 'default'}
              size="small"
              className="!h-7 shrink-0 !rounded-md !px-2.5 !text-xs"
              onClick={() => setSelectedGroupName(null)}
            >
              全部
              {renderCount(
                totalDatasourceCount,
                selectedGroupName === null,
              )}
            </Button>

            {dataSourceGroups.map((group) => {
              const active = selectedGroupName === group.groupName;

              return (
                <Button
                  key={group.groupName}
                  type={active ? 'primary' : 'default'}
                  size="small"
                  className="!h-7 shrink-0 !rounded-md !px-2.5 !text-xs"
                  onClick={() =>
                    setSelectedGroupName((previous) =>
                      previous === group.groupName
                        ? null
                        : group.groupName,
                    )
                  }
                >
                  {group.groupName}
                  {renderCount(group.datasourceList.length, active)}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {showSuggested && (
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#161823]">
              常用数据源
            </span>

            <span className="text-[11px] text-[#98a2b3]">
              点击直接创建
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {suggestedDatasourceList.map((item) => (
              <button
                key={item.dbType}
                type="button"
                className={[
                  'group flex h-[42px] min-w-0 items-center gap-2',
                  'rounded-lg border border-[#e8e9ec] bg-white px-2.5',
                  'text-left transition-colors duration-150',
                  'hover:border-[var(--ant-color-primary-border)]',
                  'hover:bg-[var(--ant-color-primary-bg)]',
                ].join(' ')}
                onClick={() => onSelect(item.dbType)}
              >
                <div
                  className={[
                    'flex h-[26px] w-[26px] shrink-0 items-center justify-center',
                    'rounded-md border border-[#eef0f3] bg-[#f5f6f7]',
                    'transition-colors duration-150',
                    'group-hover:border-[var(--ant-color-primary-border)]',
                    'group-hover:bg-[var(--ant-color-primary-bg)]',
                  ].join(' ')}
                >
                  <DatabaseIcons
                    dbType={item.dbType}
                    width="13px"
                    height="13px"
                  />
                </div>

                <div
                  className={[
                    'min-w-0 flex-1 truncate text-xs font-semibold',
                    'text-[#344054] transition-colors duration-150',
                    'group-hover:text-[var(--ant-color-primary)]',
                  ].join(' ')}
                  title={item.label}
                >
                  {item.label}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="min-h-0">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#161823]">
            数据源类型
          </span>

          <span className="text-[11px] text-[#98a2b3]">
            {filteredDatasourceList.length} 个连接器
          </span>
        </div>

        {filteredDatasourceList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d0d5dd] bg-[#fcfcfd] px-5 py-6">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="未找到匹配的数据源类型"
            />
          </div>
        ) : (
          <div className="max-h-[260px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDatasourceList.map((item) => (
                <button
                  key={[
                    item.groupName,
                    item.dbType,
                    item.connectorType || item.type || '',
                  ].join('-')}
                  type="button"
                  className={[
                    'group flex h-[42px] min-w-0 items-center gap-2',
                    'rounded-lg border border-[#e8e9ec] bg-white px-2.5',
                    'text-left transition-colors duration-150',
                    'hover:border-[var(--ant-color-primary-border)]',
                    'hover:bg-[var(--ant-color-primary-bg)]',
                  ].join(' ')}
                  onClick={() => onSelect(item.dbType)}
                >
                  <div
                    className={[
                      'flex h-[26px] w-[26px] shrink-0 items-center justify-center',
                      'rounded-md border border-[#eef0f3] bg-[#f5f6f7]',
                      'transition-colors duration-150',
                      'group-hover:border-[var(--ant-color-primary-border)]',
                      'group-hover:bg-[var(--ant-color-primary-bg)]',
                    ].join(' ')}
                  >
                    <DatabaseIcons
                      dbType={item.dbType}
                      width="13px"
                      height="13px"
                    />
                  </div>

                  <div
                    className={[
                      'min-w-0 flex-1 truncate text-xs font-medium',
                      'text-[#344054] transition-colors duration-150',
                      'group-hover:text-[var(--ant-color-primary)]',
                    ].join(' ')}
                    title={item.dbType}
                  >
                    {item.dbType}
                  </div>

                  <span
                    className={[
                      'max-w-[76px] shrink-0 truncate rounded-md',
                      'bg-[#f2f4f7] px-2 py-0.5',
                      'text-[10px] leading-4 text-[#667085]',
                    ].join(' ')}
                    title={item.groupName}
                  >
                    {item.groupName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default DataSourceTypeSelector;