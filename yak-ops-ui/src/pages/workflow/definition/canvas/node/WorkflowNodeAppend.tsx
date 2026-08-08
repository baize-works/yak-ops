import { Popover } from 'antd';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
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
}: WorkflowNodeAppendProps) => {
  const content = useMemo(
    () => (
      <div className="w-[220px] p-1">
        <div className="px-2 pb-1.5 pt-1 text-[10px] font-medium text-[rgba(22,24,35,.42)]">
          添加后续任务
        </div>
        <div className="max-h-[260px] space-y-0.5 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-md border-0 bg-transparent px-2 py-2 text-left hover:bg-[#f5f5f6]"
              onClick={() => {
                onAppend(nodeId, option.id);
                onOpenChange(false);
              }}
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
    [nodeId, onAppend, onOpenChange, options],
  );

  return (
    <Popover
      trigger="click"
      placement="right"
      arrow={false}
      open={open}
      onOpenChange={onOpenChange}
      content={content}
      overlayInnerStyle={{ padding: 0 }}
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
    </Popover>
  );
};

export default WorkflowNodeAppend;
