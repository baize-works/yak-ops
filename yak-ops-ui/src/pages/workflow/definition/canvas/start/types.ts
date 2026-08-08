export const WORKFLOW_START_NODE_ID = '__yak_workflow_start__';
export const WORKFLOW_START_META_KEY = '__yak_start__';

export type WorkflowStartValueType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'FILE' | 'ARRAY_STRING';

export interface WorkflowStartInputField {
  id: string;
  name: string;
  label: string;
  type: WorkflowStartValueType;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
}

export interface WorkflowStartVariable {
  id: string;
  name: string;
  type: Exclude<WorkflowStartValueType, 'FILE'>;
  value?: unknown;
}

export interface WorkflowStartConfig {
  position: { x: number; y: number };
  inputs: WorkflowStartInputField[];
  variables: WorkflowStartVariable[];
}

export interface WorkflowStartNodeData {
  label: string;
  locked?: boolean;
  inputs: WorkflowStartInputField[];
  appendOptions?: Array<{ id: string; label: string; typeLabel: string }>;
  onAppend?: (nodeId: string, taskId: string) => void;
}
