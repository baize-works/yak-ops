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

export interface FieldMappingValue {
  source: string;
  target: string;
}

interface FieldMappingSectionProps {
  value: FieldMappingValue[];
  onChange: (value: FieldMappingValue[]) => void;
  sourceColumns: DataSourceColumnOption[];
  targetColumns: DataSourceColumnOption[];
  sourceLoading: boolean;
  targetLoading: boolean;
  sourceReady: boolean;
  targetReady: boolean;
  targetDerived?: boolean;
}

interface MappingGeometry {
  key: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  middleX: number;
  middleY: number;
}

interface DragState {
  pointerId: number;
  source: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const normalizeFieldName = (value: string) =>
  value.trim().toLowerCase();

const mappingKey = (mapping: FieldMappingValue) =>
  `${mapping.source}::${mapping.target}`;

const fieldType = (column?: DataSourceColumnOption) =>
  column?.description?.split(' · ')[0] || '-';

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

const buildSameNameMappings = (
  sourceColumns: DataSourceColumnOption[],
  targetColumns: DataSourceColumnOption[],
): FieldMappingValue[] => {
  const targets = new Map(
    targetColumns.map((column) => [
      normalizeFieldName(column.value),
      column.value,
    ]),
  );

  return sourceColumns
    .map((column) => {
      const target = targets.get(
        normalizeFieldName(column.value),
      );

      return target
        ? { source: column.value, target }
        : null;
    })
    .filter(Boolean) as FieldMappingValue[];
};

const buildPositionMappings = (
  sourceColumns: DataSourceColumnOption[],
  targetColumns: DataSourceColumnOption[],
): FieldMappingValue[] =>
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

const connectionPath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) => {
  const distance = Math.abs(endX - startX);
  const controlOffset = Math.max(48, distance * 0.35);

  return [
    `M ${startX} ${startY}`,
    `C ${startX + controlOffset} ${startY},`,
    `${endX - controlOffset} ${endY},`,
    `${endX} ${endY}`,
  ].join(' ');
};

export default function FieldMappingSection({
  value,
  onChange,
  sourceColumns,
  targetColumns,
  sourceLoading,
  targetLoading,
  sourceReady,
  targetReady,
  targetDerived = false,
}: FieldMappingSectionProps) {
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
  const [hoveredMapping, setHoveredMapping] =
    useState<string>();
  const [geometries, setGeometries] = useState<
    MappingGeometry[]
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

  const displayTargetColumns = useMemo(() => {
    if (!targetDerived) {
      return targetColumns;
    }

    const existing = new Set(
      targetColumns.map((column) => column.value),
    );
    const customColumns: DataSourceColumnOption[] = [];

    value.forEach((mapping) => {
      if (existing.has(mapping.target)) {
        return;
      }

      existing.add(mapping.target);
      const sourceColumn = sourceMap.get(mapping.source);
      customColumns.push({
        value: mapping.target,
        label: mapping.target,
        description:
          sourceColumn?.description || '自定义目标字段',
      });
    });

    return [...targetColumns, ...customColumns];
  }, [sourceMap, targetColumns, targetDerived, value]);

  const targetMap = useMemo(
    () =>
      new Map(
        displayTargetColumns.map((column) => [
          column.value,
          column,
        ]),
      ),
    [displayTargetColumns],
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
    () =>
      filterColumns(displayTargetColumns, targetKeyword),
    [displayTargetColumns, targetKeyword],
  );

  const mappingReady =
    sourceColumns.length > 0 && displayTargetColumns.length > 0;
  const loading = sourceLoading || targetLoading;

  useEffect(() => {
    if (!mappingReady) {
      return;
    }

    const scope = [
      sourceColumns.map((item) => item.value).join(','),
      targetColumns.map((item) => item.value).join(','),
    ].join('::');
    const previousScope = initializedScopeRef.current;
    const scopeChanged = Boolean(
      previousScope && previousScope !== scope,
    );

    initializedScopeRef.current = scope;

    if (scopeChanged) {
      onChange(
        buildSameNameMappings(
          sourceColumns,
          targetColumns,
        ),
      );
      setSelectedSource(undefined);
      return;
    }

    const validMappings = value.filter(
      (item) =>
        sourceMap.has(item.source) &&
        (targetDerived || targetMap.has(item.target)),
    );

    if (validMappings.length !== value.length) {
      onChange(validMappings);
      return;
    }

    if (!previousScope && value.length === 0) {
      onChange(
        buildSameNameMappings(
          sourceColumns,
          targetColumns,
        ),
      );
    }
  }, [
    mappingReady,
    onChange,
    sourceColumns,
    sourceMap,
    targetColumns,
    targetDerived,
    targetMap,
    value,
  ]);

  const connectFields = useCallback(
    (source: string, target: string) => {
      const normalizedTarget = target.trim();

      if (
        !sourceMap.has(source) ||
        !normalizedTarget ||
        (!targetDerived && !targetMap.has(normalizedTarget))
      ) {
        message.error('来源字段或目标字段不存在');
        return;
      }

      const nextMappings = value.filter(
        (item) =>
          item.source !== source &&
          item.target !== normalizedTarget,
      );

      nextMappings.push({
        source,
        target: normalizedTarget,
      });
      onChange(nextMappings);
      setSelectedSource(undefined);
    },
    [
      onChange,
      sourceMap,
      targetDerived,
      targetMap,
      value,
    ],
  );

  const removeMapping = useCallback(
    (key: string) => {
      onChange(
        value.filter((item) => mappingKey(item) !== key),
      );
      setHoveredMapping(undefined);
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
    const nextGeometries = value
      .map((mapping) => {
        const sourceElement = sourceRefs.current.get(
          mapping.source,
        );
        const targetElement = targetRefs.current.get(
          mapping.target,
        );

        if (!sourceElement || !targetElement) {
          return null;
        }

        const sourceRect =
          sourceElement.getBoundingClientRect();
        const targetRect =
          targetElement.getBoundingClientRect();
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
          key: mappingKey(mapping),
          startX,
          startY,
          endX,
          endY,
          middleX: (startX + endX) / 2,
          middleY: (startY + endY) / 2,
        };
      })
      .filter(Boolean) as MappingGeometry[];

    setGeometries(nextGeometries);
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

    if (!canvas) {
      return undefined;
    }

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

    if (!canvas) {
      return;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const sourceRect =
      event.currentTarget.getBoundingClientRect();

    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedSource(source);
    setDrag({
      pointerId: event.pointerId,
      source,
      startX: sourceRect.right - canvasRect.left,
      startY:
        sourceRect.top -
        canvasRect.top +
        sourceRect.height / 2,
      currentX: event.clientX - canvasRect.left,
      currentY: event.clientY - canvasRect.top,
    });
  };

  const moveDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const canvasRect =
      event.currentTarget.getBoundingClientRect();

    setDrag({
      ...drag,
      currentX: event.clientX - canvasRect.left,
      currentY: event.clientY - canvasRect.top,
    });
  };

  const finishDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const target = (
      document.elementFromPoint(
        event.clientX,
        event.clientY,
      ) as HTMLElement | null
    )
      ?.closest<HTMLElement>('[data-target-field]')
      ?.dataset.targetField;

    if (target) {
      connectFields(drag.source, target);
    }

    setDrag(undefined);
  };

  const sourceOptions = sourceColumns.map((item) => ({
    value: item.value,
    label: item.label,
  }));
  const targetOptions = displayTargetColumns.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  const addMappingContent = (
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

      {targetDerived ? (
        <Input
          variant="filled"
          value={addTarget}
          placeholder="输入目标字段名"
          onChange={(event) =>
            setAddTarget(event.target.value)
          }
        />
      ) : (
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
      )}

      <div className="flex justify-end gap-2">
        <Button
          size="small"
          onClick={() => setAddOpen(false)}
        >
          取消
        </Button>
        <Button
          size="small"
          type="primary"
          disabled={!addSource || !addTarget?.trim()}
          onClick={() => {
            if (!addSource || !addTarget?.trim()) {
              return;
            }

            connectFields(addSource, addTarget);
            setAddSource(undefined);
            setAddTarget(undefined);
            setAddOpen(false);
          }}
        >
          添加
        </Button>
      </div>
    </div>
  );

  const renderFieldButton = (
    column: DataSourceColumnOption,
    role: 'source' | 'target',
  ) => {
    const field = column.value;
    const mapped = role === 'source'
      ? usedSources.has(field)
      : usedTargets.has(field);
    const selected =
      role === 'source' && selectedSource === field;

    return (
      <button
        key={field}
        ref={(element) => {
          const refs = role === 'source'
            ? sourceRefs.current
            : targetRefs.current;

          if (element) {
            refs.set(field, element);
          } else {
            refs.delete(field);
          }
        }}
        type="button"
        data-target-field={role === 'target' ? field : undefined}
        className={[
          'relative z-10 mb-1 flex h-10 w-full cursor-pointer',
          'items-center rounded-lg border px-3 text-left',
          'transition-colors',
          role === 'source'
            ? 'justify-between'
            : 'gap-3',
          selected
            ? [
                'border-[var(--yak-brand-color)]',
                'bg-[rgba(254,44,85,.06)]',
              ].join(' ')
            : mapped
              ? 'border-[#e4e7ec] bg-[#fafafa]'
              : selectedSource && role === 'target'
                ? [
                    'border-[rgba(254,44,85,.2)]',
                    'bg-[rgba(254,44,85,.03)]',
                    'hover:border-[var(--yak-brand-color)]',
                  ].join(' ')
                : [
                    'border-transparent bg-white',
                    'hover:bg-[#f7f8fa]',
                  ].join(' '),
        ].join(' ')}
        onClick={() => {
          if (role === 'source') {
            setSelectedSource(field);
          } else if (selectedSource) {
            connectFields(selectedSource, field);
          }
        }}
        onPointerDown={
          role === 'source'
            ? (event) => startDrag(event, field)
            : undefined
        }
      >
        {role === 'target' ? (
          <span
            className={[
              'h-2.5 w-2.5 shrink-0 rounded-full',
              'border-2 border-white',
              mapped
                ? [
                    'bg-[var(--yak-brand-color)]',
                    'shadow-[0_0_0_1px_var(--yak-brand-color)]',
                  ].join(' ')
                : 'bg-[#d0d5dd] shadow-[0_0_0_1px_#d0d5dd]',
            ].join(' ')}
          />
        ) : null}

        <span className="min-w-0">
          <span className="block truncate text-[12px] font-medium text-[#344054]">
            {String(column.label || field)}
          </span>
          <span className="block truncate text-[10px] text-[#98a2b3]">
            {fieldType(column)}
          </span>
        </span>

        {role === 'source' ? (
          <span
            className={[
              'h-2.5 w-2.5 shrink-0 rounded-full',
              'border-2 border-white',
              mapped || selected
                ? [
                    'bg-[var(--yak-brand-color)]',
                    'shadow-[0_0_0_1px_var(--yak-brand-color)]',
                  ].join(' ')
                : 'bg-[#d0d5dd] shadow-[0_0_0_1px_#d0d5dd]',
            ].join(' ')}
          />
        ) : null}
      </button>
    );
  };

  return (
    <EditorSection title="字段映射">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-[#667085]">
            <span>选择、重排并重命名写入目标端的字段</span>
            <Tag
              bordered={false}
              className="!m-0 !bg-[#f2f3f5] !text-[#667085]"
            >
              已映射 {value.length} 项
            </Tag>
            {targetDerived ? (
              <Tag
                bordered={false}
                className="!m-0 !bg-[#fff4f6] !text-[var(--yak-brand-color)]"
              >
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
                  buildSameNameMappings(
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
                  buildPositionMappings(
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
              content={addMappingContent}
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
            <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible">
              {geometries.map((geometry) => {
                const active =
                  hoveredMapping === geometry.key;
                const path = connectionPath(
                  geometry.startX,
                  geometry.startY,
                  geometry.endX,
                  geometry.endY,
                );

                return (
                  <g key={geometry.key}>
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      className="pointer-events-auto cursor-pointer"
                      onMouseEnter={() =>
                        setHoveredMapping(geometry.key)
                      }
                      onMouseLeave={() =>
                        setHoveredMapping(undefined)
                      }
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke={
                        active
                          ? 'var(--yak-brand-color)'
                          : '#b8bec8'
                      }
                      strokeWidth={active ? 2 : 1.4}
                    />
                  </g>
                );
              })}

              {drag ? (
                <path
                  d={connectionPath(
                    drag.startX,
                    drag.startY,
                    drag.currentX,
                    drag.currentY,
                  )}
                  fill="none"
                  stroke="var(--yak-brand-color)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                />
              ) : null}
            </svg>

            {geometries.map((geometry) =>
              hoveredMapping === geometry.key ? (
                <Tooltip
                  key={geometry.key}
                  title="删除映射"
                >
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
                    onMouseEnter={() =>
                      setHoveredMapping(geometry.key)
                    }
                    onMouseLeave={() =>
                      setHoveredMapping(undefined)
                    }
                    onClick={() =>
                      removeMapping(geometry.key)
                    }
                  />
                </Tooltip>
              ) : null,
            )}

            <div className="relative z-10 border-r border-[#eef0f2] bg-white">
              <div className="border-b border-[#eef0f2] bg-[#f7f8fa] p-3">
                <div className="mb-2 text-[12px] font-semibold text-[#344054]">
                  来源字段
                </div>
                <Input
                  allowClear
                  size="small"
                  variant="filled"
                  value={sourceKeyword}
                  placeholder="搜索来源字段"
                  onChange={(event) =>
                    setSourceKeyword(event.target.value)
                  }
                />
              </div>
              <div
                className="max-h-[360px] overflow-y-auto p-2"
                onScroll={calculateGeometry}
              >
                {visibleSources.map((column) =>
                  renderFieldButton(column, 'source'),
                )}
              </div>
            </div>

            <div className="relative z-0 border-r border-[#eef0f2] bg-[#fafbfc]">
              <div className="flex h-[66px] items-center justify-center border-b border-[#eef0f2] text-[11px] text-[#98a2b3]">
                映射关系
              </div>
              {value.length === 0 ? (
                <div className="flex h-[320px] items-center justify-center px-5 text-center text-[11px] leading-5 text-[#98a2b3]">
                  点击来源字段后选择目标字段，或拖动来源节点建立映射。
                </div>
              ) : null}
            </div>

            <div className="relative z-10 bg-white">
              <div className="border-b border-[#eef0f2] bg-[#f7f8fa] p-3">
                <div className="mb-2 text-[12px] font-semibold text-[#344054]">
                  目标字段
                </div>
                <Input
                  allowClear
                  size="small"
                  variant="filled"
                  value={targetKeyword}
                  placeholder="搜索目标字段"
                  onChange={(event) =>
                    setTargetKeyword(event.target.value)
                  }
                />
              </div>
              <div
                className="max-h-[360px] overflow-y-auto p-2"
                onScroll={calculateGeometry}
              >
                {visibleTargets.map((column) =>
                  renderFieldButton(column, 'target'),
                )}
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
