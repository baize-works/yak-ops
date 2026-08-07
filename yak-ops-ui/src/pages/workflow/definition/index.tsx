import { runWorkflow } from '@/services/workflow';
import { Button, Input, Popconfirm, message } from 'antd';
import {
  Bell,
  CirclePlay,
  Database,
  Play,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
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
  type Node,
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
}

interface NodeTemplate {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
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

const WorkflowNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => (
  <div
    className={[
      'relative min-w-[168px] rounded-lg border bg-white px-3 py-2.5 shadow-sm',
      selected ? 'border-[#fe2c55]' : 'border-[#dfe1e5]',
    ].join(' ')}
  >
    <Handle
      type="target"
      position={Position.Left}
      className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#8a8f99]"
    />
    <div className="text-[11px] font-medium text-[rgba(22,24,35,.45)]">
      {data.typeLabel}
    </div>
    <div className="mt-1 text-[13px] font-semibold text-[#161823]">
      {data.label}
    </div>
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
  const [workflowName, setWorkflowName] = useState('内存工作流');
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [running, setRunning] = useState(false);

  const nodeTypes = useMemo(() => ({ workflow: WorkflowNode }), []);

  const handleConnect = (connection: Connection) => {
    setEdges((current) =>
      addEdge(
        {
          ...connection,
          type: 'smoothstep',
        },
        current,
      ),
    );
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
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

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!reactFlowInstance || !wrapperRef.current) return;

    const raw = event.dataTransfer.getData('application/yak-workflow-node');
    if (!raw) return;

    const template = JSON.parse(raw) as { type: string; label: string };
    const bounds = wrapperRef.current.getBoundingClientRect();
    const position = reactFlowInstance.project({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    const id = `${template.type.toLowerCase()}-${Date.now()}-${sequenceRef.current++}`;

    setNodes((current) => [
      ...current,
      {
        id,
        type: 'workflow',
        position,
        data: {
          label: `${template.label} ${sequenceRef.current - 1}`,
          nodeType: template.type,
          typeLabel: template.label,
        },
      },
    ]);
  };

  const handleRun = async () => {
    if (!nodes.length) {
      message.warning('请先拖入至少一个节点');
      return;
    }
    setRunning(true);
    try {
      const instance = await runWorkflow({
        name: workflowName.trim() || '未命名工作流',
        nodes: nodes.map((node) => ({
          id: node.id,
          name: node.data.label,
          type: node.data.nodeType,
        })),
        edges: edges.map((edge: Edge) => ({
          source: edge.source,
          target: edge.target,
        })),
        input: {},
      });
      message.success(`工作流已运行：${instance.id}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '工作流运行失败');
    } finally {
      setRunning(false);
    }
  };

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
              draggable
              onDragStart={(event) => handleDragStart(event, template)}
              className="cursor-grab rounded-lg border border-[#e3e5e8] bg-white px-3 py-2.5 transition-shadow hover:shadow-sm active:cursor-grabbing"
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
            />
            <span className="text-xs text-[rgba(22,24,35,.4)]">
              {nodes.length} 节点 · {edges.length} 连线
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Popconfirm
              title="清空当前画布？"
              okText="清空"
              cancelText="取消"
              onConfirm={() => {
                setNodes([]);
                setEdges([]);
              }}
            >
              <Button icon={<RotateCcw size={14} />}>清空</Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<Play size={14} />}
              loading={running}
              onClick={handleRun}
            >
              运行
            </Button>
          </div>
        </div>

        <div ref={wrapperRef} className="min-h-0 flex-1" onDrop={handleDrop}>
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
              event.dataTransfer.dropEffect = 'move';
            }}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
            defaultEdgeOptions={{ type: 'smoothstep' }}
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
