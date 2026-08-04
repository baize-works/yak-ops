import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_CSS_VARIABLES, BRAND_THEME } from '@/styles/brand';
import { history, useParams } from '@umijs/max';
import { Button, ConfigProvider, message, Spin, Tag } from 'antd';
import {
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  Save,
  Trash2,
  Workflow,
} from 'lucide-react';
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnMoveEnd,
} from 'reactflow';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import 'reactflow/dist/style.css';

import type { WorkflowPublishedTask } from '../repository/workflow-task-library.repository';
import {
  workflowV2Repository,
  type WorkflowDefinitionDocument,
} from '../workflow-v2.repository';
import CreateWorkflowV2 from './CreateWorkflowV2';
import TaskLibraryPanel from './components/TaskLibraryPanel';
import WorkflowV2NodeCard from './components/WorkflowV2NodeCard';
import {
  WORKFLOW_TASK_DRAG_TYPE,
  createInitialWorkflowV2Dag,
  createTaskFlowNode,
  decodeTaskDragPayload,
  toFlowEdges,
  toFlowNodes,
  toWorkflowV2Dag,
  workflowV2EdgeStyle,
  type WorkflowV2CanvasNodeData,
  type WorkflowV2FlowEdge,
  type WorkflowV2FlowNode,
} from './model';

const nodeTypes = {
  workflowV2Node: WorkflowV2NodeCard,
};

const WorkflowV2DesignerContent = () => {
  const params = useParams<{ id: string }>();
  const workflowId = params.id || '';
  const reactFlow = useReactFlow<WorkflowV2CanvasNodeData>();
  const loadingRequestRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowDefinitionDocument>();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
  const [nodes, setNodes, onNodesChangeBase] =
    useNodesState<WorkflowV2CanvasNodeData>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState([]);

  const load = useCallback(async () => {
    if (!workflowId || workflowId === 'create') return;
    const requestId = ++loadingRequestRef.current;
    try {
      setLoading(true);
      const response = await workflowV2Repository.detail(workflowId);
      if (requestId !== loadingRequestRef.current) return;
      if (response.code !== API_SUCCESS_CODE || !response.data) {
        message.error(response.message || '加载 Workflow V2 失败');
        history.replace('/workflow-management');
        return;
      }
      if (response.data.schemaVersion !== 2) {
        history.replace(`/workflow-management/v1/${workflowId}/designer`);
        return;
      }

      const dag = response.data.draftV2 ?? createInitialWorkflowV2Dag();
      const flowNodes = toFlowNodes(dag);
      const flowEdges = toFlowEdges(dag);
      setWorkflow(response.data);
      setNodes(flowNodes);
      setEdges(flowEdges);
      setSelectedNodeId(undefined);
      setSelectedEdgeId(undefined);
      setDirty(false);
      requestAnimationFrame(() => {
        if (dag.viewport) {
          reactFlow.setViewport(dag.viewport, { duration: 0 });
        } else if (flowNodes.length) {
          reactFlow.fitView({ padding: 0.24, duration: 0 });
        }
      });
    } finally {
      if (requestId === loadingRequestRef.current) setLoading(false);
    }
  }, [reactFlow, setEdges, setNodes, workflowId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const markDirty = useCallback(() => setDirty(true), []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeBase(changes);
      if (changes.some((change) => change.type !== 'select')) markDirty();
    },
    [markDirty, onNodesChangeBase],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeBase(changes);
      if (changes.some((change) => change.type !== 'select')) markDirty();
    },
    [markDirty, onEdgesChangeBase],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) {
        message.warning('节点不能连接到自身');
        return;
      }
      const fromPort =
        connection.sourceHandle === 'FAILURE' ? 'FAILURE' : 'SUCCESS';
      const duplicated = edges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target &&
          (edge.sourceHandle ?? 'SUCCESS') === fromPort,
      );
      if (duplicated) return;

      setEdges((current) =>
        addEdge(
          {
            ...connection,
            sourceHandle: fromPort,
            id: `edge_${connection.source}_${fromPort}_${connection.target}_${Date.now()}`,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: workflowV2EdgeStyle(fromPort),
            data: { fromPort },
          },
          current,
        ),
      );
      markDirty();
    },
    [edges, markDirty, setEdges],
  );

  const insertTask = useCallback(
    (task: WorkflowPublishedTask, position?: { x: number; y: number }) => {
      const flowPosition =
        position ??
        reactFlow.screenToFlowPosition({
          x: Math.max(460, window.innerWidth * 0.58),
          y: window.innerHeight * 0.52,
        });
      const node = createTaskFlowNode(task, flowPosition);
      setNodes((current) => [...current, node]);
      setSelectedNodeId(node.id);
      setSelectedEdgeId(undefined);
      markDirty();
      requestAnimationFrame(() => {
        reactFlow.setCenter(flowPosition.x + 120, flowPosition.y + 60, {
          zoom: Math.max(reactFlow.getZoom(), 0.75),
          duration: 220,
        });
      });
    },
    [markDirty, reactFlow, setNodes],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const task = decodeTaskDragPayload(
        event.dataTransfer.getData(WORKFLOW_TASK_DRAG_TYPE),
      );
      if (!task) {
        message.warning('无法识别拖入的任务资源');
        return;
      }
      insertTask(
        task,
        reactFlow.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }),
      );
    },
    [insertTask, reactFlow],
  );

  const removeEdge = useCallback(
    (edgeId: string) => {
      setEdges((current) => current.filter((edge) => edge.id !== edgeId));
      setSelectedEdgeId(undefined);
      markDirty();
    },
    [markDirty, setEdges],
  );

  const saveDraft = useCallback(
    async (showSuccess = true): Promise<boolean> => {
      if (!workflow) return false;
      const invalid = nodes.find((node) => !node.data.title.trim());
      if (invalid) {
        setSelectedNodeId(invalid.id);
        message.warning('节点名称不能为空');
        return false;
      }
      try {
        setSaving(true);
        const response = await workflowV2Repository.update(workflow.id, {
          name: workflow.name,
          description: workflow.description,
          failureStrategy: workflow.failureStrategy,
          maxParallelism: workflow.maxParallelism,
          dag: toWorkflowV2Dag(nodes, edges, reactFlow.getViewport()),
        });
        if (response.code !== API_SUCCESS_CODE) {
          message.error(response.message || '保存 Workflow V2 草稿失败');
          return false;
        }
        setDirty(false);
        if (showSuccess) message.success('Workflow V2 草稿已保存');
        return true;
      } finally {
        setSaving(false);
      }
    },
    [edges, nodes, reactFlow, workflow],
  );

  const publish = useCallback(async () => {
    if (!workflow) return;
    try {
      setPublishing(true);
      if (!(await saveDraft(false))) return;
      const response = await workflowV2Repository.publish(workflow.id);
      if (response.code !== API_SUCCESS_CODE || !response.data) {
        message.error(response.message || '发布 Workflow V2 失败');
        return;
      }
      const publishedVersion = response.data.version;
      setWorkflow((current) =>
        current
          ? {
              ...current,
              state: 'PUBLISHED',
              currentVersion: publishedVersion,
            }
          : current,
      );
      message.success(`工作流版本 v${publishedVersion} 已发布`);
    } finally {
      setPublishing(false);
    }
  }, [saveDraft, workflow]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (editing) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveDraft();
        return;
      }
      if (event.key === 'Escape') {
        setSelectedNodeId(undefined);
        setSelectedEdgeId(undefined);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [saveDraft]);

  const onMoveEnd = useCallback<OnMoveEnd>(() => markDirty(), [markDirty]);

  if (loading && !workflow) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#f7f7f8]">
        <Spin tip="加载 Workflow V2..." />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex flex-col overflow-hidden bg-[#f7f7f8] text-[#161823]">
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#e4e7ec] bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="text"
            size="small"
            icon={<ArrowLeft size={16} />}
            onClick={() => history.push('/workflow-management')}
          >
            返回
          </Button>
          <div className="h-5 w-px bg-[#e4e7ec]" />
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--yak-brand-color-soft)] text-[var(--yak-brand-color)]">
            <Workflow size={15} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <strong className="max-w-[360px] truncate text-[13px] font-semibold text-[#161823]">
                {workflow?.name ?? 'Workflow V2'}
              </strong>
              <Tag
                bordered={false}
                className="!m-0 !bg-[#f2f4f7] !text-[10px] !text-[#667085]"
              >
                Schema V2
              </Tag>
              {dirty && (
                <span className="text-[10px] text-[#f79009]">未保存</span>
              )}
            </div>
            <span className="block text-[10px] text-[#98a2b3]">
              已发布任务资源编排 · 固定不可变任务版本
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {workflow?.currentVersion && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#667085]">
              <CheckCircle2 size={12} />
              当前 v{workflow.currentVersion}
            </span>
          )}
          <Button
            icon={<Save size={14} />}
            loading={saving}
            onClick={() => void saveDraft()}
          >
            保存草稿
          </Button>
          <Button
            type="primary"
            icon={<CloudUpload size={14} />}
            loading={publishing}
            onClick={() => void publish()}
          >
            发布
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <TaskLibraryPanel onInsert={(task) => insertTask(task)} />

        <main
          className="relative min-w-0 flex-1 overflow-hidden bg-[#f7f7f8]"
          onDragOver={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onMoveEnd={onMoveEnd}
            onNodesDelete={() => {
              setSelectedNodeId(undefined);
              setSelectedEdgeId(undefined);
              markDirty();
            }}
            onEdgesDelete={() => {
              setSelectedEdgeId(undefined);
              markDirty();
            }}
            onNodeClick={(_: unknown, node: WorkflowV2FlowNode) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId(undefined);
            }}
            onEdgeClick={(_: unknown, edge: WorkflowV2FlowEdge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(undefined);
            }}
            onPaneClick={() => {
              setSelectedNodeId(undefined);
              setSelectedEdgeId(undefined);
            }}
            minZoom={0.25}
            maxZoom={2}
            deleteKeyCode={['Backspace', 'Delete']}
            selectionOnDrag
            selectionMode={SelectionMode.Partial}
            multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
            defaultEdgeOptions={{
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
            }}
            connectionLineStyle={{
              stroke: 'var(--yak-brand-color)',
              strokeWidth: 1.8,
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1.1}
              color="#d7dce3"
            />
            <MiniMap
              pannable
              zoomable
              className="!border !border-[#e4e7ec] !bg-white"
            />
            <Controls
              showInteractive={false}
              className="!overflow-hidden !rounded-lg !border !border-[#e4e7ec] !shadow-[0_4px_14px_rgba(16,24,40,0.08)]"
            />
          </ReactFlow>

          <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-[#e4e7ec] bg-white/92 px-3 py-2 text-[10px] leading-4 text-[#667085] shadow-[0_4px_14px_rgba(16,24,40,0.06)] backdrop-blur">
            从左侧拖入已发布任务。点击节点仅选中，按 Delete 删除任务节点。
            灰色出口表示成功，红色出口表示失败。
          </div>

          {selectedEdgeId && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-[#e4e7ec] bg-white px-3 py-2 shadow-[0_7px_20px_rgba(16,24,40,0.10)]">
              <span className="text-[10px] text-[#667085]">已选择连线</span>
              <Button
                danger
                type="text"
                size="small"
                icon={<Trash2 size={13} />}
                onClick={() => removeEdge(selectedEdgeId)}
              >
                删除
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const WorkflowV2DesignerPage = () => {
  const params = useParams<{ id: string }>();
  const createMode = params.id === 'create';

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div style={BRAND_CSS_VARIABLES}>
        {createMode ? (
          <CreateWorkflowV2 />
        ) : (
          <ReactFlowProvider>
            <WorkflowV2DesignerContent />
          </ReactFlowProvider>
        )}
      </div>
    </ConfigProvider>
  );
};

export default WorkflowV2DesignerPage;
