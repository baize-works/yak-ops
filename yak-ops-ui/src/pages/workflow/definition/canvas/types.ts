import type {
  WorkflowNodeFailurePolicy,
  WorkflowTriggerRule,
} from '@/services/workflow';

export interface WorkflowCanvasTaskOption {
  id: string;
  label: string;
  taskType: string;
  typeLabel: string;
}

export interface WorkflowNodeData {
  label: string;
  taskId: string;
  taskType: string;
  typeLabel: string;
  triggerRule: WorkflowTriggerRule;
  failurePolicy: WorkflowNodeFailurePolicy;
  maxAttempts: number;
  retryDelaySeconds: number;
  dispatchTimeoutSeconds: number;
  executionTimeoutSeconds: number;
  inputMappingText: string;
  locked?: boolean;
  appendOptions?: WorkflowCanvasTaskOption[];
  onAppend?: (nodeId: string, taskId: string) => void;
  onDuplicate?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

export type WorkflowEdgeInsertOption = WorkflowCanvasTaskOption;

export interface WorkflowEdgeData {
  locked?: boolean;
  connectedNodeHovered?: boolean;
  insertOptions?: WorkflowCanvasTaskOption[];
  onInsert?: (
    edgeId: string,
    source: string,
    target: string,
    taskId: string,
  ) => void;
}
