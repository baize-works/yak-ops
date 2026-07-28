import { history, useParams } from '@umijs/max';
import {
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Spin,
} from 'antd';
import {
  ArrowLeft,
  Check,
  CircleDot,
  Save,
  Settings2,
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
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from 'reactflow';
import { useCallback, useEffect, useMemo, useState } from 'react';
import 'reactflow/dist/style.css';
import NodePanel from './components/NodePanel';
import NodeSelector from './components/NodeSelector';
import WorkflowNode from './components/WorkflowNode';
import './index.less';
import { fetchWorkflowDetail, updateWorkflow } from '../service';
import type {
  WorkflowDefinitionRecord,
  WorkflowFailureStrategy,
  WorkflowFlowEdge,
  WorkflowFlowNode,
  WorkflowNodeData,
  WorkflowNodeType,
} from '../types';

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const defaultNodeData = (
  type: WorkflowNodeType,
  index: number,
): WorkflowNodeData => {
  const defaults = {
    NOOP: {
      name: `基础节点 ${index}`,
      description: '用于开始、结束或流程占位。',
      config: {},
    },
    HTTP: {
      name: `HTTP 请求 ${index}`,
      description: '调用外部 REST API。',
      config: {
        method: 'GET',
        url: '',
        body: '',
        requestTimeoutSeconds: 60,
      },
    },
    SHELL: {
      name: `Shell 脚本 ${index}`,
      description: '在工作流执行主机上运行命令。',
      config: {
        command: '',
        workDirectory: '',
      },
    },
  }[type];

  return {
    ...defaults,
    taskType: type,
    retryTimes: 0,
    retryIntervalSeconds: 0,
    timeoutSeconds: 0,
    enabled: true,
    idempotent: type === 'NOOP',
    retryOnRestart: type === 'NOOP',
  };
};

interface WorkflowSettingsValues {
  name: string;
  description?: string;
  failureStrategy: WorkflowFailureStrategy;
  maxParallelism: number;
}

const WorkflowDesignerContent = () => {
  const params = useParams<{ id: string }>();
  const workflowId = params.id;
  const reactFlow = useReactFlow();
  const [settingsForm] = Form.useForm<WorkflowSettingsValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowDefinitionRecord>();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [nodes, setNodes, onNodesChangeBase] =
    useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState([]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId),
    [nodes, selectedNodeId],
  );

  const loadWorkflow = useCallback(async () => {
    if (!workflowId) {
      return;
    }
    try {
      setLoading(true);
      const response = await fetchWorkflowDetail(workflowId);
      if (response.code !== 0 || !response.data) {
        message.error(response.message || '加载工作流失败');
        return;
      }

      const detail = response.data;
      const flowNodes: WorkflowFlowNode[] = (detail.draft?.nodes || []).map(
        (node, index) => ({
          id: node.key,
          type: 'workflowNode',
          position: {
            x: node.positionX ?? 120 + index * 280,
            y: node.positionY ?? 180,
          },
          data: {
            name: node.name,
            description: node.description,
            taskType: node.type,
            config: node.config || {},
            retryTimes: node.retryTimes || 0,
            retryIntervalSeconds: node.retryIntervalSeconds || 0,
            timeoutSeconds: node.timeoutSeconds || 0,
            enabled: node.enabled !== false,
            idempotent: Boolean(node.idempotent),
            retryOnRestart: Boolean(node.retryOnRestart),
          },
        }),
      );
      const flowEdges: WorkflowFlowEdge[] = (detail.draft?.edges || []).map(
        (edge, index) => ({
          id: `edge_${edge.from}_${edge.to}_${index}`,
          source: edge.from,
          target: edge.to,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        }),
      );

      setWorkflow(detail);
      setNodes(flowNodes);
      setEdges(flowEdges);
      setSelectedNodeId(undefined);
      setDirty(false);

      const viewport = detail.draft?.viewport;
      requestAnimationFrame(() => {
        if (viewport) {
          reactFlow.setViewport(viewport, { duration: 0 });
        } else if (flowNodes.length) {
          reactFlow.fitView({ padding: 0.25, duration: 0 });
        }
      });
    } finally {
      setLoading(false);
    }
  }, [reactFlow, setEdges, setNodes, workflowId]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const onNodesChange = (changes: NodeChange[]) => {
    onNodesChangeBase(changes);
    if (changes.some((change) => change.type !== 'select')) {
      setDirty(true);
    }
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    onEdgesChangeBase(changes);
    setDirty(true);
  };

  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) {
      return;
    }
    if (connection.source === connection.target) {
      message.warning('节点不能连接到自身');
      return;
    }
    setEdges((currentEdges) =>
      addEdge(
        {
          ...connection,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        },
        currentEdges,
      ),
    );
    setDirty(true);
  };

  const addNode = (type: WorkflowNodeType) => {
    const id = `node_${Date.now().toString(36)}`;
    const position = reactFlow.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const node: WorkflowFlowNode = {
      id,
      type: 'workflowNode',
      position,
      data: defaultNodeData(type, nodes.length + 1),
    };
    setNodes((currentNodes) => [...currentNodes, node]);
    setSelectedNodeId(id);
    setDirty(true);
  };

  const updateSelectedNode = (data: WorkflowNodeData) => {
    if (!selectedNodeId) {
      return;
    }
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNodeId ? { ...node, data } : node,
      ),
    );
    setDirty(true);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) {
      return;
    }
    setNodes((currentNodes) =>
      currentNodes.filter((node) => node.id !== selectedNodeId),
    );
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) =>
          edge.source !== selectedNodeId && edge.target !== selectedNodeId,
      ),
    );
    setSelectedNodeId(undefined);
    setDirty(true);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (!editing && selectedNodeId && ['Delete', 'Backspace'].includes(event.key)) {
        event.preventDefault();
        deleteSelectedNode();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveWorkflow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const saveWorkflow = async () => {
    if (!workflow || !workflowId) {
      return;
    }
    const unnamedNode = nodes.find((node) => !node.data.name.trim());
    if (unnamedNode) {
      setSelectedNodeId(unnamedNode.id);
      message.warning('节点名称不能为空');
      return;
    }

    try {
      setSaving(true);
      const viewport = reactFlow.getViewport();
      const response = await updateWorkflow(workflowId, {
        name: workflow.name,
        description: workflow.description,
        failureStrategy: workflow.failureStrategy,
        maxParallelism: workflow.maxParallelism,
        dag: {
          nodes: nodes.map((node) => ({
            key: node.id,
            name: node.data.name.trim(),
            type: node.data.taskType,
            description: node.data.description,
            positionX: node.position.x,
            positionY: node.position.y,
            config: node.data.config || {},
            retryTimes: node.data.retryTimes,
            retryIntervalSeconds: node.data.retryIntervalSeconds,
            timeoutSeconds: node.data.timeoutSeconds,
            enabled: node.data.enabled,
            idempotent: node.data.idempotent,
            retryOnRestart: node.data.retryOnRestart,
          })),
          edges: edges.map((edge) => ({
            from: edge.source,
            to: edge.target,
          })),
          viewport,
        },
      });
      if (response.code !== 0) {
        message.error(response.message || '保存工作流失败');
        return;
      }
      setDirty(false);
      message.success('工作流草稿已保存');
    } finally {
      setSaving(false);
    }
  };

  const openSettings = () => {
    if (!workflow) {
      return;
    }
    settingsForm.setFieldsValue({
      name: workflow.name,
      description: workflow.description,
      failureStrategy: workflow.failureStrategy,
      maxParallelism: workflow.maxParallelism,
    });
    setSettingsOpen(true);
  };

  const applySettings = async () => {
    if (!workflow) {
      return;
    }
    const values = await settingsForm.validateFields();
    setWorkflow({ ...workflow, ...values });
    setSettingsOpen(false);
    setDirty(true);
  };

  return (
    <div className="workflow-designer-page">
      <header className="workflow-designer-header">
        <div className="workflow-designer-header__left">
          <button
            type="button"
            className="workflow-designer-icon-button"
            onClick={() => history.push('/workflow-management')}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="workflow-designer-header__title-row">
              <h1>{workflow?.name || '工作流设计器'}</h1>
              <span className={`workflow-designer-save-state ${dirty ? 'is-dirty' : ''}`}>
                {dirty ? <CircleDot size={13} /> : <Check size={13} />}
                {dirty ? '有未保存修改' : '已保存'}
              </span>
            </div>
            <span>{workflow?.code || '-'}</span>
          </div>
        </div>

        <div className="workflow-designer-header__actions">
          <button
            type="button"
            className="workflow-designer-secondary-button"
            onClick={openSettings}
          >
            <Settings2 size={16} />
            工作流设置
          </button>
          <button
            type="button"
            className="workflow-designer-save-button"
            onClick={() => void saveWorkflow()}
            disabled={saving || loading}
          >
            <Save size={16} />
            {saving ? '保存中...' : '保存草稿'}
          </button>
        </div>
      </header>

      <main className="workflow-designer-main">
        <Spin spinning={loading} wrapperClassName="workflow-designer-spin">
          <div className="workflow-designer-canvas">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(undefined)}
              minZoom={0.25}
              maxZoom={2}
              fitView
              defaultEdgeOptions={{
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed },
              }}
              proOptions={{ hideAttribution: true }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={18}
                size={1.2}
              />
              <Controls position="bottom-left" showInteractive={false} />
              <MiniMap
                position="bottom-right"
                pannable
                zoomable
                nodeStrokeWidth={2}
              />
            </ReactFlow>
            <NodeSelector onAdd={addNode} />
            {selectedNode && (
              <NodePanel
                node={selectedNode}
                onChange={updateSelectedNode}
                onDelete={deleteSelectedNode}
                onClose={() => setSelectedNodeId(undefined)}
              />
            )}
          </div>
        </Spin>
      </main>

      <Drawer
        title="工作流设置"
        open={settingsOpen}
        width={420}
        onClose={() => setSettingsOpen(false)}
        extra={
          <button
            type="button"
            className="workflow-designer-save-button is-compact"
            onClick={() => void applySettings()}
          >
            应用
          </button>
        }
      >
        <Form form={settingsForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label="工作流名称"
            name="name"
            rules={[{ required: true, message: '请输入工作流名称' }]}
          >
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={4} maxLength={1000} showCount />
          </Form.Item>
          <Form.Item label="失败策略" name="failureStrategy">
            <Select
              options={[
                { label: '失败即停止', value: 'FAIL_FAST' },
                { label: '继续后续分支', value: 'CONTINUE' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="最大并行度"
            name="maxParallelism"
            rules={[{ required: true, message: '请输入最大并行度' }]}
          >
            <InputNumber min={1} max={256} className="w-full" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

const WorkflowDesignerPage = () => (
  <ReactFlowProvider>
    <WorkflowDesignerContent />
  </ReactFlowProvider>
);

export default WorkflowDesignerPage;
