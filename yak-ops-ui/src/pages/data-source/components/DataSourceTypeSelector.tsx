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
      (total, group) =>
        total + group.datasourceList.length,
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
        !keyword ||
        item.searchText.includes(keyword);

      return matchGroup && matchKeyword;
    });
  }, [
    flatDatasourceList,
    keyword,
    selectedGroupName,
  ]);

  const suggestedDatasourceList = useMemo(() => {
    return COMMON_DB_OPTIONS.map((common) => {
      const matched = flatDatasourceList.find(
        (item) => {
          const dbType =
            item.dbType?.toLowerCase();
          const value =
            common.value?.toLowerCase();
          const label =
            common.label?.toLowerCase();

          return (
            dbType === value ||
            dbType === label
          );
        },
      );

      return {
        ...common,
        dbType:
          matched?.dbType || common.value,
        connectorType:
          matched?.connectorType,
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

  const renderCount = (
    count: number,
    active: boolean,
  ) => {
    return (
      <span
        className={[
          'ml-1 inline-flex min-w-[17px] justify-center rounded-full px-1',
          'text-[10px] leading-[17px]',
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
    <div className="flex flex-col gap-4">
      <div>
        <Input
          allowClear
          variant="filled"
          prefix={
            <SearchOutlined className="text-[#98a2b3]" />
          }
          placeholder="搜索 MySQL、PostgreSQL、Oracle..."
          value={query}
          className="!h-9 !rounded-lg"
          onChange={(event) =>
            setQuery(event.target.value)
          }
        />

        <div className="mt-3 flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-[#667085]">
            类型
          </span>

          <div
            className={[
              'flex min-w-0 flex-1 items-center gap-1.5',
              'overflow-x-auto pb-1',
            ].join(' ')}
          >
            <Button
              type={
                selectedGroupName === null
                  ? 'primary'
                  : 'default'
              }
              size="small"
              className="!h-7 shrink-0 !rounded-md !px-2.5 !text-xs"
              onClick={() =>
                setSelectedGroupName(null)
              }
            >
              全部
              {renderCount(
                totalDatasourceCount,
                selectedGroupName === null,
              )}
            </Button>

            {dataSourceGroups.map((group) => {
              const active =
                selectedGroupName ===
                group.groupName;

              return (
                <Button
                  key={group.groupName}
                  type={
                    active
                      ? 'primary'
                      : 'default'
                  }
                  size="small"
                  className="!h-7 shrink-0 !rounded-md !px-2.5 !text-xs"
                  onClick={() =>
                    setSelectedGroupName(
                      (previous) =>
                        previous ===
                        group.groupName
                          ? null
                          : group.groupName,
                    )
                  }
                >
                  {group.groupName}

                  {renderCount(
                    group.datasourceList.length,
                    active,
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {showSuggested && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#161823]">
              常用数据源
            </span>

            <span className="text-xs text-[#98a2b3]">
              点击直接创建
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {suggestedDatasourceList.map(
              (item) => (
                <button
                  key={item.dbType}
                  type="button"
                  className={[
                    'group flex min-h-[52px] min-w-0 items-center gap-2.5',
                    'rounded-lg border border-[#e8e9ec] bg-white px-3 py-2',
                    'text-left transition-colors duration-150',
                    'hover:border-[#bcc8f5] hover:bg-[#fafbff]',
                  ].join(' ')}
                  onClick={() =>
                    onSelect(item.dbType)
                  }
                >
                  <div
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center',
                      'rounded-lg border border-[#eef0f3] bg-[#f5f6f7]',
                    ].join(' ')}
                  >
                    <DatabaseIcons
                      dbType={item.dbType}
                      width="16px"
                      height="16px"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-[#344054]">
                      {item.label}
                    </div>

                    <div className="mt-0.5 truncate text-[11px] text-[#98a2b3]">
                      {item.connectorType ||
                        item.groupName ||
                        '常用连接器'}
                    </div>
                  </div>
                </button>
              ),
            )}
          </div>
        </section>
      )}

      <section className="min-h-0">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#161823]">
            数据源类型
          </span>

          <span className="text-xs text-[#98a2b3]">
            {filteredDatasourceList.length} 个连接器
          </span>
        </div>

        {filteredDatasourceList.length === 0 ? (
          <div
            className={[
              'rounded-lg border border-dashed border-[#d0d5dd]',
              'bg-[#fcfcfd] px-5 py-6',
            ].join(' ')}
          >
            <Empty
              image={
                Empty.PRESENTED_IMAGE_SIMPLE
              }
              description="未找到匹配的数据源类型"
            />
          </div>
        ) : (
          <div
            className={[
              'max-h-[316px] overflow-y-auto pr-1',
              'scrollbar-thin scrollbar-track-transparent',
            ].join(' ')}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDatasourceList.map(
                (item) => (
                  <button
                    key={[
                      item.groupName,
                      item.dbType,
                      item.connectorType ||
                        item.type ||
                        '',
                    ].join('-')}
                    type="button"
                    className={[
                      'group flex min-h-[56px] min-w-0 items-center gap-2.5',
                      'rounded-lg border border-[#e8e9ec] bg-white px-3 py-2',
                      'text-left transition-colors duration-150',
                      'hover:border-[#bcc8f5] hover:bg-[#fafbff]',
                    ].join(' ')}
                    onClick={() =>
                      onSelect(item.dbType)
                    }
                  >
                    <div
                      className={[
                        'flex h-8 w-8 shrink-0 items-center justify-center',
                        'rounded-lg border border-[#eef0f3] bg-[#f5f6f7]',
                      ].join(' ')}
                    >
                      <DatabaseIcons
                        dbType={item.dbType}
                        width="16px"
                        height="16px"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-[13px] font-medium text-[#344054]"
                        title={item.dbType}
                      >
                        {item.dbType}
                      </div>

                      <div className="mt-0.5 truncate text-[11px] text-[#98a2b3]">
                        {item.connectorType ||
                          item.type ||
                          '数据源连接器'}
                      </div>
                    </div>

                    <span
                      className={[
                        'max-w-[76px] shrink-0 truncate',
                        'rounded-md bg-[#f2f4f7] px-2 py-1',
                        'text-[10px] leading-4 text-[#667085]',
                      ].join(' ')}
                      title={item.groupName}
                    >
                      {item.groupName}
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default DataSourceTypeSelector;