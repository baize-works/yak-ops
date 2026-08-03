import {
  DeleteOutlined,
  PlusOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Button, Empty, Input, Select, Tag } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { DataSourceColumnOption } from '../hooks/useDataSourceColumns';
import EditorSection from './EditorSection';

interface FieldMappingSectionProps {
  sourceColumns: DataSourceColumnOption[];
  targetColumns: DataSourceColumnOption[];
  sourceLoading: boolean;
  targetLoading: boolean;
  sourceReady: boolean;
  targetReady: boolean;
  targetDerived?: boolean;
}

interface FieldMappingRow {
  key: string;
  sourceField?: string;
  targetField?: string;
}

const normalizeFieldName = (value: string) => value.trim().toLowerCase();

let mappingRowSeed = 0;

const createMappingKey = (index: number) => {
  mappingRowSeed += 1;
  return `mapping-${mappingRowSeed}-${index}`;
};

const buildSameNameMappings = (
  sourceColumns: DataSourceColumnOption[],
  targetColumns: DataSourceColumnOption[],
): FieldMappingRow[] => {
  const targetMap = new Map(
    targetColumns.map((column) => [normalizeFieldName(column.value), column.value]),
  );

  return sourceColumns
    .map((column, index) => {
      const targetField = targetMap.get(normalizeFieldName(column.value));
      if (!targetField) return null;
      return {
        key: createMappingKey(index),
        sourceField: column.value,
        targetField,
      };
    })
    .filter(Boolean) as FieldMappingRow[];
};

const buildPositionMappings = (
  sourceColumns: DataSourceColumnOption[],
  targetColumns: DataSourceColumnOption[],
): FieldMappingRow[] => {
  const size = Math.min(sourceColumns.length, targetColumns.length);

  return Array.from({ length: size }, (_, index) => ({
    key: createMappingKey(index),
    sourceField: sourceColumns[index]?.value,
    targetField: targetColumns[index]?.value,
  }));
};

const fieldType = (column?: DataSourceColumnOption) =>
  column?.description?.split(' · ')[0] || '-';

const filterColumns = (
  columns: DataSourceColumnOption[],
  keyword: string,
) => {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return columns;

  return columns.filter((column) =>
    [column.label, column.value, column.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized)),
  );
};

export default function FieldMappingSection({
  sourceColumns,
  targetColumns,
  sourceLoading,
  targetLoading,
  sourceReady,
  targetReady,
  targetDerived = false,
}: FieldMappingSectionProps) {
  const [rows, setRows] = useState<FieldMappingRow[]>([]);
  const [sourceKeyword, setSourceKeyword] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const initializedKeyRef = useRef('');

  const sourceMap = useMemo(
    () => new Map(sourceColumns.map((column) => [column.value, column])),
    [sourceColumns],
  );
  const targetMap = useMemo(
    () => new Map(targetColumns.map((column) => [column.value, column])),
    [targetColumns],
  );

  const filteredSourceColumns = useMemo(
    () => filterColumns(sourceColumns, sourceKeyword),
    [sourceColumns, sourceKeyword],
  );
  const filteredTargetColumns = useMemo(
    () => filterColumns(targetColumns, targetKeyword),
    [targetColumns, targetKeyword],
  );

  const sourceOptions = useMemo(
    () =>
      filteredSourceColumns.map((column) => ({
        label: column.description
          ? `${column.label} · ${column.description}`
          : column.label,
        value: column.value,
      })),
    [filteredSourceColumns],
  );
  const targetOptions = useMemo(
    () =>
      filteredTargetColumns.map((column) => ({
        label: column.description
          ? `${column.label} · ${column.description}`
          : column.label,
        value: column.value,
      })),
    [filteredTargetColumns],
  );

  useEffect(() => {
    const initializeKey = [
      sourceColumns.map((column) => column.value).join(','),
      targetColumns.map((column) => column.value).join(','),
    ].join('::');

    if (!initializeKey || initializedKeyRef.current === initializeKey) return;

    initializedKeyRef.current = initializeKey;
    setRows(buildSameNameMappings(sourceColumns, targetColumns));
  }, [sourceColumns, targetColumns]);

  const updateRow = (
    key: string,
    patch: Partial<FieldMappingRow>,
  ) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      { key: createMappingKey(current.length) },
    ]);
  };

  const removeRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };

  const mappingReady = sourceColumns.length > 0 && targetColumns.length > 0;
  const loading = sourceLoading || targetLoading;

  return (
    <EditorSection title="字段映射">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-[12px] text-[#667085]">
            <span>配置来源字段与目标字段的对应关系</span>
            <Tag bordered={false} className="!m-0 !bg-[#f2f3f5] !text-[#667085]">
              已映射 {rows.filter((row) => row.sourceField && row.targetField).length} 项
            </Tag>
            {targetDerived ? (
              <Tag bordered={false} className="!m-0 !bg-[#fff4f6] !text-[var(--yak-brand-color)]">
                目标字段按来源预览
              </Tag>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="small"
              type="primary"
              disabled={!mappingReady}
              onClick={() =>
                setRows(buildSameNameMappings(sourceColumns, targetColumns))
              }
            >
              同名映射
            </Button>
            <Button
              size="small"
              disabled={!mappingReady}
              onClick={() =>
                setRows(buildPositionMappings(sourceColumns, targetColumns))
              }
            >
              同序映射
            </Button>
            <Button size="small" disabled={rows.length === 0} onClick={() => setRows([])}>
              清空映射
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e8eaee] bg-white">
          <div className="grid grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)_44px] items-center gap-3 border-b border-[#e8eaee] bg-[#f7f8fa] px-4 py-3 max-md:grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)_36px]">
            <div>
              <div className="text-[12px] font-semibold text-[#344054]">来源字段</div>
              <Input
                allowClear
                variant="filled"
                size="small"
                value={sourceKeyword}
                placeholder="搜索来源字段"
                className="!mt-2"
                onChange={(event) => setSourceKeyword(event.target.value)}
              />
            </div>
            <div className="text-center text-[11px] text-[#98a2b3]">映射关系</div>
            <div>
              <div className="text-[12px] font-semibold text-[#344054]">目标字段</div>
              <Input
                allowClear
                variant="filled"
                size="small"
                value={targetKeyword}
                placeholder="搜索目标字段"
                className="!mt-2"
                onChange={(event) => setTargetKeyword(event.target.value)}
              />
            </div>
            <div />
          </div>

          {!sourceReady || !targetReady ? (
            <div className="flex min-h-[220px] items-center justify-center px-5">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="请先完成来源端和目标端配置"
              />
            </div>
          ) : loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-[12px] text-[#98a2b3]">
              正在加载字段信息...
            </div>
          ) : !mappingReady ? (
            <div className="flex min-h-[220px] items-center justify-center px-5">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="当前表暂未获取到可映射字段"
              />
            </div>
          ) : (
            <div>
              {rows.length > 0 ? (
                rows.map((row) => {
                  const sourceColumn = row.sourceField
                    ? sourceMap.get(row.sourceField)
                    : undefined;
                  const targetColumn = row.targetField
                    ? targetMap.get(row.targetField)
                    : undefined;

                  return (
                    <div
                      key={row.key}
                      className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)_44px] items-center gap-3 border-b border-[#f0f1f3] px-4 py-2.5 last:border-b-0 max-md:grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)_36px]"
                    >
                      <div className="min-w-0">
                        <Select
                          allowClear
                          showSearch
                          variant="filled"
                          value={row.sourceField}
                          options={sourceOptions}
                          optionFilterProp="label"
                          placeholder="选择来源字段"
                          className="w-full"
                          onChange={(sourceField) =>
                            updateRow(row.key, { sourceField })
                          }
                        />
                        <div className="mt-1 truncate text-[11px] text-[#98a2b3]">
                          类型：{fieldType(sourceColumn)}
                        </div>
                      </div>

                      <div className="relative flex h-8 items-center justify-center">
                        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[#cfd4dc]" />
                        <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#dfe3e8] bg-white text-[12px] text-[#98a2b3]">
                          <SwapOutlined />
                        </span>
                      </div>

                      <div className="min-w-0">
                        <Select
                          allowClear
                          showSearch
                          variant="filled"
                          value={row.targetField}
                          options={targetOptions}
                          optionFilterProp="label"
                          placeholder="选择目标字段"
                          className="w-full"
                          onChange={(targetField) =>
                            updateRow(row.key, { targetField })
                          }
                        />
                        <div className="mt-1 truncate text-[11px] text-[#98a2b3]">
                          类型：{fieldType(targetColumn)}
                        </div>
                      </div>

                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        className="!h-8 !w-8 !min-w-0 !p-0"
                        onClick={() => removeRow(row.key)}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="flex min-h-[160px] items-center justify-center px-5 text-[12px] text-[#98a2b3]">
                  暂无映射关系，可通过上方规则生成或手动添加。
                </div>
              )}

              <div className="border-t border-[#f0f1f3] px-4 py-3">
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={addRow}
                >
                  添加字段映射
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="text-[11px] leading-5 text-[#98a2b3]">
          当前字段映射仅保存在页面状态中，本次改动暂不写入任务定义。
        </div>
      </div>
    </EditorSection>
  );
}
