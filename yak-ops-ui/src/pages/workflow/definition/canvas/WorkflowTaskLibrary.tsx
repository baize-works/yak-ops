import type { WorkflowTaskDefinition } from '@/services/workflow';
import type { DragEvent } from 'react';

interface WorkflowTaskLibraryProps {
  tasks: WorkflowTaskDefinition[];
  loading: boolean;
  locked: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>, task: WorkflowTaskDefinition) => void;
}

/**
 * Workflow tasks are now added through the shared Dify-style task picker from
 * node handles, edge insertion, and the inspector Next Step area. Keeping a
 * permanent task rail would duplicate those entry points and reduce canvas
 * space, so the legacy component intentionally renders nothing while its
 * public contract is kept temporarily for a low-risk editor-shell migration.
 */
const WorkflowTaskLibrary = (_props: WorkflowTaskLibraryProps) => null;

export default WorkflowTaskLibrary;
