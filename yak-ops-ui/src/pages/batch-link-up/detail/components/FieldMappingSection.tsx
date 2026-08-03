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
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
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

interface DragConnectionState {
  pointerId: number;
  sourceField: string;

  startX: number;
  startY: number;

  currentX: number;
  currentY: number;

  startClientX: number;
  startClientY: number;

  moved: boolean;

  targetField?: string;
  targetOccupied?: boolean;
}

interface ManualFieldEditorProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

type RowsUpdater = (
  currentRows: FieldMappingRow[],
) => FieldMappingRow[];

const BRAND_COLOR =
  'var(--yak-brand-color, rgba(254, 44, 85, 1))';

const TABLE_WIDTH = 360;
const TABLE_HEADER_HEIGHT = 32;
const TABLE_ROW_HEIGHT = 32;

const DRAG_START_DISTANCE = 4;

let mappingRowSeed = 0;

const normalizeFieldName = (value: string) =>
  value.trim().toLowerCase();

const createMappingKey = (index: number) => {
  mappingRowSeed += 1;

  return `mapping-${mappingRowSeed}-${index}`;
};

const getColumnLabel = (
  column: DataSourceColumnOption,
) => String(column.label || column.value);

const getFieldType = (
  column?: DataSourceColumnOption,
) => {
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

const rowsToMappingValue = (
  rows: FieldMappingRow[],
): FieldMappingValue[] =>
  rows
    .filter(
      (row) =>
        Boolean(row.sourceField) &&
        Boolean(row.targetField),
    )
    .map((row) => ({
      source: row.sourceField as string,
      target: row.targetField as string,
    }));

const mappingValueToRows = (
  value: FieldMappingValue[],
): FieldMappingRow[] =>
  value.map((item, index) => ({
    key: createMappingKey(index),
    sourceField: item.source,
    targetField: item.target,
  }));

const mappingValueSignature = (
  value: FieldMappingValue[],
) =>
  value
    .map(
      (item) =>
        `${item.source}\u0000${item.target}`,
    )
    .join('\u0001');

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
          w-12 shrink-0 select-none
          border-r border-[#eef0f2]
          bg-[#f7f8fa] py-2
          text-right text-[12px]
          leading-7 text-[#98a2b3]
        "
      >
        {Array.from(
          { length: lineCount },
          (_, index) => (
            <div
              key={index}
              className="h-7 pr-3"
            >
              {index + 1}
            </div>
          ),
        )}
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
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
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
  const [rows, setRows] = useState<FieldMappingRow[]>(
    () => mappingValueToRows(value),
  );

  const [geometries, setGeometries] = useState<
    MappingGeometry[]
  >([]);

  const [
    hoveredMappingKey,
    setHoveredMappingKey,
  ] = useState<string>();

  const [
    editingMappingKey,
    setEditingMappingKey,
  ] = useState<string>();

  const [
    editingTargetValue,
    setEditingTargetValue,
  ] = useState('');

  const [
    sourcePickerField,
    setSourcePickerField,
  ] = useState<string>();

  const [
    sourcePickerTargetValue,
    setSourcePickerTargetValue,
  ] = useState('');

  const [
    addPopoverOpen,
    setAddPopoverOpen,
  ] = useState(false);

  const [addValues, setAddValues] =
    useState<AddMappingValues>({});

  const [
    manualModalOpen,
    setManualModalOpen,
  ] = useState(false);

  const [
    manualSourceFields,
    setManualSourceFields,
  ] = useState('');

  const [
    manualTargetFields,
    setManualTargetFields,
  ] = useState('');

  const [
    dragConnection,
    setDragConnection,
  ] = useState<DragConnectionState>();

  const canvasRef =
    useRef<HTMLDivElement | null>(null);

  const sourceRowRefs = useRef<
    Map<string, HTMLDivElement>
  >(new Map());

  const targetRowRefs = useRef<
    Map<string, HTMLDivElement>
  >(new Map());

  const rowsRef =
    useRef<FieldMappingRow[]>(rows);

  const dragConnectionRef =
    useRef<DragConnectionState>();

  const initializedKeyRef = useRef('');

  const hoverTimerRef =
    useRef<number | undefined>(undefined);

  const suppressSourceClickRef =
    useRef(false);

  const bodyStyleRef = useRef<{
    cursor: string;
    userSelect: string;
  }>();

  const reactId = useId();

  const dragArrowMarkerId = useMemo(
    () =>
      `field-mapping-arrow-${reactId.replace(
        /[^a-zA-Z0-9_-]/g,
        '',
      )}`,
    [reactId],
  );

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
      targetColumns.map(
        (column) => column.value,
      ),
    );

    const customColumns: DataSourceColumnOption[] = [];

    rows.forEach((row) => {
      if (
        !row.sourceField ||
        !row.targetField ||
        existing.has(row.targetField)
      ) {
        return;
      }

      existing.add(row.targetField);

      const sourceColumn = sourceMap.get(
        row.sourceField,
      );

      customColumns.push({
        value: row.targetField,
        label: row.targetField,
        description:
          sourceColumn?.description ||
          '自定义目标字段',
      });
    });

    return [
      ...targetColumns,
      ...customColumns,
    ];
  }, [
    rows,
    sourceMap,
    targetColumns,
    targetDerived,
  ]);

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

  const sourceFieldAliasMap = useMemo(() => {
    const aliasMap =
      new Map<string, string>();

    sourceColumns.forEach((column) => {
      aliasMap.set(
        normalizeFieldName(column.value),
        column.value,
      );

      aliasMap.set(
        normalizeFieldName(
          getColumnLabel(column),
        ),
        column.value,
      );
    });

    return aliasMap;
  }, [sourceColumns]);

  const targetFieldAliasMap = useMemo(() => {
    const aliasMap =
      new Map<string, string>();

    displayTargetColumns.forEach((column) => {
      aliasMap.set(
        normalizeFieldName(column.value),
        column.value,
      );

      aliasMap.set(
        normalizeFieldName(
          getColumnLabel(column),
        ),
        column.value,
      );
    });

    return aliasMap;
  }, [displayTargetColumns]);

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

  const sourceMappingKeyMap = useMemo(() => {
    const result = new Map<string, string>();

    rows.forEach((row) => {
      if (row.sourceField) {
        result.set(row.sourceField, row.key);
      }
    });

    return result;
  }, [rows]);

  const targetMappingKeyMap = useMemo(() => {
    const result = new Map<string, string>();

    rows.forEach((row) => {
      if (row.targetField) {
        result.set(row.targetField, row.key);
      }
    });

    return result;
  }, [rows]);

  const activeMappingKey =
    editingMappingKey || hoveredMappingKey;

  const connectionSourceField =
    dragConnection?.sourceField ||
    sourcePickerField;

  const syncRows = useCallback(
    (nextRows: FieldMappingRow[]) => {
      rowsRef.current = nextRows;
      setRows(nextRows);
    },
    [],
  );

  const replaceRows = useCallback(
    (nextRows: FieldMappingRow[]) => {
      syncRows(nextRows);
      onChange(
        rowsToMappingValue(nextRows),
      );
    },
    [onChange, syncRows],
  );

  const updateRows = useCallback(
    (updater: RowsUpdater) => {
      replaceRows(
        updater(rowsRef.current),
      );
    },
    [replaceRows],
  );

  const setDragState = useCallback(
    (
      nextState:
        | DragConnectionState
        | undefined,
    ) => {
      dragConnectionRef.current =
        nextState;

      setDragConnection(nextState);
    },
    [],
  );

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    if (
      !sourceColumns.length ||
      !displayTargetColumns.length
    ) {
      syncRows([]);
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
      targetDerived ? 'derived' : 'fixed',
    ].join('::');

    const previousKey =
      initializedKeyRef.current;

    initializedKeyRef.current =
      initializeKey;

    if (
      previousKey &&
      previousKey !== initializeKey
    ) {
      replaceRows(
        buildSameNameMappings(
          sourceColumns,
          targetColumns,
        ),
      );

      setHoveredMappingKey(undefined);
      setEditingMappingKey(undefined);
      setEditingTargetValue('');
      setSourcePickerField(undefined);
      return;
    }

    const usedSources = new Set<string>();
    const usedTargets = new Set<string>();

    const validValue = value
      .map((item) => ({
        source: String(
          item?.source || '',
        ).trim(),
        target: String(
          item?.target || '',
        ).trim(),
      }))
      .filter((item) => {
        if (
          !item.source ||
          !item.target ||
          !sourceMap.has(item.source) ||
          (!targetDerived &&
            !targetMap.has(item.target)) ||
          usedSources.has(item.source) ||
          usedTargets.has(item.target)
        ) {
          return false;
        }

        usedSources.add(item.source);
        usedTargets.add(item.target);
        return true;
      });

    const currentValue =
      rowsToMappingValue(
        rowsRef.current,
      );

    if (
      mappingValueSignature(currentValue) !==
      mappingValueSignature(validValue)
    ) {
      syncRows(
        mappingValueToRows(validValue),
      );
    }

    if (
      mappingValueSignature(value) !==
      mappingValueSignature(validValue)
    ) {
      onChange(validValue);
      return;
    }

    if (
      !previousKey &&
      validValue.length === 0
    ) {
      replaceRows(
        buildSameNameMappings(
          sourceColumns,
          targetColumns,
        ),
      );
    }
  }, [
    displayTargetColumns.length,
    onChange,
    replaceRows,
    sourceColumns,
    sourceMap,
    syncRows,
    targetColumns,
    targetDerived,
    targetMap,
    value,
  ]);

  const calculateGeometry = useCallback(() => {
    const canvasElement =
      canvasRef.current;

    if (!canvasElement) {
      setGeometries([]);
      return;
    }

    const canvasRect =
      canvasElement.getBoundingClientRect();

    const nextGeometries = rows
      .map((row) => {
        if (
          !row.sourceField ||
          !row.targetField
        ) {
          return null;
        }

        const sourceElement =
          sourceRowRefs.current.get(
            row.sourceField,
          );

        const targetElement =
          targetRowRefs.current.get(
            row.targetField,
          );

        if (
          !sourceElement ||
          !targetElement
        ) {
          return null;
        }

        const sourceRect =
          sourceElement.getBoundingClientRect();

        const targetRect =
          targetElement.getBoundingClientRect();

        const startX =
          sourceRect.right -
          canvasRect.left;

        const startY =
          sourceRect.top -
          canvasRect.top +
          sourceRect.height / 2;

        const endX =
          targetRect.left -
          canvasRect.left;

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
          middleX:
            (startX + endX) / 2,
          middleY:
            (startY + endY) / 2,
        };
      })
      .filter(Boolean) as MappingGeometry[];

    setGeometries(nextGeometries);
  }, [rows]);

  useLayoutEffect(() => {
    calculateGeometry();
  }, [
    calculateGeometry,
    displayTargetColumns,
    sourceColumns,
  ]);

  useEffect(() => {
    const canvasElement =
      canvasRef.current;

    if (!canvasElement) {
      return undefined;
    }

    const resizeObserver =
      new ResizeObserver(() => {
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

  const restoreBodyStyle =
    useCallback(() => {
      if (
        typeof document === 'undefined' ||
        !bodyStyleRef.current
      ) {
        return;
      }

      document.body.style.cursor =
        bodyStyleRef.current.cursor;

      document.body.style.userSelect =
        bodyStyleRef.current.userSelect;

      bodyStyleRef.current = undefined;
    }, []);

  const clearDragConnection =
    useCallback(() => {
      setDragState(undefined);
      restoreBodyStyle();
    }, [
      restoreBodyStyle,
      setDragState,
    ]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(
          hoverTimerRef.current,
        );
      }

      restoreBodyStyle();
    };
  }, [restoreBodyStyle]);

  const connectFields = useCallback(
    (
      sourceField: string,
      targetField: string,
    ) => {
      const normalizedTargetField =
        targetField.trim();

      if (
        !sourceMap.has(sourceField) ||
        !normalizedTargetField ||
        (!targetDerived &&
          !targetMap.has(
            normalizedTargetField,
          ))
      ) {
        message.error(
          '来源字段或目标字段不存在',
        );

        return false;
      }

      const currentRows =
        rowsRef.current;

      const sourceMapping =
        currentRows.find(
          (row) =>
            row.sourceField ===
            sourceField,
        );

      if (sourceMapping) {
        message.warning(
          '该来源字段已建立映射',
        );

        return false;
      }

      const targetMapping =
        currentRows.find(
          (row) =>
            row.targetField ===
            normalizedTargetField,
        );

      if (targetMapping) {
        message.warning(
          '该目标字段已建立映射，请先删除原映射',
        );

        return false;
      }

      updateRows((current) => [
        ...current,
        {
          key: createMappingKey(
            current.length,
          ),
          sourceField,
          targetField:
            normalizedTargetField,
        },
      ]);

      setSourcePickerField(undefined);
      setSourcePickerTargetValue('');

      return true;
    },
    [
      sourceMap,
      targetDerived,
      targetMap,
      updateRows,
    ],
  );

  const resolveTargetFieldAtPoint =
    useCallback(
      (
        clientX: number,
        clientY: number,
      ) => {
        const element =
          document.elementFromPoint(
            clientX,
            clientY,
          );

        const targetElement =
          element?.closest<HTMLElement>(
            '[data-mapping-target-field]',
          );

        const fieldFromElement =
          targetElement?.dataset
            .mappingTargetField;

        if (fieldFromElement) {
          return fieldFromElement;
        }

        for (const column of displayTargetColumns) {
          const targetRow =
            targetRowRefs.current.get(
              column.value,
            );

          if (!targetRow) {
            continue;
          }

          const rect =
            targetRow.getBoundingClientRect();

          const insideY =
            clientY >= rect.top &&
            clientY <= rect.bottom;

          const nearTargetHandle =
            clientX >= rect.left - 28 &&
            clientX <= rect.left + 56;

          if (
            insideY &&
            nearTargetHandle
          ) {
            return column.value;
          }
        }

        return undefined;
      },
      [displayTargetColumns],
    );

  const beginSourceDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    sourceField: string,
  ) => {
    if (event.button !== 0) {
      return;
    }

    if (
      rowsRef.current.some(
        (row) =>
          row.sourceField ===
          sourceField,
      )
    ) {
      return;
    }

    const canvasElement =
      canvasRef.current;

    const sourceElement =
      sourceRowRefs.current.get(
        sourceField,
      );

    if (
      !canvasElement ||
      !sourceElement
    ) {
      return;
    }

    const canvasRect =
      canvasElement.getBoundingClientRect();

    const sourceRect =
      sourceElement.getBoundingClientRect();

    const startX =
      sourceRect.right -
      canvasRect.left;

    const startY =
      sourceRect.top -
      canvasRect.top +
      sourceRect.height / 2;

    setSourcePickerField(undefined);

    if (
      typeof document !== 'undefined'
    ) {
      bodyStyleRef.current = {
        cursor:
          document.body.style.cursor,
        userSelect:
          document.body.style
            .userSelect,
      };

      document.body.style.cursor =
        'crosshair';

      document.body.style.userSelect =
        'none';
    }

    event.currentTarget.setPointerCapture?.(
      event.pointerId,
    );

    setDragState({
      pointerId: event.pointerId,
      sourceField,

      startX,
      startY,

      currentX: startX,
      currentY: startY,

      startClientX: event.clientX,
      startClientY: event.clientY,

      moved: false,
    });
  };

  useEffect(() => {
    const handlePointerMove = (
      event: PointerEvent,
    ) => {
      const current =
        dragConnectionRef.current;

      const canvasElement =
        canvasRef.current;

      if (
        !current ||
        !canvasElement ||
        current.pointerId !==
          event.pointerId
      ) {
        return;
      }

      const distance = Math.hypot(
        event.clientX -
          current.startClientX,
        event.clientY -
          current.startClientY,
      );

      const moved =
        current.moved ||
        distance >=
          DRAG_START_DISTANCE;

      const canvasRect =
        canvasElement.getBoundingClientRect();

      const targetField =
        resolveTargetFieldAtPoint(
          event.clientX,
          event.clientY,
        );

      const targetOccupied =
        targetField
          ? rowsRef.current.some(
              (row) =>
                row.targetField ===
                targetField,
            )
          : false;

      let currentX =
        event.clientX -
        canvasRect.left;

      let currentY =
        event.clientY -
        canvasRect.top;

      if (targetField) {
        const targetElement =
          targetRowRefs.current.get(
            targetField,
          );

        if (targetElement) {
          const targetRect =
            targetElement.getBoundingClientRect();

          currentX =
            targetRect.left -
            canvasRect.left;

          currentY =
            targetRect.top -
            canvasRect.top +
            targetRect.height / 2;
        }
      }

      setDragState({
        ...current,

        currentX,
        currentY,

        moved,

        targetField,
        targetOccupied,
      });

      if (moved) {
        event.preventDefault();
      }
    };

    const handlePointerUp = (
      event: PointerEvent,
    ) => {
      const current =
        dragConnectionRef.current;

      if (
        !current ||
        current.pointerId !==
          event.pointerId
      ) {
        return;
      }

      const targetField =
        resolveTargetFieldAtPoint(
          event.clientX,
          event.clientY,
        ) || current.targetField;

      suppressSourceClickRef.current =
        current.moved;

      if (
        current.moved &&
        targetField
      ) {
        const targetOccupied =
          rowsRef.current.some(
            (row) =>
              row.targetField ===
              targetField,
          );

        if (targetOccupied) {
          message.warning(
            '该目标字段已经建立映射，请先删除原映射',
          );
        } else {
          connectFields(
            current.sourceField,
            targetField,
          );
        }
      }

      clearDragConnection();

      window.setTimeout(() => {
        suppressSourceClickRef.current =
          false;
      }, 120);
    };

    const handlePointerCancel = (
      event: PointerEvent,
    ) => {
      const current =
        dragConnectionRef.current;

      if (
        !current ||
        current.pointerId !==
          event.pointerId
      ) {
        return;
      }

      suppressSourceClickRef.current =
        true;

      clearDragConnection();

      window.setTimeout(() => {
        suppressSourceClickRef.current =
          false;
      }, 120);
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === 'Escape' &&
        dragConnectionRef.current
      ) {
        suppressSourceClickRef.current =
          true;

        clearDragConnection();

        window.setTimeout(() => {
          suppressSourceClickRef.current =
            false;
        }, 120);
      }
    };

    window.addEventListener(
      'pointermove',
      handlePointerMove,
      {
        passive: false,
      },
    );

    window.addEventListener(
      'pointerup',
      handlePointerUp,
    );

    window.addEventListener(
      'pointercancel',
      handlePointerCancel,
    );

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        'pointermove',
        handlePointerMove,
      );

      window.removeEventListener(
        'pointerup',
        handlePointerUp,
      );

      window.removeEventListener(
        'pointercancel',
        handlePointerCancel,
      );

      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [
    clearDragConnection,
    connectFields,
    resolveTargetFieldAtPoint,
    setDragState,
  ]);

  const handleSourceHandleClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    sourceField: string,
  ) => {
    if (
      suppressSourceClickRef.current
    ) {
      event.preventDefault();
      event.stopPropagation();

      suppressSourceClickRef.current =
        false;

      return;
    }

    if (
      rowsRef.current.some(
        (row) =>
          row.sourceField ===
          sourceField,
      )
    ) {
      return;
    }

    setSourcePickerTargetValue('');

    setSourcePickerField((current) =>
      current === sourceField
        ? undefined
        : sourceField,
    );
  };

  const showMappingActions = (
    key: string,
  ) => {
    if (hoverTimerRef.current) {
      window.clearTimeout(
        hoverTimerRef.current,
      );
    }

    setHoveredMappingKey(key);
  };

  const hideMappingActions = (
    key: string,
  ) => {
    if (
      editingMappingKey === key
    ) {
      return;
    }

    hoverTimerRef.current =
      window.setTimeout(() => {
        setHoveredMappingKey(
          (current) =>
            current === key
              ? undefined
              : current,
        );
      }, 120);
  };

  const removeMapping = (
    key: string,
  ) => {
    updateRows((currentRows) =>
      currentRows.filter(
        (row) => row.key !== key,
      ),
    );

    setHoveredMappingKey(undefined);
    setEditingMappingKey(undefined);
    setEditingTargetValue('');
  };

  const updateMappingTarget = (
    key: string,
    targetField: string,
  ) => {
    const normalizedTargetField =
      targetField.trim();

    if (
      !normalizedTargetField ||
      (!targetDerived &&
        !targetMap.has(
          normalizedTargetField,
        ))
    ) {
      message.error(
        '目标字段不存在',
      );

      return;
    }

    const occupiedMapping =
      rowsRef.current.find(
        (row) =>
          row.key !== key &&
          row.targetField ===
            normalizedTargetField,
      );

    if (occupiedMapping) {
      message.warning(
        '该目标字段已建立映射，请先删除原映射',
      );

      return;
    }

    updateRows((currentRows) =>
      currentRows.map((row) =>
        row.key === key
          ? {
              ...row,
              targetField:
                normalizedTargetField,
            }
          : row,
      ),
    );

    setEditingMappingKey(undefined);
    setEditingTargetValue('');
    setHoveredMappingKey(key);
  };

  const handleSameNameMapping =
    () => {
      replaceRows(
        buildSameNameMappings(
          sourceColumns,
          targetColumns,
        ),
      );

      setHoveredMappingKey(undefined);
      setEditingMappingKey(undefined);
      setEditingTargetValue('');
      setSourcePickerField(undefined);
    };

  const handlePositionMapping =
    () => {
      replaceRows(
        buildPositionMappings(
          sourceColumns,
          targetColumns,
        ),
      );

      setHoveredMappingKey(undefined);
      setEditingMappingKey(undefined);
      setEditingTargetValue('');
      setSourcePickerField(undefined);
    };

  const handleClearMapping = () => {
    replaceRows([]);

    setHoveredMappingKey(undefined);
    setEditingMappingKey(undefined);
    setEditingTargetValue('');
    setSourcePickerField(undefined);
  };

  const openManualMappingModal =
    () => {
      const validRows =
        rowsRef.current.filter(
          (row) =>
            row.sourceField &&
            row.targetField,
        );

      if (validRows.length > 0) {
        setManualSourceFields(
          validRows
            .map(
              (row) =>
                row.sourceField,
            )
            .join('\n'),
        );

        setManualTargetFields(
          validRows
            .map(
              (row) =>
                row.targetField,
            )
            .join('\n'),
        );
      } else {
        setManualSourceFields(
          sourceColumns
            .map(
              (column) =>
                column.value,
            )
            .join('\n'),
        );

        setManualTargetFields(
          targetColumns
            .map(
              (column) =>
                column.value,
            )
            .join('\n'),
        );
      }

      setManualModalOpen(true);
    };

  const handleManualMappingConfirm =
    () => {
      const sourceFieldNames =
        parseManualFields(
          manualSourceFields,
        );

      const targetFieldNames =
        parseManualFields(
          manualTargetFields,
        );

      if (
        !sourceFieldNames.length &&
        !targetFieldNames.length
      ) {
        message.warning(
          '请至少配置一组字段映射',
        );

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

      const invalidSourceFields =
        sourceFieldNames.filter(
          (fieldName) =>
            !sourceFieldAliasMap.has(
              normalizeFieldName(
                fieldName,
              ),
            ),
        );

      if (
        invalidSourceFields.length > 0
      ) {
        message.error(
          `来源字段不存在：${invalidSourceFields.join(
            '、',
          )}`,
        );

        return;
      }

      const invalidTargetFields =
        targetDerived
          ? []
          : targetFieldNames.filter(
              (fieldName) =>
                !targetFieldAliasMap.has(
                  normalizeFieldName(
                    fieldName,
                  ),
                ),
            );

      if (
        invalidTargetFields.length > 0
      ) {
        message.error(
          `目标字段不存在：${invalidTargetFields.join(
            '、',
          )}`,
        );

        return;
      }

      const normalizedSourceFields =
        sourceFieldNames.map(
          (fieldName) =>
            sourceFieldAliasMap.get(
              normalizeFieldName(
                fieldName,
              ),
            ) as string,
        );

      const normalizedTargetFields =
        targetDerived
          ? targetFieldNames.map(
              (fieldName) =>
                fieldName.trim(),
            )
          : targetFieldNames.map(
              (fieldName) =>
                targetFieldAliasMap.get(
                  normalizeFieldName(
                    fieldName,
                  ),
                ) as string,
            );

      if (
        new Set(
          normalizedSourceFields,
        ).size !==
        normalizedSourceFields.length
      ) {
        message.warning(
          '来源字段不能重复映射',
        );

        return;
      }

      if (
        new Set(
          normalizedTargetFields,
        ).size !==
        normalizedTargetFields.length
      ) {
        message.warning(
          '目标字段不能重复映射',
        );

        return;
      }

      replaceRows(
        normalizedSourceFields.map(
          (sourceField, index) => ({
            key: createMappingKey(index),
            sourceField,
            targetField:
              normalizedTargetFields[
                index
              ],
          }),
        ),
      );

      setHoveredMappingKey(undefined);
      setEditingMappingKey(undefined);
      setEditingTargetValue('');
      setSourcePickerField(undefined);
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

    if (
      !sourceField ||
      !targetField?.trim()
    ) {
      return;
    }

    const connected = connectFields(
      sourceField,
      targetField,
    );

    if (!connected) {
      return;
    }

    setAddValues({});
    setAddPopoverOpen(false);
  };

  const buildTargetOptions = (
    currentMappingKey?: string,
  ) => {
    const currentMapping =
      rowsRef.current.find(
        (row) =>
          row.key ===
          currentMappingKey,
      );

    return displayTargetColumns.map(
      (column) => {
        const occupied =
          usedTargetFields.has(
            column.value,
          ) &&
          currentMapping?.targetField !==
            column.value;

        return {
          value: column.value,
          disabled: occupied,
          label: (
            <div className="flex min-w-0 items-center justify-between gap-3">
              <span className="truncate">
                {getColumnLabel(
                  column,
                )}
              </span>

              {occupied ? (
                <Tooltip title="此字段已建立映射">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f5a623]" />
                </Tooltip>
              ) : null}
            </div>
          ),
        };
      },
    );
  };

  const sourceOptions = useMemo(
    () =>
      sourceColumns.map(
        (column) => ({
          value: column.value,
          disabled:
            usedSourceFields.has(
              column.value,
            ),
          label:
            getColumnLabel(column),
        }),
      ),
    [
      sourceColumns,
      usedSourceFields,
    ],
  );

  const addTargetOptions =
    useMemo(
      () =>
        displayTargetColumns.map(
          (column) => ({
            value: column.value,
            disabled:
              usedTargetFields.has(
                column.value,
              ),
            label:
              getColumnLabel(
                column,
              ),
          }),
        ),
      [
        displayTargetColumns,
        usedTargetFields,
      ],
    );

  const sourceAndTargetReady =
    sourceReady && targetReady;

  const loading =
    sourceLoading || targetLoading;

  const mappingReady =
    sourceColumns.length > 0 &&
    displayTargetColumns.length > 0;

  const maxRowCount = Math.max(
    sourceColumns.length,
    displayTargetColumns.length,
  );

  const canvasHeight =
    TABLE_HEADER_HEIGHT +
    maxRowCount *
      TABLE_ROW_HEIGHT;

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `${TABLE_WIDTH}px minmax(260px, 1fr) ${TABLE_WIDTH}px`,
  };

  const tableHeaderClass = [
    'grid h-8',
    'grid-cols-[minmax(0,1fr)_180px]',
    'items-center',
    'border border-[#e5e7eb]',
    'bg-[#f2f2f2]',
    'text-[12px] font-semibold',
    'text-[#161823]',
  ].join(' ');

  const tableRowClass = [
    'group/field-row relative',
    'grid h-8',
    'grid-cols-[minmax(0,1fr)_180px]',
    'items-center',
    'border-x border-b',
    'border-[#e5e7eb]',
    'bg-white',
    'text-[12px] text-[#161823]',
    'transition-colors',
    'hover:bg-[#fafafa]',
  ].join(' ');

  const renderUnavailableContent =
    () => {
      if (!sourceAndTargetReady) {
        return (
          <div className="flex min-h-[120px] items-center justify-center border border-[#e5e7eb]">
            <Empty
              image={
                Empty.PRESENTED_IMAGE_SIMPLE
              }
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
              image={
                Empty.PRESENTED_IMAGE_SIMPLE
              }
              description="当前表暂未获取到可映射字段"
            />
          </div>
        );
      }

      return null;
    };

  const unavailableContent =
    renderUnavailableContent();

  const renderSourcePicker = (
    sourceField: string,
  ) => (
    <div className="w-[220px]">
      <div className="mb-2 text-xs text-[#475467]">
        {targetDerived
          ? '请输入目标字段'
          : '请选择目标字段'}
      </div>

      {targetDerived ? (
        <Input.Search
          autoFocus
          allowClear
          variant="filled"
          value={sourcePickerTargetValue}
          placeholder="输入目标字段，回车确认"
          className="w-full"
          onChange={(event) =>
            setSourcePickerTargetValue(
              event.target.value,
            )
          }
          onSearch={(targetField) => {
            const connected = connectFields(
              sourceField,
              targetField,
            );

            if (connected) {
              setSourcePickerTargetValue('');
            }
          }}
        />
      ) : (
        <Select
          autoFocus
          showSearch
          variant="filled"
          placeholder="请选择"
          options={buildTargetOptions()}
          optionFilterProp="value"
          className="w-full"
          onChange={(targetField) => {
            connectFields(
              sourceField,
              targetField,
            );
          }}
        />
      )}
    </div>
  );

  return (
    <EditorSection title="字段映射">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="primary"
            size="small"
            disabled={!mappingReady}
            onClick={
              handleSameNameMapping
            }
          >
            同名映射
          </Button>

          <Button
            type="primary"
            size="small"
            disabled={!mappingReady}
            onClick={
              handlePositionMapping
            }
          >
            同行映射
          </Button>

          <Button
            size="small"
            disabled={!rows.length}
            onClick={
              handleClearMapping
            }
          >
            清空映射
          </Button>

          <Button
            size="small"
            disabled={!mappingReady}
            onClick={
              openManualMappingModal
            }
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
                  <div
                    className={
                      tableHeaderClass
                    }
                  >
                    <div className="px-3">
                      来源字段
                    </div>

                    <div className="flex items-center gap-1 border-l border-[#e5e7eb] px-3">
                      类型

                      <FilterOutlined className="text-[10px] text-[#667085]" />
                    </div>
                  </div>

                  {sourceColumns.map(
                    (column) => {
                      const mappingKey =
                        sourceMappingKeyMap.get(
                          column.value,
                        );

                      const mapped =
                        Boolean(mappingKey);

                      const mappingActive =
                        mappingKey ===
                        activeMappingKey;

                      const pickerOpen =
                        sourcePickerField ===
                        column.value;

                      const dragging =
                        dragConnection
                          ?.sourceField ===
                        column.value;

                      return (
                        <div
                          key={
                            column.value
                          }
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
                          className={
                            tableRowClass
                          }
                        >
                          <div className="truncate px-3">
                            {getColumnLabel(
                              column,
                            )}
                          </div>

                          <div className="truncate border-l border-[#e5e7eb] px-3">
                            {getFieldType(
                              sourceMap.get(
                                column.value,
                              ),
                            )}
                          </div>

                          {mapped ? (
                            <span
                              className="
                                absolute right-[-4px]
                                top-1/2 z-30
                                h-[7px] w-[7px]
                                -translate-y-1/2
                                rotate-45
                                transition-all
                              "
                              style={{
                                backgroundColor:
                                  mappingActive
                                    ? BRAND_COLOR
                                    : '#c9ced6',
                              }}
                            />
                          ) : (
                            <Popover
                              trigger="click"
                              placement="top"
                              open={pickerOpen}
                              onOpenChange={(
                                open,
                              ) => {
                                if (!open) {
                                  setSourcePickerField(
                                    undefined,
                                  );
                                  setSourcePickerTargetValue(
                                    '',
                                  );
                                }
                              }}
                              content={renderSourcePicker(
                                column.value,
                              )}
                            >
                              <button
                                type="button"
                                aria-label={`连接来源字段 ${getColumnLabel(
                                  column,
                                )}`}
                                className="
                                  group/source-handle
                                  absolute right-[-10px]
                                  top-1/2 z-40
                                  flex h-5 w-5
                                  -translate-y-1/2
                                  touch-none
                                  items-center
                                  justify-center
                                  rounded-full
                                  border border-transparent
                                  bg-transparent
                                  p-0
                                  transition-all
                                  hover:border-[#d8dce3]
                                  hover:bg-white
                                  hover:shadow-sm
                                "
                                style={{
                                  borderColor:
                                    pickerOpen ||
                                    dragging
                                      ? BRAND_COLOR
                                      : undefined,
                                  backgroundColor:
                                    pickerOpen ||
                                    dragging
                                      ? '#fff'
                                      : undefined,
                                }}
                                onPointerDown={(
                                  event,
                                ) =>
                                  beginSourceDrag(
                                    event,
                                    column.value,
                                  )
                                }
                                onClick={(
                                  event,
                                ) =>
                                  handleSourceHandleClick(
                                    event,
                                    column.value,
                                  )
                                }
                              >
                                <span
                                  className="
                                    absolute h-[7px]
                                    w-[7px]
                                    rotate-45
                                    transition-all
                                    group-hover/source-handle:opacity-0
                                  "
                                  style={{
                                    backgroundColor:
                                      pickerOpen ||
                                      dragging
                                        ? BRAND_COLOR
                                        : '#d6dae1',
                                  }}
                                />

                                <PlusOutlined
                                  className="
                                    relative z-10
                                    text-[10px]
                                    opacity-0
                                    transition-opacity
                                    group-hover/source-handle:opacity-100
                                  "
                                  style={{
                                    color:
                                      BRAND_COLOR,
                                    opacity:
                                      pickerOpen ||
                                      dragging
                                        ? 1
                                        : undefined,
                                  }}
                                />
                              </button>
                            </Popover>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>

                <div />

                <div className="relative z-20">
                  <div
                    className={
                      tableHeaderClass
                    }
                  >
                    <div className="px-3">
                      目标字段
                    </div>

                    <div className="flex items-center gap-1 border-l border-[#e5e7eb] px-3">
                      类型

                      <FilterOutlined className="text-[10px] text-[#667085]" />
                    </div>
                  </div>

                  {displayTargetColumns.map(
                    (column) => {
                      const mappingKey =
                        targetMappingKeyMap.get(
                          column.value,
                        );

                      const mapped =
                        Boolean(mappingKey);

                      const mappingActive =
                        mappingKey ===
                        activeMappingKey;

                      const targetHovered =
                        dragConnection
                          ?.targetField ===
                        column.value;

                      const connectionMode =
                        Boolean(
                          connectionSourceField,
                        );

                      const targetAvailable =
                        connectionMode &&
                        !mapped;

                      const targetOccupied =
                        connectionMode &&
                        mapped;

                      return (
                        <div
                          key={
                            column.value
                          }
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
                          data-mapping-target-field={
                            column.value
                          }
                          className={[
                            tableRowClass,
                            connectionMode
                              ? 'cursor-crosshair'
                              : '',
                            targetHovered &&
                            !mapped
                              ? '!bg-[#fff7f9]'
                              : '',
                          ].join(' ')}
                        >
                          <button
                            type="button"
                            tabIndex={-1}
                            aria-label={`目标字段 ${getColumnLabel(
                              column,
                            )}`}
                            data-mapping-target-field={
                              column.value
                            }
                            className="
                              absolute left-[-10px]
                              top-1/2 z-40
                              flex h-5 w-5
                              -translate-y-1/2
                              items-center
                              justify-center
                              border-0
                              bg-transparent
                              p-0
                            "
                          >
                            <span
                              className="
                                h-[7px] w-[7px]
                                rotate-45
                                transition-all
                              "
                              style={{
                                backgroundColor:
                                  targetHovered
                                    ? targetOccupied
                                      ? '#f5a623'
                                      : BRAND_COLOR
                                    : mappingActive
                                      ? BRAND_COLOR
                                      : targetAvailable
                                        ? BRAND_COLOR
                                        : '#c9ced6',

                                opacity:
                                  targetAvailable &&
                                  !targetHovered
                                    ? 0.5
                                    : 1,

                                transform:
                                  targetHovered
                                    ? 'rotate(45deg) scale(1.25)'
                                    : 'rotate(45deg)',
                              }}
                            />
                          </button>

                          <div className="truncate px-3">
                            {getColumnLabel(
                              column,
                            )}
                          </div>

                          <div className="truncate border-l border-[#e5e7eb] px-3">
                            {getFieldType(
                              targetMap.get(
                                column.value,
                              ),
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                <svg
                  className="
                    pointer-events-none
                    absolute inset-0 z-10
                    h-full w-full
                    overflow-visible
                  "
                >
                  <defs>
                    <marker
                      id={
                        dragArrowMarkerId
                      }
                      markerWidth="8"
                      markerHeight="8"
                      refX="7"
                      refY="4"
                      orient="auto"
                      markerUnits="strokeWidth"
                    >
                      <path
                        d="M 0 0 L 8 4 L 0 8 Z"
                        fill={BRAND_COLOR}
                      />
                    </marker>
                  </defs>

                  {geometries.map(
                    (geometry) => {
                      const active =
                        hoveredMappingKey ===
                          geometry.key ||
                        editingMappingKey ===
                          geometry.key;

                      return (
                        <g
                          key={
                            geometry.key
                          }
                        >
                          <line
                            x1={
                              geometry.startX
                            }
                            y1={
                              geometry.startY
                            }
                            x2={
                              geometry.endX
                            }
                            y2={
                              geometry.endY
                            }
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
                            x1={
                              geometry.startX
                            }
                            y1={
                              geometry.startY
                            }
                            x2={
                              geometry.endX
                            }
                            y2={
                              geometry.endY
                            }
                            stroke={
                              active
                                ? BRAND_COLOR
                                : '#c9ced6'
                            }
                            strokeWidth={
                              active
                                ? 1.6
                                : 1
                            }
                            pointerEvents="none"
                            className="transition-all duration-150"
                          />
                        </g>
                      );
                    },
                  )}

                  {dragConnection?.moved ? (
                    <line
                      x1={
                        dragConnection.startX
                      }
                      y1={
                        dragConnection.startY
                      }
                      x2={
                        dragConnection.currentX
                      }
                      y2={
                        dragConnection.currentY
                      }
                      stroke={
                        dragConnection.targetOccupied
                          ? '#f5a623'
                          : BRAND_COLOR
                      }
                      strokeWidth={1.5}
                      strokeDasharray="6 5"
                      markerEnd={
                        dragConnection.targetOccupied
                          ? undefined
                          : `url(#${dragArrowMarkerId})`
                      }
                      pointerEvents="none"
                    />
                  ) : null}
                </svg>

                {geometries.map(
                  (geometry) => {
                    const visible =
                      hoveredMappingKey ===
                        geometry.key ||
                      editingMappingKey ===
                        geometry.key;

                    if (!visible) {
                      return null;
                    }

                    const mapping =
                      rows.find(
                        (row) =>
                          row.key ===
                          geometry.key,
                      );

                    return (
                      <div
                        key={`actions-${geometry.key}`}
                        className="
                          absolute z-50
                          flex items-center
                          gap-1.5
                        "
                        style={{
                          left:
                            geometry.middleX,
                          top:
                            geometry.middleY,
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
                            !h-6
                            !rounded-full
                            !bg-white
                            !px-2
                            !text-[11px]
                            !shadow-sm
                          "
                          onClick={() =>
                            removeMapping(
                              geometry.key,
                            )
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
                          onOpenChange={(
                            open,
                          ) => {
                            setEditingMappingKey(
                              open
                                ? geometry.key
                                : undefined,
                            );

                            setEditingTargetValue(
                              open
                                ? mapping?.targetField ||
                                    ''
                                : '',
                            );
                          }}
                          content={
                            <div className="w-[220px]">
                              <div className="mb-2 text-xs text-[#475467]">
                                {targetDerived
                                  ? '请输入目标字段'
                                  : '请选择目标字段'}
                              </div>

                              {targetDerived ? (
                                <Input.Search
                                  autoFocus
                                  allowClear
                                  variant="filled"
                                  value={
                                    editingTargetValue
                                  }
                                  placeholder="输入目标字段，回车确认"
                                  className="w-full"
                                  onChange={(event) =>
                                    setEditingTargetValue(
                                      event.target
                                        .value,
                                    )
                                  }
                                  onSearch={(
                                    targetField,
                                  ) =>
                                    updateMappingTarget(
                                      geometry.key,
                                      targetField,
                                    )
                                  }
                                />
                              ) : (
                                <Select
                                  autoFocus
                                  showSearch
                                  variant="filled"
                                  value={
                                    mapping?.targetField
                                  }
                                  options={buildTargetOptions(
                                    geometry.key,
                                  )}
                                  optionFilterProp="value"
                                  placeholder="选择目标字段"
                                  className="w-full"
                                  onChange={(
                                    targetField,
                                  ) =>
                                    updateMappingTarget(
                                      geometry.key,
                                      targetField,
                                    )
                                  }
                                />
                              )}
                            </div>
                          }
                        >
                          <Button
                            size="small"
                            className="
                              !h-6
                              !rounded-full
                              !bg-white
                              !px-2
                              !text-[11px]
                              !shadow-sm
                            "
                          >
                            修改
                          </Button>
                        </Popover>
                      </div>
                    );
                  },
                )}
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
                        options={
                          sourceOptions
                        }
                        optionFilterProp="label"
                        placeholder="选择来源字段"
                        className="w-full"
                        onChange={(
                          sourceField,
                        ) =>
                          setAddValues(
                            (current) => ({
                              ...current,
                              sourceField,
                            }),
                          )
                        }
                      />
                    </div>

                    <div>
                      <div className="mb-1.5 text-xs text-[#475467]">
                        目标字段
                      </div>

                      {targetDerived ? (
                        <Input
                          allowClear
                          variant="filled"
                          value={
                            addValues.targetField
                          }
                          placeholder="输入目标字段"
                          className="w-full"
                          onChange={(event) =>
                            setAddValues(
                              (current) => ({
                                ...current,
                                targetField:
                                  event.target
                                    .value,
                              }),
                            )
                          }
                          onPressEnter={
                            addMapping
                          }
                        />
                      ) : (
                        <Select
                          showSearch
                          variant="filled"
                          value={
                            addValues.targetField
                          }
                          options={
                            addTargetOptions
                          }
                          optionFilterProp="label"
                          placeholder="选择目标字段"
                          className="w-full"
                          onChange={(
                            targetField,
                          ) =>
                            setAddValues(
                              (current) => ({
                                ...current,
                                targetField,
                              }),
                            )
                          }
                        />
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        size="small"
                        onClick={() => {
                          setAddValues({});
                          setAddPopoverOpen(
                            false,
                          );
                        }}
                      >
                        取消
                      </Button>

                      <Button
                        size="small"
                        type="primary"
                        disabled={
                          !addValues.sourceField ||
                          !addValues.targetField?.trim()
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
                  className="
                    !mt-1 !h-7
                    !px-0 !text-xs
                  "
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
        onCancel={() =>
          setManualModalOpen(false)
        }
        onOk={
          handleManualMappingConfirm
        }
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
              value={
                manualSourceFields
              }
              placeholder={
                'code\nname\ndescription\nextendname'
              }
              onChange={
                setManualSourceFields
              }
            />
          </div>

          <div>
            <div className="mb-2 text-[13px] font-medium text-[#344054]">
              目标字段
            </div>

            <ManualFieldEditor
              value={
                manualTargetFields
              }
              placeholder={
                'code\nname\nextendname\ndescription'
              }
              onChange={
                setManualTargetFields
              }
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[12px] text-[#98a2b3]">
          <span>
            两侧字段按照行号一一建立映射关系
          </span>

          <span>
            来源字段：
            {
              parseManualFields(
                manualSourceFields,
              ).length
            }
            {' · '}
            目标字段：
            {
              parseManualFields(
                manualTargetFields,
              ).length
            }
          </span>
        </div>
      </Modal>
    </EditorSection>
  );
}