import {
  activateWorkflowInstance,
  cancelWorkflowInstance,
  continueWorkflowAfterFailure,
  getWorkflowTasks,
  isWorkflowTerminal,
  pauseWorkflowInstance,
  resumeWorkflowInstance,
  retryWorkflowFailedNode,
  runWorkflow,
  subscribeWorkflowEvents,
  type WorkflowFailureStrategy,
  type WorkflowInstance,
  type WorkflowNodeFailurePolicy,
  type WorkflowTaskDefinition,
  type WorkflowTriggerRule,
} from '@/services/workflow';
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Popover,
  Select,
  Spin,
  message,
} from 'antd';
import {
  ArrowRightCircle,
  CheckCircle2,
  CircleEllipsis,
  CircleSlash2,
  Database,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  Square,
  XCircle,
} from 'lucide-react';
import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react';
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
  taskId: string;
  taskType: string;
  typeLabel: string;
  triggerRule: WorkflowTriggerRule;
  failurePolicy: WorkflowNodeFailurePolicy;
  maxAttempts: number;
  retryDelaySeconds: number;
  dispatchTimeoutSeconds: number;
  executionTimeoutSeconds: number;
  inputMappingText: string;
  executionStatus?: string;
  continuedAfterFailure?: boolean;
}

interface NodeContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

const WORKFLOW_FAILURE_OPTIONS = [
  { value: 'CONTINUE_INDEPENDENT_BRANCHES', label: '独立分支继续' },
  { value: 'FAIL_FAST', label: '失败快速结束' },
  { value: 'TERMINATE_ALL', label: '终止全部节点' },
];

const TRIGGER_RULE_OPTIONS = [
  { value: 'ALL_SUCCESS', label: '全部前置成功' },
  { value: 'ALL_DONE', label: '全部前置结束' },
  { value: 'NONE_FAILED', label: '无前置失败' },
  { value: 'ONE_SUCCESS', label: '至少一个成功' },
  { value: 'ALWAYS', label: '始终执行' },
];

const NODE_FAILURE_OPTIONS = [
  { value: 'FAIL_WORKFLOW', label: '标记工作流失败' },
  { value: 'BLOCK_BRANCH', label: '仅阻断当前分支' },
  { value: 'IGNORE_FAILURE', label: '忽略失败继续' },
];

const statusLabel: Record<string, string> = {
  CREATED: '已创建', WAITING: '等待中', READY: '就绪', SUBMITTED: '待执行', RUNNING: '运行中',
  PAUSING: '暂停中', PAUSED: '已暂停', RESUMING: '恢复中', SUCCESS: '成功',
  SUCCESS_WITH_WARNINGS: '完成（有告警）', FAILED: '失败', WARNING: '告警', CANCELED: '已取消',
  TIMED_OUT: '已超时', UPSTREAM_FAILED: '已阻断', SKIPPED: '已跳过',
};

const isTransitioning = (status?: string) =>
  status === 'RUNNING' || status === 'PAUSING' || status === 'RESUMING';

const statusIcon = (status?: string) => {
  if (isTransitioning(status)) return <LoaderCircle size={13} className="animate-spin text-[#fe2c55]" />;
  if (status === 'PAUSED') return <Pause size={13} className="text-[rgba(22,24,35,.58)]" />;
  if (status === 'SUCCESS' || status === 'SUCCESS_WITH_WARNINGS') return <CheckCircle2 size={13} className="text-[#161823]" />;
  if (status === 'FAILED' || status === 'TIMED_OUT') return <XCircle size={13} className="text-[#d92d20]" />;
  if (status === 'UPSTREAM_FAILED') return <CircleSlash2 size={13} className="text-[rgba(22,24,35,.42)]" />;
  return <CircleEllipsis size={13} className="text-[rgba(22,24,35,.42)]" />;
};

const nodeStateClass = (status?: string, selected?: boolean) => {
  if (status === 'RUNNING' || status === 'RESUMING') return 'border-[#fe2c55] bg-[#fff7f8] shadow-[0_0_0_3px_rgba(254,44,85,.10)]';
  if (status === 'PAUSING' || status === 'PAUSED') return 'border-[#b8bdc5] bg-[#f6f7f8]';
  if (status === 'FAILED' || status === 'TIMED_OUT') return 'border-[#d92d20] bg-[#fff6f4]';
  if (status === 'UPSTREAM_FAILED') return 'border-[#cfd3d8] bg-[#f5f6f7] opacity-70';
  if (status === 'SUCCESS') return 'border-[rgba(22,24,35,.45)] bg-[#f7f7f8]';
  if (selected) return 'border-[#fe2c55] bg-white';
  return 'border-[#dfe1e5] bg-white';
};

const WorkflowNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => (
  <div className={[
    'relative min-w-[190px] rounded-lg border px-3 py-2.5 shadow-sm transition-all',
    nodeStateClass(data.executionStatus, selected),
  ].join(' ')}>
    <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#8a8f99]" />
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-medium text-[rgba(22,24,35,.45)]">{data.typeLabel}</span>
      {data.executionStatus ? (
        <span className="flex items-center gap-1 text-[10px] text-[rgba(22,24,35,.58)]">
          {statusIcon(data.executionStatus)}
          {statusLabel[data.executionStatus] || data.executionStatus}
        </span>
      ) : null}
    </div>
    <div className="mt-1.5 text-[13px] font-semibold text-[#161823]">{data.label}</div>
    <div className="mt-1 truncate text-[9px] text-[rgba(22,24,35,.34)]">Task ID: {data.taskId}</div>
    {data.maxAttempts > 1 || data.executionTimeoutSeconds > 0 ? (
      <div className="mt-1.5 text-[9px] text-[rgba(22,24,35,.38)]">
        {data.maxAttempts > 1 ? `最多 ${data.maxAttempts} 次` : ''}
        {data.maxAttempts > 1 && data.executionTimeoutSeconds > 0 ? ' · ' : ''}
        {data.executionTimeoutSeconds > 0 ? `执行超时 ${data.executionTimeoutSeconds}s` : ''}
      </div>
    ) : null}
    <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#8a8f99]" />
  </div>
);

const parseObject = <T extends Record<string, unknown>>(raw: string, label: string): T => {
  const value = raw.trim() ? JSON.parse(raw) : {};
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(`${label}必须是 JSON 对象`);
  return value as T;
};

const WorkflowDefinitionContent = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef(1);
  const closeStreamRef = useRef<(() => void) | null>(null);
  const continuedFailureNodeIdsRef = useRef<Set<string>>(new Set());

  const [tasks, setTasks] = useState<WorkflowTaskDefinition[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string>();
  const [workflowName, setWorkflowName] = useState('内存工作流');
  const [workflowTimeoutSeconds, setWorkflowTimeoutSeconds] = useState(0);
  const [workflowInputText, setWorkflowInputText] = useState('{}');
  const [failureStrategy, setFailureStrategy] = useState<WorkflowFailureStrategy>('CONTINUE_INDEPENDENT_BRANCHES');
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
  const syncTasks = useMemo(() => tasks.filter((task) => task.type === 'SYNC'), [tasks]);

  useEffect(() => {
    let active = true;
    setTasksLoading(true);
    getWorkflowTasks()
      .then((data) => {
        if (!active) return;
        setTasks(data || []);
        setTasksError(undefined);
      })
      .catch((error) => {
        if (!active) return;
        setTasksError(error instanceof Error ? error.message : '任务列表加载失败');
      })
      .finally(() => active && setTasksLoading(false));
    return () => { active = false; };
  }, []);

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
        continuedAfterFailure: continuedFailureNodeIdsRef.current.has(node.id),
      },
    })));
    setEdges((current) => current.map((edge) => {
      const sourceStatus = statusByNodeId.get(edge.source);
      const targetStatus = statusByNodeId.get(edge.target);
      const continued = continuedFailureNodeIdsRef.current.has(edge.source);
      const running = targetStatus === 'RUNNING' || targetStatus === 'RESUMING';
      const blocked = targetStatus === 'UPSTREAM_FAILED';
      const failed = targetStatus === 'FAILED' || (sourceStatus === 'FAILED' && !continued);
      let stroke = '#d9dce1';
      let strokeWidth = 1.4;
      let strokeDasharray: string | undefined;
      if (blocked) { stroke = '#c8ccd3'; strokeDasharray = '5 5'; }
      else if (running) { stroke = '#fe2c55'; strokeWidth = 2.2; }
      else if (failed) { stroke = '#d92d20'; strokeWidth = 1.8; }
      else if (sourceStatus === 'SUCCESS') { stroke = '#555b66'; strokeWidth = 1.7; }
      return { ...edge, animated: running, style: { ...edge.style, stroke, strokeWidth, strokeDasharray } };
    }));
  };

  const handleConnect = (connection: Connection) => {
    setEdges((current) => addEdge({ ...connection, type: 'smoothstep' }, current));
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, task: WorkflowTaskDefinition) => {
    event.dataTransfer.setData('application/yak-workflow-task', JSON.stringify(task));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (workflowLocked || !reactFlowInstance || !wrapperRef.current) return;
    const raw = event.dataTransfer.getData('application/yak-workflow-task');
    if (!raw) return;
    const task = JSON.parse(raw) as WorkflowTaskDefinition;
    const bounds = wrapperRef.current.getBoundingClientRect();
    const position = reactFlowInstance.project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    const sequence = sequenceRef.current++;
    setNodes((current) => [...current, {
      id: `task-${Date.now()}-${sequence}`,
      type: 'workflow',
      position,
      data: {
        label: task.name,
        taskId: task.id,
        taskType: task.type,
        typeLabel: task.type === 'SYNC' ? '数据同步' : task.type,
        triggerRule: 'ALL_SUCCESS',
        failurePolicy: 'FAIL_WORKFLOW',
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
      node.id === selectedNode.id ? { ...node, data: { ...node.data, ...patch } } : node));
  };

  const resetExecutionVisuals = () => {
    continuedFailureNodeIdsRef.current.clear();
    setContextMenu(undefined);
    setNodes((current) => current.map((node) => ({
      ...node,
      data: { ...node.data, executionStatus: 'WAITING', continuedAfterFailure: false },
    })));
  };

  const handleRun = async () => {
    if (!nodes.length) { message.warning('请先拖入至少一个任务'); return; }
    closeStreamRef.current?.();
    setActiveInstance(undefined);
    resetExecutionVisuals();
    setSubmitting(true);
    try {
      const input = parseObject<Record<string, unknown>>(workflowInputText, '工作流输入');
      const instance = await runWorkflow({
        name: workflowName.trim() || '未命名工作流',
        nodes: nodes.map((node) => ({
          id: node.id,
          taskId: node.data.taskId,
          triggerRule: node.data.triggerRule,
          failurePolicy: node.data.failurePolicy,
          maxAttempts: node.data.maxAttempts,
          retryDelaySeconds: node.data.retryDelaySeconds,
          dispatchTimeoutSeconds: node.data.dispatchTimeoutSeconds,
          executionTimeoutSeconds: node.data.executionTimeoutSeconds,
          inputMapping: parseObject<Record<string, string>>(node.data.inputMappingText, `${node.data.label} 输入映射`),
        })),
        edges: edges.map((edge: Edge) => ({ source: edge.source, target: edge.target })),
        input,
        workflowTimeoutSeconds,
        failureStrategy,
      });
      applySnapshot(instance);
      closeStreamRef.current = subscribeWorkflowEvents(instance.id, applySnapshot);
      applySnapshot(await activateWorkflowInstance(instance.id));
      message.success('工作流已启动');
    } catch (error) {
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

  const handleRetryFailedNode = async (nodeId: string) => {
    if (!activeInstance || recoveringNodeId) return;
    setRecoveringNodeId(nodeId);
    setContextMenu(undefined);
    try {
      continuedFailureNodeIdsRef.current.delete(nodeId);
      applySnapshot(await retryWorkflowFailedNode(activeInstance.id, nodeId));
      message.success('已重新执行当前任务');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重新执行失败');
    } finally {
      setRecoveringNodeId(undefined);
    }
  };

  const handleContinueAfterFailure = async (nodeId: string) => {
    if (!activeInstance || recoveringNodeId) return;
    setRecoveringNodeId(nodeId);
    setContextMenu(undefined);
    try {
      continuedFailureNodeIdsRef.current.add(nodeId);
      applySnapshot(await continueWorkflowAfterFailure(activeInstance.id, nodeId));
      message.success('已跳过当前失败并继续后续任务');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '继续执行失败');
    } finally {
      setRecoveringNodeId(undefined);
    }
  };

  const clearCanvas = () => {
    closeStreamRef.current?.();
    closeStreamRef.current = null;
    setActiveInstance(undefined);
    setNodes([]);
    setEdges([]);
    setContextMenu(undefined);
  };

  const runtimeConfig = (
    <div className="w-[360px] space-y-3">
      <div>
        <div className="text-[12px] font-medium text-[#161823]">失败策略</div>
        <Select className="mt-1 w-full" value={failureStrategy} disabled={workflowLocked}
          options={WORKFLOW_FAILURE_OPTIONS}
          onChange={(value) => setFailureStrategy(value as WorkflowFailureStrategy)} />
      </div>
      <div>
        <div className="text-[12px] font-medium text-[#161823]">工作流超时</div>
        <div className="mt-1 flex items-center gap-2">
          <InputNumber min={0} value={workflowTimeoutSeconds}
            onChange={(value) => setWorkflowTimeoutSeconds(Number(value || 0))}
            disabled={workflowLocked} className="w-[150px]" />
          <span className="text-[11px] text-[rgba(22,24,35,.44)]">秒，0 表示不限制</span>
        </div>
      </div>
      <div>
        <div className="text-[12px] font-medium text-[#161823]">Workflow Input</div>
        <Input.TextArea rows={5} value={workflowInputText}
          onChange={(event) => setWorkflowInputText(event.target.value)}
          disabled={workflowLocked} className="mt-1 font-mono !text-[11px]" />
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-48px)] min-h-[620px] overflow-hidden bg-white">
      <aside className="w-[250px] shrink-0 border-r border-[#e8e9ec] bg-[#fafafa]">
        <div className="border-b border-[#e8e9ec] px-4 py-3.5">
          <div className="text-[14px] font-semibold text-[#161823]">已配置任务</div>
          <div className="mt-1 text-xs leading-5 text-[rgba(22,24,35,.48)]">拖拽任务到右侧画布进行编排</div>
        </div>
        <div className="p-3">
          <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-medium text-[rgba(22,24,35,.52)]">
            <Database size={14} /> 数据同步
          </div>
          {tasksLoading ? <div className="flex justify-center py-8"><Spin size="small" /></div> : null}
          {!tasksLoading && tasksError ? <div className="px-2 py-4 text-xs text-[#d92d20]">{tasksError}</div> : null}
          {!tasksLoading && !tasksError && !syncTasks.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可执行同步任务" /> : null}
          <div className="space-y-2">
            {syncTasks.map((task) => (
              <div key={task.id} draggable={!workflowLocked}
                onDragStart={(event) => handleDragStart(event, task)}
                className={[
                  'rounded-lg border border-[#e3e5e8] bg-white px-3 py-2.5',
                  workflowLocked ? 'cursor-not-allowed opacity-60' : 'cursor-grab hover:border-[#cfd2d7] hover:shadow-sm',
                ].join(' ')}>
                <div className="truncate text-[13px] font-semibold text-[#161823]">{task.name}</div>
                <div className="mt-1 truncate text-[10px] text-[rgba(22,24,35,.38)]">ID {task.id}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e8e9ec] px-4">
          <div className="flex items-center gap-3">
            <div className="text-[15px] font-semibold text-[#161823]">工作流定义</div>
            <Input value={workflowName} onChange={(event) => setWorkflowName(event.target.value)}
              variant="filled" className="w-[220px]" disabled={workflowLocked} />
            <Popover content={runtimeConfig} title="运行配置" trigger="click">
              <Button size="small" icon={<Settings2 size={13} />}>运行配置</Button>
            </Popover>
            <span className="text-xs text-[rgba(22,24,35,.4)]">{nodes.length} 节点 · {edges.length} 连线</span>
            {activeInstance ? (
              <span className="flex items-center gap-1.5 border-l border-[#ececef] pl-3 text-[11px] text-[rgba(22,24,35,.62)]">
                {statusIcon(activeInstance.status)} {statusLabel[activeInstance.status] || activeInstance.status}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {activeInstance?.status === 'RUNNING' ? (
              <Button icon={<Pause size={14} />} loading={controlAction === 'pause'}
                onClick={() => void executeControl('pause', pauseWorkflowInstance, '已请求暂停工作流')}>暂停</Button>
            ) : null}
            {activeInstance?.status === 'PAUSED' ? (
              <Button icon={<Play size={14} />} loading={controlAction === 'resume'}
                onClick={() => void executeControl('resume', resumeWorkflowInstance, '已恢复工作流')}>恢复</Button>
            ) : null}
            {activeInstance && !isWorkflowTerminal(activeInstance.status) ? (
              <Popconfirm title="取消当前工作流？" onConfirm={() => void executeControl('cancel', cancelWorkflowInstance, '工作流已取消')}>
                <Button danger icon={<Square size={13} />} loading={controlAction === 'cancel'}>取消</Button>
              </Popconfirm>
            ) : null}
            <Popconfirm title="清空当前画布？" disabled={workflowLocked} onConfirm={clearCanvas}>
              <Button icon={<RotateCcw size={14} />} disabled={workflowLocked}>清空</Button>
            </Popconfirm>
            <Button type="primary" icon={<Play size={14} />} loading={submitting}
              disabled={workflowLocked} onClick={handleRun}>运行</Button>
          </div>
        </div>

        <div ref={wrapperRef} className="relative min-h-0 flex-1" onDrop={handleDrop}>
          {selectedNode && !workflowLocked ? (
            <div className="absolute right-4 top-4 z-20 w-[330px] rounded-lg border border-[#e3e5e8] bg-white p-3 shadow-md">
              <div className="text-[12px] font-semibold text-[#161823]">任务节点</div>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-[#f7f7f8] p-2.5">
                <div><div className="text-[10px] text-[rgba(22,24,35,.4)]">任务名称</div><div className="mt-1 truncate text-[12px] font-medium">{selectedNode.data.label}</div></div>
                <div><div className="text-[10px] text-[rgba(22,24,35,.4)]">任务类型</div><div className="mt-1 text-[12px] font-medium">{selectedNode.data.typeLabel}</div></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div><div className="text-[10px] text-[rgba(22,24,35,.48)]">触发规则</div><Select className="mt-1 w-full" size="small" value={selectedNode.data.triggerRule} options={TRIGGER_RULE_OPTIONS} onChange={(value) => updateSelectedNode({ triggerRule: value as WorkflowTriggerRule })} /></div>
                <div><div className="text-[10px] text-[rgba(22,24,35,.48)]">失败策略</div><Select className="mt-1 w-full" size="small" value={selectedNode.data.failurePolicy} options={NODE_FAILURE_OPTIONS} onChange={(value) => updateSelectedNode({ failurePolicy: value as WorkflowNodeFailurePolicy })} /></div>
                <div><div className="text-[10px] text-[rgba(22,24,35,.48)]">最大 Attempt</div><InputNumber min={1} value={selectedNode.data.maxAttempts} onChange={(value) => updateSelectedNode({ maxAttempts: Number(value || 1) })} className="mt-1 w-full" /></div>
                <div><div className="text-[10px] text-[rgba(22,24,35,.48)]">重试延迟（秒）</div><InputNumber min={0} value={selectedNode.data.retryDelaySeconds} onChange={(value) => updateSelectedNode({ retryDelaySeconds: Number(value || 0) })} className="mt-1 w-full" /></div>
                <div><div className="text-[10px] text-[rgba(22,24,35,.48)]">派发超时（秒）</div><InputNumber min={0} value={selectedNode.data.dispatchTimeoutSeconds} onChange={(value) => updateSelectedNode({ dispatchTimeoutSeconds: Number(value || 0) })} className="mt-1 w-full" /></div>
                <div><div className="text-[10px] text-[rgba(22,24,35,.48)]">执行超时（秒）</div><InputNumber min={0} value={selectedNode.data.executionTimeoutSeconds} onChange={(value) => updateSelectedNode({ executionTimeoutSeconds: Number(value || 0) })} className="mt-1 w-full" /></div>
              </div>
              <div className="mt-3 text-[10px] text-[rgba(22,24,35,.48)]">Input Mapping</div>
              <Input.TextArea rows={4} className="mt-1 font-mono !text-[10px]"
                value={selectedNode.data.inputMappingText}
                onChange={(event) => updateSelectedNode({ inputMappingText: event.target.value })} />
              <div className="mt-1.5 text-[9px] leading-4 text-[rgba(22,24,35,.38)]">任务自身配置不在工作流中编辑；这里只配置编排行为。</div>
            </div>
          ) : null}

          {contextMenu ? (
            <div className="absolute z-30 w-[248px] rounded-lg border border-[#e1e4e8] bg-white p-1.5 shadow-lg"
              style={{ left: contextMenu.x, top: contextMenu.y }} onMouseDown={(event) => event.stopPropagation()}>
              <Button type="text" block icon={<RefreshCw size={14} />} loading={recoveringNodeId === contextMenu.nodeId}
                className="!flex !h-8 !items-center !justify-start !px-2 !text-[12px]"
                onClick={() => void handleRetryFailedNode(contextMenu.nodeId)}>重新执行当前任务</Button>
              <Button type="text" block icon={<ArrowRightCircle size={14} />} disabled={Boolean(recoveringNodeId)}
                className="!flex !h-8 !items-center !justify-start !px-2 !text-[12px]"
                onClick={() => void handleContinueAfterFailure(contextMenu.nodeId)}>跳过失败并继续</Button>
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
                y: Math.max(8, Math.min(event.clientY - bounds.top, bounds.height - 100)),
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
