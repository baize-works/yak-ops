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
  applyNodeChanges,
  getOutgoers,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import WorkflowCanvasTools, { type WorkflowCanvasMode } from './canvas/WorkflowCanvasTools';
import WorkflowNodeInspector from './canvas/WorkflowNodeInspector';
import WorkflowTaskLibrary from './canvas/WorkflowTaskLibrary';
import WorkflowToolbar from './canvas/WorkflowToolbar';
import {
  WORKFLOW_NODE_HORIZONTAL_GAP,
  WORKFLOW_NODE_VERTICAL_GAP,
  WORKFLOW_NODE_WIDTH,
} from './canvas/constants';
import WorkflowConnectionLine from './canvas/edge/WorkflowConnectionLine';
import WorkflowEdge from './canvas/edge/WorkflowEdge';
import WorkflowNode from './canvas/node/WorkflowNode';
import WorkflowStartInspector from './canvas/start/WorkflowStartInspector';
import WorkflowStartNode from './canvas/start/WorkflowStartNode';
import {
  hydrateWorkflowStartConfig,
  serializeWorkflowStartContext,
} from './canvas/start/context';
import {
  WORKFLOW_START_NODE_ID,
  type WorkflowStartConfig,
  type WorkflowStartNodeData,
} from './canvas/start/types';
import type { WorkflowEdgeData, WorkflowNodeData } from './canvas/types';
import useWorkflowCanvasHistory from './canvas/useWorkflowCanvasHistory';
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

const DEFAULT_START_CONFIG: WorkflowStartConfig = {
  position: { x: 80, y: 160 },
  inputs: [],
  variables: [],
};

interface WorkflowEditorHistorySnapshot {
  nodes: Array<Node<WorkflowNodeData>>;
  edges: Array<Edge<WorkflowEdgeData>>;
  startConfig: WorkflowStartConfig;
  workflowName: string;
  workflowDescription: string;
  workflowTimeoutSeconds: number;
  failureStrategy: WorkflowFailureStrategy;
}

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
  const [failureStrategy, setFailureStrategy] = useState<WorkflowFailureStrategy>('CONTINUE_INDEPENDENT_BRANCHES');
  const [startConfig, setStartConfig] = useState<WorkflowStartConfig>(DEFAULT_START_CONFIG);
  const [startSelected, setStartSelected] = useState(false);
  const [startNodeState, setStartNodeState] = useState<Node<WorkflowStartNodeData>>({
    id: WORKFLOW_START_NODE_ID,
    type: 'start',
    position: DEFAULT_START_CONFIG.position,
    selected: false,
    deletable: false,
    data: {
      label: '开始',
      inputs: [],
    },
  });
  const [hoveredNodeId, setHoveredNodeId] = useState<string>();
  const [controlMode, setControlMode] = useState<WorkflowCanvasMode>('pointer');
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdgeData>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const nodeTypes = useMemo(() => ({ workflow: WorkflowNode, start: WorkflowStartNode }), []);
  const edgeTypes = useMemo(() => ({ workflow: WorkflowEdge }), []);
  const selectedNode = useMemo(() => nodes.find((node) => node.selected), [nodes]);
  const syncTasks = useMemo(() => tasks.filter((task) => task.type === 'SYNC'), [tasks]);
  const locked = definition?.status === 'ONLINE';

  const rootNodes = useMemo(() => {
    const targets = new Set(edges.map((edge) => edge.target));
    return nodes.filter((node) => !targets.has(node.id));
  }, [edges, nodes]);

  const historySnapshot = useMemo<WorkflowEditorHistorySnapshot>(() => ({
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: { ...node.position },
      data: { ...node.data },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
    })),
    startConfig: {
      ...startConfig,
      position: { ...startConfig.position },
      inputs: startConfig.inputs.map((item) => ({ ...item })),
      variables: startConfig.variables.map((item) => ({ ...item })),
    },
    workflowName,
    workflowDescription,
    workflowTimeoutSeconds,
    failureStrategy,
  }), [
    edges,
    failureStrategy,
    nodes,
    startConfig,
    workflowDescription,
    workflowName,
    workflowTimeoutSeconds,
  ]);

  const restoreHistorySnapshot = useCallback((snapshot: WorkflowEditorHistorySnapshot) => {
    setWorkflowName(snapshot.workflowName);
    setWorkflowDescription(snapshot.workflowDescription);
    setWorkflowTimeoutSeconds(snapshot.workflowTimeoutSeconds);
    setFailureStrategy(snapshot.failureStrategy);
    setStartConfig(snapshot.startConfig);
    setStartSelected(false);
    setStartNodeState((current) => ({
      ...current,
      position: snapshot.startConfig.position,
      selected: false,
      dragging: false,
    }));
    setNodes(snapshot.nodes.map((node) => ({ ...node, selected: false, dragging: false })));
    setEdges(snapshot.edges.map((edge) => ({ ...edge, selected: false })));
  }, [setEdges, setNodes]);

  const {
    entries: historyEntries,
    currentIndex: currentHistoryIndex,
    canUndo,
    canRedo,
    mark: markHistory,
    undo: undoHistory,
    redo: redoHistory,
    jumpTo: jumpToHistory,
    clear: clearHistory,
  } = useWorkflowCanvasHistory({
    snapshot: historySnapshot,
    historyKey: id,
    enabled: !loading,
    onRestore: restoreHistorySnapshot,
  });

  const hydrateDefinition = useCallback((value: WorkflowDefinition, taskList: WorkflowTaskDefinition[]) => {
    const taskMap = new Map(taskList.map((task) => [task.id, task]));
    const hydratedStartConfig = hydrateWorkflowStartConfig(value.input || {});
    setDefinition(value);
    setWorkflowName(value.name);
    setWorkflowDescription(value.description || '');
    setWorkflowTimeoutSeconds(value.workflowTimeoutSeconds || 0);
    setFailureStrategy(value.failureStrategy || 'CONTINUE_INDEPENDENT_BRANCHES');
    setStartConfig(hydratedStartConfig);
    setStartSelected(false);
    setControlMode('pointer');
    setStartNodeState((current) => ({
      ...current,
      position: hydratedStartConfig.position,
      selected: false,
      dragging: false,
    }));
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

  const handleControlModeChange = useCallback((mode: WorkflowCanvasMode) => {
    if (locked) return;
    setControlMode(mode);
    if (mode === 'hand') {
      setStartSelected(false);
      setNodes((current) => current.map((node) =>
        node.selected ? { ...node, selected: false } : node));
    }
  }, [locked, setNodes]);

  const handleConnect = (connection: Connection) => {
    if (locked) return;
    if (connection.source === WORKFLOW_START_NODE_ID) {
      if (!connection.target) return;
      const hasTaskPredecessor = edges.some((edge) => edge.target === connection.target);
      if (hasTaskPredecessor) {
        message.warning('开始节点只能连接没有前置任务的根节点');
      }
      return;
    }
    markHistory('节点已连接');
    setEdges((current) => addEdge({ ...connection, type: 'workflow' }, current));
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
    markHistory(`${task.name} 节点已添加`);
    setStartSelected(false);
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
    markHistory(`${task.name} 节点已插入`);
    setStartSelected(false);
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
  }, [edges, locked, markHistory, nodes, setEdges, setNodes, syncTasks]);

  const handleAppendTask = useCallback((sourceNodeId: string, taskId: string) => {
    if (locked) return;
    const task = syncTasks.find((item) => item.id === taskId);
    const sourceNode = nodes.find((node) => node.id === sourceNodeId);
    if (!task || !sourceNode) return;

    const outgoers = getOutgoers(sourceNode, nodes, edges)
      .sort((left, right) => left.position.y - right.position.y);
    const lastOutgoer = outgoers[outgoers.length - 1];
    const sourceWidth = sourceNode.width ?? WORKFLOW_NODE_WIDTH;
    const fallbackHeight = sourceNode.height ?? 96;
    const sequence = sequenceRef.current++;
    const nodeId = `task-${Date.now()}-${sequence}`;
    const position = lastOutgoer
      ? {
          x: lastOutgoer.position.x,
          y: lastOutgoer.position.y
            + (lastOutgoer.height ?? fallbackHeight)
            + WORKFLOW_NODE_VERTICAL_GAP,
        }
      : {
          x: sourceNode.position.x + sourceWidth + WORKFLOW_NODE_HORIZONTAL_GAP,
          y: sourceNode.position.y,
        };

    markHistory(`${task.name} 节点已添加`);
    setStartSelected(false);
    setNodes((current) => [
      ...current.map((node) => ({ ...node, selected: false })),
      {
        id: nodeId,
        type: 'workflow',
        selected: true,
        position,
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
  }, [edges, locked, markHistory, nodes, setEdges, setNodes, syncTasks]);

  const handleAppendFromStart = useCallback((_startNodeId: string, taskId: string) => {
    if (locked) return;
    const task = syncTasks.find((item) => item.id === taskId);
    if (!task) return;

    const taskTargets = new Set(edges.map((edge) => edge.target));
    const currentRoots = nodes
      .filter((node) => !taskTargets.has(node.id))
      .sort((left, right) => left.position.y - right.position.y);
    const lastRoot = currentRoots[currentRoots.length - 1];
    const sequence = sequenceRef.current++;
    const nodeId = `task-${Date.now()}-${sequence}`;
    const position = lastRoot
      ? {
          x: lastRoot.position.x,
          y: lastRoot.position.y + (lastRoot.height ?? 72) + WORKFLOW_NODE_VERTICAL_GAP,
        }
      : {
          x: startConfig.position.x + WORKFLOW_NODE_WIDTH + WORKFLOW_NODE_HORIZONTAL_GAP,
          y: startConfig.position.y,
        };

    markHistory(`${task.name} 节点已添加`);
    setStartSelected(false);
    setNodes((current) => [
      ...current.map((node) => ({ ...node, selected: false })),
      {
        id: nodeId,
        type: 'workflow',
        selected: true,
        position,
        data: createNodeData(task),
      },
    ]);
  }, [edges, locked, markHistory, nodes, setNodes, startConfig.position.x, startConfig.position.y, syncTasks]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    if (locked) return;
    const sourceNode = nodes.find((node) => node.id === nodeId);
    if (!sourceNode) return;
    const sequence = sequenceRef.current++;
    const duplicatedId = `task-${Date.now()}-${sequence}`;
    markHistory(`${sourceNode.data.label} 节点已复制`);
    setStartSelected(false);
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
  }, [locked, markHistory, nodes, setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (locked || nodeId === WORKFLOW_START_NODE_ID) return;
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
        markHistory(`${node.data.label} 节点已删除`);
        setNodes((current) => current.filter((item) => item.id !== nodeId));
        setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      },
    });
  }, [locked, markHistory, nodes, setEdges, setNodes]);

  const handleCanvasNodesChange = useCallback((changes: NodeChange[]) => {
    const startChanges = changes.filter((change) => change.id === WORKFLOW_START_NODE_ID);
    const taskChanges = changes.filter((change) => change.id !== WORKFLOW_START_NODE_ID);

    if (startChanges.length) {
      const safeStartChanges = startChanges.filter((change) => change.type !== 'remove');
      if (safeStartChanges.length) {
        setStartNodeState((current) => {
          const [next] = applyNodeChanges(safeStartChanges, [current]);
          return next
            ? {
                ...next,
                id: WORKFLOW_START_NODE_ID,
                type: 'start',
                deletable: false,
              }
            : current;
        });
      }

      startChanges.forEach((change) => {
        if (change.type === 'position' && change.position && !locked) {
          setStartConfig((current) => ({ ...current, position: change.position! }));
        }
        if (change.type === 'select') setStartSelected(change.selected);
      });
    }

    const removedTask = taskChanges.find((change) => change.type === 'remove');
    if (removedTask) {
      const removedNode = nodes.find((node) => node.id === removedTask.id);
      markHistory(`${removedNode?.data.label || '任务'} 节点已删除`);
    }
    if (taskChanges.some((change) => change.type === 'select' && change.selected)) {
      setStartSelected(false);
    }
    if (taskChanges.length) onNodesChange(taskChanges);
  }, [locked, markHistory, nodes, onNodesChange]);

  const handleCanvasEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (changes.some((change) => change.type === 'remove')) {
      markHistory('节点连接已断开');
    }
    onEdgesChange(changes);
  }, [markHistory, onEdgesChange]);

  const handleNodeMouseEnter = useCallback<NodeMouseHandler>((_, node) => {
    setHoveredNodeId(node.id);
  }, []);

  const handleNodeMouseLeave = useCallback<NodeMouseHandler>(() => {
    setHoveredNodeId(undefined);
  }, []);

  const taskOptions = useMemo(() => syncTasks.map((task) => ({
    id: task.id,
    label: task.name,
    typeLabel: task.type === 'SYNC' ? '数据同步' : task.type,
  })), [syncTasks]);

  const inspectorNextNodes = useMemo(() => {
    if (!selectedNode) return [];
    const targetIds = new Set(
      edges.filter((edge) => edge.source === selectedNode.id).map((edge) => edge.target),
    );
    return nodes
      .filter((node) => targetIds.has(node.id))
      .map((node) => ({ id: node.id, label: node.data.label, taskType: node.data.taskType }));
  }, [edges, nodes, selectedNode]);

  const startNextNodes = useMemo(() => rootNodes.map((node) => ({
    id: node.id,
    label: node.data.label,
    taskType: node.data.taskType,
  })), [rootNodes]);

  const closeNodeInspector = useCallback(() => {
    setNodes((current) => current.map((node) =>
      node.selected ? { ...node, selected: false } : node));
  }, [setNodes]);

  const closeStartInspector = useCallback(() => setStartSelected(false), []);

  const taskCanvasNodes = useMemo(() => nodes.map((node) => ({
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

  const startCanvasNode = useMemo<Node<WorkflowStartNodeData>>(() => ({
    ...startNodeState,
    id: WORKFLOW_START_NODE_ID,
    type: 'start',
    position: startConfig.position,
    selected: startSelected,
    deletable: false,
    draggable: !locked && controlMode === 'pointer',
    data: {
      label: '开始',
      locked,
      inputs: startConfig.inputs,
      appendOptions: taskOptions,
      onAppend: handleAppendFromStart,
    },
  }), [
    controlMode,
    handleAppendFromStart,
    locked,
    startConfig.inputs,
    startConfig.position,
    startNodeState,
    startSelected,
    taskOptions,
  ]);

  const canvasNodes = useMemo(() => [startCanvasNode, ...taskCanvasNodes], [startCanvasNode, taskCanvasNodes]);

  const taskCanvasEdges = useMemo(() => edges.map((edge) => ({
    ...edge,
    type: 'workflow',
    data: {
      ...edge.data,
      locked,
      connectedNodeHovered: edge.source === hoveredNodeId || edge.target === hoveredNodeId,
      insertOptions: taskOptions,
      onInsert: handleInsertTaskIntoEdge,
    },
  })), [edges, handleInsertTaskIntoEdge, hoveredNodeId, locked, taskOptions]);

  const startCanvasEdges = useMemo(() => rootNodes.map((node, index) => ({
    id: `edge-start-${node.id}-${index}`,
    source: WORKFLOW_START_NODE_ID,
    target: node.id,
    type: 'workflow',
    data: {
      locked: true,
      connectedNodeHovered: hoveredNodeId === WORKFLOW_START_NODE_ID || hoveredNodeId === node.id,
    },
  })), [hoveredNodeId, rootNodes]);

  const canvasEdges = useMemo(() => [...startCanvasEdges, ...taskCanvasEdges], [startCanvasEdges, taskCanvasEdges]);

  const updateSelectedNode = (patch: Partial<WorkflowNodeData>) => {
    if (!selectedNode || locked) return;
    markHistory(`${selectedNode.data.label} 节点配置已更新`);
    setNodes((current) => current.map((node) =>
      node.id === selectedNode.id ? { ...node, data: { ...node.data, ...patch } } : node));
  };

  const updateStartConfig = useCallback((nextConfig: WorkflowStartConfig) => {
    if (locked) return;
    markHistory('开始节点配置已更新');
    setStartConfig(nextConfig);
  }, [locked, markHistory]);

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
    input: serializeWorkflowStartContext(startConfig, {
      definitionId: id,
      workflowName: workflowName.trim(),
    }),
    workflowTimeoutSeconds,
    failureStrategy,
  });

  const saveDefinition = async (showMessage = true) => {
    if (!id) throw new Error('工作流 ID 不能为空');
    if (!workflowName.trim()) throw new Error('工作流名称不能为空');
    setSaving(true);
    try {
      const saved = await updateWorkflowDefinition(id, buildPayload());
      const hydratedStartConfig = hydrateWorkflowStartConfig(saved.input || {});
      setDefinition(saved);
      setStartConfig(hydratedStartConfig);
      setStartNodeState((current) => ({
        ...current,
        position: hydratedStartConfig.position,
      }));
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
      message.warning('请先添加至少一个任务节点');
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
    <div className="flex h-[calc(100vh-48px)] min-h-[620px] overflow-hidden" style={{ backgroundColor: '#F2F4F7' }}>
      <WorkflowTaskLibrary tasks={syncTasks} loading={tasksLoading} locked={locked} onDragStart={handleDragStart} />
      <section className="flex min-w-0 flex-1 flex-col">
        <WorkflowToolbar
          definition={definition}
          name={workflowName}
          description={workflowDescription}
          workflowTimeoutSeconds={workflowTimeoutSeconds}
          failureStrategy={failureStrategy}
          nodesCount={nodes.length + 1}
          edgesCount={edges.length + rootNodes.length}
          locked={locked}
          saving={saving}
          statusAction={statusAction}
          onNameChange={(value) => {
            markHistory('工作流名称已修改');
            setWorkflowName(value);
          }}
          onDescriptionChange={(value) => {
            markHistory('工作流描述已修改');
            setWorkflowDescription(value);
          }}
          onWorkflowTimeoutChange={(value) => {
            markHistory('工作流超时已修改');
            setWorkflowTimeoutSeconds(value);
          }}
          onFailureStrategyChange={(value) => {
            markHistory('工作流失败策略已修改');
            setFailureStrategy(value);
          }}
          onClear={() => {
            if (!locked) {
              markHistory('画布任务已清空');
              setNodes([]);
              setEdges([]);
              setStartSelected(true);
            }
          }}
          onSave={() => void handleSave()}
          onOnline={() => void handleOnline()}
          onOffline={() => void handleOffline()}
        />
        <div ref={wrapperRef} className="relative min-h-0 flex-1 bg-[#f2f4f7]" onDrop={handleDrop}>
          {startSelected ? (
            <WorkflowStartInspector
              definitionId={id}
              workflowName={workflowName}
              config={startConfig}
              locked={locked}
              nextNodes={startNextNodes}
              appendOptions={taskOptions}
              onChange={updateStartConfig}
              onClose={closeStartInspector}
              onAppend={(taskId) => handleAppendFromStart(WORKFLOW_START_NODE_ID, taskId)}
            />
          ) : selectedNode ? (
            <WorkflowNodeInspector
              node={selectedNode}
              locked={locked}
              definitionId={id}
              nextNodes={inspectorNextNodes}
              appendOptions={taskOptions}
              onChange={updateSelectedNode}
              onClose={closeNodeInspector}
              onDuplicate={() => handleDuplicateNode(selectedNode.id)}
              onDelete={() => handleDeleteNode(selectedNode.id)}
              onAppend={(taskId) => handleAppendTask(selectedNode.id, taskId)}
            />
          ) : null}
          <ReactFlow
            nodes={canvasNodes}
            edges={canvasEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionLineComponent={WorkflowConnectionLine}
            onNodesChange={handleCanvasNodesChange}
            onEdgesChange={handleCanvasEdgesChange}
            onConnect={handleConnect}
            onNodeDragStart={(_, node) => markHistory(`${node.data.label || '任务'} 节点移动`)}
            onNodeClick={(_, node) => {
              if (controlMode === 'hand') return;
              if (node.id === WORKFLOW_START_NODE_ID) {
                setStartSelected(true);
                setNodes((current) => current.map((item) => item.selected ? { ...item, selected: false } : item));
              } else {
                setStartSelected(false);
              }
            }}
            onPaneClick={() => {
              if (controlMode === 'hand') return;
              setStartSelected(false);
              closeNodeInspector();
            }}
            onNodeMouseEnter={handleNodeMouseEnter}
            onNodeMouseLeave={handleNodeMouseLeave}
            onInit={setReactFlowInstance}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = locked ? 'none' : 'move';
            }}
            panOnDrag={controlMode === 'hand'}
            selectionOnDrag={controlMode === 'pointer'}
            nodesDraggable={!locked && controlMode === 'pointer'}
            nodesConnectable={!locked && controlMode === 'pointer'}
            elementsSelectable={controlMode === 'pointer'}
            fitView
            deleteKeyCode={locked || controlMode === 'hand' ? null : ['Backspace', 'Delete']}
            defaultEdgeOptions={{ type: 'workflow' }}
          >
            <Background gap={[14, 14]} size={2} color="#e6e7ef" />
            <Controls position="bottom-right" showInteractive={false} />
            <MiniMap pannable zoomable className="!border !border-[#e8e9ec] !bg-white" />
          </ReactFlow>

          <WorkflowCanvasTools
            mode={controlMode}
            locked={Boolean(locked)}
            historyEntries={historyEntries}
            currentHistoryIndex={currentHistoryIndex}
            canUndo={canUndo}
            canRedo={canRedo}
            onModeChange={handleControlModeChange}
            onUndo={undoHistory}
            onRedo={redoHistory}
            onJumpToHistory={jumpToHistory}
            onClearHistory={clearHistory}
          />
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
