import {
  DeleteOutlined,
  PlusOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  Input,
  Popover,
  Select,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import type { DataSourceColumnOption } from '../hooks/useDataSourceColumns';
import EditorSection from './EditorSection';

export interface PersistedColumnMapping {
  source: string;
  target: string;
}

interface PersistedFieldMappingSectionProps {
  value: PersistedColumnMapping[];
  onChange: (value: PersistedColumnMapping[]) => void;
  sourceColumns: DataSourceColumnOption[];
  targetColumns: DataSourceColumnOption[];
  sourceLoading: boolean;
  targetLoading: boolean;
  sourceReady: boolean;
  targetReady: boolean;
  targetDerived?: boolean;
}

interface Geometry {
  key: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  middleX: number;
  middleY: number;
}

interface DragState {
  source: string;
  pointerId: number;
  x: number;
  y: number;
}

const normalize = (value: string) =>
  value.trim().toLowerCase();

const mappingKey = (mapping: PersistedColumnMapping) =>
  `${mapping.source}::${mapping.target}`;

const sameNameMappings = (
  sourceColumns: DataSourceColumnOption[],
  targetColumns: DataSourceColumnOption[],
): PersistedColumnMapping[] => {
  const targetMap = new Map(
    targetColumns.map((column) => [
      normalize(column.value),
      column.value,
    ]),
  );

  return sourceColumns
    .map((column) => {
      const target = targetMap.get(
        normalize(column.value),
      );

      return target
        ? { source: column.value, target }
        : null;
    })
    .filter(Boolean) as PersistedColumnMapping[];
};

const positionMappings = (
  sourceColumns: DataSourceColumnOption[],
  targetColumns: DataSourceColumnOption[],
): PersistedColumnMapping[] =>
  Array.from(
    {
      length: Math.min(
        sourceColumns.length,
        targetColumns.length,
      ),
    },
    (_, index) => ({
      source: sourceColumns[index].value,
      target: targetColumns[index].value,
    }),
  );

const filterColumns = (
  columns: DataSourceColumnOption[],
  keyword: string,
) => {
  const normalized = keyword.trim().toLowerCase();

  if (!normalized) {
    return columns;
  }

  return columns.filter((column) =>
    [column.label, column.value, column.description]
      .filter(Boolean)
      .some((item) =>
        String(item).toLowerCase().includes(normalized),
      ),
  );
};

const fieldType = (column?: DataSourceColumnOption) =>
  column?.description?.split(' · ')[0] || '-';

export default function PersistedFieldMappingSection({
  value,
  onChange,
  sourceColumns,
  targetColumns,
  sourceLoading,
  targetLoading,
  sourceReady,
  targetReady,
  targetDerived = false,
}: PersistedFieldMappingSectionProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sourceRefs = useRef(
    new Map<string, HTMLButtonElement>(),
  );
  const targetRefs = useRef(
    new Map<string, HTMLButtonElement>(),
  );
  const initializedScopeRef = useRef('');

  const [sourceKeyword, setSourceKeyword] =
    useState('');
  const [targetKeyword, setTargetKeyword] =
    useState('');
  const [selectedSource, setSelectedSource] =
    useState<string>();
  const [hoveredKey, setHoveredKey] =
    useState<string>();
  const [geometries, setGeometries] = useState<
    Geometry[]
  >([]);
  const [drag, setDrag] = useState<DragState>();
  const [addOpen, setAddOpen] = useState(false);
  const [addSource, setAddSource] =
    useState<string>();
  const [addTarget, setAddTarget] =
    useState<string>();

  const sourceMap = useMemo(
    () =>
      new Map(
        sourceColumns.map((column) => [
          column.value,
          column,
        ]),
      ),
    [sourceColumns],
  );
  const targetMap = useMemo(
    () =>
      new Map(
        targetColumns.map((column) => [
          column.value,
          column,
        ]),
      ),
    [targetColumns],
  );

  const usedSources = useMemo(
    () => new Set(value.map((item) => item.source)),
    [value],
  );
  const usedTargets = useMemo(
    () => new Set(value.map((item) => item.target)),
    [value],
  );

  const visibleSources = useMemo(
    () => filterColumns(sourceColumns, sourceKeyword),
    [sourceColumns, sourceKeyword],
  );
  const visibleTargets = useMemo(
    () => filterColumns(targetColumns, targetKeyword),
    [targetColumns, targetKeyword],
  );

  const mappingReady =
    sourceColumns.length > 0 && targetColumns.length > 0;
  const loading = sourceLoading || targetLoading;

  useEffect(() => {
    if (!mappingReady) {
      return;
    }

    const scopeKey = [
      sourceColumns.map((item) => item.value).join(','),
      targetColumns.map((item) => item.value).join(','),
    ].join('::');
    const scopeChanged =
      initializedScopeRef.current !== scopeKey;
    initializedScopeRef.current = scopeKey;

    const sanitized = value.filter(
      (item) =>
        sourceMap.has(item.source) &&
        targetMap.has(item.target),
    );

    if (sanitized.length !== value.length) {
      onChange(
        sanitized.length > 0
          ? sanitized
          : sameNameMappings(
              sourceColumns,
              targetColumns,
            ),
      );
      return;
    }

    if (scopeChanged && value.length === 0) {
      onChange(
        sameNameMappings(sourceColumns, targetColumns),
      );
    }
  }, [
    mappingReady,
    onChange,
    sourceColumns,
    sourceMap,
    targetColumns,
    targetMap,
    value,
  ]);

  const connect = useCallback(
    (source: string, target: string) => {
      if (!sourceMap.has(source) || !targetMap.has(target)) {
        message.error('来源字段或目标字段不存在');
        return;
      }

      const next = value.filter(
        (item) =>
          item.source !== source && item.target !== target,
      );
      next.push({ source, target });
      onChange(next);
      setSelectedSource(undefined);
    },
    [onChange, sourceMap, targetMap, value],
  );

  const remove = useCallback(
    (key: string) => {
      onChange(
        value.filter((item) => mappingKey(item) !== key),
      );
    },
    [onChange, value],
  );

  const calculateGeometry = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      setGeometries([]);
      return;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const next = value
      .map((item) => {
        const source = sourceRefs.current.get(item.source);
        const target = targetRefs.current.get(item.target);

        if (!source || !target) {
          return null;
        }

        const sourceRect = source.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const startX = sourceRect.right - canvasRect.left;
        const startY =
          sourceRect.top -
          canvasRect.top +
          sourceRect.height / 2;
        const endX = targetRect.left - canvasRect.left;
        const endY =
          targetRect.top -
          canvasRect.top +
          targetRect.height / 2;

        return {
          key: mappingKey(item),
          startX,
          startY,
          endX,
          endY,
          middleX: (startX + endX) / 2,
          middleY: (startY + endY) / 2,
        };
      })
      .filter(Boolean) as Geometry[];

    setGeometries(next);
  }, [value]);

  useLayoutEffect(() => {
    calculateGeometry();
  }, [
    calculateGeometry,
    visibleSources,
    visibleTargets,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const observer = new ResizeObserver(calculateGeometry);
    observer.observe(canvas);
    window.addEventListener('resize', calculateGeometry);

    return () => {
      observer.disconnect();
      window.removeEventListener(
        'resize',
        calculateGeometry,
      );
    };
  }, [calculateGeometry]);

  const startDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    source: string,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      source,
      pointerId: event.pointerId,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    setSelectedSource(source);
  };

  const moveDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setDrag({
      ...drag,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const finishDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const element = document.elementFromPoint(
      event.clientX,
      event.clientY,
    ) as HTMLElement | null;
    const target = element
      ?.closest<HTMLElement>('[data-target-field]')
      ?.dataset.targetField;

    if (target) {
      connect(drag.source, target);
    }
    setDrag(undefined);
  };

  const sourceOptions = sourceColumns
    .filter((item) => !usedSources.has(item.value))
    .map((item) => ({
      value: item.value,
      label: item.label,
    }));
  const targetOptions = targetColumns
    .filter((item) => !usedTargets.has(item.value))
    .map((item) => ({
      value: item.value,
      label: item.label,
    }));

  const addContent = (
    <div className="w-[300px] space-y-3 p-1">
      <Select
        showSearch
        variant="filled"
        className="w-full"
        placeholder="选择来源字段"
        value={addSource}
        options={sourceOptions}
        optionFilterProp="label"
        onChange={setAddSource}
      />
      <Select
        showSearch
        variant="filled"
        className="w-full"
        placeholder="选择目标字段"
        value={addTarget}
        options={targetOptions}
        optionFilterProp="label"
        onChange={setAddTarget}
      />
      <div className="flex justify-end gap-2">
        <Button size="small" onClick={() => setAddOpen(false)}>
          取消
        </Button>
        <Button
          size="small"
          type="primary"
          disabled={!addSource || !addTarget}
          onClick={() => {
            if (addSource && addTarget) {
              connect(addSource, addTarget);
              setAddSource(undefined);
              setAddTarget(undefined);
              setAddOpen(false);
            }
          }}
        >
          添加
        </Button>
      </div>
    </div>
  );

  return (
    <EditorSection title="字段映射">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-[#667085]">
            <span>选择、重排并重命名写入目标端的字段</span>
            <Tag bordered={false} className="!m-0 !bg-[#f2f3f5] !text-[#667085]">
              已映射 {value.length} 项
            </Tag>
            {targetDerived ? (
              <Tag bordered={false} className="!m-0 !bg-[#fff4f6] !text-[var(--yak-brand-color)]">
                自动建表
              </Tag>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="small"
              type="primary"
              disabled={!mappingReady}
              onClick={() =>
                onChange(
                  sameNameMappings(
                    sourceColumns,
                    targetColumns,
                  ),
                )
              }
            >
              同名映射
            </Button>
            <Button
              size="small"
              disabled={!mappingReady}
              onClick={() =>
                onChange(
                  positionMappings(
                    sourceColumns,
                    targetColumns,
                  ),
                )
              }
            >
              同序映射
            </Button>
            <Popover
              trigger="click"
              placement="bottomRight"
              open={addOpen}
              content={addContent}
              onOpenChange={setAddOpen}
            >
              <Button
                size="small"
                icon={<PlusOutlined />}
                disabled={!mappingReady}
              >
                添加映射
              </Button>
            </Popover>
            <Button
              size="small"
              disabled={value.length === 0}
              onClick={() => onChange([])}
            >
              清空
            </Button>
          </div>
        </div>

        {!sourceReady || !targetReady ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-[#e8eaee] bg-white">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="请先完成来源端和目标端配置"
            />
          </div>
        ) : loading ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-[#e8eaee] bg-white text-[12px] text-[#98a2b3]">
            正在加载字段信息...
          </div>
        ) : !mappingReady ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-[#e8eaee] bg-white">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="当前表暂未获取到可映射字段"
            />
          </div>
        ) : (
          <div
            ref={canvasRef}
            className="relative grid min-h-[420px] grid-cols-[minmax(280px,1fr)_180px_minmax(280px,1fr)] overflow-hidden rounded-xl border border-[#e8eaee] bg-white"
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            onPointerCancel={() => setDrag(undefined)}
          >
            <div className="relative z-10 border-r border-[#eef0f2] bg-white">
              <div className="sticky top-0 border-b border-[#eef0f2] bg-[#f7f8fa] p-3">
                <div className="mb-2 text-[12px] font-semibold text-[#344054]">来源字段</div>
                <Input
                  allowClear
                  size="small"
                  variant="filled"
                  value={sourceKeyword}
                  placeholder="搜索来源字段"
                  onChange={(event) => setSourceKeyword(event.target.value)}
                />
              </div>
              <div className="max-h-[360px] overflow-y-auto p-2">
                {visibleSources.map((column) => {
                  const mapped = usedSources.has(column.value);
                  const selected = selectedSource === column.value;
                  return (
                    <button
                      key={column.value}
                      ref={(element) => {
                        if (element) sourceRefs.current.set(column.value, element);
                        else sourceRefs.current.delete(column.value);
                      }}
                      type="button"
                      className={[
                        'mb-1 flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border px-3 text-left transition-colors',
                        selected
                          ? 'border-[var(--yak-brand-color)] bg-[rgba(254,44,85,.06)]'
                          : mapped
                            ? 'border-[#e4e7ec] bg-[#fafafa]'
                            : 'border-transparent bg-white hover:bg-[#f7f8fa]',
                      ].join(' ')}
                      onClick={() => setSelectedSource(column.value)}
                      onPointerDown={(event) => startDrag(event, column.value)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium text-[#344054]">
                          {String(column.label || column.value)}
                        </span>
                        <span className="block truncate text-[10px] text-[#98a2b3]">
                          {fieldType(column)}
                        </span>
                      </span>
                      <span className={[
                        'h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white',
                        mapped || selected
                          ? 'bg-[var(--yak-brand-color)] shadow-[0_0_0_1px_var(--yak-brand-color)]'
                          : 'bg-[#d0d5dd] shadow-[0_0_0_1px_#d0d5dd]',
                      ].join(' ')} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative bg-[#fafbfc]">
              <div className="flex h-[66px] items-center justify-center border-b border-[#eef0f2] text-[11px] text-[#98a2b3]">
                映射关系
              </div>
              <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                {geometries.map((geometry) => {
                  const active = hoveredKey === geometry.key;
                  const controlOffset = Math.max(
                    42,
                    Math.abs(geometry.endX - geometry.startX) * 0.35,
                  );
                  const path = `M ${geometry.startX} ${geometry.startY} C ${geometry.startX + controlOffset} ${geometry.startY}, ${geometry.endX - controlOffset} ${geometry.endY}, ${geometry.endX} ${geometry.endY}`;
                  return (
                    <path
                      key={geometry.key}
                      d={path}
                      fill="none"
                      stroke={active ? 'var(--yak-brand-color)' : '#b8bec8'}
                      strokeWidth={active ? 2 : 1.4}
                      className="pointer-events-auto cursor-pointer"
                      onMouseEnter={() => setHoveredKey(geometry.key)}
                      onMouseLeave={() => setHoveredKey(undefined)}
                    />
                  );
                })}
                {drag ? (
                  <line
                    x1={0}
                    y1={drag.y}
                    x2={drag.x}
                    y2={drag.y}
                    stroke="var(--yak-brand-color)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                  />
                ) : null}
              </svg>

              {geometries.map((geometry) =>
                hoveredKey === geometry.key ? (
                  <Tooltip key={geometry.key} title="删除映射">
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      className="!absolute !z-20 !h-7 !w-7 !min-w-0 !rounded-full !border !border-[#f0f1f3] !bg-white !p-0 !shadow-sm"
                      style={{
                        left: geometry.middleX - 14,
                        top: geometry.middleY - 14,
                      }}
                      onMouseEnter={() => setHoveredKey(geometry.key)}
                      onClick={() => remove(geometry.key)}
                    />
                  </Tooltip>
                ) : null,
              )}

              {value.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center px-5 text-center text-[11px] leading-5 text-[#98a2b3]">
                  点击来源字段后选择目标字段，或拖动来源节点建立映射。
                </div>
              ) : null}
            </div>

            <div className="relative z-10 border-l border-[#eef0f2] bg-white">
              <div className="sticky top-0 border-b border-[#eef0f2] bg-[#f7f8fa] p-3">
                <div className="mb-2 text-[12px] font-semibold text-[#344054]">目标字段</div>
                <Input
                  allowClear
                  size="small"
                  variant="filled"
                  value={targetKeyword}
                  placeholder="搜索目标字段"
                  onChange={(event) => setTargetKeyword(event.target.value)}
                />
              </div>
              <div className="max-h-[360px] overflow-y-auto p-2">
                {visibleTargets.map((column) => {
                  const mapped = usedTargets.has(column.value);
                  return (
                    <button
                      key={column.value}
                      ref={(element) => {
                        if (element) targetRefs.current.set(column.value, element);
                        else targetRefs.current.delete(column.value);
                      }}
                      type="button"
                      data-target-field={column.value}
                      className={[
                        'mb-1 flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg border px-3 text-left transition-colors',
                        mapped
                          ? 'border-[#e4e7ec] bg-[#fafafa]'
                          : selectedSource
                            ? 'border-[rgba(254,44,85,.2)] bg-[rgba(254,44,85,.03)] hover:border-[var(--yak-brand-color)]'
                            : 'border-transparent bg-white hover:bg-[#f7f8fa]',
                      ].join(' ')}
                      onClick={() => {
                        if (selectedSource) {
                          connect(selectedSource, column.value);
                        }
                      }}
                    >
                      <span className={[
                        'h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white',
                        mapped
                          ? 'bg-[var(--yak-brand-color)] shadow-[0_0_0_1px_var(--yak-brand-color)]'
                          : 'bg-[#d0d5dd] shadow-[0_0_0_1px_#d0d5dd]',
                      ].join(' ')} />
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium text-[#344054]">
                          {String(column.label || column.value)}
                        </span>
                        <span className="block truncate text-[10px] text-[#98a2b3]">
                          {fieldType(column)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 text-[11px] leading-5 text-[#98a2b3]">
          <SwapOutlined className="mt-1" />
          <span>
            数组顺序即目标写入顺序；未映射字段不会写入。当前版本仅支持字段选择、重排和重命名。
          </span>
        </div>
      </div>
    </EditorSection>
  );
}
