import {
  activateWorkflowInstance,
  continueWorkflowAfterFailure,
  isWorkflowTerminal,
  retryWorkflowFailedNode,
  runWorkflow,
  subscribeWorkflowEvents,
  type WorkflowInstance,
  type WorkflowMockResult,
} from '@/services/workflow';
import { Button, Input, Popconfirm, Segmented, message } from 'antd';
import {
  ArrowRightCircle,
  Bell,
  CheckCircle2,
  CircleEllipsis,
  CirclePlay,
  CircleSlash2,
  Database,
  LoaderCircle,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  type DragEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlowProvider,
  addEdge,
  type Connection,
  type Edge,
  type NodeProps,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface WorkflowNodeData {
  label: string;
  nodeType: string;
  typeLabel: string;
  mockResult: WorkflowMockResult;
  executionStatus?: string;
  continuedAfterFailure?: boolean;
}

interface NodeTemplate {
  type: string;
  label: string;
  description: string;
  icon: ReactNode;
}

interface NodeContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

const NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: 'TASK',
    label: '任务节点',
    description: '通用任务执行节点',
    icon: <CirclePlay size={16} />,
  },
  {
    type: 'DATA',
    label: '数据处理',
    description: '模拟数据处理任务',
    icon: <Database size={16} />,
  },
  {
    type: 'CHECK',
    label: '校验节点',
    description: '模拟规则或质量校验',
    icon: <ShieldCheck size={16} />,
  },
  {
    type: 'NOTICE',
    label: '通知节点',
    description: '模拟消息通知任务',
    icon: <Bell size={16} />,
  },
];

const statusLabel: Record<string, string> = {
  WAITING: '等待中',
  READY: '就绪',
  SUBMITTED: '待执行',
  RUNNING: '运行中',
  SUCCESS: '成功',
  SUCCESS_WITH_WARNINGS: '完成（有告警）',
  FAILED: '失败',
  WARNING: '告警',
  CANCELED: '已取消',
  UPSTREAM_FAILED: '已阻断',
  SKIPPED: '已跳过',
};

const statusIcon = (status?: string) => {
  if (status === 'RUNNING') {
    return <LoaderCircle size={13} className="animate-spin text-[#fe2c55]" />;
  }
  if (status === 'SUCCESS' || status === 'SUCCESS_WITH_WARNINGS') {
    return <CheckCircle2 size={13} className="text-[#161823]" />;
  }
  if (status === 'FAILED') {
    return <XCircle size={13} className="text-[#d92d20]" />;
  }
  if (status === 'UPSTREAM_FAILED') {
    return (
      <CircleSlash2
        size={13}
        className="text-[rgba(22,24,35,.42)]"
      />
    );
  }
  return <CircleEllipsis size={13} className="text-[rgba(22,24,35,.42)]" />;
};

const nodeStateClass = (status?: string, selected?: boolean) => {
  if (status === 'RUNNING') {
    return 'border-[#fe2c55] bg-[#fff7f8] shadow-[0_0_0_3px_rgba(254,44,85,.10)]';
  }
  if (status === 'FAILED') {
    return 'border-[#d92d20] bg-[#fff6f4] shadow-[0_0_0_2px_rgba(217,45,32,.06)]';
  }
  if (status === 'UPSTREAM_FAILED') {
    return 'border-[#cfd3d8] bg-[#f5f6f7] opacity-70 shadow-none';
  }
  if (status === 'SUCCESS') {
    return 'border-[rgba(22,24,35,.45)] bg-[#f7f7f8]';
  }
  if (status === 'SUBMITTED' || status === 'READY') {
    return 'border-[#aeb2ba] bg-[#fafafa]';
  }
  if (selected) return 'border-[#fe2c55] bg-white';
  return 'border-[#dfe1e5] bg-white';
};

const statusTextClass = (status?: string) => {
  if (status === 'RUNNING') return 'font-medium text-[#fe2c55]';
  if (status === 'FAILED') return 'font-medium text-[#d92d20]';
  if (status === 'UPSTREAM_FAILED') {
    return 'font-medium text-[rgba(22,24,35,.44)]';
  }
  if (status === 'SUCCESS') return 'font-medium text-[#161823]';
  return 'text-[rgba(22,24,35,.52)]';
};

const WorkflowNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => (
  <div
    className={[
      'relative min-w-[174px] rounded-lg border px-3 py-2.5 shadow-sm transition-[border-color,background-color,box-shadow,opacity] duration-300',
      nodeStateClass(data.executionStatus, selected),
    ].join(' ')}
  >
    {data.executionStatus === 'RUNNING' ? (
      <span className="pointer-events-none absolute -inset-[4px] -z-10 animate-pulse rounded-[11px] border border-[rgba(254,44,85,.18)]" />
    ) : null}

    <Handle
      type="target"
      position={Position.Left}
      className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#8a8f99]"
    />

    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-[rgba(22,24,35,.45)]">
          {data.typeLabel}
        </span>
        {data.mockResult === 'FAILED' ? (
          <span className="rounded bg-[#fff0f0] px-1.5 py-0.5 text-[9px] font-medium text-[#d92d20]">
            模拟失败
          </span>
        ) : null}
        {data.continuedAfterFailure ? (
          <span className="rounded bg-[#f0f1f2] px-1.5 py-0.5 text-[9px] font-medium text-[rgba(22,24,35,.58)]">
            已放行
          </span>
        ) : null}
      </div>

      {data.executionStatus ? (
        <span className="flex items-center gap-1 text-[10px]">
          {statusIcon(data.executionStatus)}
          <span className={statusTextClass(data.executionStatus)}>
            {statusLabel[data.executionStatus] || data.executionStatus}
          </span>
        </span>
      ) : null}
    </div>

    <div className="mt-1.5 text-[13px] font-semibold text-[#161823]">
      {data.label}
    </div>

    {data.executionStatus === 'RUNNING' ? (
      <div className="mt-2 h-[2px] overflow-hidden rounded-full bg-[rgba(254,44,85,.10)]">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-[#fe2c55]" />
      </div>
    ) : null}

    <Handle
      type="source"
      position={Position.Right}
      className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#8a8f99]"
    />
  </div>
);

const WorkflowDefinitionContent = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef(1);
  const closeStreamRef = useRef<(() => void) | null>(null);
  const continuedFailureNodeIdsRef = useRef<Set<string>>(new Set());

  const [workflowName, setWorkflowName] = useState('内存工作流');
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeInstance, setActiveInstance] = useState<WorkflowInstance>();
  const [contextMenu, setContextMenu] = useState<NodeContextMenuState>();
  const [recoveringNodeId, setRecoveringNodeId] = useState<string>();

  const nodeTypes = useMemo(() => ({ workflow: WorkflowNode }), []);
  const workflowRunning = Boolean(
    activeInstance && !isWorkflowTerminal(activeInstance.status),
  );
  const selectedNode = useMemo(
    () => nodes.find((node) => node.selected),
    [nodes],
  );

  useEffect(() => () => closeStreamRef.current?.(), []);

  const applySnapshot = (snapshot: WorkflowInstance) => {
    setActiveInstance(snapshot);

    const statusByNodeId = new Map(
      snapshot.nodes.map((node) => [node.id, node.status]),
    );

    setNodes((current) => current.map((node) => ({
      ...node,
      data: {
        ...node.data,
        executionStatus: statusByNodeId.get(node.id) ?? node.data.executionStatus,
      },
    })));

    setEdges((current) => current.map((edge) => {
      const sourceStatus = statusByNodeId.get(edge.source);
      const targetStatus = statusByNodeId.get(edge.target);
      const sourceFailureContinued = continuedFailureNodeIdsRef.current.has(edge.source);
      const blockedPath =
        sourceStatus === 'UPSTREAM_FAILED' || targetStatus === 'UPSTREAM_FAILED';
      const failedPath =
        targetStatus === 'FAILED' ||
        (sourceStatus === 'FAILED' && !sourceFailureContinued);
      const targetRunning = targetStatus === 'RUNNING';
      const sourceEffectiveSuccess =
        sourceStatus === 'SUCCESS' ||
        (sourceStatus === 'FAILED' && sourceFailureContinued);
      const completedPath = sourceEffectiveSuccess && targetStatus === 'SUCCESS';
      const readyPath = sourceEffectiveSuccess;

      let stroke = '#d9dce1';
      let strokeWidth = 1.4;
      let strokeDasharray: string | undefined;

      if (blockedPath) {
        stroke = '#c8ccd3';
        strokeWidth = 1.4;
        strokeDasharray = '5 5';
      } else if (targetRunning) {
        stroke = '#fe2c55';
        strokeWidth = 2.2;
      } else if (failedPath) {
        stroke = '#d92d20';
        strokeWidth = 1.8;
      } else if (completedPath) {
        stroke = '#555b66';
        strokeWidth = 1.8;
      } else if (readyPath) {
        stroke = '#8a8f99';
        strokeWidth = 1.7;
      }

      return {
        ...edge,
        animated: targetRunning,
        style: {
          ...edge.style,
          stroke,
          strokeWidth,
          strokeDasharray,
          transition: 'stroke 240ms ease, stroke-width 240ms ease',
        },
      };
    }));
  };

  const handleConnect = (connection: Connection) => {
    setEdges((current) =>
      addEdge(
        {
          ...connection,
          type: 'smoothstep',
          style: { stroke: '#d9dce1', strokeWidth: 1.4 },
        },
        current,
      ),
    );
  };

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    template: NodeTemplate,
  ) => {
    event.dataTransfer.setData(
      'application/yak-workflow-node',
      JSON.stringify({
        type: template.type,
        label: template.label,
      }),
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (workflowRunning || !reactFlowInstance || !wrapperRef.current) return;

    const raw = event.dataTransfer.getData('application/yak-workflow-node');
    if (!raw) return;

    const template = JSON.parse(raw) as { type: string; label: string };
    const bounds = wrapperRef.current.getBoundingClientRect();
    const position = reactFlowInstance.project({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    const sequence = sequenceRef.current++;
    const id = `${template.type.toLowerCase()}-${Date.now()}-${sequence}`;

    setNodes((current) => [
      ...current,
      {
        id,
        type: 'workflow',
        position,
        data: {
          label: `${template.label} ${sequence}`,
          nodeType: template.type,
          typeLabel: template.label,
          mockResult: 'SUCCESS',
        },
      },
    ]);
  };

  const updateSelectedMockResult = (mockResult: WorkflowMockResult) => {
    if (!selectedNode || workflowRunning) return;
    setNodes((current) => current.map((node) =>
      node.id === selectedNode.id
        ? {
            ...node,
            data: {
              ...node.data,
              mockResult,
            },
          }
        : node,
    ));
  };

  const resetExecutionVisuals = () => {
    continuedFailureNodeIdsRef.current.clear();
    setContextMenu(undefined);
    setNodes((current) => current.map((node) => ({
      ...node,
      data: {
        ...node.data,
        executionStatus: 'WAITING',
        continuedAfterFailure: false,
      },
    })));
    setEdges((current) => current.map((edge) => ({
      ...edge,
      animated: false,
      style: {
        ...edge.style,
        stroke: '#d9dce1',
        strokeWidth: 1.4,
        strokeDasharray: undefined,
      },
    })));
  };

  const handleRun = async () => {
    if (!nodes.length) {
      message.warning('请先拖入至少一个节点');
      return;
    }

    closeStreamRef.current?.();
    closeStreamRef.current = null;
    setActiveInstance(undefined);
    resetExecutionVisuals();
    setSubmitting(true);

    try {
      const instance = await runWorkflow({
        name: workflowName.trim() || '未命名工作流',
        nodes: nodes.map((node) => ({
          id: node.id,
          name: node.data.label,
          type: node.data.nodeType,
          mockResult: node.data.mockResult,
        })),
        edges: edges.map((edge: Edge) => ({
          source: edge.source,
          target: edge.target,
        })),
        input: {},
      });

      applySnapshot(instance);
      closeStreamRef.current = subscribeWorkflowEvents(instance.id, applySnapshot);
      const activated = await activateWorkflowInstance(instance.id);
      applySnapshot(activated);

      message.success('工作流已启动，将按节点实时展示执行状态');
    } catch (error) {
      closeStreamRef.current?.();
      closeStreamRef.current = null;
      message.error(error instanceof Error ? error.message : '工作流运行失败');
    } finally {
      setSubmitting(false);
    }
  };

  const restartStreamIfNeeded = (
    executionId: string,
    previousStatus: string,
    snapshot: WorkflowInstance,
  ) => {
    if (isWorkflowTerminal(previousStatus) && !isWorkflowTerminal(snapshot.status)) {
      closeStreamRef.current?.();
      closeStreamRef.current = subscribeWorkflowEvents(executionId, applySnapshot);
    }
  };

  const handleRetryFailedNode = async (nodeId: string) => {
    if (!activeInstance || recoveringNodeId) return;

    const executionId = activeInstance.id;
    const previousStatus = activeInstance.status;
    setRecoveringNodeId(nodeId);
    setContextMenu(undefined);

    try {
      const retried = await retryWorkflowFailedNode(executionId, nodeId);
      continuedFailureNodeIdsRef.current.delete(nodeId);
      setNodes((current) => current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                continuedAfterFailure: false,
              },
            }
          : node,
      ));
      applySnapshot(retried);
      restartStreamIfNeeded(executionId, previousStatus, retried);
      message.success('已从当前失败节点重新执行，成功后将继续调度后续节点');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重新执行当前节点失败');
    } finally {
      setRecoveringNodeId(undefined);
    }
  };

  const handleContinueAfterFailure = async (nodeId: string) => {
    if (!activeInstance || recoveringNodeId) return;

    const executionId = activeInstance.id;
    const previousStatus = activeInstance.status;
    setRecoveringNodeId(nodeId);
    setContextMenu(undefined);

    try {
      const continued = await continueWorkflowAfterFailure(executionId, nodeId);
      continuedFailureNodeIdsRef.current.add(nodeId);
      setNodes((current) => current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                continuedAfterFailure: true,
              },
            }
          : node,
      ));
      applySnapshot(continued);
      restartStreamIfNeeded(executionId, previousStatus, continued);
      message.success('已保留当前失败结果，并从下一个可执行节点继续');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '继续执行失败');
    } finally {
      setRecoveringNodeId(undefined);
    }
  };

  const clearCanvas = () => {
    closeStreamRef.current?.();
    closeStreamRef.current = null;
    continuedFailureNodeIdsRef.current.clear();
    setContextMenu(undefined);
    setActiveInstance(undefined);
    setNodes([]);
    setEdges([]);
  };

  const executionCounts = useMemo(() => {
    const result = {
      running: 0,
      success: 0,
      failed: 0,
      blocked: 0,
      waiting: 0,
    };
    activeInstance?.nodes.forEach((node) => {
      if (node.status === 'RUNNING') result.running += 1;
      else if (node.status === 'SUCCESS') result.success += 1;
      else if (node.status === 'FAILED') result.failed += 1;
      else if (node.status === 'UPSTREAM_FAILED') result.blocked += 1;
      else result.waiting += 1;
    });
    return result;
  }, [activeInstance]);

  return (
    <div className="flex h-[calc(100vh-48px)] min-h-[620px] overflow-hidden bg-white">
      <aside className="w-[232px] shrink-0 border-r border-[#e8e9ec] bg-[#fafafa]">
        <div className="border-b border-[#e8e9ec] px-4 py-3.5">
          <div className="text-[14px] font-semibold text-[#161823]">节点</div>
          <div className="mt-1 text-xs leading-5 text-[rgba(22,24,35,.48)]">
            拖拽到右侧画布后连接节点
          </div>
        </div>

        <div className="space-y-2 p-3">
          {NODE_TEMPLATES.map((template) => (
            <div
              key={template.type}
              draggable={!workflowRunning}
              onDragStart={(event) => handleDragStart(event, template)}
              className={[
                'rounded-lg border border-[#e3e5e8] bg-white px-3 py-2.5 transition-shadow',
                workflowRunning
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-grab hover:shadow-sm active:cursor-grabbing',
              ].join(' ')}
            >
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#161823]">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#f4f4f5] text-[rgba(22,24,35,.66)]">
                  {template.icon}
                </span>
                {template.label}
              </div>
              <div className="mt-1.5 pl-9 text-[11px] text-[rgba(22,24,35,.45)]">
                {template.description}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e8e9ec] px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="text-[15px] font-semibold text-[#161823]">工作流定义</div>
            <Input
              value={workflowName}
              onChange={(event) => setWorkflowName(event.target.value)}
              variant="filled"
              className="w-[240px]"
              placeholder="输入工作流名称"
              disabled={workflowRunning}
            />
            <span className="text-xs text-[rgba(22,24,35,.4)]">
              {nodes.length} 节点 · {edges.length} 连线
            </span>

            {activeInstance ? (
              <div className="flex items-center gap-3 border-l border-[#ececef] pl-3 text-[11px]">
                <span className="flex items-center gap-1.5 text-[rgba(22,24,35,.62)]">
                  {workflowRunning ? (
                    <LoaderCircle size={12} className="animate-spin text-[#fe2c55]" />
                  ) : (
                    statusIcon(activeInstance.status)
                  )}
                  {statusLabel[activeInstance.status] || activeInstance.status}
                </span>
                <span className="text-[rgba(22,24,35,.48)]">
                  运行 {executionCounts.running}
                </span>
                <span className="text-[rgba(22,24,35,.48)]">
                  成功 {executionCounts.success}
                </span>
                {executionCounts.failed > 0 ? (
                  <span className="text-[#d92d20]">
                    失败 {executionCounts.failed}
                  </span>
                ) : null}
                {executionCounts.blocked > 0 ? (
                  <span className="text-[rgba(22,24,35,.46)]">
                    阻断 {executionCounts.blocked}
                  </span>
                ) : null}
                <span className="text-[rgba(22,24,35,.38)]">
                  等待 {executionCounts.waiting}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Popconfirm
              title="清空当前画布？"
              okText="清空"
              cancelText="取消"
              disabled={workflowRunning}
              onConfirm={clearCanvas}
            >
              <Button icon={<RotateCcw size={14} />} disabled={workflowRunning}>
                清空
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<Play size={14} />}
              loading={submitting}
              disabled={workflowRunning}
              onClick={handleRun}
            >
              {workflowRunning ? '运行中' : '运行'}
            </Button>
          </div>
        </div>

        <div
          ref={wrapperRef}
          className="relative min-h-0 flex-1"
          onDrop={handleDrop}
        >
          {selectedNode && !workflowRunning ? (
            <div className="absolute right-4 top-4 z-20 w-[250px] rounded-lg border border-[#e3e5e8] bg-white p-3 shadow-md">
              <div className="text-[12px] font-semibold text-[#161823]">节点测试</div>
              <div className="mt-1 truncate text-[11px] text-[rgba(22,24,35,.48)]">
                {selectedNode.data.label}
              </div>
              <div className="mt-3 text-[11px] font-medium text-[rgba(22,24,35,.62)]">
                本次模拟结果
              </div>
              <Segmented
                block
                size="small"
                className="mt-2"
                value={selectedNode.data.mockResult}
                options={[
                  { label: '正常成功', value: 'SUCCESS' },
                  { label: '模拟失败', value: 'FAILED' },
                ]}
                onChange={(value) =>
                  updateSelectedMockResult(value as WorkflowMockResult)
                }
              />
              <div className="mt-2 text-[10px] leading-4 text-[rgba(22,24,35,.4)]">
                仅用于内存工作流测试。模拟失败会真实触发引擎的失败传播逻辑。
              </div>
            </div>
          ) : null}

          {contextMenu ? (
            <div
              className="absolute z-30 w-[248px] rounded-lg border border-[#e1e4e8] bg-white p-1.5 shadow-lg"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <Button
                type="text"
                block
                icon={<RefreshCw size={14} />}
                loading={recoveringNodeId === contextMenu.nodeId}
                className="!flex !h-8 !items-center !justify-start !px-2 !text-[12px]"
                onClick={() => void handleRetryFailedNode(contextMenu.nodeId)}
              >
                重新执行当前节点
              </Button>
              <div className="px-2 pb-1 text-[10px] leading-4 text-[rgba(22,24,35,.42)]">
                当前节点重新执行，成功后再继续后续节点。
              </div>

              <div className="mx-2 my-1 border-t border-[#f0f0f1]" />

              <Button
                type="text"
                block
                icon={<ArrowRightCircle size={14} />}
                disabled={Boolean(recoveringNodeId)}
                className="!flex !h-8 !items-center !justify-start !px-2 !text-[12px]"
                onClick={() => void handleContinueAfterFailure(contextMenu.nodeId)}
              >
                跳过当前失败，继续后续节点
              </Button>
              <div className="px-2 pb-1 text-[10px] leading-4 text-[rgba(22,24,35,.42)]">
                保留当前失败结果，直接解除受它影响的后继阻断。
              </div>
            </div>
          ) : null}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onInit={setReactFlowInstance}
            onPaneClick={() => setContextMenu(undefined)}
            onNodeClick={() => setContextMenu(undefined)}
            onNodeContextMenu={(event, node) => {
              event.preventDefault();
              const data = node.data as WorkflowNodeData;
              if (
                !activeInstance ||
                data.executionStatus !== 'FAILED' ||
                data.continuedAfterFailure ||
                !wrapperRef.current
              ) {
                setContextMenu(undefined);
                return;
              }

              const bounds = wrapperRef.current.getBoundingClientRect();
              const menuWidth = 248;
              const menuHeight = 142;
              setContextMenu({
                nodeId: node.id,
                x: Math.max(
                  8,
                  Math.min(event.clientX - bounds.left, bounds.width - menuWidth - 8),
                ),
                y: Math.max(
                  8,
                  Math.min(event.clientY - bounds.top, bounds.height - menuHeight - 8),
                ),
              });
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = workflowRunning ? 'none' : 'move';
            }}
            nodesDraggable={!workflowRunning}
            nodesConnectable={!workflowRunning}
            elementsSelectable={!workflowRunning}
            fitView
            deleteKeyCode={workflowRunning ? null : ['Backspace', 'Delete']}
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { stroke: '#d9dce1', strokeWidth: 1.4 },
            }}
          >
            <Background gap={18} size={1} />
            <Controls position="bottom-right" />
            <MiniMap
              pannable
              zoomable
              className="!border !border-[#e8e9ec] !bg-white"
            />
          </ReactFlow>
        </div>
      </section>
    </div>
  );
};

const WorkflowDefinitionPage = () => (
  <ReactFlowProvider>
    <WorkflowDefinitionContent />
  </ReactFlowProvider>
);

export default WorkflowDefinitionPage;
