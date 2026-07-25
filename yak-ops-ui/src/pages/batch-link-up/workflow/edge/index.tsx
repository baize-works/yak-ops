import React, {useState} from 'react';
import {BaseEdge, type EdgeProps, getBezierPath} from 'reactflow';

const DEFAULT_EDGE_COLOR = '#d0d5dc';
const ACTIVE_EDGE_COLOR = '#315EFB';
const INSERT_BUTTON_SIZE = 18;
const INSERT_BUTTON_HOVER_SCALE = 1.28;
const INSERT_BUTTON_HIT_AREA = 32;

interface CustomEdgeData {
  executionStatus?: 'running' | 'succeeded' | 'failed' | 'pending';
  onEdgeClick?: (edgeId: string) => void;
  onEdgeMouseEnter?: (edgeId: string) => void;
  onEdgeMouseLeave?: (edgeId: string) => void;
  onOpenInsertMenu?: (
    edgeId: string,
    payload: {
      flowPosition: { x: number; y: number };
      screenPosition: { x: number; y: number };
    },
  ) => void;
}

const CustomEdge: React.FC<EdgeProps> = ({
                                           id,
                                           sourceX,
                                           sourceY,
                                           targetX,
                                           targetY,
                                           sourcePosition,
                                           targetPosition,
                                           style = {},
                                           data,
                                           markerEnd,
                                           selected,
                                         }) => {
  const [hovered, setHovered] = useState(false);
  const [insertButtonHovered, setInsertButtonHovered] = useState(false);
  const edgeData = data as CustomEdgeData | undefined;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // 如果 style 中已经有 stroke 属性（来自 onNodeMouseEnter），就使用它
  // 否则根据状态返回颜色
  const strokeColor =
    style.stroke ||
    (edgeData?.executionStatus === 'running'
      ? '#faad14'
      : edgeData?.executionStatus === 'succeeded'
        ? '#17b26a'
        : edgeData?.executionStatus === 'failed'
          ? '#ff4d4f'
          : edgeData?.executionStatus === 'pending'
            ? '#296dff'
            : DEFAULT_EDGE_COLOR);

  const handleInsertClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const buttonRect = event.currentTarget.getBoundingClientRect();

    edgeData?.onOpenInsertMenu?.(id, {
      flowPosition: {x: labelX, y: labelY},
      screenPosition: {
        x: buttonRect.left + buttonRect.width / 2,
        y: buttonRect.top + buttonRect.height / 2,
      },
    });
  };

  return (
    <g
      onMouseEnter={() => {
        setHovered(true);
        edgeData?.onEdgeMouseEnter?.(id);
      }}
      onMouseLeave={() => {
        setHovered(false);
        edgeData?.onEdgeMouseLeave?.(id);
      }}
      onClick={(event) => {
        event.stopPropagation();
        edgeData?.onEdgeClick?.(id);
      }}
      style={{cursor: 'pointer'}}
    >
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        className="react-flow__edge-interaction"
      />

      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? ACTIVE_EDGE_COLOR : strokeColor,
          strokeWidth: selected ? 2.2 : style.strokeWidth || 1.5,
        }}
      />

      {hovered && edgeData?.onOpenInsertMenu && (
        <foreignObject
          width={INSERT_BUTTON_HIT_AREA}
          height={INSERT_BUTTON_HIT_AREA}
          x={labelX - INSERT_BUTTON_HIT_AREA / 2}
          y={labelY - INSERT_BUTTON_HIT_AREA / 2}
          requiredExtensions="http://www.w3.org/1999/xhtml"
          style={{
            background: 'transparent',
            overflow: 'visible',
          }}
        >
          <button
            className="nodrag nopan"
            type="button"
            aria-label="在连接线上插入节点"
            onClick={handleInsertClick}
            onMouseEnter={() => setInsertButtonHovered(true)}
            onMouseLeave={() => setInsertButtonHovered(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: INSERT_BUTTON_SIZE,
              height: INSERT_BUTTON_SIZE,
              margin: (INSERT_BUTTON_HIT_AREA - INSERT_BUTTON_SIZE) / 2,
              borderRadius: 999,
              border: 0,
              background: ACTIVE_EDGE_COLOR,
              boxShadow: '0 6px 14px rgba(49, 94, 251, 0.24)',
              cursor: 'pointer',
              appearance: 'none',
              outline: 'none',
              outlineOffset: 0,
              padding: 0,
              transform: insertButtonHovered
                ? `scale(${INSERT_BUTTON_HOVER_SCALE})`
                : 'scale(1)',
              transformOrigin: 'center',
              transition:
                'transform 0.14s ease, box-shadow 0.14s ease, background-color 0.14s ease',
            }}
          >
            <svg
              width={10}
              height={10}
              viewBox="0 0 10 10"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M5 1.5V8.5M1.5 5H8.5"
                stroke="#FFFFFF"
                strokeLinecap="round"
                strokeWidth={2}
              />
            </svg>
          </button>
        </foreignObject>
      )}
    </g>
  );
};

export default CustomEdge;
