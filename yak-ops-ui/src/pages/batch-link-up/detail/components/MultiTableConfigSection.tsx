import {
  DatabaseOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { Input, Select, Switch } from 'antd';
import type { ReactNode } from 'react';

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
  description: string;
  children: ReactNode;
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

        <div>
          <div className="text-[14px] font-semibold text-[#182230]">
            {title}
          </div>
          <div className="mt-0.5 text-[11px] leading-5 text-[#667085]">
            {description}
          </div>
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

  return (
    <EditorSection
      title="多表同步配置"
    >
      <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <EndpointPanel
          icon={<DatabaseOutlined />}
          title="Source 来源配置"
          description="选择一张或多张来源表，也可以通过表名规则批量匹配。"
        >
          <div>
            <FieldLabel required>来源表</FieldLabel>
            <Select
              mode="tags"
              showSearch
              variant="filled"
              disabled={!sourceReady}
              value={sourceConfig.tables || []}
              options={sourceTables.map((table) => ({
                label: table,
                value: table,
              }))}
              loading={sourceLoading}
              placeholder={
                sourceReady
                  ? '请选择一张或多张来源表'
                  : '请先选择来源数据源'
              }
              optionFilterProp="label"
              className="w-full"
              onChange={(tables) =>
                onSourceChange({
                  tables,
                  table: tables?.[0] || '',
                })
              }
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
