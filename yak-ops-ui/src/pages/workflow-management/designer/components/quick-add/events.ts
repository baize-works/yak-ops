export type WorkflowQuickAddMode = 'append' | 'insert';

export interface WorkflowQuickAddPoint {
  x: number;
  y: number;
}

export interface WorkflowQuickAddContext {
  mode: WorkflowQuickAddMode;
  sourceNodeId: string;
  targetNodeId?: string;
  edgeId?: string;
  position?: WorkflowQuickAddPoint;
}

export const WORKFLOW_QUICK_ADD_EVENT = 'yak-workflow-open-quick-add';

export const openWorkflowQuickAdd = (context: WorkflowQuickAddContext) => {
  window.dispatchEvent(
    new CustomEvent<WorkflowQuickAddContext>(WORKFLOW_QUICK_ADD_EVENT, {
      detail: context,
    }),
  );
};
