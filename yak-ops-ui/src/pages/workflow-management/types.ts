import type { Edge, Node, Viewport } from 'reactflow';

export type WorkflowDefinitionState = 'DRAFT' | 'PUBLISHED' | 'OFFLINE';
export type WorkflowFailureStrategy = 'FAIL_FAST' | 'CONTINUE';

/**
 * Front-end workflow block types. Only HTTP and SHELL currently map to concrete
 * backend executors. The remaining visual blocks are persisted as NOOP nodes
 * with their visual type stored in config.__uiType, so the draft remains
 * compatible with the current backend while execution is intentionally out of scope.
 */
export type WorkflowNodeType =
  | 'START'
  | 'END'
  | 'LLM'
  | 'HTTP'
  | 'SHELL'
  | 'CODE'
  | 'CONDITION'
  | 'TEMPLATE'
  | 'VARIABLE'
  | 'ITERATION'
  | 'KNOWLEDGE'
  | 'QUESTION_CLASSIFIER'
  | 'NOTE'
  | 'NOOP';

export type WorkflowBackendTaskType = 'NOOP' | 'HTTP' | 'SHELL' | string;
export type WorkflowPanelType =
  | 'node'
  | 'environment'
  | 'variables'
  | 'history'
  | 'run'
  | 'workflow-settings'
  | null;

export interface CommonApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

export interface WorkflowVariable {
  id: string;
  name: string;
  value: string;
  description?: string;
  secret?: boolean;
}

export interface WorkflowNodeRecord {
  key: string;
  name: string;
  type: WorkflowBackendTaskType;
  description?: string;
  positionX?: number;
  positionY?: number;
  config: Record<string, unknown>;
  retryTimes: number;
  retryIntervalSeconds: number;
  timeoutSeconds: number;
  enabled: boolean;
  idempotent: boolean;
  retryOnRestart: boolean;
}

export interface WorkflowEdgeRecord {
  from: string;
  to: string;
}

export interface WorkflowViewportRecord {
  x: number;
  y: number;
  zoom: number;
}

export interface WorkflowDagRecord {
  nodes: WorkflowNodeRecord[];
  edges: WorkflowEdgeRecord[];
  viewport?: WorkflowViewportRecord;
}

export interface WorkflowDefinitionRecord {
  id: number;
  code: string;
  name: string;
  description?: string;
  state: WorkflowDefinitionState;
  currentVersion?: number;
  failureStrategy: WorkflowFailureStrategy;
  maxParallelism: number;
  draft: WorkflowDagRecord;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowCreatePayload {
  code: string;
  name: string;
  description?: string;
  failureStrategy: WorkflowFailureStrategy;
  maxParallelism: number;
  dag: WorkflowDagRecord;
}

export interface WorkflowUpdatePayload {
  name: string;
  description?: string;
  failureStrategy: WorkflowFailureStrategy;
  maxParallelism: number;
  dag: WorkflowDagRecord;
}

export interface WorkflowNodeData {
  title: string;
  description?: string;
  nodeType: WorkflowNodeType;
  taskType: WorkflowBackendTaskType;
  config: Record<string, unknown>;
  retryTimes: number;
  retryIntervalSeconds: number;
  timeoutSeconds: number;
  enabled: boolean;
  idempotent: boolean;
  retryOnRestart: boolean;
  runningStatus?: 'idle' | 'running' | 'success' | 'failed';
  _candidate?: boolean;
}

export type WorkflowFlowNode = Node<WorkflowNodeData>;
export type WorkflowFlowEdge = Edge;

export interface WorkflowDesignerState {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
  viewport: Viewport;
}

export interface WorkflowSnapshot extends WorkflowDesignerState {
  id: string;
  name: string;
  createdAt: string;
}

export interface WorkflowTemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: WorkflowNodeType;
  nodes: WorkflowNodeRecord[];
  edges: WorkflowEdgeRecord[];
  viewport?: WorkflowViewportRecord;
}

export interface WorkflowContextMenuState {
  kind: 'pane' | 'node' | 'edge';
  x: number;
  y: number;
  nodeId?: string;
  edgeId?: string;
  flowPosition?: { x: number; y: number };
}

export interface WorkflowRunLog {
  id: string;
  nodeId: string;
  nodeTitle: string;
  status: 'waiting' | 'running' | 'success' | 'failed';
  startedAt?: string;
  duration?: number;
  message?: string;
}
