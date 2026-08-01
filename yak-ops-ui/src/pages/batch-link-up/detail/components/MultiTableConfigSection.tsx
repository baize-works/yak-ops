import {
  DatabaseOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import {
  Empty,
  Input,
  Select,
  Spin,
  Switch,
  Transfer,
} from 'antd';
import { useMemo, type ReactNode } from 'react';

import EditorSection from './EditorSection';

interface MultiTableConfigSectionProps {
  sourceConfig: Record<string, any>;
  sinkConfig: Record<string, any>;
  sourceTables: string[];
  sourceLoading: boolean;
  sourceReady: boolean;
  targetReady: boolean;
  onSourceChange: (patch: Record<string, any>) => void;
  onSinkChange: (patch: Record<string, any>) => void;
}

interface EndpointPanelProps {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}

interface TableTransferItem {
  key: string;
  title: string;
}

function EndpointPanel({
  icon,
  title,
  description,
  children,
}: EndpointPanelProps) {
  return (
    <div className="rounded-xl border border-[#ebecef] bg-[#fcfcfd] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--yak-brand-color-soft-hover)] text-[var(--yak-brand-color)]">
          {icon}
        </span>

        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[#182230]">
            {title}
          </div>

          {description ? (
            <div className="mt-0.5 text-[11px] leading-5 text-[#667085]">
              {description}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

function FieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="mb-2 text-[12px] font-medium text-[#475467]">
      {children}
      {required ? (
        <span className="ml-1 text-[var(--yak-brand-color)]">*</span>
      ) : null}
    </div>
  );
}

export default function MultiTableConfigSection({
  sourceConfig,
  sinkConfig,
  sourceTables,
  sourceLoading,
  sourceReady,
  targetReady,
  onSourceChange,
  onSinkChange,
}: MultiTableConfigSectionProps) {
  const tableNamingRule =
    sinkConfig.tableNamingRule || 'same_name';

  const selectedTables = useMemo(
    () =>
      Array.isArray(sourceConfig.tables)
        ? sourceConfig.tables.filter(Boolean).map(String)
        : [],
    [sourceConfig.tables],
  );

  const transferDataSource = useMemo<TableTransferItem[]>(
    () =>
      Array.from(new Set([...sourceTables, ...selectedTables])).map(
        (table) => ({
          key: table,
          title: table,
        }),
      ),
    [selectedTables, sourceTables],
  );

  return (
    <EditorSection title="多表同步配置">
      <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <EndpointPanel
          icon={<DatabaseOutlined />}
          title="Source 来源配置"
          description="从来源数据源中批量选择需要同步的数据表。"
        >
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[12px] font-medium text-[#475467]">
                来源表
                <span className="ml-1 text-[var(--yak-brand-color)]">
                  *
                </span>
              </div>

              <span className="text-[11px] text-[#98a2b3]">
                已选择 {selectedTables.length} 张表
              </span>
            </div>

            <Transfer<TableTransferItem>
              dataSource={transferDataSource}
              targetKeys={selectedTables}
              disabled={!sourceReady || sourceLoading}
              showSearch
              showSelectAll
              operations={['添加', '移除']}
              titles={[
                `可选表 (${sourceTables.length})`,
                `已选表 (${selectedTables.length})`,
              ]}
              listStyle={{
                width: 'calc(50% - 28px)',
                height: 320,
              }}
              locale={{
                itemUnit: '项',
                itemsUnit: '项',
                searchPlaceholder: '搜索表名',
                notFoundContent: sourceLoading ? (
                  <Spin size="small" />
                ) : sourceReady ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无数据表"
                  />
                ) : (
                  '请先选择来源数据源'
                ),
              }}
              filterOption={(inputValue, item) =>
                item.title
                  .toLowerCase()
                  .includes(inputValue.trim().toLowerCase())
              }
              render={(item) => (
                <span className="block truncate" title={item.title}>
                  {item.title}
                </span>
              )}
              className="w-full"
              onChange={(targetKeys) => {
                const tables = targetKeys.map(String);

                onSourceChange({
                  tables,
                  table: tables[0] || '',
                });
              }}
            />
          </div>

          <div>
            <FieldLabel>表名过滤规则</FieldLabel>
            <Input
              variant="filled"
              disabled={!sourceReady}
              value={sourceConfig.tablePattern || ''}
              placeholder="可选，例如：ods_*"
              onChange={(event) =>
                onSourceChange({
                  tablePattern: event.target.value,
                })
              }
            />

            <div className="mt-1.5 text-[11px] leading-5 text-[#98a2b3]">
              可与已选表同时使用，运行时会合并匹配结果并自动去重。
            </div>
          </div>
        </EndpointPanel>

        <EndpointPanel
          icon={<ExportOutlined />}
          title="Sink 目标配置"
          description="统一配置目标表命名规则、建表方式和写入策略。"
        >
          <div className="flex items-center justify-between rounded-lg bg-[#f5f5f6] px-3.5 py-3">
            <div>
              <div className="text-[12px] font-medium text-[#475467]">
                自动创建目标表
              </div>
            </div>

            <Switch
              checked={Boolean(sinkConfig.autoCreateTable)}
              onChange={(autoCreateTable) =>
                onSinkChange({ autoCreateTable })
              }
            />
          </div>

          <div>
            <FieldLabel required>目标表命名</FieldLabel>
            <Select
              variant="filled"
              disabled={!targetReady}
              value={tableNamingRule}
              options={[
                { label: '保持来源表名', value: 'same_name' },
                { label: '增加统一前缀', value: 'prefix' },
                { label: '增加统一后缀', value: 'suffix' },
              ]}
              className="w-full"
              onChange={(value) =>
                onSinkChange({ tableNamingRule: value })
              }
            />
          </div>

          {tableNamingRule !== 'same_name' ? (
            <div>
              <FieldLabel required>
                {tableNamingRule === 'prefix'
                  ? '目标表名前缀'
                  : '目标表名后缀'}
              </FieldLabel>
              <Input
                variant="filled"
                disabled={!targetReady}
                value={sinkConfig.tableNameAffix || ''}
                placeholder={
                  tableNamingRule === 'prefix'
                    ? '例如：dw_'
                    : '例如：_bak'
                }
                onChange={(event) =>
                  onSinkChange({
                    tableNameAffix: event.target.value,
                  })
                }
              />
            </div>
          ) : null}

          <div>
            <FieldLabel required>写入模式</FieldLabel>
            <Select
              variant="filled"
              value={sinkConfig.writeMode || 'append'}
              options={[
                { label: '追加写入 Append', value: 'append' },
                { label: '覆盖写入 Overwrite', value: 'overwrite' },
                { label: '主键更新 Upsert', value: 'upsert' },
              ]}
              className="w-full"
              onChange={(writeMode) =>
                onSinkChange({ writeMode })
              }
            />
          </div>

          {sinkConfig.writeMode === 'upsert' ? (
            <div>
              <FieldLabel required>主键字段</FieldLabel>
              <Input
                variant="filled"
                value={sinkConfig.primaryKey || ''}
                placeholder="多个字段使用英文逗号分隔"
                onChange={(event) =>
                  onSinkChange({ primaryKey: event.target.value })
                }
              />
            </div>
          ) : null}
        </EndpointPanel>
      </div>
    </EditorSection>
  );
}
