import { Plus } from 'lucide-react';
import WorkflowTaskPicker from '../WorkflowTaskPicker';
import type { WorkflowCanvasTaskOption } from '../types';

interface WorkflowNodeAppendProps {
  nodeId: string;
  open: boolean;
  selected?: boolean;
  options: WorkflowCanvasTaskOption[];
  onOpenChange: (open: boolean) => void;
  onAppend: (nodeId: string, taskId: string) => void;
}

const WorkflowNodeAppend = ({
  nodeId,
  open,
  selected,
  options,
  onOpenChange,
  onAppend,
}: WorkflowNodeAppendProps) => (
  <WorkflowTaskPicker
    open={open}
    onOpenChange={onOpenChange}
    placement="rightTop"
    options={options}
    onSelect={(taskId) => onAppend(nodeId, taskId)}
  >
    <span
      aria-hidden
      className={[
        'nodrag nopan pointer-events-none absolute inset-0 z-20',
        'flex h-4 w-4 items-center justify-center rounded-full',
        'bg-[#fe2c55] text-white shadow-[0_1px_3px_rgba(254,44,85,.22)]',
        'transition-opacity duration-150',
        selected || open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
      ].join(' ')}
    >
      <Plus size={10} strokeWidth={2.4} />
    </span>
  </WorkflowTaskPicker>
);

export default WorkflowNodeAppend;
