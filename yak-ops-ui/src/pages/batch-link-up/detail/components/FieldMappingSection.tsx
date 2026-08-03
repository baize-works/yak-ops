import {
  FilterOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  Input,
  Modal,
  Popover,
  Select,
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
  type CSSProperties,
} from 'react';

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

interface MappingGeometry {
  key: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  middleX: number;
  middleY: number;
}

interface AddMappingValues {
  sourceField?: string;
  targetField?: string;
}

interface ManualFieldEditorProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

const BRAND_COLOR = 'var(--yak-brand-color, rgba(254, 44, 85, 1))';

const TABLE_WIDTH = 360;
const TABLE_TYPE_WIDTH = 180;
const TABLE_HEADER_HEIGHT = 32;
const TABLE_ROW_HEIGHT = 32;

let mappingRowSeed = 0;

const normalizeFieldName = (value: string) =>
  value.trim().toLowerCase();

const createMappingKey = (index: number) => {
  mappingRowSeed += 1;

  return `mapping-${mappingRowSeed}-${index}`;
};

const getFieldType = (column?: DataSourceColumnOption) => {
  if (!column?.description) {
    return '-';
  }

  return column.description.split(' · ')[0] || '-';
};

const parseManualFields = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const buildSameNameMappings = (
  sourceColumns: DataSourceColumnOption[],
  targetColumns: DataSourceColumnOption[],
): FieldMappingRow[] => {
  const targetFieldMap = new Map(
    targetColumns.map((column) => [
      normalizeFieldName(column.value),
      column.value,
    ]),
  );

  return sourceColumns
    .map((column, index) => {
      const targetField = targetFieldMap.get(
        normalizeFieldName(column.value),
      );

      if (!targetField) {
        return null;
      }

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
  const mappingSize = Math.min(
    sourceColumns.length,
    targetColumns.length,
  );

  return Array.from(
    { length: mappingSize },
    (_, index) => ({
      key: createMappingKey(index),
      sourceField: sourceColumns[index]?.value,
      targetField: targetColumns[index]?.value,
    }),
  );
};

const ManualFieldEditor = ({
  value,
  placeholder,
  onChange,
}: ManualFieldEditorProps) => {
  const lineCount = Math.max(
    14,
    value.split(/\r?\n/).length,
  );

  return (
    <div className="flex h-[360px] overflow-hidden border border-[#e5e7eb] bg-white">
      <div
        className="
          w-12 shrink-0 select-none border-r border-[#eef0f2]
          bg-[#f7f8fa] py-2 text-right
          text-[12px] leading-7 text-[#98a2b3]
        "
      >
        {Array.from({ length: lineCount }, (_, index) => (
          <div key={index} className="h-7 pr-3">
            {index + 1}
          </div>
        ))}
      </div>

      <Input.TextArea
        value={value}
        placeholder={placeholder}
        variant="borderless"
        spellCheck={false}
        autoSize={false}
        className="
          !h-full !resize-none !rounded-none
          !px-3 !py-2 !font-mono
          !text-[13px] !leading-7
          !text-[#161823]
        "
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
};

export default function FieldMappingSection({
  sourceColumns,
  targetColumns,
  sourceLoading,
  targetLoading,
  sourceReady,
  targetReady,
}: FieldMappingSectionProps) {
  const [rows, setRows] = useState<FieldMappingRow[]>([]);
  const [geometries, setGeometries] = useState<
    MappingGeometry[]
  >([]);

  const [hoveredMappingKey, setHoveredMappingKey] =
    useState<string>();

  const [editingMappingKey, setEditingMappingKey] =
    useState<string>();

  const [addPopoverOpen, setAddPopoverOpen] =
    useState(false);

  const [addValues, setAddValues] =
    useState<AddMappingValues>({});

  const [manualModalOpen, setManualModalOpen] =
    useState(false);

  const [manualSourceFields, setManualSourceFields] =
    useState('');

  const [manualTargetFields, setManualTargetFields] =
    useState('');

  const canvasRef = useRef<HTMLDivElement | null>(null);

  const sourceRowRefs = useRef<
    Map<string, HTMLDivElement>
  >(new Map());

  const targetRowRefs = useRef<
    Map<string, HTMLDivElement>
  >(new Map());

  const initializedKeyRef = useRef('');
  const hoverTimerRef = useRef<number>();

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

  const sourceFieldAliasMap = useMemo(() => {
    const aliasMap = new Map<string, string>();

    sourceColumns.forEach((column) => {
      aliasMap.set(
        normalizeFieldName(column.value),
        column.value,
      );

      if (column.label) {
        aliasMap.set(
          normalizeFieldName(String(column.label)),
          column.value,
        );
      }
    });

    return aliasMap;
  }, [sourceColumns]);

  const targetFieldAliasMap = useMemo(() => {
    const aliasMap = new Map<string, string>();

    targetColumns.forEach((column) => {
      aliasMap.set(
        normalizeFieldName(column.value),
        column.value,
      );

      if (column.label) {
        aliasMap.set(
          normalizeFieldName(String(column.label)),
          column.value,
        );
      }
    });

    return aliasMap;
  }, [targetColumns]);

  const usedSourceFields = useMemo(
    () =>
      new Set(
        rows
          .map((row) => row.sourceField)
          .filter(Boolean) as string[],
      ),
    [rows],
  );

  const usedTargetFields = useMemo(
    () =>
      new Set(
        rows
          .map((row) => row.targetField)
          .filter(Boolean) as string[],
      ),
    [rows],
  );

  useEffect(() => {
    if (!sourceColumns.length || !targetColumns.length) {
      setRows([]);
      initializedKeyRef.current = '';
      return;
    }

    const initializeKey = [
      sourceColumns
        .map((column) => column.value)
        .join(','),
      targetColumns
        .map((column) => column.value)
        .join(','),
    ].join('::');

    if (initializedKeyRef.current === initializeKey) {
      return;
    }

    initializedKeyRef.current = initializeKey;

    setRows(
      buildSameNameMappings(
        sourceColumns,
        targetColumns,
      ),
    );
  }, [sourceColumns, targetColumns]);

  const calculateGeometry = useCallback(() => {
    const canvasElement = canvasRef.current;

    if (!canvasElement) {
      setGeometries([]);
      return;
    }

    const canvasRect =
      canvasElement.getBoundingClientRect();

    const nextGeometries = rows
      .map((row) => {
        if (!row.sourceField || !row.targetField) {
          return null;
        }

        const sourceElement =
          sourceRowRefs.current.get(row.sourceField);

        const targetElement =
          targetRowRefs.current.get(row.targetField);

        if (!sourceElement || !targetElement) {
          return null;
        }

        const sourceRect =
          sourceElement.getBoundingClientRect();

        const targetRect =
          targetElement.getBoundingClientRect();

        const startX =
          sourceRect.right - canvasRect.left;

        const startY =
          sourceRect.top -
          canvasRect.top +
          sourceRect.height / 2;

        const endX =
          targetRect.left - canvasRect.left;

        const endY =
          targetRect.top -
          canvasRect.top +
          targetRect.height / 2;

        return {
          key: row.key,
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
  }, [rows]);

  useLayoutEffect(() => {
    calculateGeometry();
  }, [
    calculateGeometry,
    sourceColumns,
    targetColumns,
  ]);

  useEffect(() => {
    const canvasElement = canvasRef.current;

    if (!canvasElement) {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => {
      calculateGeometry();
    });

    resizeObserver.observe(canvasElement);

    window.addEventListener(
      'resize',
      calculateGeometry,
    );

    return () => {
      resizeObserver.disconnect();

      window.removeEventListener(
        'resize',
        calculateGeometry,
      );
    };
  }, [calculateGeometry]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const showMappingActions = (key: string) => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }

    setHoveredMappingKey(key);
  };

  const hideMappingActions = (key: string) => {
    if (editingMappingKey === key) {
      return;
    }

    hoverTimerRef.current = window.setTimeout(() => {
      setHoveredMappingKey((current) =>
        current === key ? undefined : current,
      );
    }, 120);
  };

  const removeMapping = (key: string) => {
    setRows((currentRows) =>
      currentRows.filter((row) => row.key !== key),
    );

    setHoveredMappingKey(undefined);
    setEditingMappingKey(undefined);
  };

  const updateMappingTarget = (
    key: string,
    targetField: string,
  ) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.key === key
          ? {
              ...row,
              targetField,
            }
          : row,
      ),
    );

    setEditingMappingKey(undefined);
    setHoveredMappingKey(key);
  };

  const handleSameNameMapping = () => {
    setRows(
      buildSameNameMappings(
        sourceColumns,
        targetColumns,
      ),
    );

    setHoveredMappingKey(undefined);
    setEditingMappingKey(undefined);
  };

  const handlePositionMapping = () => {
    setRows(
      buildPositionMappings(
        sourceColumns,
        targetColumns,
      ),
    );

    setHoveredMappingKey(undefined);
    setEditingMappingKey(undefined);
  };

  const handleClearMapping = () => {
    setRows([]);
    setHoveredMappingKey(undefined);
    setEditingMappingKey(undefined);
  };

  const openManualMappingModal = () => {
    const validRows = rows.filter(
      (row) => row.sourceField && row.targetField,
    );

    if (validRows.length > 0) {
      setManualSourceFields(
        validRows
          .map((row) => row.sourceField)
          .join('\n'),
      );

      setManualTargetFields(
        validRows
          .map((row) => row.targetField)
          .join('\n'),
      );
    } else {
      setManualSourceFields(
        sourceColumns
          .map((column) => column.value)
          .join('\n'),
      );

      setManualTargetFields(
        targetColumns
          .map((column) => column.value)
          .join('\n'),
      );
    }

    setManualModalOpen(true);
  };

  const handleManualMappingConfirm = () => {
    const sourceFieldNames = parseManualFields(
      manualSourceFields,
    );

    const targetFieldNames = parseManualFields(
      manualTargetFields,
    );

    if (
      !sourceFieldNames.length &&
      !targetFieldNames.length
    ) {
      message.warning('请至少配置一组字段映射');
      return;
    }

    if (
      sourceFieldNames.length !==
      targetFieldNames.length
    ) {
      message.warning(
        `两侧有效字段数量不一致：来源 ${sourceFieldNames.length} 个，目标 ${targetFieldNames.length} 个`,
      );
      return;
    }

    const invalidSourceFields = sourceFieldNames.filter(
      (fieldName) =>
        !sourceFieldAliasMap.has(
          normalizeFieldName(fieldName),
        ),
    );

    if (invalidSourceFields.length > 0) {
      message.error(
        `来源字段不存在：${invalidSourceFields.join('、')}`,
      );
      return;
    }

    const invalidTargetFields = targetFieldNames.filter(
      (fieldName) =>
        !targetFieldAliasMap.has(
          normalizeFieldName(fieldName),
        ),
    );

    if (invalidTargetFields.length > 0) {
      message.error(
        `目标字段不存在：${invalidTargetFields.join('、')}`,
      );
      return;
    }

    const normalizedSourceFields = sourceFieldNames.map(
      (fieldName) =>
        sourceFieldAliasMap.get(
          normalizeFieldName(fieldName),
        ) as string,
    );

    const normalizedTargetFields = targetFieldNames.map(
      (fieldName) =>
        targetFieldAliasMap.get(
          normalizeFieldName(fieldName),
        ) as string,
    );

    if (
      new Set(normalizedSourceFields).size !==
      normalizedSourceFields.length
    ) {
      message.warning('来源字段不能重复映射');
      return;
    }

    if (
      new Set(normalizedTargetFields).size !==
      normalizedTargetFields.length
    ) {
      message.warning('目标字段不能重复映射');
      return;
    }

    setRows(
      normalizedSourceFields.map(
        (sourceField, index) => ({
          key: createMappingKey(index),
          sourceField,
          targetField:
            normalizedTargetFields[index],
        }),
      ),
    );

    setHoveredMappingKey(undefined);
    setEditingMappingKey(undefined);
    setManualModalOpen(false);

    message.success(
      `已生成 ${normalizedSourceFields.length} 条字段映射`,
    );
  };

  const addMapping = () => {
    const {
      sourceField,
      targetField,
    } = addValues;

    if (!sourceField || !targetField) {
      return;
    }

    setRows((currentRows) => [
      ...currentRows,
      {
        key: createMappingKey(
          currentRows.length,
        ),
        sourceField,
        targetField,
      },
    ]);

    setAddValues({});
    setAddPopoverOpen(false);
  };

  const renderTargetOptions = (
    currentMappingKey?: string,
  ) => {
    const currentMapping = rows.find(
      (row) => row.key === currentMappingKey,
    );

    return targetColumns.map((column) => {
      const occupied =
        usedTargetFields.has(column.value) &&
        currentMapping?.targetField !==
          column.value;

      return {
        value: column.value,
        disabled: occupied,
        label: (
          <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="truncate">
              {column.label || column.value}
            </span>

            {occupied ? (
              <Tooltip title="此字段已建立映射，选择后将取消原映射">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f5a623]" />
              </Tooltip>
            ) : null}
          </div>
        ),
      };
    });
  };

  const sourceOptions = useMemo(
    () =>
      sourceColumns.map((column) => ({
        value: column.value,
        disabled: usedSourceFields.has(
          column.value,
        ),
        label:
          column.label || column.value,
      })),
    [
      sourceColumns,
      usedSourceFields,
    ],
  );

  const addTargetOptions = useMemo(
    () =>
      targetColumns.map((column) => ({
        value: column.value,
        disabled: usedTargetFields.has(
          column.value,
        ),
        label:
          column.label || column.value,
      })),
    [
      targetColumns,
      usedTargetFields,
    ],
  );

  const sourceAndTargetReady =
    sourceReady && targetReady;

  const loading =
    sourceLoading || targetLoading;

  const mappingReady =
    sourceColumns.length > 0 &&
    targetColumns.length > 0;

  const maxRowCount = Math.max(
    sourceColumns.length,
    targetColumns.length,
  );

  const canvasHeight =
    TABLE_HEADER_HEIGHT +
    maxRowCount * TABLE_ROW_HEIGHT;

  const tableHeaderClass = [
    'grid h-8 grid-cols-[minmax(0,1fr)_180px]',
    'items-center border border-[#e5e7eb]',
    'bg-[#f2f2f2] text-[12px]',
    'font-semibold text-[#161823]',
  ].join(' ');

  const tableRowClass = [
    'relative grid h-8',
    'grid-cols-[minmax(0,1fr)_180px]',
    'items-center border-x border-b',
    'border-[#e5e7eb] bg-white',
    'text-[12px] text-[#161823]',
    'transition-colors hover:bg-[#fafafa]',
  ].join(' ');

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `${TABLE_WIDTH}px minmax(260px, 1fr) ${TABLE_WIDTH}px`,
  };

  const renderUnavailableContent = () => {
    if (!sourceAndTargetReady) {
      return (
        <div className="flex min-h-[120px] items-center justify-center border border-[#e5e7eb]">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请先完成来源端和目标端配置"
          />
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex min-h-[120px] items-center justify-center border border-[#e5e7eb] text-xs text-[#98a2b3]">
          正在加载字段信息...
        </div>
      );
    }

    if (!mappingReady) {
      return (
        <div className="flex min-h-[120px] items-center justify-center border border-[#e5e7eb]">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="当前表暂未获取到可映射字段"
          />
        </div>
      );
    }

    return null;
  };

  const unavailableContent =
    renderUnavailableContent();

  return (
    <EditorSection title="字段映射">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="primary"
            size="small"
            disabled={!mappingReady}
            onClick={handleSameNameMapping}
          >
            同名映射
          </Button>

          <Button
            type="primary"
            size="small"
            disabled={!mappingReady}
            onClick={handlePositionMapping}
          >
            同行映射
          </Button>

          <Button
            size="small"
            disabled={!rows.length}
            onClick={handleClearMapping}
          >
            清空映射
          </Button>

          <Button
            size="small"
            disabled={!mappingReady}
            onClick={openManualMappingModal}
          >
            手动编辑映射关系
          </Button>
        </div>

        <div className="overflow-x-auto">
          {unavailableContent ? (
            unavailableContent
          ) : (
            <div className="min-w-[900px]">
              <div
                ref={canvasRef}
                className="relative grid items-start"
                style={{
                  ...gridStyle,
                  minHeight: canvasHeight,
                }}
              >
                <div className="relative z-20">
                  <div className={tableHeaderClass}>
                    <div className="px-3">
                      来源字段
                    </div>

                    <div className="flex items-center gap-1 border-l border-[#e5e7eb] px-3">
                      类型

                      <FilterOutlined className="text-[10px] text-[#667085]" />
                    </div>
                  </div>

                  {sourceColumns.map((column) => (
                    <div
                      key={column.value}
                      ref={(element) => {
                        if (element) {
                          sourceRowRefs.current.set(
                            column.value,
                            element,
                          );
                        } else {
                          sourceRowRefs.current.delete(
                            column.value,
                          );
                        }
                      }}
                      className={tableRowClass}
                    >
                      <div className="truncate px-3">
                        {column.label || column.value}
                      </div>

                      <div className="truncate border-l border-[#e5e7eb] px-3">
                        {getFieldType(
                          sourceMap.get(column.value),
                        )}
                      </div>

                      <span
                        className="
                          absolute right-[-4px] top-1/2 z-30
                          h-[7px] w-[7px]
                          -translate-y-1/2 rotate-45
                          bg-[#d6dae1]
                        "
                      />
                    </div>
                  ))}
                </div>

                <div />

                <div className="relative z-20">
                  <div className={tableHeaderClass}>
                    <div className="px-3">
                      目标字段
                    </div>

                    <div className="flex items-center gap-1 border-l border-[#e5e7eb] px-3">
                      类型

                      <FilterOutlined className="text-[10px] text-[#667085]" />
                    </div>
                  </div>

                  {targetColumns.map((column) => (
                    <div
                      key={column.value}
                      ref={(element) => {
                        if (element) {
                          targetRowRefs.current.set(
                            column.value,
                            element,
                          );
                        } else {
                          targetRowRefs.current.delete(
                            column.value,
                          );
                        }
                      }}
                      className={tableRowClass}
                    >
                      <span
                        className="
                          absolute left-[-4px] top-1/2 z-30
                          h-[7px] w-[7px]
                          -translate-y-1/2 rotate-45
                          bg-[#d6dae1]
                        "
                      />

                      <div className="truncate px-3">
                        {column.label || column.value}
                      </div>

                      <div className="truncate border-l border-[#e5e7eb] px-3">
                        {getFieldType(
                          targetMap.get(column.value),
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <svg
                  className="
                    pointer-events-none absolute inset-0
                    z-10 h-full w-full overflow-visible
                  "
                >
                  {geometries.map((geometry) => {
                    const active =
                      hoveredMappingKey === geometry.key ||
                      editingMappingKey === geometry.key;

                    return (
                      <g key={geometry.key}>
                        <line
                          x1={geometry.startX}
                          y1={geometry.startY}
                          x2={geometry.endX}
                          y2={geometry.endY}
                          stroke="transparent"
                          strokeWidth={18}
                          pointerEvents="stroke"
                          className="cursor-pointer"
                          onMouseEnter={() =>
                            showMappingActions(
                              geometry.key,
                            )
                          }
                          onMouseLeave={() =>
                            hideMappingActions(
                              geometry.key,
                            )
                          }
                        />

                        <line
                          x1={geometry.startX}
                          y1={geometry.startY}
                          x2={geometry.endX}
                          y2={geometry.endY}
                          stroke={
                            active
                              ? BRAND_COLOR
                              : '#c9ced6'
                          }
                          strokeWidth={
                            active ? 1.6 : 1
                          }
                          pointerEvents="none"
                          className="transition-all duration-150"
                        />

                        <rect
                          x={geometry.startX - 3}
                          y={geometry.startY - 3}
                          width={6}
                          height={6}
                          fill={
                            active
                              ? BRAND_COLOR
                              : '#c9ced6'
                          }
                          transform={`rotate(45 ${geometry.startX} ${geometry.startY})`}
                          pointerEvents="none"
                        />

                        <rect
                          x={geometry.endX - 3}
                          y={geometry.endY - 3}
                          width={6}
                          height={6}
                          fill={
                            active
                              ? BRAND_COLOR
                              : '#c9ced6'
                          }
                          transform={`rotate(45 ${geometry.endX} ${geometry.endY})`}
                          pointerEvents="none"
                        />
                      </g>
                    );
                  })}
                </svg>

                {geometries.map((geometry) => {
                  const visible =
                    hoveredMappingKey === geometry.key ||
                    editingMappingKey === geometry.key;

                  if (!visible) {
                    return null;
                  }

                  const mapping = rows.find(
                    (row) =>
                      row.key === geometry.key,
                  );

                  return (
                    <div
                      key={`actions-${geometry.key}`}
                      className="absolute z-40 flex items-center gap-1.5"
                      style={{
                        left: geometry.middleX,
                        top: geometry.middleY,
                        transform:
                          'translate(-50%, -50%)',
                      }}
                      onMouseEnter={() =>
                        showMappingActions(
                          geometry.key,
                        )
                      }
                      onMouseLeave={() =>
                        hideMappingActions(
                          geometry.key,
                        )
                      }
                    >
                      <Button
                        danger
                        size="small"
                        className="
                          !h-6 !rounded-full
                          !bg-white !px-2
                          !text-[11px] !shadow-sm
                        "
                        onClick={() =>
                          removeMapping(geometry.key)
                        }
                      >
                        删除
                      </Button>

                      <Popover
                        trigger="click"
                        placement="bottom"
                        open={
                          editingMappingKey ===
                          geometry.key
                        }
                        onOpenChange={(open) => {
                          setEditingMappingKey(
                            open
                              ? geometry.key
                              : undefined,
                          );
                        }}
                        content={
                          <div className="w-[220px]">
                            <div className="mb-2 text-xs text-[#475467]">
                              请选择目标字段
                            </div>

                            <Select
                              autoFocus
                              showSearch
                              variant="filled"
                              value={
                                mapping?.targetField
                              }
                              options={renderTargetOptions(
                                geometry.key,
                              )}
                              optionFilterProp="label"
                              placeholder="选择目标字段"
                              className="w-full"
                              onChange={(targetField) =>
                                updateMappingTarget(
                                  geometry.key,
                                  targetField,
                                )
                              }
                            />
                          </div>
                        }
                      >
                        <Button
                          size="small"
                          className="
                            !h-6 !rounded-full
                            !bg-white !px-2
                            !text-[11px] !shadow-sm
                          "
                        >
                          修改
                        </Button>
                      </Popover>
                    </div>
                  );
                })}
              </div>

              <Popover
                trigger="click"
                placement="bottomLeft"
                open={addPopoverOpen}
                onOpenChange={(open) => {
                  setAddPopoverOpen(open);

                  if (!open) {
                    setAddValues({});
                  }
                }}
                content={
                  <div className="w-[260px] space-y-3">
                    <div>
                      <div className="mb-1.5 text-xs text-[#475467]">
                        来源字段
                      </div>

                      <Select
                        showSearch
                        variant="filled"
                        value={
                          addValues.sourceField
                        }
                        options={sourceOptions}
                        optionFilterProp="label"
                        placeholder="选择来源字段"
                        className="w-full"
                        onChange={(sourceField) =>
                          setAddValues((current) => ({
                            ...current,
                            sourceField,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <div className="mb-1.5 text-xs text-[#475467]">
                        目标字段
                      </div>

                      <Select
                        showSearch
                        variant="filled"
                        value={
                          addValues.targetField
                        }
                        options={addTargetOptions}
                        optionFilterProp="label"
                        placeholder="选择目标字段"
                        className="w-full"
                        onChange={(targetField) =>
                          setAddValues((current) => ({
                            ...current,
                            targetField,
                          }))
                        }
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        size="small"
                        onClick={() => {
                          setAddValues({});
                          setAddPopoverOpen(false);
                        }}
                      >
                        取消
                      </Button>

                      <Button
                        size="small"
                        type="primary"
                        disabled={
                          !addValues.sourceField ||
                          !addValues.targetField
                        }
                        onClick={addMapping}
                      >
                        确定
                      </Button>
                    </div>
                  </div>
                }
              >
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  className="!mt-1 !h-7 !px-0 !text-xs"
                >
                  添加字段
                </Button>
              </Popover>
            </div>
          )}
        </div>
      </div>

      <Modal
        title="手动编辑表字段"
        width={800}
        centered
        destroyOnHidden
        open={manualModalOpen}
        okText="确定"
        cancelText="取消"
        styles={{
          body: {
            paddingTop: 14,
          },
        }}
        onCancel={() => setManualModalOpen(false)}
        onOk={handleManualMappingConfirm}
      >
        <Alert
          showIcon
          type="info"
          message="请手动编辑字段，一行表示一个字段，空行会被忽略"
          className="mb-4"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-2 text-[13px] font-medium text-[#344054]">
              来源字段
            </div>

            <ManualFieldEditor
              value={manualSourceFields}
              placeholder={'code\nname\ndescription\nextendname'}
              onChange={setManualSourceFields}
            />
          </div>

          <div>
            <div className="mb-2 text-[13px] font-medium text-[#344054]">
              目标字段
            </div>

            <ManualFieldEditor
              value={manualTargetFields}
              placeholder={'code\nname\nextendname\ndescription'}
              onChange={setManualTargetFields}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[12px] text-[#98a2b3]">
          <span>
            两侧字段按照行号一一建立映射关系
          </span>

          <span>
            来源字段：
            {parseManualFields(
              manualSourceFields,
            ).length}
            {' · '}
            目标字段：
            {parseManualFields(
              manualTargetFields,
            ).length}
          </span>
        </div>
      </Modal>
    </EditorSection>
  );
}