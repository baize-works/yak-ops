import { Popover } from 'antd';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
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
}: WorkflowEdgeInsertProps) => {
  const content = useMemo(
    () => (
      <div className="w-[220px] p-1">
        <div className="px-2 pb-1.5 pt-1 text-[10px] font-medium text-[rgba(22,24,35,.42)]">
          插入任务节点
        </div>
        <div className="max-h-[260px] space-y-0.5 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-md border-0 bg-transparent px-2 py-2 text-left hover:bg-[#f5f5f6]"
              onClick={() => onSelect(option.id)}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f2f4f7] text-[11px] font-semibold text-[#52525b]">
                {option.typeLabel.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-medium text-[#161823]">
                  {option.label}
                </span>
                <span className="mt-0.5 block truncate text-[9px] text-[rgba(22,24,35,.36)]">
                  {option.typeLabel}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    ),
    [onSelect, options],
  );

  return (
    <Popover
      trigger="click"
      placement="bottom"
      open={open}
      onOpenChange={onOpenChange}
      content={content}
      overlayInnerStyle={{ padding: 0 }}
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
    </Popover>
  );
};

export default WorkflowEdgeInsert;
