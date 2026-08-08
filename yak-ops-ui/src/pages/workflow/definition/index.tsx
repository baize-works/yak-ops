import {
  getWorkflowTasks,
  type WorkflowFailureStrategy,
  type WorkflowNodeFailurePolicy,
  type WorkflowTaskDefinition,
  type WorkflowTriggerRule,
} from '@/services/workflow';
import {
  getWorkflowDefinition,
  offlineWorkflowDefinition,
  onlineWorkflowDefinition,
  updateWorkflowDefinition,
  type WorkflowDefinition,
} from '@/services/workflow/definitions';
import { history, useParams } from '@umijs/max';
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
  ArrowLeft,
  CloudOff,
  CloudUpload,
  Database,
  RotateCcw,
  Save,
  Settings2,
} from 'lucide-react';
import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const definitionStatusLabel: Record<string, string> = {
  DRAFT: '草稿',
  ONLINE: '已上线',
  OFFLINE: '已下线',
};

const WorkflowNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => (
  <div className={[
    'relative min-w-[200px] rounded-lg border bg-white px-3 py-2.5 shadow-sm transition-all',
    selected ? 'border-[#fe2c55] shadow-[0_0_0_3px_rgba(254,44,85,.08)]' : 'border-[#dfe1e5]',
  ].join(' ')}>
    <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#8a8f99]" />
    <div className="text-[10px] font-medium text-[rgba(22,24,35,.42)]">{data.typeLabel}</div>
    <div className="mt-1.5 truncate text-[13px] font-semibold text-[#161823]">{data.label}</div>
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
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(`${label}必须是 JSON 对象`);
  }
  return value as T;
};

const WorkflowDefinitionContent = () => {
  const { id = '' } = useParams<{ id: string }>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef(1);
  const [tasks, setTasks] = useState<WorkflowTaskDefinition[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusAction, setStatusAction] = useState(false);
  const [definition, setDefinition] = useState<WorkflowDefinition>();
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowTimeoutSeconds, setWorkflowTimeoutSeconds] = useState(0);
  const [workflowInputText, setWorkflowInputText] = useState('{}');
  const [failureStrategy, setFailureStrategy] = useState<WorkflowFailureStrategy>('CONTINUE_INDEPENDENT_BRANCHES');
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const nodeTypes = useMemo(() => ({ workflow: WorkflowNode }), []);
  const selectedNode = useMemo(() => nodes.find((node) => node.selected), [nodes]);
  const syncTasks = useMemo(() => tasks.filter((task) => task.type === 'SYNC'), [tasks]);
  const locked = definition?.status === 'ONLINE';

  const hydrateDefinition = useCallback((value: WorkflowDefinition, taskList: WorkflowTaskDefinition[]) => {
    const taskMap = new Map(taskList.map((task) => [task.id, task]));
    setDefinition(value);
    setWorkflowName(value.name);
    setWorkflowDescription(value.description || '');
    setWorkflowTimeoutSeconds(value.workflowTimeoutSeconds || 0);
    setWorkflowInputText(JSON.stringify(value.input || {}, null, 2));
    setFailureStrategy(value.failureStrategy || 'CONTINUE_INDEPENDENT_BRANCHES');
    setNodes(value.nodes.map((node) => {
      const task = taskMap.get(node.taskId);
      return {
        id: node.id,
        type: 'workflow',
        position: { x: node.positionX || 0, y: node.positionY || 0 },
        data: {
          label: task?.name || `任务 ${node.taskId}`,
          taskId: node.taskId,
          taskType: task?.type || 'SYNC',
          typeLabel: task?.type === 'SYNC' || !task ? '数据同步' : task.type,
          triggerRule: node.triggerRule,
          failurePolicy: node.failurePolicy,
          maxAttempts: node.maxAttempts,
          retryDelaySeconds: node.retryDelaySeconds,
          dispatchTimeoutSeconds: node.dispatchTimeoutSeconds,
          executionTimeoutSeconds: node.executionTimeoutSeconds,
          inputMappingText: JSON.stringify(node.inputMapping || {}, null, 2),
        },
      };
    }));
    setEdges(value.edges.map((edge, index) => ({
      id: `edge-${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
    })));
    sequenceRef.current = Math.max(1, value.nodes.length + 1);
  }, [setEdges, setNodes]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!id) {
        message.error('工作流 ID 不能为空');
        history.replace('/workflow/definitions');
        return;
      }
      setLoading(true);
      setTasksLoading(true);
      try {
        const [taskList, detail] = await Promise.all([
          getWorkflowTasks(),
          getWorkflowDefinition(id),
        ]);
        if (!active) return;
        const nextTasks = taskList || [];
        setTasks(nextTasks);
        hydrateDefinition(detail, nextTasks);
      } catch (error) {
        if (active) message.error(error instanceof Error ? error.message : '工作流加载失败');
      } finally {
        if (active) {
          setLoading(false);
          setTasksLoading(false);
        }
      }
    };
    void load();
    return () => { active = false; };
  }, [hydrateDefinition, id]);

  const handleConnect = (connection: Connection) => {
    if (locked) return;
    setEdges((current) => addEdge({ ...connection, type: 'smoothstep' }, current));
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, task: WorkflowTaskDefinition) => {
    event.dataTransfer.setData('application/yak-workflow-task', JSON.stringify(task));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (locked || !reactFlowInstance || !wrapperRef.current) return;
    const raw = event.dataTransfer.getData('application/yak-workflow-task');
    if (!raw) return;
    const task = JSON.parse(raw) as WorkflowTaskDefinition;
    const bounds = wrapperRef.current.getBoundingClientRect();
    const position = reactFlowInstance.project({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
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
    if (!selectedNode || locked) return;
    setNodes((current) => current.map((node) =>
      node.id === selectedNode.id ? { ...node, data: { ...node.data, ...patch } } : node));
  };

  const buildPayload = () => ({
    name: workflowName.trim(),
    description: workflowDescription.trim() || undefined,
    nodes: nodes.map((node) => ({
      id: node.id,
      taskId: node.data.taskId,
      positionX: node.position.x,
      positionY: node.position.y,
      triggerRule: node.data.triggerRule,
      failurePolicy: node.data.failurePolicy,
      maxAttempts: node.data.maxAttempts,
      retryDelaySeconds: node.data.retryDelaySeconds,
      dispatchTimeoutSeconds: node.data.dispatchTimeoutSeconds,
      executionTimeoutSeconds: node.data.executionTimeoutSeconds,
      inputMapping: parseObject<Record<string, string>>(node.data.inputMappingText, `${node.data.label} 输入映射`),
    })),
    edges: edges.map((edge: Edge) => ({ source: edge.source, target: edge.target })),
    input: parseObject<Record<string, unknown>>(workflowInputText, '工作流输入'),
    workflowTimeoutSeconds,
    failureStrategy,
  });

  const saveDefinition = async (showMessage = true) => {
    if (!id) throw new Error('工作流 ID 不能为空');
    if (!workflowName.trim()) throw new Error('工作流名称不能为空');
    setSaving(true);
    try {
      const saved = await updateWorkflowDefinition(id, buildPayload());
      setDefinition(saved);
      if (showMessage) message.success('工作流配置已保存');
      return saved;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveDefinition();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存工作流失败');
    }
  };

  const handleOnline = async () => {
    if (!nodes.length) {
      message.warning('请先拖入至少一个任务节点');
      return;
    }
    setStatusAction(true);
    try {
      await saveDefinition(false);
      const next = await onlineWorkflowDefinition(id);
      setDefinition(next);
      message.success('工作流已上线');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '工作流上线失败');
    } finally {
      setStatusAction(false);
    }
  };

  const handleOffline = async () => {
    setStatusAction(true);
    try {
      const next = await offlineWorkflowDefinition(id);
      setDefinition(next);
      message.success('工作流已下线，可以继续编辑');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '工作流下线失败');
    } finally {
      setStatusAction(false);
    }
  };

  const clearCanvas = () => {
    if (locked) return;
    setNodes([]);
    setEdges([]);
  };

  const runtimeConfig = (
    <div className="w-[360px] space-y-3">
      <div>
        <div className="text-[12px] font-medium text-[#161823]">失败策略</div>
        <Select className="mt-1 w-full" value={failureStrategy} disabled={locked}
          options={WORKFLOW_FAILURE_OPTIONS}
          onChange={(value) => setFailureStrategy(value as WorkflowFailureStrategy)} />
      </div>
      <div>
        <div className="text-[12px] font-medium text-[#161823]">工作流超时</div>
        <div className="mt-1 flex items-center gap-2">
          <InputNumber min={0} value={workflowTimeoutSeconds}
            onChange={(value) => setWorkflowTimeoutSeconds(Number(value || 0))}
            disabled={locked} className="w-[150px]" />
          <span className="text-[11px] text-[rgba(22,24,35,.44)]">秒，0 表示不限制</span>
        </div>
      </div>
      <div>
        <div className="text-[12px] font-medium text-[#161823]">Workflow Input</div>
        <Input.TextArea rows={5} value={workflowInputText}
          onChange={(event) => setWorkflowInputText(event.target.value)}
          disabled={locked} className="mt-1 font-mono !text-[11px]" />
      </div>
      <div>
        <div className="text-[12px] font-medium text-[#161823]">描述</div>
        <Input.TextArea rows={3} value={workflowDescription}
          onChange={(event) => setWorkflowDescription(event.target.value)}
          disabled={locked} className="mt-1 !text-[11px]" />
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex h-[calc(100vh-48px)] items-center justify-center bg-white"><Spin /></div>;
  }

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
          {!tasksLoading && !syncTasks.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可用于工作流的同步任务" /> : null}
          <div className="space-y-2">
            {syncTasks.map((task) => (
              <div key={task.id} draggable={!locked}
                onDragStart={(event) => handleDragStart(event, task)}
                className={[
                  'rounded-lg border border-[#e3e5e8] bg-white px-3 py-2.5',
                  locked ? 'cursor-not-allowed opacity-60' : 'cursor-grab hover:border-[#cfd2d7] hover:shadow-sm',
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
          <div className="flex min-w-0 items-center gap-2.5">
            <Button type="text" size="small" icon={<ArrowLeft size={14} />} onClick={() => history.push('/workflow/definitions')}>返回</Button>
            <div className="h-5 w-px bg-[#ececef]" />
            <Input value={workflowName} onChange={(event) => setWorkflowName(event.target.value)}
              variant="filled" className="w-[240px]" disabled={locked} />
            <span className={[
              'rounded-md px-2 py-1 text-[10px] font-medium',
              definition?.status === 'ONLINE' ? 'bg-[#fff0f3] text-[#d92d50]' : 'bg-[#f2f4f7] text-[#667085]',
            ].join(' ')}>{definitionStatusLabel[definition?.status || 'DRAFT'] || definition?.status}</span>
            <Popover content={runtimeConfig} title="运行配置" trigger="click">
              <Button size="small" icon={<Settings2 size={13} />}>运行配置</Button>
            </Popover>
            <span className="text-[11px] text-[rgba(22,24,35,.38)]">{nodes.length} 节点 · {edges.length} 连线</span>
            {locked ? <span className="text-[10px] text-[rgba(22,24,35,.38)]">已上线，需下线后修改</span> : null}
          </div>
          <div className="flex items-center gap-2">
            <Popconfirm title="清空当前画布？" disabled={locked} onConfirm={clearCanvas}>
              <Button icon={<RotateCcw size={14} />} disabled={locked}>清空</Button>
            </Popconfirm>
            {!locked ? <Button icon={<Save size={14} />} loading={saving} onClick={() => void handleSave()}>保存</Button> : null}
            {definition?.status === 'ONLINE' ? (
              <Button icon={<CloudOff size={14} />} loading={statusAction} onClick={() => void handleOffline()}>下线</Button>
            ) : (
              <Button type="primary" icon={<CloudUpload size={14} />} loading={statusAction || saving} onClick={() => void handleOnline()}>保存并上线</Button>
            )}
          </div>
        </div>

        <div ref={wrapperRef} className="relative min-h-0 flex-1" onDrop={handleDrop}>
          {selectedNode ? (
            <div className="absolute right-4 top-4 z-20 w-[340px] rounded-lg border border-[#e3e5e8] bg-white p-3 shadow-md">
              <div className="text-[12px] font-semibold text-[#161823]">任务节点</div>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-[#f7f7f8] p-2.5">
                <div><div className="text-[10px] text-[rgba(22,24,35,.4)]">任务名称</div><div className="mt-1 truncate text-[12px] font-medium">{selectedNode.data.label}</div></div>
                <div><div className="text-[10px] text-[rgba(22,24,35,.4)]">任务类型</div><div className="mt-1 text-[12px] font-medium">{selectedNode.data.typeLabel}</div></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div><div className="text-[10px] text-[rgba(22,24,35,.48)]">触发规则</div><Select disabled={locked} className="mt-1 w-full" size="small" value={selectedNode.data.triggerRule} options={TRIGGER_RULE_OPTIONS} onChange={(value) => updateSelectedNode({ triggerRule: value as WorkflowTriggerRule })} /></div>
                <div><div className="text-[10px] text-[rgba(22,24,35,.48)]">失败策略</div><Select disabled={locked} className="mt-1 w-full" size="small" value={selectedNode.data.failurePolicy} options={NODE_FAILURE_OPTIONS} onChange={(value) => updateSelectedNode({ failurePolicy: value as WorkflowNodeFailurePolicy })} /></div>
                <div><div className="text-[10px] text-[rgba(22,24,35,.48)]">最大 Attempt</div><InputNumber disabled={locked} min={1} value={selectedNode.data.maxAttempts} onChange={(value) => updateSelectedNode({ maxAttempts: Number(value || 1) })} className="mt-1 w-full" /></div>
                <div><div className="text-[10px] text-[rgba(22,24,35,.48)]">重试延迟（秒）</div><InputNumber disabled={locked} min={0} value={selectedNode.data.retryDelaySeconds} onChange={(value) => updateSelectedNode({ retryDelaySeconds: Number(value || 0) })} className="mt-1 w-full" /></div>
                <div><div className="text-[10px] text-[rgba(22,24,35,.48)]">派发超时（秒）</div><InputNumber disabled={locked} min={0} value={selectedNode.data.dispatchTimeoutSeconds} onChange={(value) => updateSelectedNode({ dispatchTimeoutSeconds: Number(value || 0) })} className="mt-1 w-full" /></div>
                <div><div className="text-[10px] text-[rgba(22,24,35,.48)]">执行超时（秒）</div><InputNumber disabled={locked} min={0} value={selectedNode.data.executionTimeoutSeconds} onChange={(value) => updateSelectedNode({ executionTimeoutSeconds: Number(value || 0) })} className="mt-1 w-full" /></div>
              </div>
              <div className="mt-3 text-[10px] text-[rgba(22,24,35,.48)]">Input Mapping</div>
              <Input.TextArea disabled={locked} rows={4} className="mt-1 font-mono !text-[10px]"
                value={selectedNode.data.inputMappingText}
                onChange={(event) => updateSelectedNode({ inputMappingText: event.target.value })} />
              <div className="mt-1.5 text-[9px] leading-4 text-[rgba(22,24,35,.38)]">任务自身配置不在工作流中编辑；这里只配置编排行为。</div>
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
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = locked ? 'none' : 'move';
            }}
            nodesDraggable={!locked}
            nodesConnectable={!locked}
            elementsSelectable
            fitView
            deleteKeyCode={locked ? null : ['Backspace', 'Delete']}
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
