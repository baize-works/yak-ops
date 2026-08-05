import {
  MarkerType,
  type Edge,
  type Node,
  type Viewport,
  type XYPosition,
} from 'reactflow';

import type {
  WorkflowPublishedTask,
} from '../repository/workflow-task-library.repository';
import {
  WORKFLOW_V2_SCHEMA_VERSION,
  createWorkflowV2ExecutionPolicy,
  type WorkflowV2BindingSource,
  type WorkflowV2Dag,
  type WorkflowV2Edge,
  type WorkflowV2ExecutionPolicy,
  type WorkflowV2InputBinding,
  type WorkflowV2NodeKind,
  type WorkflowV2TaskReference,
} from '../workflow-v2.types';

export const WORKFLOW_TASK_DRAG_TYPE =
  'application/x-yak-workflow-published-task';

export interface WorkflowV2CanvasTaskMeta {
  projectName?: string;
  folderName?: string;
  pluginVersion?: string;
  publishedAt?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface WorkflowV2CanvasNodeData {
  title: string;
  description?: string;
  kind: WorkflowV2NodeKind;
  enabled: boolean;
  taskRef?: WorkflowV2TaskReference;
  taskMeta?: WorkflowV2CanvasTaskMeta;
  inputBindings: WorkflowV2InputBinding[];
  outputBindings: Record<string, WorkflowV2BindingSource>;
  executionPolicy: WorkflowV2ExecutionPolicy;
}

export type WorkflowV2FlowNode = Node<WorkflowV2CanvasNodeData>;
export type WorkflowV2FlowEdge = Edge;

const copyJson = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const uniqueTaskNodeKey = (taskId: string) => {
  const compactTaskId = taskId.replace(/[^A-Za-z0-9_-]/g, '').slice(-20);
  const suffix = `${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  return `task_${compactTaskId || 'node'}_${suffix}`.slice(0, 64);
};

export const createInitialWorkflowV2Dag = (): WorkflowV2Dag => ({
  schemaVersion: WORKFLOW_V2_SCHEMA_VERSION,
  nodes: [
    {
      key: 'start',
      name: '开始',
      kind: 'START',
      description: '工作流输入入口',
      positionX: 140,
      positionY: 220,
      enabled: true,
      inputBindings: [],
      outputBindings: {},
      executionPolicy: createWorkflowV2ExecutionPolicy(),
    },
    {
      key: 'end',
      name: '结束',
      kind: 'END',
      description: '工作流输出出口',
      positionX: 760,
      positionY: 220,
      enabled: true,
      inputBindings: [],
      outputBindings: {},
      executionPolicy: createWorkflowV2ExecutionPolicy(),
    },
  ],
  edges: [
    {
      from: 'start',
      fromPort: 'SUCCESS',
      to: 'end',
    },
  ],
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
  },
});

export const createTaskFlowNode = (
  task: WorkflowPublishedTask,
  position: XYPosition,
): WorkflowV2FlowNode => ({
  id: uniqueTaskNodeKey(task.taskId),
  type: 'workflowV2Node',
  position,
  deletable: true,
  data: {
    title: task.name,
    description: task.description,
    kind: 'TASK',
    enabled: true,
    taskRef: {
      taskId: task.taskId,
      taskVersionId: task.publishedVersionId,
      taskVersionNumber: task.publishedVersionNumber,
      taskType: task.taskType,
    },
    taskMeta: {
      projectName: task.projectName,
      folderName: task.folderName,
      pluginVersion: task.pluginVersion,
      publishedAt: task.publishedAt,
      inputSchema: copyJson(task.inputSchema),
      outputSchema: copyJson(task.outputSchema),
    },
    inputBindings: [],
    outputBindings: {},
    executionPolicy: createWorkflowV2ExecutionPolicy(),
  },
});

export const toFlowNodes = (dag: WorkflowV2Dag): WorkflowV2FlowNode[] =>
  dag.nodes.map((node, index) => ({
    id: node.key,
    type: 'workflowV2Node',
    position: {
      x: node.positionX ?? 120 + index * 300,
      y: node.positionY ?? 220,
    },
    deletable: node.kind === 'TASK',
    data: {
      title: node.name,
      description: node.description,
      kind: node.kind,
      enabled: node.enabled,
      taskRef: node.taskRef ? copyJson(node.taskRef) : undefined,
      taskMeta:
        node.kind === 'TASK' && node.taskRef
          ? {
              pluginVersion: undefined,
              projectName: undefined,
              folderName: undefined,
            }
          : undefined,
      inputBindings: copyJson(node.inputBindings ?? []),
      outputBindings: copyJson(node.outputBindings ?? {}),
      executionPolicy: copyJson(
        node.executionPolicy ?? createWorkflowV2ExecutionPolicy(),
      ),
    },
  }));

const edgeStyle = (port: WorkflowV2Edge['fromPort']) =>
  port === 'FAILURE'
    ? { stroke: '#f04438', strokeWidth: 1.8 }
    : { stroke: '#98a2b3', strokeWidth: 1.8 };

export const toFlowEdges = (dag: WorkflowV2Dag): WorkflowV2FlowEdge[] =>
  dag.edges.map((edge, index) => ({
    id: `edge_${edge.from}_${edge.fromPort}_${edge.to}_${index}`,
    source: edge.from,
    sourceHandle: edge.fromPort,
    target: edge.to,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
    style: edgeStyle(edge.fromPort),
    data: { fromPort: edge.fromPort },
  }));

export const toWorkflowV2Dag = (
  nodes: WorkflowV2FlowNode[],
  edges: WorkflowV2FlowEdge[],
  viewport: Viewport,
): WorkflowV2Dag => ({
  schemaVersion: WORKFLOW_V2_SCHEMA_VERSION,
  nodes: nodes.map((node) => ({
    key: node.id,
    name: node.data.title.trim(),
    kind: node.data.kind,
    description: node.data.description,
    positionX: node.position.x,
    positionY: node.position.y,
    enabled: node.data.enabled,
    taskRef:
      node.data.kind === 'TASK' && node.data.taskRef
        ? copyJson(node.data.taskRef)
        : undefined,
    inputBindings: copyJson(node.data.inputBindings),
    outputBindings: copyJson(node.data.outputBindings),
    executionPolicy: copyJson(node.data.executionPolicy),
  })),
  edges: edges.map((edge) => ({
    from: edge.source,
    fromPort:
      edge.sourceHandle === 'FAILURE' || edge.data?.fromPort === 'FAILURE'
        ? 'FAILURE'
        : 'SUCCESS',
    to: edge.target,
  })),
  viewport: {
    x: viewport.x,
    y: viewport.y,
    zoom: viewport.zoom,
  },
});

export const encodeTaskDragPayload = (task: WorkflowPublishedTask) =>
  JSON.stringify(task);

export const decodeTaskDragPayload = (
  value: string,
): WorkflowPublishedTask | undefined => {
  if (!value.trim()) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<WorkflowPublishedTask>;
    if (
      typeof parsed.taskId !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.projectId !== 'string' ||
      typeof parsed.projectName !== 'string' ||
      typeof parsed.taskType !== 'string' ||
      typeof parsed.publishedVersionId !== 'string' ||
      typeof parsed.publishedVersionNumber !== 'number' ||
      typeof parsed.pluginVersion !== 'string'
    ) {
      return undefined;
    }
    return {
      ...parsed,
      description: parsed.description,
      folderId: parsed.folderId,
      folderName: parsed.folderName,
      engineType: parsed.engineType,
      schemaVersion: Number(parsed.schemaVersion ?? 1),
      inputSchema:
        parsed.inputSchema && typeof parsed.inputSchema === 'object'
          ? parsed.inputSchema
          : {},
      outputSchema:
        parsed.outputSchema && typeof parsed.outputSchema === 'object'
          ? parsed.outputSchema
          : {},
      contentDigest: String(parsed.contentDigest ?? ''),
      publishedAt: String(parsed.publishedAt ?? ''),
      updatedAt: String(parsed.updatedAt ?? ''),
      favorite: Boolean(parsed.favorite),
    } as WorkflowPublishedTask;
  } catch {
    return undefined;
  }
};

export const isControlNode = (node: WorkflowV2FlowNode) =>
  node.data.kind === 'START' || node.data.kind === 'END';

export const workflowV2EdgeStyle = edgeStyle;
