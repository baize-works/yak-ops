import { Plus } from 'lucide-react';
import WorkflowTaskPicker from '../WorkflowTaskPicker';
import type { WorkflowEdgeInsertOption } from '../types';

interface WorkflowEdgeInsertProps {
  open: boolean;
  visible: boolean;
  options: WorkflowEdgeInsertOption[];
  onOpenChange: (open: boolean) => void;
  onSelect: (taskId: string) => void;
}

const WorkflowEdgeInsert = ({
  open,
  visible,
  options,
  onOpenChange,
  onSelect,
}: WorkflowEdgeInsertProps) => (
  <WorkflowTaskPicker
    open={open}
    onOpenChange={onOpenChange}
    placement="bottom"
    options={options}
    onSelect={onSelect}
  >
    <button
      type="button"
      aria-label="在连线中插入任务"
      className={[
        'nodrag nopan flex h-6 w-6 items-center justify-center rounded-full',
        'border border-[#dfe1e5] bg-white text-[#667085]',
        'shadow-[0_1px_4px_rgba(22,24,35,.12)] transition-all duration-150',
        'hover:scale-125 hover:border-[#fe2c55] hover:text-[#fe2c55]',
        visible || open ? 'scale-100 opacity-100' : 'scale-90 opacity-0',
      ].join(' ')}
    >
      <Plus size={12} strokeWidth={2} />
    </button>
  </WorkflowTaskPicker>
);

export default WorkflowEdgeInsert;
