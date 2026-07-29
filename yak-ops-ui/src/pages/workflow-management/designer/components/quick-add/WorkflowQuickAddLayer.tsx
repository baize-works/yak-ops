import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MarkerType,
  useEdges,
  useNodes,
  useReactFlow,
  useViewport,
} from 'reactflow';

import type {
  WorkflowFlowEdge,
  WorkflowFlowNode,
  WorkflowNodeData,
  WorkflowNodeType,
} from '../../../types';
import { createNodeData } from '../../constants';
import NodePicker from './NodePicker';
import QuickAddButton from './QuickAddButton';
import {
  WORKFLOW_QUICK_ADD_EVENT,
  type WorkflowQuickAddContext,
} from './events';

interface EdgeCurve {
  edge: WorkflowFlowEdge;
  path: string;
  middleX: number;
  middleY: number;
  flowMiddleX: number;
  flowMiddleY: number;
}

const NODE_WIDTH = 240;
const NODE_HEIGHT = 112;
const HANDLE_OFFSET_Y = 17;

const uniqueNodeId = (type: WorkflowNodeType) =>
  `${String(type).toLowerCase()}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;

const cubicPoint = (
  start: number,
  control1: number,
  control2: number,
  end: number,
) => (start + 3 * control1 + 3 * control2 + end) / 8;

const buildCurve = (
  edge: WorkflowFlowEdge,
  source: WorkflowFlowNode,
  target: WorkflowFlowNode,
  viewport: { x: number; y: number; zoom: number },
): EdgeCurve => {
  const sourcePosition = source.positionAbsolute || source.position;
  const targetPosition = target.positionAbsolute || target.position;
  const sourceX = sourcePosition.x + (source.width || NODE_WIDTH);
  const sourceY = sourcePosition.y + HANDLE_OFFSET_Y;
  const targetX = targetPosition.x;
  const targetY = targetPosition.y + HANDLE_OFFSET_Y;
  const controlOffset = Math.max(72, Math.abs(targetX - sourceX) * 0.45);
  const control1X = sourceX + controlOffset;
  const control2X = targetX - controlOffset;
  const flowMiddleX = cubicPoint(sourceX, control1X, control2X, targetX);
  const flowMiddleY = cubicPoint(sourceY, sourceY, targetY, targetY);

  const screen = (value: number, offset: number) =>
    value * viewport.zoom + offset;

  return {
    edge,
    path: [
      `M ${screen(sourceX, viewport.x)} ${screen(sourceY, viewport.y)}`,
      `C ${screen(control1X, viewport.x)} ${screen(sourceY, viewport.y)}`,
      `${screen(control2X, viewport.x)} ${screen(targetY, viewport.y)}`,
      `${screen(targetX, viewport.x)} ${screen(targetY, viewport.y)}`,
    ].join(' '),
    middleX: screen(flowMiddleX, viewport.x),
    middleY: screen(flowMiddleY, viewport.y),
    flowMiddleX,
    flowMiddleY,
  };
};

const WorkflowQuickAddLayer = () => {
  const nodes = useNodes<WorkflowNodeData>();
  const edges = useEdges();
  const reactFlow = useReactFlow<WorkflowNodeData>();
  const viewport = useViewport();
  const [canvas, setCanvas] = useState<HTMLElement | null>(null);
  const [context, setContext] = useState<WorkflowQuickAddContext>();
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string>();

  useEffect(() => {
    setCanvas(document.querySelector<HTMLElement>('.dify-workflow-canvas'));
  }, []);

  useEffect(() => {
    const open = (event: Event) => {
      const customEvent = event as CustomEvent<WorkflowQuickAddContext>;
      setContext(customEvent.detail);
    };

    window.addEventListener(WORKFLOW_QUICK_ADD_EVENT, open);
    return () => window.removeEventListener(WORKFLOW_QUICK_ADD_EVENT, open);
  }, []);

  useEffect(() => {
    if (!context) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContext(undefined);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [context]);

  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );

  const curves = useMemo(
    () =>
      edges.flatMap((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        return source && target
          ? [buildCurve(edge, source, target, viewport)]
          : [];
      }),
    [edges, nodeMap, viewport],
  );

  const allowedTypes: WorkflowNodeType[] = context?.mode === 'insert'
    ? ['HTTP', 'SHELL']
    : ['HTTP', 'SHELL', 'END'];

  const openNodePanel = (nodeId: string) => {
    window.setTimeout(() => {
      const nodeElement = canvas?.querySelector<HTMLElement>(
        `.react-flow__node[data-id="${nodeId}"]`,
      );
      nodeElement?.click();
    }, 0);
  };

  const addNode = (type: WorkflowNodeType) => {
    if (!context) return;
    const source = nodeMap.get(context.sourceNodeId);
    if (!source) return;

    const id = uniqueNodeId(type);
    const sourcePosition = source.positionAbsolute || source.position;
    const position = context.mode === 'insert' && context.position
      ? {
          x: context.position.x - NODE_WIDTH / 2,
          y: context.position.y - NODE_HEIGHT / 2,
        }
      : {
          x: sourcePosition.x + NODE_WIDTH + 110,
          y: sourcePosition.y,
        };
    const node: WorkflowFlowNode = {
      id,
      type: 'workflowNode',
      position,
      data: createNodeData(type, nodes.length + 1),
    };

    reactFlow.setNodes((current) => [...current, node]);
    reactFlow.setEdges((current) => {
      const next = context.edgeId
        ? current.filter((edge) => edge.id !== context.edgeId)
        : current;
      const markerEnd = { type: MarkerType.ArrowClosed };
      const sourceEdge: WorkflowFlowEdge = {
        id: `edge_${context.sourceNodeId}_${id}_${Date.now()}`,
        source: context.sourceNodeId,
        target: id,
        type: 'smoothstep',
        markerEnd,
      };

      if (context.mode !== 'insert' || !context.targetNodeId) {
        return [...next, sourceEdge];
      }

      return [
        ...next,
        sourceEdge,
        {
          id: `edge_${id}_${context.targetNodeId}_${Date.now() + 1}`,
          source: id,
          target: context.targetNodeId,
          type: 'smoothstep',
          markerEnd,
        },
      ];
    });

    setContext(undefined);
    void reactFlow.setCenter(
      position.x + NODE_WIDTH / 2,
      position.y + NODE_HEIGHT / 2,
      {
        zoom: Math.max(reactFlow.getZoom(), 0.85),
        duration: 240,
      },
    );
    openNodePanel(id);
  };

  if (!canvas) return null;

  const edgeLayer = (
    <div className="pointer-events-none absolute inset-0 z-[12]">
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <marker
            id="yak-workflow-edge-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#a6afbd" />
          </marker>
          <marker
            id="yak-workflow-edge-arrow-active"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#155eef" />
          </marker>
        </defs>

        {curves.map(({ edge, path }) => {
          const active = edge.selected || hoveredEdgeId === edge.id;
          return (
            <path
              key={edge.id}
              d={path}
              fill="none"
              stroke={active ? '#155eef' : '#a6afbd'}
              strokeWidth={active ? 2 : 1.6}
              strokeLinecap="round"
              markerEnd={
                active
                  ? 'url(#yak-workflow-edge-arrow-active)'
                  : 'url(#yak-workflow-edge-arrow)'
              }
            />
          );
        })}
      </svg>

      {curves.map((curve) => (
        <div
          key={`${curve.edge.id}-quick-add`}
          className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: curve.middleX, top: curve.middleY }}
          onMouseEnter={() => setHoveredEdgeId(curve.edge.id)}
          onMouseLeave={() => setHoveredEdgeId(undefined)}
        >
          <QuickAddButton
            label="在连线中插入节点"
            variant="edge"
            alwaysVisible={Boolean(curve.edge.selected)}
            onClick={() =>
              setContext({
                mode: 'insert',
                edgeId: curve.edge.id,
                sourceNodeId: curve.edge.source,
                targetNodeId: curve.edge.target,
                position: {
                  x: curve.flowMiddleX,
                  y: curve.flowMiddleY,
                },
              })
            }
          />
        </div>
      ))}
    </div>
  );

  const pickerPanel = context ? (
    <aside
      className={[
        'pointer-events-auto absolute bottom-0 right-0 top-0 z-[70]',
        'flex w-[400px] max-w-full flex-col overflow-hidden',
        'border-l border-[#e4e7ec] bg-white',
        'shadow-[-12px_0_32px_rgba(16,24,40,0.10)]',
      ].join(' ')}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="flex min-h-[64px] shrink-0 items-center justify-between border-b border-[#eaecf0] px-4">
        <div>
          <h3 className="m-0 text-[15px] font-semibold text-[#101828]">
            {context.mode === 'insert' ? '在连线中添加节点' : '添加下一个节点'}
          </h3>
          <p className="mb-0 mt-1 text-[11px] text-[#98a2b3]">
            {context.mode === 'insert'
              ? '选择后会自动拆分当前连线，并把节点放在中间。'
              : '选择后会自动连接到当前节点。'}
          </p>
        </div>
        <button
          type="button"
          aria-label="关闭节点列表"
          className="flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7]"
          onClick={() => setContext(undefined)}
        >
          <X size={17} />
        </button>
      </header>

      <NodePicker allowedTypes={allowedTypes} onSelect={addNode} />
    </aside>
  ) : null;

  return (
    <>
      {createPortal(edgeLayer, canvas)}
      {pickerPanel && createPortal(pickerPanel, canvas)}
    </>
  );
};

export default WorkflowQuickAddLayer;
