import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_CSS_VARIABLES, BRAND_THEME } from '@/styles/brand';
import { history, useParams } from '@umijs/max';
import { ConfigProvider, message, Modal, Spin } from 'antd';
import { Sparkles } from 'lucide-react';
import {
  addEdge,
  Background,
  BackgroundVariant,
  MarkerType,
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
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import 'reactflow/dist/style.css';
import { fetchWorkflowDetail, updateWorkflow } from '../service';
import type {
  WorkflowContextMenuState,
  WorkflowDefinitionRecord,
  WorkflowDesignerState,
  WorkflowFlowEdge,
  WorkflowFlowNode,
  WorkflowNodeData,
  WorkflowNodeType,
  WorkflowPanelType,
  WorkflowSnapshot,
  WorkflowVariable,
} from '../types';
import CanvasOperator, {
  type CanvasInteractionMode,
  type CanvasLibraryGroup,
  type CanvasLibraryItem,
} from './components/operator/CanvasOperator';
import HistoryPanel from './components/HistoryPanel';
import NodeIcon from './components/node/NodeIcon';
import NodePanel from './components/NodePanel';
import RunPanel from './components/RunPanel';
import VariableInspectPanel from './components/VariableInspectPanel';
import VariablePanel from './components/VariablePanel';
import WorkflowContextMenu from './components/WorkflowContextMenu';
import WorkflowCreateGuide from './components/WorkflowCreateGuide';
import WorkflowHeader from './components/WorkflowHeader';
import WorkflowNode from './components/WorkflowNode';
import WorkflowSettingsPanel from './components/WorkflowSettingsPanel';
import {
  CATEGORY_LABELS,
  WORKFLOW_NODE_CATALOG,
  createNodeData,
  getNodeMeta,
  resolveVisualNodeType,
} from './constants';
import { useWorkflowHistory } from './hooks/useWorkflowHistory';
import './index.less';

const nodeTypes = { workflowNode: WorkflowNode };

interface ClipboardState {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
}

type CanvasPoint = {
  x: number;
  y: number;
};

const CANVAS_NODE_GROUPS: CanvasLibraryGroup[] = (
  ['control', 'action'] as const
).map((category) => ({
  key: category,
  title: CATEGORY_LABELS[category],
  items: WORKFLOW_NODE_CATALOG.filter(
    (item) => item.category === category,
  ).map((item) => ({
    key: item.type,
    nodeType: item.type,
    label: item.title,
    description: item.description,
    keywords: [item.title, item.description, item.type],
    icon: <NodeIcon type={item.type} size={14} />,
    iconColor: getNodeMeta(item.type).color,
  })),
}));

const cloneNodes = (nodes: WorkflowFlowNode[]) =>
  nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: {
      ...node.data,
      config: JSON.parse(JSON.stringify(node.data.config || {})),
    },
  }));

const buildStorageKey = (workflowId: string, suffix: string) =>
  `yak-ops:workflow:${workflowId}:${suffix}`;

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const uniqueNodeId = (prefix = 'node') =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const WorkflowDesignerContent = () => {
  const params = useParams<{ id: string }>();
  const workflowId = params.id || '';
  const createMode = workflowId === 'create';
  const reactFlow = useReactFlow<WorkflowNodeData>();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const clipboardRef = useRef<ClipboardState | undefined>(undefined);

  const [loading, setLoading] = useState(!createMode);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowDefinitionRecord>();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [activePanel, setActivePanel] = useState<WorkflowPanelType>(null);
  const [nodeLibraryOpen, setNodeLibraryOpen] = useState(false);
  const [interactionMode, setInteractionMode] =
    useState<CanvasInteractionMode>('select');
  const [libraryInsertPosition, setLibraryInsertPosition] =
    useState<CanvasPoint>();
  const [quickAddSourceId, setQuickAddSourceId] = useState<string>();
  const [pendingNodeType, setPendingNodeType] =
    useState<WorkflowNodeType>();
  const [pendingNodePointer, setPendingNodePointer] =
    useState<CanvasPoint>();
  const [contextMenu, setContextMenu] =
    useState<WorkflowContextMenuState>();
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [variableInspectOpen, setVariableInspectOpen] = useState(false);
  const [variables, setVariables] = useState<WorkflowVariable[]>([]);
  const [environmentVariables, setEnvironmentVariables] =
    useState<WorkflowVariable[]>([]);
  const [snapshots, setSnapshots] = useState<WorkflowSnapshot[]>([]);
  const [nodes, setNodes, onNodesChangeBase] =
    useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState([]);
  const workflowHistory = useWorkflowHistory();

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId),
    [nodes, selectedNodeId],
  );

  const pendingNodeData = useMemo(
    () =>
      pendingNodeType
        ? createNodeData(pendingNodeType, nodes.length + 1)
        : undefined,
    [nodes.length, pendingNodeType],
  );

  const pendingNodeMeta = useMemo(
    () => (pendingNodeType ? getNodeMeta(pendingNodeType) : undefined),
    [pendingNodeType],
  );

  const persistWorkspace = useCallback(
    (
      nextVariables = variables,
      nextEnvironment = environmentVariables,
      nextSnapshots = snapshots,
    ) => {
      if (!workflowId || createMode) return;
      localStorage.setItem(
        buildStorageKey(workflowId, 'variables'),
        JSON.stringify(nextVariables),
      );
      localStorage.setItem(
        buildStorageKey(workflowId, 'environment'),
        JSON.stringify(nextEnvironment),
      );
      localStorage.setItem(
        buildStorageKey(workflowId, 'snapshots'),
        JSON.stringify(nextSnapshots),
      );
    },
    [createMode, environmentVariables, snapshots, variables, workflowId],
  );

  const loadWorkflow = useCallback(async () => {
    if (!workflowId || createMode) return;
    try {
      setLoading(true);
      const response = await fetchWorkflowDetail(workflowId);
      if (response.code !== API_SUCCESS_CODE || !response.data) {
        message.error(response.message || '加载工作流失败');
        return;
      }

      const detail = response.data;
      const flowNodes: WorkflowFlowNode[] = (detail.draft?.nodes || []).map(
        (node, index) => {
          const nodeType = resolveVisualNodeType(node.type, node.config);
          return {
            id: node.key,
            type: 'workflowNode',
            position: {
              x: node.positionX ?? 100 + index * 300,
              y: node.positionY ?? 220,
            },
            data: {
              title: node.name,
              description: node.description,
              nodeType,
              taskType: node.type,
              config: { ...(node.config || {}), __uiType: nodeType },
              retryTimes: node.retryTimes || 0,
              retryIntervalSeconds: node.retryIntervalSeconds || 0,
              timeoutSeconds: node.timeoutSeconds || 0,
              enabled: node.enabled !== false,
              idempotent: Boolean(node.idempotent),
              retryOnRestart: Boolean(node.retryOnRestart),
              runningStatus: 'idle',
            },
          };
        },
      );
      const flowEdges: WorkflowFlowEdge[] = (detail.draft?.edges || []).map(
        (edge, index) => ({
          id: `edge_${edge.from}_${edge.to}_${index}`,
          source: edge.from,
          target: edge.to,
          type: 'smoothstep',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed },
        }),
      );

      setWorkflow(detail);
      setNodes(flowNodes);
      setEdges(flowEdges);
      setVariables(
        readStorage(buildStorageKey(workflowId, 'variables'), []),
      );
      setEnvironmentVariables(
        readStorage(buildStorageKey(workflowId, 'environment'), []),
      );
      setSnapshots(
        readStorage(buildStorageKey(workflowId, 'snapshots'), []),
      );
      setSelectedNodeId(undefined);
      setActivePanel(null);
      setPendingNodeType(undefined);
      setPendingNodePointer(undefined);
      setDirty(false);
      workflowHistory.reset();

      const viewport = detail.draft?.viewport;
      requestAnimationFrame(() => {
        if (viewport) reactFlow.setViewport(viewport, { duration: 0 });
        else if (flowNodes.length)
          reactFlow.fitView({ padding: 0.25, duration: 0 });
      });
    } finally {
      setLoading(false);
    }
  }, [
    createMode,
    reactFlow,
    setEdges,
    setNodes,
    workflowHistory,
    workflowId,
  ]);

  useEffect(() => {
    void loadWorkflow();
  }, [loadWorkflow]);

  const markDirty = useCallback(() => setDirty(true), []);

  const recordHistory = useCallback(() => {
    workflowHistory.record(nodes, edges);
  }, [edges, nodes, workflowHistory]);

  const saveWorkflow = useCallback(async () => {
    if (!workflow || !workflowId || createMode) return;
    const invalidNode = nodes.find((node) => !node.data.title.trim());
    if (invalidNode) {
      setSelectedNodeId(invalidNode.id);
      setActivePanel('node');
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
            name: node.data.title.trim(),
            type: node.data.taskType,
            description: node.data.description,
            positionX: node.position.x,
            positionY: node.position.y,
            config: { ...node.data.config, __uiType: node.data.nodeType },
            retryTimes: node.data.retryTimes,
            retryIntervalSeconds: node.data.retryIntervalSeconds,
            timeoutSeconds: node.data.timeoutSeconds,
            enabled:
              node.data.nodeType === 'NOTE' ? false : node.data.enabled,
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
      if (response.code !== API_SUCCESS_CODE) {
        message.error(response.message || '保存工作流失败');
        return;
      }

      const snapshot: WorkflowSnapshot = {
        id: `snapshot_${Date.now()}`,
        name: `草稿快照 ${snapshots.length + 1}`,
        createdAt: new Date().toISOString(),
        nodes: cloneNodes(nodes),
        edges: edges.map((edge) => ({ ...edge })),
        viewport,
      };
      const nextSnapshots = [snapshot, ...snapshots].slice(0, 30);
      setSnapshots(nextSnapshots);
      persistWorkspace(variables, environmentVariables, nextSnapshots);
      setDirty(false);
      message.success('工作流草稿已保存');
    } finally {
      setSaving(false);
    }
  }, [
    createMode,
    edges,
    environmentVariables,
    nodes,
    persistWorkspace,
    reactFlow,
    snapshots,
    variables,
    workflow,
    workflowId,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeBase(changes);
      if (changes.some((change) => change.type !== 'select')) markDirty();
    },
    [markDirty, onNodesChangeBase],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (changes.some((change) => change.type === 'remove')) recordHistory();
      onEdgesChangeBase(changes);
      if (changes.some((change) => change.type !== 'select')) markDirty();
    },
    [markDirty, onEdgesChangeBase, recordHistory],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) {
        message.warning('节点不能连接到自身');
        return;
      }
      const duplicated = edges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target,
      );
      if (duplicated) return;

      recordHistory();
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            id: `edge_${connection.source}_${connection.target}_${Date.now()}`,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          current,
        ),
      );
      markDirty();
    },
    [edges, markDirty, recordHistory, setEdges],
  );

  const addNode = useCallback(
    (type: WorkflowNodeType, requestedPosition?: CanvasPoint) => {
      recordHistory();
      const sourceNode = quickAddSourceId
        ? nodes.find((node) => node.id === quickAddSourceId)
        : undefined;
      const position =
        requestedPosition ||
        (sourceNode
          ? { x: sourceNode.position.x + 330, y: sourceNode.position.y }
          : reactFlow.screenToFlowPosition({
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            }));
      const id = uniqueNodeId(type.toLowerCase());
      const node: WorkflowFlowNode = {
        id,
        type: 'workflowNode',
        position,
        data: createNodeData(type, nodes.length + 1),
      };

      setNodes((current) => [...current, node]);
      if (sourceNode && type !== 'NOTE') {
        setEdges((current) =>
          addEdge(
            {
              id: `edge_${sourceNode.id}_${id}_${Date.now()}`,
              source: sourceNode.id,
              target: id,
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
            },
            current,
          ),
        );
      }
      setSelectedNodeId(id);
      setActivePanel('node');
      setQuickAddSourceId(undefined);
      setLibraryInsertPosition(undefined);
      setNodeLibraryOpen(false);
      markDirty();
    },
    [
      markDirty,
      nodes,
      quickAddSourceId,
      reactFlow,
      recordHistory,
      setEdges,
      setNodes,
    ],
  );

  const cancelNodePlacement = useCallback(() => {
    setPendingNodeType(undefined);
    setPendingNodePointer(undefined);
  }, []);

  const placePendingNode = useCallback(
    (clientX: number, clientY: number) => {
      if (!pendingNodeType) return false;
      const point = reactFlow.screenToFlowPosition({ x: clientX, y: clientY });
      addNode(pendingNodeType, {
        x: point.x - 112,
        y: point.y - 64,
      });
      cancelNodePlacement();
      return true;
    },
    [addNode, cancelNodePlacement, pendingNodeType, reactFlow],
  );

  const beginNodePlacement = useCallback(
    (type: WorkflowNodeType) => {
      setPendingNodeType(type);
      setPendingNodePointer(undefined);
      setNodeLibraryOpen(false);
      setQuickAddSourceId(undefined);
      setLibraryInsertPosition(undefined);
      setContextMenu(undefined);
      setSelectedNodeId(undefined);
      setActivePanel(null);
      setInteractionMode('select');
    },
    [],
  );

  const selectCanvasLibraryItem = useCallback(
    (item: CanvasLibraryItem) => {
      if (quickAddSourceId || libraryInsertPosition) {
        addNode(item.nodeType, libraryInsertPosition);
        return;
      }

      beginNodePlacement(item.nodeType);
    },
    [
      addNode,
      beginNodePlacement,
      libraryInsertPosition,
      quickAddSourceId,
    ],
  );

  const updateSelectedNode = useCallback(
    (data: WorkflowNodeData) => {
      if (!selectedNodeId) return;
      setNodes((current) =>
        current.map((node) =>
          node.id === selectedNodeId ? { ...node, data } : node,
        ),
      );
      markDirty();
    },
    [markDirty, selectedNodeId, setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      recordHistory();
      setNodes((current) => current.filter((node) => node.id !== nodeId));
      setEdges((current) =>
        current.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId,
        ),
      );
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(undefined);
        setActivePanel(null);
      }
      markDirty();
    },
    [markDirty, recordHistory, selectedNodeId, setEdges, setNodes],
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const source = nodes.find((node) => node.id === nodeId);
      if (!source) return;
      recordHistory();
      const id = uniqueNodeId(source.data.nodeType.toLowerCase());
      const duplicate: WorkflowFlowNode = {
        ...source,
        id,
        selected: true,
        position: {
          x: source.position.x + 42,
          y: source.position.y + 42,
        },
        data: {
          ...source.data,
          title: `${source.data.title} 副本`,
          config: JSON.parse(JSON.stringify(source.data.config || {})),
          runningStatus: 'idle',
        },
      };
      setNodes((current) => [
        ...current.map((node) => ({ ...node, selected: false })),
        duplicate,
      ]);
      setSelectedNodeId(id);
      setActivePanel('node');
      markDirty();
    },
    [markDirty, nodes, recordHistory, setNodes],
  );

  const toggleNode = useCallback(
    (nodeId: string) => {
      recordHistory();
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: { ...node.data, enabled: !node.data.enabled },
              }
            : node,
        ),
      );
      markDirty();
    },
    [markDirty, recordHistory, setNodes],
  );

  const copySelection = useCallback(() => {
    const selected = nodes.filter(
      (node) => node.selected || node.id === selectedNodeId,
    );
    if (!selected.length) return;
    const selectedIds = new Set(selected.map((node) => node.id));
    clipboardRef.current = {
      nodes: cloneNodes(selected),
      edges: edges.filter(
        (edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target),
      ),
    };
    message.success(`已复制 ${selected.length} 个节点`);
  }, [edges, nodes, selectedNodeId]);

  const pasteSelection = useCallback(
    (flowPosition?: CanvasPoint) => {
      const clipboard = clipboardRef.current;
      if (!clipboard?.nodes.length) return;
      recordHistory();
      const idMap = new Map<string, string>();
      const minX = Math.min(...clipboard.nodes.map((node) => node.position.x));
      const minY = Math.min(...clipboard.nodes.map((node) => node.position.y));
      const pastedNodes = clipboard.nodes.map((node) => {
        const id = uniqueNodeId(node.data.nodeType.toLowerCase());
        idMap.set(node.id, id);
        return {
          ...node,
          id,
          selected: true,
          position: flowPosition
            ? {
                x: flowPosition.x + (node.position.x - minX),
                y: flowPosition.y + (node.position.y - minY),
              }
            : {
                x: node.position.x + 48,
                y: node.position.y + 48,
              },
          data: {
            ...node.data,
            title:
              clipboard.nodes.length === 1
                ? `${node.data.title} 副本`
                : node.data.title,
            config: JSON.parse(JSON.stringify(node.data.config || {})),
            runningStatus: 'idle' as const,
          },
        };
      });
      const pastedEdges = clipboard.edges.map((edge) => ({
        ...edge,
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        source: idMap.get(edge.source)!,
        target: idMap.get(edge.target)!,
        selected: false,
      }));
      setNodes((current) => [
        ...current.map((node) => ({ ...node, selected: false })),
        ...pastedNodes,
      ]);
      setEdges((current) => [...current, ...pastedEdges]);
      setSelectedNodeId(pastedNodes[0]?.id);
      setActivePanel(pastedNodes.length === 1 ? 'node' : null);
      markDirty();
    },
    [markDirty, recordHistory, setEdges, setNodes],
  );

  const selectAll = useCallback(() => {
    setNodes((current) =>
      current.map((node) => ({ ...node, selected: true })),
    );
    setEdges((current) =>
      current.map((edge) => ({ ...edge, selected: true })),
    );
    setSelectedNodeId(undefined);
    setActivePanel(null);
  }, [setEdges, setNodes]);

  const handleUndo = useCallback(() => {
    const frame = workflowHistory.undo(nodes, edges);
    if (!frame) return;
    setNodes(frame.nodes);
    setEdges(frame.edges);
    setSelectedNodeId(undefined);
    setActivePanel(null);
    markDirty();
  }, [edges, markDirty, nodes, setEdges, setNodes, workflowHistory]);

  const handleRedo = useCallback(() => {
    const frame = workflowHistory.redo(nodes, edges);
    if (!frame) return;
    setNodes(frame.nodes);
    setEdges(frame.edges);
    setSelectedNodeId(undefined);
    setActivePanel(null);
    markDirty();
  }, [edges, markDirty, nodes, setEdges, setNodes, workflowHistory]);

  const autoLayout = useCallback(() => {
    if (!nodes.length) return;
    recordHistory();
    const incoming = new Map<string, number>();
    const successors = new Map<string, string[]>();
    nodes.forEach((node) => {
      incoming.set(node.id, 0);
      successors.set(node.id, []);
    });
    edges.forEach((edge) => {
      if (incoming.has(edge.target))
        incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
      successors.get(edge.source)?.push(edge.target);
    });
    const queue = nodes
      .filter((node) => (incoming.get(node.id) || 0) === 0)
      .map((node) => node.id);
    const levels = new Map<string, number>();
    queue.forEach((id) => levels.set(id, 0));
    while (queue.length) {
      const id = queue.shift()!;
      for (const successor of successors.get(id) || []) {
        levels.set(
          successor,
          Math.max(
            levels.get(successor) || 0,
            (levels.get(id) || 0) + 1,
          ),
        );
        incoming.set(successor, (incoming.get(successor) || 1) - 1);
        if (incoming.get(successor) === 0) queue.push(successor);
      }
    }
    const groups = new Map<number, WorkflowFlowNode[]>();
    nodes.forEach((node) => {
      if (node.data.nodeType === 'NOTE') return;
      const level = levels.get(node.id) || 0;
      groups.set(level, [...(groups.get(level) || []), node]);
    });
    setNodes((current) =>
      current.map((node) => {
        if (node.data.nodeType === 'NOTE') return node;
        const level = levels.get(node.id) || 0;
        const siblings = groups.get(level) || [];
        const index = siblings.findIndex((item) => item.id === node.id);
        return {
          ...node,
          position: { x: 100 + level * 330, y: 100 + index * 210 },
        };
      }),
    );
    markDirty();
    requestAnimationFrame(() =>
      reactFlow.fitView({ padding: 0.2, duration: 260 }),
    );
  }, [edges, markDirty, nodes, reactFlow, recordHistory, setNodes]);

  const exportWorkflow = useCallback(() => {
    const data: WorkflowDesignerState = {
      nodes: cloneNodes(nodes),
      edges: edges.map((edge) => ({ ...edge })),
      viewport: reactFlow.getViewport(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${workflow?.code || 'workflow'}-draft.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [edges, nodes, reactFlow, workflow?.code]);

  const importWorkflow = useCallback(
    async (file: File) => {
      try {
        const parsed = JSON.parse(
          await file.text(),
        ) as Partial<WorkflowDesignerState>;
        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
          message.error('工作流 JSON 格式不正确');
          return;
        }
        recordHistory();
        setNodes(parsed.nodes as WorkflowFlowNode[]);
        setEdges(parsed.edges as WorkflowFlowEdge[]);
        if (parsed.viewport)
          reactFlow.setViewport(parsed.viewport, { duration: 180 });
        setSelectedNodeId(undefined);
        setActivePanel(null);
        cancelNodePlacement();
        markDirty();
        message.success('工作流草稿已导入');
      } catch {
        message.error('无法解析工作流 JSON');
      } finally {
        if (importInputRef.current) importInputRef.current.value = '';
      }
    },
    [
      cancelNodePlacement,
      markDirty,
      reactFlow,
      recordHistory,
      setEdges,
      setNodes,
    ],
  );

  const restoreSnapshot = useCallback(
    (snapshot: WorkflowSnapshot) => {
      Modal.confirm({
        title: '恢复历史快照',
        content: '当前未保存修改会被覆盖，确定继续吗？',
        okText: '恢复',
        cancelText: '取消',
        centered: true,
        onOk: () => {
          recordHistory();
          setNodes(cloneNodes(snapshot.nodes));
          setEdges(snapshot.edges.map((edge) => ({ ...edge })));
          reactFlow.setViewport(snapshot.viewport, { duration: 220 });
          setActivePanel(null);
          setSelectedNodeId(undefined);
          cancelNodePlacement();
          markDirty();
        },
      });
    },
    [
      cancelNodePlacement,
      markDirty,
      reactFlow,
      recordHistory,
      setEdges,
      setNodes,
    ],
  );

  const changeVariables = useCallback(
    (next: WorkflowVariable[]) => {
      setVariables(next);
      persistWorkspace(next, environmentVariables, snapshots);
    },
    [environmentVariables, persistWorkspace, snapshots],
  );

  const changeEnvironment = useCallback(
    (next: WorkflowVariable[]) => {
      setEnvironmentVariables(next);
      persistWorkspace(variables, next, snapshots);
    },
    [persistWorkspace, snapshots, variables],
  );

  const openPanel = useCallback(
    (panel: Exclude<WorkflowPanelType, 'node' | null>) => {
      setSelectedNodeId(undefined);
      setActivePanel((current) => (current === panel ? null : panel));
      setNodeLibraryOpen(false);
      setQuickAddSourceId(undefined);
      setLibraryInsertPosition(undefined);
      cancelNodePlacement();
    },
    [cancelNodePlacement],
  );

  const onMoveEnd = useCallback<OnMoveEnd>(() => {
    markDirty();
  }, [markDirty]);

  useEffect(() => {
    const quickAdd = (event: Event) => {
      const customEvent = event as CustomEvent<{ nodeId: string }>;
      cancelNodePlacement();
      setQuickAddSourceId(customEvent.detail.nodeId);
      setLibraryInsertPosition(undefined);
      setNodeLibraryOpen(true);
      setSelectedNodeId(undefined);
      setActivePanel(null);
    };

    window.addEventListener('yak-workflow-quick-add', quickAdd);
    return () => window.removeEventListener('yak-workflow-quick-add', quickAdd);
  }, [cancelNodePlacement]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (editing) return;

      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (modifier && key === 's') {
        event.preventDefault();
        void saveWorkflow();
      } else if (modifier && key === 'z' && event.shiftKey) {
        event.preventDefault();
        handleRedo();
      } else if (modifier && key === 'z') {
        event.preventDefault();
        handleUndo();
      } else if (modifier && key === 'y') {
        event.preventDefault();
        handleRedo();
      } else if (modifier && key === 'c') {
        event.preventDefault();
        copySelection();
      } else if (modifier && key === 'v') {
        event.preventDefault();
        pasteSelection();
      } else if (modifier && key === 'd' && selectedNodeId) {
        event.preventDefault();
        duplicateNode(selectedNodeId);
      } else if (modifier && key === 'a') {
        event.preventDefault();
        selectAll();
      } else if (
        ['delete', 'backspace'].includes(key) &&
        selectedNodeId
      ) {
        event.preventDefault();
        deleteNode(selectedNodeId);
      } else if (event.key === 'Escape') {
        setContextMenu(undefined);
        setNodeLibraryOpen(false);
        setLibraryInsertPosition(undefined);
        setQuickAddSourceId(undefined);
        setActivePanel(null);
        setSelectedNodeId(undefined);
        cancelNodePlacement();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cancelNodePlacement,
    copySelection,
    deleteNode,
    duplicateNode,
    handleRedo,
    handleUndo,
    pasteSelection,
    saveWorkflow,
    selectAll,
    selectedNodeId,
  ]);

  if (createMode) return <WorkflowCreateGuide />;

  return (
    <div
      className="dify-workflow-designer"
      onMouseDown={() => setContextMenu(undefined)}
    >
      <WorkflowHeader
        workflow={workflow}
        dirty={dirty}
        saving={saving}
        activePanel={activePanel}
        onBack={() => history.push('/workflow-management')}
        onRename={(name) => {
          if (!workflow) return;
          setWorkflow({ ...workflow, name });
          markDirty();
        }}
        onSave={() => void saveWorkflow()}
        onOpenPanel={openPanel}
        onOpenCanvas={() => {
          setActivePanel(null);
          setSelectedNodeId(undefined);
        }}
      />

      <Spin spinning={loading} wrapperClassName="dify-workflow-loading">
        <div
          className="dify-workflow-canvas"
          data-node-placement={Boolean(pendingNodeType)}
          data-interaction-mode={interactionMode}
          onMouseMove={(event) => {
            if (!pendingNodeType) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            setPendingNodePointer({
              x: event.clientX - bounds.left,
              y: event.clientY - bounds.top,
            });
          }}
          onMouseLeave={() => {
            if (pendingNodeType) setPendingNodePointer(undefined);
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStart={recordHistory}
            onMoveEnd={onMoveEnd}
            onNodeClick={(event, node) => {
              if (placePendingNode(event.clientX, event.clientY)) return;
              setSelectedNodeId(node.id);
              setActivePanel('node');
              setNodeLibraryOpen(false);
              setQuickAddSourceId(undefined);
              setLibraryInsertPosition(undefined);
            }}
            onPaneClick={(event) => {
              if (placePendingNode(event.clientX, event.clientY)) return;
              setSelectedNodeId(undefined);
              if (activePanel === 'node') setActivePanel(null);
              setNodeLibraryOpen(false);
              setQuickAddSourceId(undefined);
              setLibraryInsertPosition(undefined);
            }}
            onPaneContextMenu={(event) => {
              event.preventDefault();
              if (pendingNodeType) {
                cancelNodePlacement();
                return;
              }
              const flowPosition = reactFlow.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
              });
              setContextMenu({
                kind: 'pane',
                x: event.clientX,
                y: event.clientY,
                flowPosition,
              });
            }}
            onNodeContextMenu={(event, node) => {
              event.preventDefault();
              if (pendingNodeType) {
                cancelNodePlacement();
                return;
              }
              setSelectedNodeId(node.id);
              setContextMenu({
                kind: 'node',
                x: event.clientX,
                y: event.clientY,
                nodeId: node.id,
              });
            }}
            onEdgeContextMenu={(event, edge) => {
              event.preventDefault();
              if (pendingNodeType) {
                cancelNodePlacement();
                return;
              }
              setContextMenu({
                kind: 'edge',
                x: event.clientX,
                y: event.clientY,
                edgeId: edge.id,
              });
            }}
            minZoom={0.25}
            maxZoom={2}
            selectionOnDrag={!pendingNodeType && interactionMode === 'select'}
            selectionMode={SelectionMode.Partial}
            multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
            deleteKeyCode={null}
            panOnDrag={
              pendingNodeType
                ? false
                : interactionMode === 'pan'
                  ? true
                  : [1, 2]
            }
            nodesDraggable={!pendingNodeType && interactionMode === 'select'}
            elementsSelectable={!pendingNodeType && interactionMode === 'select'}
            defaultEdgeOptions={{
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
            }}
            connectionLineStyle={{ stroke: '#6b7cff', strokeWidth: 2 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1.2}
              color="#d9dee8"
            />
          </ReactFlow>

          {pendingNodeType && pendingNodeData && pendingNodePointer && (
            <div
              className={[
                'pointer-events-none absolute z-30 w-[224px] -translate-x-1/2 -translate-y-1/2',
                'overflow-hidden rounded-xl border border-[var(--yak-brand-color-border)] bg-white/95',
                'shadow-[0_0_0_3px_var(--yak-brand-color-outline),0_14px_34px_rgba(16,24,40,0.16)]',
                'backdrop-blur-[8px]',
              ].join(' ')}
              style={
                {
                  left: pendingNodePointer.x,
                  top: pendingNodePointer.y,
                  '--node-color': pendingNodeMeta?.color,
                } as CSSProperties
              }
            >
              <div className="flex h-[43px] items-center gap-2 px-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--node-color)_10%,white)]">
                  <NodeIcon type={pendingNodeType} size={17} />
                </span>
                <div className="min-w-0">
                  <strong className="block truncate text-[12px] font-semibold text-[#344054]">
                    {pendingNodeData.title}
                  </strong>
                  <span className="block text-[9px] uppercase tracking-[0.04em] text-[#98a2b3]">
                    {pendingNodeMeta?.title}
                  </span>
                </div>
              </div>
              <div className="min-h-[54px] border-t border-[#f0f1f4] px-3 py-2.5">
                <p className="line-clamp-2 text-[10px] leading-[16px] text-[#667085]">
                  {pendingNodeData.description}
                </p>
              </div>
              <div className="flex h-[29px] items-center justify-between border-t border-[#f0f1f4] bg-[#fcfcfd] px-3 text-[9px] text-[#667085]">
                <span>单击放置节点</span>
                <span>Esc / 右键取消</span>
              </div>
            </div>
          )}

          {activePanel === 'node' && selectedNode && (
            <NodePanel
              node={selectedNode}
              onChange={updateSelectedNode}
              onDuplicate={() => duplicateNode(selectedNode.id)}
              onDelete={() => deleteNode(selectedNode.id)}
              onClose={() => {
                setSelectedNodeId(undefined);
                setActivePanel(null);
              }}
            />
          )}
          {activePanel === 'variables' && (
            <VariablePanel
              title="全局变量"
              description="可在所有节点中引用的工作流变量"
              variables={variables}
              onChange={changeVariables}
              onClose={() => setActivePanel(null)}
            />
          )}
          {activePanel === 'environment' && (
            <VariablePanel
              title="环境变量"
              description="配置密钥与环境相关参数"
              variables={environmentVariables}
              environment
              onChange={changeEnvironment}
              onClose={() => setActivePanel(null)}
            />
          )}
          {activePanel === 'history' && (
            <HistoryPanel
              snapshots={snapshots}
              onRestore={restoreSnapshot}
              onClose={() => setActivePanel(null)}
            />
          )}
          {activePanel === 'workflow-settings' && workflow && (
            <WorkflowSettingsPanel
              workflow={workflow}
              onApply={(values) => {
                setWorkflow({ ...workflow, ...values });
                setActivePanel(null);
                markDirty();
              }}
              onClose={() => setActivePanel(null)}
            />
          )}
          {activePanel === 'run' && (
            <RunPanel
              nodes={nodes}
              onStatusChange={(nodeId, status) =>
                setNodes((current) =>
                  current.map((node) =>
                    node.id === nodeId
                      ? {
                          ...node,
                          data: { ...node.data, runningStatus: status },
                        }
                      : node,
                  ),
                )
              }
              onClose={() => {
                setNodes((current) =>
                  current.map((node) => ({
                    ...node,
                    data: { ...node.data, runningStatus: 'idle' },
                  })),
                );
                setActivePanel(null);
              }}
            />
          )}

          <CanvasOperator
            canUndo={workflowHistory.canUndo}
            canRedo={workflowHistory.canRedo}
            showMiniMap={showMiniMap}
            nodePanelOpen={nodeLibraryOpen}
            interactionMode={interactionMode}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onToggleMiniMap={() => setShowMiniMap((value) => !value)}
            onAutoLayout={autoLayout}
            onExport={exportWorkflow}
            onImport={() => importInputRef.current?.click()}
            onToggleVariableInspect={() =>
              setVariableInspectOpen((value) => !value)
            }
            onToggleNodePanel={() => {
              cancelNodePlacement();
              setQuickAddSourceId(undefined);
              setLibraryInsertPosition(undefined);
              setNodeLibraryOpen((value) => !value);
              setSelectedNodeId(undefined);
              setActivePanel(null);
            }}
            onInteractionModeChange={(mode) => {
              cancelNodePlacement();
              setInteractionMode(mode);
            }}
            onSelectLibraryItem={selectCanvasLibraryItem}
            variableInspectOpen={variableInspectOpen}
            nodeGroups={CANVAS_NODE_GROUPS}
          />

          <VariableInspectPanel
            open={variableInspectOpen}
            nodes={nodes}
            variables={variables}
            environmentVariables={environmentVariables}
            onClose={() => setVariableInspectOpen(false)}
          />

          {contextMenu && (
            <WorkflowContextMenu
              menu={contextMenu}
              canPaste={Boolean(clipboardRef.current?.nodes.length)}
              onClose={() => setContextMenu(undefined)}
              onAddNode={() => {
                cancelNodePlacement();
                setContextMenu(undefined);
                setQuickAddSourceId(undefined);
                setLibraryInsertPosition(contextMenu.flowPosition);
                setNodeLibraryOpen(true);
                setSelectedNodeId(undefined);
                setActivePanel(null);
              }}
              onPaste={() => pasteSelection(contextMenu.flowPosition)}
              onSelectAll={selectAll}
              onFitView={() =>
                reactFlow.fitView({ padding: 0.24, duration: 220 })
              }
              onDuplicateNode={() =>
                contextMenu.nodeId && duplicateNode(contextMenu.nodeId)
              }
              onToggleNode={() =>
                contextMenu.nodeId && toggleNode(contextMenu.nodeId)
              }
              onDeleteNode={() =>
                contextMenu.nodeId && deleteNode(contextMenu.nodeId)
              }
              onDeleteEdge={() => {
                if (!contextMenu.edgeId) return;
                recordHistory();
                setEdges((current) =>
                  current.filter((edge) => edge.id !== contextMenu.edgeId),
                );
                markDirty();
              }}
            />
          )}

          {!nodes.length && !loading && !pendingNodeType && (
            <button
              type="button"
              className="dify-empty-canvas"
              onClick={() => {
                cancelNodePlacement();
                setQuickAddSourceId(undefined);
                setLibraryInsertPosition(undefined);
                setNodeLibraryOpen(true);
              }}
            >
              <Sparkles size={24} />
              <strong>开始构建工作流</strong>
              <span>从左侧节点面板选择节点，再单击画布完成放置。</span>
            </button>
          )}

          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importWorkflow(file);
            }}
          />
        </div>
      </Spin>
    </div>
  );
};

const WorkflowDesignerPage = () => (
  <ConfigProvider theme={BRAND_THEME}>
    <div style={BRAND_CSS_VARIABLES}>
      <ReactFlowProvider>
        <WorkflowDesignerContent />
      </ReactFlowProvider>
    </div>
  </ConfigProvider>
);

export default WorkflowDesignerPage;
