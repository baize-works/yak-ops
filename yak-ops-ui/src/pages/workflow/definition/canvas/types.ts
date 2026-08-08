import type {
  WorkflowNodeFailurePolicy,
  WorkflowTriggerRule,
} from '@/services/workflow';

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
}

export interface WorkflowEdgeInsertOption {
  id: string;
  label: string;
  typeLabel: string;
}

export interface WorkflowEdgeData {
  locked?: boolean;
  insertOptions?: WorkflowEdgeInsertOption[];
  onInsert?: (
    edgeId: string,
    source: string,
    target: string,
    taskId: string,
  ) => void;
}
