import {
  ArrowRightOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { Input, Select, Tag } from 'antd';
import { useMemo } from 'react';

import type { DataSourceRecord } from '@/pages/data-source/types';
import {
  BRAND_COLOR,
  BRAND_COLOR_SOFT_HOVER,
} from '@/styles/brand';

import {
  applyEndpointSelection,
  type EndpointKind,
  type SyncEditorState,
} from '../model';
import EditorSection, { EditorField } from './EditorSection';

interface TaskBasicSectionProps {
  editor: SyncEditorState;
  dataSources: DataSourceRecord[];
  dataSourceLoading: boolean;
  onChange: (value: SyncEditorState) => void;
}

const modeLabel = {
  GUIDE_SINGLE: '单表同步',
  GUIDE_MULTI: '多表同步',
} as const;

const normalizeType = (value?: string) =>
  String(value || '').trim().toUpperCase();

const compatibleDataSources = (
  records: DataSourceRecord[],
  dbType: string,
) => {
  const expected = normalizeType(dbType);

  if (!expected) return records;

  const matched = records.filter(
    (record) => normalizeType(record.dbType) === expected,
  );

  return matched.length > 0 ? matched : records;
};

const toOptions = (records: DataSourceRecord[]) =>
  records
    .filter((record) => record.id !== undefined && record.id !== null)
    .map((record) => ({
      label: `${record.name || record.id} · ${record.dbType || 'UNKNOWN'}`,
      value: String(record.id),
    }));

export default function TaskBasicSection({
  editor,
  dataSources,
  dataSourceLoading,
  onChange,
}: TaskBasicSectionProps) {
  const sourceRecords = useMemo(
    () => compatibleDataSources(dataSources, editor.basic.sourceType),
    [dataSources, editor.basic.sourceType],
  );

  const targetRecords = useMemo(
    () => compatibleDataSources(dataSources, editor.basic.targetType),
    [dataSources, editor.basic.targetType],
  );

  const updateBasic = (
    patch: Partial<SyncEditorState['basic']>,
  ) => {
    onChange({
      ...editor,
      basic: {
        ...editor.basic,
        ...patch,
      },
    });
  };

  const selectEndpoint = (
    kind: EndpointKind,
    id: string,
  ) => {
    const record = dataSources.find(
      (item) => String(item.id) === String(id),
    );

    if (!record) return;

    onChange(applyEndpointSelection(editor, kind, record));
  };

  return (
    <EditorSection
      title="任务基础信息"
      description="确认任务信息和同步链路。本版本不执行连接测试，选择数据源后可直接配置数据表。"
    >
      <div className="space-y-5">
        <EditorField label="任务名称" required>
          <Input
            value={editor.basic.jobName}
            maxLength={64}
            showCount
            variant="filled"
            placeholder="请输入任务名称"
            onChange={(event) =>
              updateBasic({ jobName: event.target.value })
            }
          />
        </EditorField>

        <EditorField label="任务描述">
          <Input.TextArea
            value={editor.basic.jobDesc}
            rows={4}
            maxLength={200}
            showCount
            variant="filled"
            placeholder="请说明业务场景、同步范围和使用目的"
            onChange={(event) =>
              updateBasic({ jobDesc: event.target.value })
            }
          />
        </EditorField>

        <EditorField
          label="同步链路"
          required
          hint="来源端和目标端在这里直接选择，不再单独进行连接测试。"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_42px_minmax(0,1fr)] items-center gap-3 max-md:grid-cols-1">
            <div className="rounded-lg border border-[#ebecef] bg-[#fcfcfd] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[12px] font-medium text-[#667085]">
                  Source 来源端
                </span>

                <Tag className="!m-0 !border-[#ffd1da] !bg-[#fff4f6] !text-[11px] !text-[var(--yak-brand-color)]">
                  {editor.basic.sourceType || 'SOURCE'}
                </Tag>
              </div>

              <Select
                showSearch
                variant="filled"
                value={editor.basic.sourceDataSourceId || undefined}
                options={toOptions(sourceRecords)}
                loading={dataSourceLoading}
                optionFilterProp="label"
                placeholder="请选择来源数据源"
                className="w-full"
                onChange={(id) => selectEndpoint('source', id)}
              />
            </div>

            <div className="flex items-center justify-center text-[18px] text-[#98a2b3] max-md:rotate-90">
              <ArrowRightOutlined />
            </div>

            <div className="rounded-lg border border-[#ebecef] bg-[#fcfcfd] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[12px] font-medium text-[#667085]">
                  Sink 目标端
                </span>

                <Tag className="!m-0 !border-[#ffd1da] !bg-[#fff4f6] !text-[11px] !text-[var(--yak-brand-color)]">
                  {editor.basic.targetType || 'SINK'}
                </Tag>
              </div>

              <Select
                showSearch
                variant="filled"
                value={editor.basic.targetDataSourceId || undefined}
                options={toOptions(targetRecords)}
                loading={dataSourceLoading}
                optionFilterProp="label"
                placeholder="请选择目标数据源"
                className="w-full"
                onChange={(id) => selectEndpoint('sink', id)}
              />
            </div>
          </div>
        </EditorField>

        <EditorField label="同步类型">
          <div className="flex h-10 items-center gap-3 rounded-lg bg-[#f5f5f6] px-3">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{
                color: BRAND_COLOR,
                backgroundColor: BRAND_COLOR_SOFT_HOVER,
              }}
            >
              <DatabaseOutlined />
            </span>

            <span className="text-[13px] font-medium text-[#344054]">
              {modeLabel[editor.mode]}
            </span>

            <span className="text-[11px] text-[#98a2b3]">
              创建后不可切换类型
            </span>
          </div>
        </EditorField>
      </div>
    </EditorSection>
  );
}
