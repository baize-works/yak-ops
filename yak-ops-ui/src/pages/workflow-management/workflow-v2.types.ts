/**
 * Workflow V2 cross-layer contract.
 *
 * Workflow V2 owns orchestration only. Task authoring content and plugin-specific configuration
 * stay in data development and are referenced through an immutable published task version.
 */

export const WORKFLOW_V2_SCHEMA_VERSION = 2 as const;

export type WorkflowV2NodeKind = 'START' | 'TASK' | 'END';
export type WorkflowV2EdgePort = 'SUCCESS' | 'FAILURE';
export type WorkflowV2FailureAction =
  | 'FAIL_WORKFLOW'
  | 'ROUTE_FAILURE'
  | 'PAUSE';
export type WorkflowV2BindingSourceType =
  | 'START_INPUT'
  | 'NODE_OUTPUT'
  | 'WORKFLOW_VARIABLE'
  | 'LITERAL';

export interface WorkflowV2TaskReference {
  taskId: string;
  taskVersionId: string;
  taskVersionNumber: number;
  taskType: string;
}

export interface WorkflowV2BindingSource {
  type: WorkflowV2BindingSourceType;
  nodeKey?: string;
  path?: string;
  variableName?: string;
  literalValue?: unknown;
}

export interface WorkflowV2InputBinding {
  target: string;
  source: WorkflowV2BindingSource;
}

export interface WorkflowV2ExecutionPolicy {
  timeoutSeconds: number;
  retryTimes: number;
  retryIntervalSeconds: number;
  failureAction: WorkflowV2FailureAction;
}

export interface WorkflowV2Node {
  key: string;
  name: string;
  kind: WorkflowV2NodeKind;
  description?: string;
  positionX: number;
  positionY: number;
  enabled: boolean;

  /** Required only when kind is TASK. */
  taskRef?: WorkflowV2TaskReference;

  /** Task input mappings. START usually has none. */
  inputBindings: WorkflowV2InputBinding[];

  /** Workflow outputs exposed by END nodes. */
  outputBindings: Record<string, WorkflowV2BindingSource>;

  /** Orchestration policy. It never contains plugin-specific task configuration. */
  executionPolicy: WorkflowV2ExecutionPolicy;
}

export interface WorkflowV2Edge {
  from: string;
  fromPort: WorkflowV2EdgePort;
  to: string;
}

export interface WorkflowV2Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface WorkflowV2Dag {
  schemaVersion: typeof WORKFLOW_V2_SCHEMA_VERSION;
  nodes: WorkflowV2Node[];
  edges: WorkflowV2Edge[];
  viewport: WorkflowV2Viewport;
}

export const createWorkflowV2ExecutionPolicy = (): WorkflowV2ExecutionPolicy => ({
  timeoutSeconds: 0,
  retryTimes: 0,
  retryIntervalSeconds: 0,
  failureAction: 'FAIL_WORKFLOW',
});
