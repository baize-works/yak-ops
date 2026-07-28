import type { Edge, Node, Viewport } from 'reactflow';

export type WorkflowDefinitionState = 'DRAFT' | 'PUBLISHED' | 'OFFLINE';
export type WorkflowFailureStrategy = 'FAIL_FAST' | 'CONTINUE';
export type WorkflowNodeType = 'NOOP' | 'HTTP' | 'SHELL';

export interface CommonApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

export interface WorkflowNodeRecord {
  key: string;
  name: string;
  type: WorkflowNodeType | string;
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
  name: string;
  description?: string;
  taskType: WorkflowNodeType | string;
  config: Record<string, unknown>;
  retryTimes: number;
  retryIntervalSeconds: number;
  timeoutSeconds: number;
  enabled: boolean;
  idempotent: boolean;
  retryOnRestart: boolean;
}

export type WorkflowFlowNode = Node<WorkflowNodeData>;
export type WorkflowFlowEdge = Edge;

export interface WorkflowDesignerState {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
  viewport: Viewport;
}
