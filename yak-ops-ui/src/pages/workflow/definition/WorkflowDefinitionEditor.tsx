import {
  getWorkflowTasks,
  type WorkflowFailureStrategy,
  type WorkflowTaskDefinition,
} from '@/services/workflow';
import {
  getWorkflowDefinition,
  offlineWorkflowDefinition,
  onlineWorkflowDefinition,
  updateWorkflowDefinition,
  type WorkflowDefinition,
} from '@/services/workflow/definitions';
import { history, useParams } from '@umijs/max';
import { Modal, Spin, message } from 'antd';
import type { DragEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  type Connection,
  type Edge,
  type NodeMouseHandler,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import WorkflowNodeInspector from './canvas/WorkflowNodeInspector';
import WorkflowTaskLibrary from './canvas/WorkflowTaskLibrary';
import WorkflowToolbar from './canvas/WorkflowToolbar';
import WorkflowConnectionLine from './canvas/edge/WorkflowConnectionLine';
import WorkflowEdge from './canvas/edge/WorkflowEdge';
import WorkflowNode from './canvas/node/WorkflowNode';
import type { WorkflowEdgeData, WorkflowNodeData } from './canvas/types';
import 'reactflow/dist/style.css';

const parseObject = <T extends Record<string, unknown>>(raw: string, label: string): T => {
  const value = raw.trim() ? JSON.parse(raw) : {};
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(`${label}必须是 JSON 对象`);
  }
  return value as T;
};

const createNodeData = (task: WorkflowTaskDefinition): WorkflowNodeData => ({
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
});

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
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdgeData>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const nodeTypes = useMemo(() => ({ workflow: WorkflowNode }), []);
  const edgeTypes = useMemo(() => ({ workflow: WorkflowEdge }), []);
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
      type: 'workflow',
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
        const [taskList, detail] = await Promise.all([getWorkflowTasks(), getWorkflowDefinition(id)]);
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
    if (!locked) setEdges((current) => addEdge({ ...connection, type: 'workflow' }, current));
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
    const sequence = sequenceRef.current++;
    setNodes((current) => [...current, {
      id: `task-${Date.now()}-${sequence}`,
      type: 'workflow',
      position: reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      }),
      data: createNodeData(task),
    }]);
  };

  const handleInsertTaskIntoEdge = useCallback((edgeId: string, source: string, target: string, taskId: string) => {
    if (locked) return;
    const task = syncTasks.find((item) => item.id === taskId);
    const sourceNode = nodes.find((node) => node.id === source);
    const targetNode = nodes.find((node) => node.id === target);
    const sourceEdge = edges.find((edge) => edge.id === edgeId);
    if (!task || !sourceNode || !targetNode || !sourceEdge) return;

    const sequence = sequenceRef.current++;
    const nodeId = `task-${Date.now()}-${sequence}`;
    setNodes((current) => [
      ...current.map((node) => ({ ...node, selected: false })),
      {
        id: nodeId,
        type: 'workflow',
        selected: true,
        position: {
          x: (sourceNode.position.x + targetNode.position.x) / 2,
          y: (sourceNode.position.y + targetNode.position.y) / 2,
        },
        data: createNodeData(task),
      },
    ]);
    setEdges((current) => [
      ...current.filter((edge) => edge.id !== edgeId),
      {
        id: `edge-${source}-${nodeId}-${sequence}`,
        source,
        sourceHandle: sourceEdge.sourceHandle,
        target: nodeId,
        type: 'workflow',
      },
      {
        id: `edge-${nodeId}-${target}-${sequence}`,
        source: nodeId,
        target,
        targetHandle: sourceEdge.targetHandle,
        type: 'workflow',
      },
    ]);
  }, [edges, locked, nodes, setEdges, setNodes, syncTasks]);

  const handleAppendTask = useCallback((sourceNodeId: string, taskId: string) => {
    if (locked) return;
    const task = syncTasks.find((item) => item.id === taskId);
    const sourceNode = nodes.find((node) => node.id === sourceNodeId);
    if (!task || !sourceNode) return;

    const sequence = sequenceRef.current++;
    const nodeId = `task-${Date.now()}-${sequence}`;
    const outgoingCount = edges.filter((edge) => edge.source === sourceNodeId).length;

    setNodes((current) => [
      ...current.map((node) => ({ ...node, selected: false })),
      {
        id: nodeId,
        type: 'workflow',
        selected: true,
        position: {
          x: sourceNode.position.x + 320,
          y: sourceNode.position.y + outgoingCount * 120,
        },
        data: createNodeData(task),
      },
    ]);
    setEdges((current) => [
      ...current,
      {
        id: `edge-${sourceNodeId}-${nodeId}-${sequence}`,
        source: sourceNodeId,
        target: nodeId,
        type: 'workflow',
      },
    ]);
  }, [edges, locked, nodes, setEdges, setNodes, syncTasks]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    if (locked) return;
    const sourceNode = nodes.find((node) => node.id === nodeId);
    if (!sourceNode) return;

    const sequence = sequenceRef.current++;
    const duplicatedId = `task-${Date.now()}-${sequence}`;
    setNodes((current) => [
      ...current.map((node) => ({ ...node, selected: false })),
      {
        ...sourceNode,
        id: duplicatedId,
        selected: true,
        position: {
          x: sourceNode.position.x + 36,
          y: sourceNode.position.y + 36,
        },
        data: { ...sourceNode.data },
      },
    ]);
  }, [locked, nodes, setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (locked) return;
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;

    Modal.confirm({
      centered: true,
      title: '删除节点？',
      content: `即将删除「${node.data.label}」及其关联连线。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        setNodes((current) => current.filter((item) => item.id !== nodeId));
        setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      },
    });
  }, [locked, nodes, setEdges, setNodes]);

  const handleNodeMouseEnter = useCallback<NodeMouseHandler>((_, node) => {
    setEdges((current) => current.map((edge) => {
      if (edge.source !== node.id && edge.target !== node.id) return edge;
      return {
        ...edge,
        data: {
          ...edge.data,
          connectedNodeHovered: true,
        },
      };
    }));
  }, [setEdges]);

  const handleNodeMouseLeave = useCallback<NodeMouseHandler>(() => {
    setEdges((current) => current.map((edge) => {
      if (!edge.data?.connectedNodeHovered) return edge;
      return {
        ...edge,
        data: {
          ...edge.data,
          connectedNodeHovered: false,
        },
      };
    }));
  }, [setEdges]);

  const taskOptions = useMemo(() => syncTasks.map((task) => ({
    id: task.id,
    label: task.name,
    typeLabel: task.type === 'SYNC' ? '数据同步' : task.type,
  })), [syncTasks]);

  const canvasNodes = useMemo(() => nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      locked,
      appendOptions: taskOptions,
      onAppend: handleAppendTask,
      onDuplicate: handleDuplicateNode,
      onDelete: handleDeleteNode,
    },
  })), [handleAppendTask, handleDeleteNode, handleDuplicateNode, locked, nodes, taskOptions]);

  const canvasEdges = useMemo(() => edges.map((edge) => ({
    ...edge,
    type: 'workflow',
    data: {
      ...edge.data,
      locked,
      insertOptions: taskOptions,
      onInsert: handleInsertTaskIntoEdge,
    },
  })), [edges, handleInsertTaskIntoEdge, locked, taskOptions]);

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
      setDefinition(await onlineWorkflowDefinition(id));
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
      setDefinition(await offlineWorkflowDefinition(id));
      message.success('工作流已下线，可以继续编辑');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '工作流下线失败');
    } finally {
      setStatusAction(false);
    }
  };

  if (loading) {
    return <div className="flex h-[calc(100vh-48px)] items-center justify-center bg-white"><Spin /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-48px)] min-h-[620px] overflow-hidden " style={{backgroundColor: "#F2F4F7"}}>
      <WorkflowTaskLibrary tasks={syncTasks} loading={tasksLoading} locked={locked} onDragStart={handleDragStart} />
      <section className="flex min-w-0 flex-1 flex-col">
        <WorkflowToolbar
          definition={definition}
          name={workflowName}
          description={workflowDescription}
          workflowInputText={workflowInputText}
          workflowTimeoutSeconds={workflowTimeoutSeconds}
          failureStrategy={failureStrategy}
          nodesCount={nodes.length}
          edgesCount={edges.length}
          locked={locked}
          saving={saving}
          statusAction={statusAction}
          onNameChange={setWorkflowName}
          onDescriptionChange={setWorkflowDescription}
          onWorkflowInputChange={setWorkflowInputText}
          onWorkflowTimeoutChange={setWorkflowTimeoutSeconds}
          onFailureStrategyChange={setFailureStrategy}
          onClear={() => { if (!locked) { setNodes([]); setEdges([]); } }}
          onSave={() => void handleSave()}
          onOnline={() => void handleOnline()}
          onOffline={() => void handleOffline()}
        />
        <div ref={wrapperRef} className="relative min-h-0 flex-1" onDrop={handleDrop}>
          {selectedNode ? <WorkflowNodeInspector node={selectedNode} locked={locked} onChange={updateSelectedNode} /> : null}
          <ReactFlow
            nodes={canvasNodes}
            edges={canvasEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionLineComponent={WorkflowConnectionLine}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeMouseEnter={handleNodeMouseEnter}
            onNodeMouseLeave={handleNodeMouseLeave}
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
            defaultEdgeOptions={{ type: 'workflow' }}
          >
            <Background gap={20} size={1} color="#e4e7ec" />
            <Controls position="bottom-right" />
            <MiniMap pannable zoomable className="!border !border-[#e8e9ec] !bg-white" />
          </ReactFlow>
        </div>
      </section>
    </div>
  );
};

const WorkflowDefinitionEditor = () => (
  <ReactFlowProvider>
    <WorkflowDefinitionContent />
  </ReactFlowProvider>
);

export default WorkflowDefinitionEditor;
