import {
  activateWorkflowInstance,
  cancelWorkflowInstance,
  continueWorkflowAfterFailure,
  isWorkflowTerminal,
  pauseWorkflowInstance,
  resumeWorkflowInstance,
  retryWorkflowFailedNode,
  runWorkflow,
  subscribeWorkflowEvents,
  type WorkflowInstance,
  type WorkflowMockResult,
} from '@/services/workflow';
import {
  Button,
  Input,
  InputNumber,
  Popconfirm,
  Popover,
  Segmented,
  message,
} from 'antd';
import {
  ArrowRightCircle,
  Bell,
  CheckCircle2,
  CircleEllipsis,
  CirclePlay,
  CircleSlash2,
  Database,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Square,
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
  maxAttempts: number;
  retryDelaySeconds: number;
  dispatchTimeoutSeconds: number;
  executionTimeoutSeconds: number;
  inputMappingText: string;
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
  CREATED: '已创建',
  WAITING: '等待中',
  READY: '就绪',
  SUBMITTED: '待执行',
  RUNNING: '运行中',
  PAUSING: '暂停中',
  PAUSED: '已暂停',
  RESUMING: '恢复中',
  SUCCESS: '成功',
  SUCCESS_WITH_WARNINGS: '完成（有告警）',
  FAILED: '失败',
  WARNING: '告警',
  CANCELED: '已取消',
  TIMED_OUT: '已超时',
  UPSTREAM_FAILED: '已阻断',
  SKIPPED: '已跳过',
};

const isTransitioning = (status?: string) =>
  status === 'RUNNING' || status === 'PAUSING' || status === 'RESUMING';

const statusIcon = (status?: string) => {
  if (isTransitioning(status)) {
    return <LoaderCircle size={13} className="animate-spin text-[#fe2c55]" />;
  }
  if (status === 'PAUSED') {
    return <Pause size={13} className="text-[rgba(22,24,35,.58)]" />;
  }
  if (status === 'SUCCESS' || status === 'SUCCESS_WITH_WARNINGS') {
    return <CheckCircle2 size={13} className="text-[#161823]" />;
  }
  if (status === 'FAILED' || status === 'TIMED_OUT') {
    return <XCircle size={13} className="text-[#d92d20]" />;
  }
  if (status === 'UPSTREAM_FAILED') {
    return <CircleSlash2 size={13} className="text-[rgba(22,24,35,.42)]" />;
  }
  return <CircleEllipsis size={13} className="text-[rgba(22,24,35,.42)]" />;
};

const nodeStateClass = (status?: string, selected?: boolean) => {
  if (status === 'RUNNING' || status === 'RESUMING') {
    return 'border-[#fe2c55] bg-[#fff7f8] shadow-[0_0_0_3px_rgba(254,44,85,.10)]';
  }
  if (status === 'PAUSING' || status === 'PAUSED') {
    return 'border-[#b8bdc5] bg-[#f6f7f8] shadow-none';
  }
  if (status === 'FAILED' || status === 'TIMED_OUT') {
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
  if (status === 'RUNNING' || status === 'RESUMING') {
    return 'font-medium text-[#fe2c55]';
  }
  if (status === 'FAILED' || status === 'TIMED_OUT') {
    return 'font-medium text-[#d92d20]';
  }
  if (status === 'UPSTREAM_FAILED' || status === 'PAUSED' || status === 'PAUSING') {
    return 'font-medium text-[rgba(22,24,35,.48)]';
  }
  if (status === 'SUCCESS') return 'font-medium text-[#161823]';
  return 'text-[rgba(22,24,35,.52)]';
};

const WorkflowNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => (
  <div
    className={[
      'relative min-w-[184px] rounded-lg border px-3 py-2.5 shadow-sm transition-[border-color,background-color,box-shadow,opacity] duration-300',
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
    {data.maxAttempts > 1 || data.executionTimeoutSeconds > 0 ? (
      <div className="mt-1.5 text-[9px] text-[rgba(22,24,35,.38)]">
        {data.maxAttempts > 1 ? `最多 ${data.maxAttempts} 次` : ''}
        {data.maxAttempts > 1 && data.executionTimeoutSeconds > 0 ? ' · ' : ''}
        {data.executionTimeoutSeconds > 0 ? `执行超时 ${data.executionTimeoutSeconds}s` : ''}
      </div>
    ) : null}
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

const parseObject = <T extends Record<string, unknown>>(raw: string, label: string): T => {
  const value = raw.trim() ? JSON.parse(raw) : {};
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(`${label}必须是 JSON 对象`);
  }
  return value as T;
};

const WorkflowDefinitionContent = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef(1);
  const closeStreamRef = useRef<(() => void) | null>(null);
  const continuedFailureNodeIdsRef = useRef<Set<string>>(new Set());

  const [workflowName, setWorkflowName] = useState('内存工作流');
  const [workflowTimeoutSeconds, setWorkflowTimeoutSeconds] = useState(0);
  const [workflowInputText, setWorkflowInputText] = useState('{}');
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [controlAction, setControlAction] = useState<string>();
  const [activeInstance, setActiveInstance] = useState<WorkflowInstance>();
  const [contextMenu, setContextMenu] = useState<NodeContextMenuState>();
  const [recoveringNodeId, setRecoveringNodeId] = useState<string>();

  const nodeTypes = useMemo(() => ({ workflow: WorkflowNode }), []);
  const workflowLocked = Boolean(activeInstance && !isWorkflowTerminal(activeInstance.status));
  const selectedNode = useMemo(() => nodes.find((node) => node.selected), [nodes]);

  useEffect(() => () => closeStreamRef.current?.(), []);

  const applySnapshot = (snapshot: WorkflowInstance) => {
    setActiveInstance(snapshot);
    snapshot.nodes.forEach((node) => {
      if (node.continuedAfterFailure) continuedFailureNodeIdsRef.current.add(node.id);
    });
    const statusByNodeId = new Map(snapshot.nodes.map((node) => [node.id, node.status]));
    setNodes((current) => current.map((node) => ({
      ...node,
      data: {
        ...node.data,
        executionStatus: statusByNodeId.get(node.id) ?? node.data.executionStatus,
        continuedAfterFailure:
          continuedFailureNodeIdsRef.current.has(node.id) || node.data.continuedAfterFailure,
      },
    })));
    setEdges((current) => current.map((edge) => {
      const sourceStatus = statusByNodeId.get(edge.source);
      const targetStatus = statusByNodeId.get(edge.target);
      const sourceFailureContinued = continuedFailureNodeIdsRef.current.has(edge.source);
      const blockedPath = sourceStatus === 'UPSTREAM_FAILED' || targetStatus === 'UPSTREAM_FAILED';
      const failedPath = targetStatus === 'FAILED' || (sourceStatus === 'FAILED' && !sourceFailureContinued);
      const targetRunning = targetStatus === 'RUNNING' || targetStatus === 'RESUMING';
      const sourceEffectiveSuccess = sourceStatus === 'SUCCESS' || (sourceStatus === 'FAILED' && sourceFailureContinued);
      const completedPath = sourceEffectiveSuccess && targetStatus === 'SUCCESS';
      const readyPath = sourceEffectiveSuccess;
      let stroke = '#d9dce1';
      let strokeWidth = 1.4;
      let strokeDasharray: string | undefined;
      if (blockedPath) {
        stroke = '#c8ccd3';
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
        style: { ...edge.style, stroke, strokeWidth, strokeDasharray },
      };
    }));
  };

  const handleConnect = (connection: Connection) => {
    setEdges((current) => addEdge({
      ...connection,
      type: 'smoothstep',
      style: { stroke: '#d9dce1', strokeWidth: 1.4 },
    }, current));
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, template: NodeTemplate) => {
    event.dataTransfer.setData(
      'application/yak-workflow-node',
      JSON.stringify({ type: template.type, label: template.label }),
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (workflowLocked || !reactFlowInstance || !wrapperRef.current) return;
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
    setNodes((current) => [...current, {
      id,
      type: 'workflow',
      position,
      data: {
        label: `${template.label} ${sequence}`,
        nodeType: template.type,
        typeLabel: template.label,
        mockResult: 'SUCCESS',
        maxAttempts: 1,
        retryDelaySeconds: 0,
        dispatchTimeoutSeconds: 0,
        executionTimeoutSeconds: 0,
        inputMappingText: '{}',
      },
    }]);
  };

  const updateSelectedNode = (patch: Partial<WorkflowNodeData>) => {
    if (!selectedNode || workflowLocked) return;
    setNodes((current) => current.map((node) =>
      node.id === selectedNode.id
        ? { ...node, data: { ...node.data, ...patch } }
        : node,
    ));
  };

  const resetExecutionVisuals = () => {
    continuedFailureNodeIdsRef.current.clear();
    setContextMenu(undefined);
    setNodes((current) => current.map((node) => ({
      ...node,
      data: { ...node.data, executionStatus: 'WAITING', continuedAfterFailure: false },
    })));
    setEdges((current) => current.map((edge) => ({
      ...edge,
      animated: false,
      style: { ...edge.style, stroke: '#d9dce1', strokeWidth: 1.4, strokeDasharray: undefined },
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
      const input = parseObject<Record<string, unknown>>(workflowInputText, '工作流输入');
      const payloadNodes = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        mockResult: node.data.mockResult,
        maxAttempts: node.data.maxAttempts,
        retryDelaySeconds: node.data.retryDelaySeconds,
        dispatchTimeoutSeconds: node.data.dispatchTimeoutSeconds,
        executionTimeoutSeconds: node.data.executionTimeoutSeconds,
        inputMapping: parseObject<Record<string, string>>(
          node.data.inputMappingText,
          `${node.data.label} 输入映射`,
        ),
      }));
      const instance = await runWorkflow({
        name: workflowName.trim() || '未命名工作流',
        nodes: payloadNodes,
        edges: edges.map((edge: Edge) => ({ source: edge.source, target: edge.target })),
        input,
        workflowTimeoutSeconds,
      });
      applySnapshot(instance);
      closeStreamRef.current = subscribeWorkflowEvents(instance.id, applySnapshot);
      applySnapshot(await activateWorkflowInstance(instance.id));
      message.success('工作流已启动，运行状态将实时更新');
    } catch (error) {
      closeStreamRef.current?.();
      closeStreamRef.current = null;
      message.error(error instanceof Error ? error.message : '工作流运行失败');
    } finally {
      setSubmitting(false);
    }
  };

  const executeControl = async (
    action: string,
    handler: (id: string) => Promise<WorkflowInstance>,
    successMessage: string,
  ) => {
    if (!activeInstance || controlAction) return;
    setControlAction(action);
    try {
      applySnapshot(await handler(activeInstance.id));
      message.success(successMessage);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '工作流操作失败');
    } finally {
      setControlAction(undefined);
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
      applySnapshot(retried);
      restartStreamIfNeeded(executionId, previousStatus, retried);
      message.success('已重新执行当前失败节点');
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
      applySnapshot(continued);
      restartStreamIfNeeded(executionId, previousStatus, continued);
      message.success('已保留当前失败并继续后续节点');
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
    const result = { running: 0, paused: 0, success: 0, failed: 0, blocked: 0 };
    activeInstance?.nodes.forEach((node) => {
      if (node.status === 'RUNNING' || node.status === 'RESUMING') result.running += 1;
      else if (node.status === 'PAUSED' || node.status === 'PAUSING') result.paused += 1;
      else if (node.status === 'SUCCESS') result.success += 1;
      else if (node.status === 'FAILED') result.failed += 1;
      else if (node.status === 'UPSTREAM_FAILED') result.blocked += 1;
    });
    return result;
  }, [activeInstance]);

  const runtimeConfig = (
    <div className="w-[360px] space-y-3">
      <div>
        <div className="text-[12px] font-medium text-[#161823]">工作流超时</div>
        <div className="mt-1 flex items-center gap-2">
          <InputNumber
            min={0}
            value={workflowTimeoutSeconds}
            onChange={(value) => setWorkflowTimeoutSeconds(Number(value || 0))}
            disabled={workflowLocked}
            className="w-[150px]"
          />
          <span className="text-[11px] text-[rgba(22,24,35,.44)]">秒，0 表示不限制</span>
        </div>
      </div>
      <div>
        <div className="text-[12px] font-medium text-[#161823]">Workflow Input</div>
        <Input.TextArea
          rows={6}
          value={workflowInputText}
          onChange={(event) => setWorkflowInputText(event.target.value)}
          disabled={workflowLocked}
          className="mt-1 font-mono !text-[11px]"
          placeholder={'{\n  "requestId": "REQ-001"\n}'}
        />
      </div>
    </div>
  );

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
              draggable={!workflowLocked}
              onDragStart={(event) => handleDragStart(event, template)}
              className={[
                'rounded-lg border border-[#e3e5e8] bg-white px-3 py-2.5 transition-shadow',
                workflowLocked ? 'cursor-not-allowed opacity-60' : 'cursor-grab hover:shadow-sm',
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
              className="w-[220px]"
              disabled={workflowLocked}
            />
            <Popover content={runtimeConfig} title="运行配置" trigger="click">
              <Button size="small" icon={<Settings2 size={13} />}>运行配置</Button>
            </Popover>
            <span className="text-xs text-[rgba(22,24,35,.4)]">
              {nodes.length} 节点 · {edges.length} 连线
            </span>
            {activeInstance ? (
              <div className="flex items-center gap-2 border-l border-[#ececef] pl-3 text-[11px]">
                <span className="flex items-center gap-1.5 text-[rgba(22,24,35,.62)]">
                  {statusIcon(activeInstance.status)}
                  {statusLabel[activeInstance.status] || activeInstance.status}
                </span>
                <span className="text-[rgba(22,24,35,.46)]">运行 {executionCounts.running}</span>
                {executionCounts.paused ? <span className="text-[rgba(22,24,35,.46)]">暂停 {executionCounts.paused}</span> : null}
                <span className="text-[rgba(22,24,35,.46)]">成功 {executionCounts.success}</span>
                {executionCounts.failed ? <span className="text-[#d92d20]">失败 {executionCounts.failed}</span> : null}
                {executionCounts.blocked ? <span className="text-[rgba(22,24,35,.46)]">阻断 {executionCounts.blocked}</span> : null}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {activeInstance?.status === 'RUNNING' ? (
              <Button
                icon={<Pause size={14} />}
                loading={controlAction === 'pause'}
                onClick={() => void executeControl('pause', pauseWorkflowInstance, '已请求暂停工作流')}
              >暂停</Button>
            ) : null}
            {activeInstance?.status === 'PAUSED' ? (
              <Button
                icon={<Play size={14} />}
                loading={controlAction === 'resume'}
                onClick={() => void executeControl('resume', resumeWorkflowInstance, '已请求恢复工作流')}
              >恢复</Button>
            ) : null}
            {activeInstance && !isWorkflowTerminal(activeInstance.status) ? (
              <Popconfirm
                title="取消当前工作流？"
                onConfirm={() => void executeControl('cancel', cancelWorkflowInstance, '工作流已取消')}
              >
                <Button danger icon={<Square size={13} />} loading={controlAction === 'cancel'}>取消</Button>
              </Popconfirm>
            ) : null}
            <Popconfirm
              title="清空当前画布？"
              okText="清空"
              cancelText="取消"
              disabled={workflowLocked}
              onConfirm={clearCanvas}
            >
              <Button icon={<RotateCcw size={14} />} disabled={workflowLocked}>清空</Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<Play size={14} />}
              loading={submitting}
              disabled={workflowLocked}
              onClick={handleRun}
            >运行</Button>
          </div>
        </div>

        <div ref={wrapperRef} className="relative min-h-0 flex-1" onDrop={handleDrop}>
          {selectedNode && !workflowLocked ? (
            <div className="absolute right-4 top-4 z-20 w-[300px] rounded-lg border border-[#e3e5e8] bg-white p-3 shadow-md">
              <div className="text-[12px] font-semibold text-[#161823]">节点配置</div>
              <div className="mt-1 truncate text-[11px] text-[rgba(22,24,35,.48)]">
                {selectedNode.data.label}
              </div>
              <div className="mt-3 text-[11px] font-medium text-[rgba(22,24,35,.62)]">模拟结果</div>
              <Segmented
                block
                size="small"
                className="mt-1.5"
                value={selectedNode.data.mockResult}
                options={[
                  { label: '正常成功', value: 'SUCCESS' },
                  { label: '模拟失败', value: 'FAILED' },
                ]}
                onChange={(value) => updateSelectedNode({ mockResult: value as WorkflowMockResult })}
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-[rgba(22,24,35,.48)]">最大 Attempt</div>
                  <InputNumber min={1} value={selectedNode.data.maxAttempts} onChange={(value) => updateSelectedNode({ maxAttempts: Number(value || 1) })} className="mt-1 w-full" />
                </div>
                <div>
                  <div className="text-[10px] text-[rgba(22,24,35,.48)]">重试延迟（秒）</div>
                  <InputNumber min={0} value={selectedNode.data.retryDelaySeconds} onChange={(value) => updateSelectedNode({ retryDelaySeconds: Number(value || 0) })} className="mt-1 w-full" />
                </div>
                <div>
                  <div className="text-[10px] text-[rgba(22,24,35,.48)]">派发超时（秒）</div>
                  <InputNumber min={0} value={selectedNode.data.dispatchTimeoutSeconds} onChange={(value) => updateSelectedNode({ dispatchTimeoutSeconds: Number(value || 0) })} className="mt-1 w-full" />
                </div>
                <div>
                  <div className="text-[10px] text-[rgba(22,24,35,.48)]">执行超时（秒）</div>
                  <InputNumber min={0} value={selectedNode.data.executionTimeoutSeconds} onChange={(value) => updateSelectedNode({ executionTimeoutSeconds: Number(value || 0) })} className="mt-1 w-full" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-[rgba(22,24,35,.48)]">Input Mapping</div>
              <Input.TextArea
                rows={4}
                className="mt-1 font-mono !text-[10px]"
                value={selectedNode.data.inputMappingText}
                onChange={(event) => updateSelectedNode({ inputMappingText: event.target.value })}
                placeholder={'{\n  "requestId": "$workflow.requestId",\n  "value": "upstream.value"\n}'}
              />
              <div className="mt-1.5 text-[9px] leading-4 text-[rgba(22,24,35,.38)]">
                超时填 0 表示关闭；Input Mapping 只能引用 Workflow Input 或直接前置节点 Output。
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
              >重新执行当前节点</Button>
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
              >跳过当前失败，继续后续节点</Button>
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
              if (!activeInstance || data.executionStatus !== 'FAILED' || data.continuedAfterFailure || !wrapperRef.current) {
                setContextMenu(undefined);
                return;
              }
              const bounds = wrapperRef.current.getBoundingClientRect();
              setContextMenu({
                nodeId: node.id,
                x: Math.max(8, Math.min(event.clientX - bounds.left, bounds.width - 256)),
                y: Math.max(8, Math.min(event.clientY - bounds.top, bounds.height - 150)),
              });
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = workflowLocked ? 'none' : 'move';
            }}
            nodesDraggable={!workflowLocked}
            nodesConnectable={!workflowLocked}
            elementsSelectable={!workflowLocked}
            fitView
            deleteKeyCode={workflowLocked ? null : ['Backspace', 'Delete']}
            defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#d9dce1', strokeWidth: 1.4 } }}
          >
            <Background gap={18} size={1} />
            <Controls position="bottom-right" />
            <MiniMap pannable zoomable className="!border !border-[#e8e9ec] !bg-white" />
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
