import {
  DatabaseOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import {
  Input,
  Segmented,
  Select,
  Spin,
  Switch,
} from 'antd';
import type { ChangeEvent, ReactNode } from 'react';

import type { DataSourceColumnOption } from '../hooks/useDataSourceColumns';
import EditorSection from './EditorSection';

interface SingleTableConfigSectionProps {
  sourceConfig: Record<string, any>;
  sinkConfig: Record<string, any>;
  sourceTables: string[];
  targetTables: string[];
  sourceLoading: boolean;
  targetLoading: boolean;
  primaryKeyOptions: DataSourceColumnOption[];
  primaryKeyLoading: boolean;
  sourceReady: boolean;
  targetReady: boolean;
  onSourceChange: (patch: Record<string, any>) => void;
  onSinkChange: (patch: Record<string, any>) => void;
}

interface EndpointPanelProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

function EndpointPanel({ icon, title, children }: EndpointPanelProps) {
  return (
    <div className="rounded-xl border border-[#ebecef] bg-[#fcfcfd] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--yak-brand-color-soft-hover)] text-[var(--yak-brand-color)]">
          {icon}
        </span>
        <div className="text-[14px] font-semibold text-[#182230]">{title}</div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <div className="mb-2 text-[12px] font-medium text-[#475467]">
      {children}
      {required ? <span className="ml-1 text-[var(--yak-brand-color)]">*</span> : null}
    </div>
  );
}

const splitPrimaryKeys = (value: unknown): string[] =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export default function SingleTableConfigSection({
  sourceConfig,
  sinkConfig,
  sourceTables,
  targetTables,
  sourceLoading,
  targetLoading,
  primaryKeyOptions,
  primaryKeyLoading,
  sourceReady,
  targetReady,
  onSourceChange,
  onSinkChange,
}: SingleTableConfigSectionProps) {
  return (
    <EditorSection title="单表同步配置">
      <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <EndpointPanel icon={<DatabaseOutlined />} title="Source 来源配置">
          <div>
            <FieldLabel>读取方式</FieldLabel>
            <Segmented
              block
              value={sourceConfig.readMode || 'table'}
              options={[
                { label: '选择数据表', value: 'table' },
                { label: '自定义 SQL', value: 'sql' },
              ]}
              onChange={(readMode: string | number) =>
                onSourceChange({
                  readMode,
                  ...(readMode === 'table' ? { sql: '' } : { table: '' }),
                })
              }
            />
          </div>

          {sourceConfig.readMode === 'sql' ? (
            <div>
              <FieldLabel required>查询 SQL</FieldLabel>
              <Input.TextArea
                rows={10}
                variant="filled"
                value={sourceConfig.sql || ''}
                placeholder="SELECT * FROM source_table"
                className="font-mono"
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onSourceChange({ sql: event.target.value })}
              />
            </div>
          ) : (
            <div>
              <FieldLabel required>来源表</FieldLabel>
              <Select
                showSearch
                variant="filled"
                disabled={!sourceReady}
                value={sourceConfig.table || undefined}
                options={sourceTables.map((table) => ({ label: table, value: table }))}
                loading={sourceLoading}
                notFoundContent={sourceLoading ? <Spin size="small" /> : undefined}
                placeholder={sourceReady ? '请选择来源表' : '请先选择来源数据源'}
                optionFilterProp="label"
                className="w-full"
                onChange={(table: string) => onSourceChange({ table })}
              />
            </div>
          )}
        </EndpointPanel>

        <EndpointPanel icon={<ExportOutlined />} title="Sink 目标配置">
          <div className="flex items-center justify-between rounded-lg bg-[#f5f5f6] px-3.5 py-3">
            <div className="text-[12px] font-medium text-[#475467]">自动创建目标表</div>
            <Switch
              checked={Boolean(sinkConfig.autoCreateTable)}
              onChange={(autoCreateTable: boolean) =>
                onSinkChange({
                  autoCreateTable,
                  table: '',
                  targetTableName: '',
                  primaryKey: '',
                })
              }
            />
          </div>

          {sinkConfig.autoCreateTable ? (
            <div>
              <FieldLabel required>目标表名</FieldLabel>
              <Input
                variant="filled"
                disabled={!targetReady}
                value={sinkConfig.targetTableName || ''}
                placeholder={targetReady ? '请输入需要创建的目标表名' : '请先选择目标数据源'}
                onChange={(event: ChangeEvent<HTMLInputElement>) => onSinkChange({ targetTableName: event.target.value })}
              />
            </div>
          ) : (
            <div>
              <FieldLabel required>目标表</FieldLabel>
              <Select
                showSearch
                variant="filled"
                disabled={!targetReady}
                value={sinkConfig.table || undefined}
                options={targetTables.map((table) => ({ label: table, value: table }))}
                loading={targetLoading}
                placeholder={targetReady ? '请选择目标表' : '请先选择目标数据源'}
                optionFilterProp="label"
                className="w-full"
                onChange={(table: string) => onSinkChange({ table, primaryKey: '' })}
              />
            </div>
          )}

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
              onChange={(writeMode: string) =>
                onSinkChange({
                  writeMode,
                  ...(writeMode === 'upsert' ? {} : { primaryKey: '' }),
                })
              }
            />
          </div>

          {sinkConfig.writeMode === 'upsert' ? (
            <div>
              <FieldLabel required>主键字段</FieldLabel>
              <Select
                mode="tags"
                allowClear
                showSearch
                variant="filled"
                value={splitPrimaryKeys(sinkConfig.primaryKey)}
                loading={primaryKeyLoading}
                disabled={!targetReady}
                options={primaryKeyOptions.map((option) => ({
                  label: option.description
                    ? `${option.label} · ${option.description}`
                    : option.label,
                  value: option.value,
                }))}
                placeholder={
                  primaryKeyLoading
                    ? '正在加载字段'
                    : primaryKeyOptions.length > 0
                      ? '请选择一个或多个主键字段'
                      : '请先选择来源或目标表'
                }
                optionFilterProp="label"
                className="w-full"
                onChange={(primaryKeys: string[]) =>
                  onSinkChange({ primaryKey: primaryKeys.join(',') })
                }
              />
            </div>
          ) : null}
        </EndpointPanel>
      </div>
    </EditorSection>
  );
}
