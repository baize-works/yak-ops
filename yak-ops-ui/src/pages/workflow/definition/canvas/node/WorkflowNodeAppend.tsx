import { Popover } from 'antd';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkflowCanvasTaskOption } from '../types';

interface WorkflowNodeAppendProps {
  nodeId: string;
  selected?: boolean;
  locked?: boolean;
  options?: WorkflowCanvasTaskOption[];
  onAppend?: (nodeId: string, taskId: string) => void;
}

const WorkflowNodeAppend = ({
  nodeId,
  selected,
  locked,
  options = [],
  onAppend,
}: WorkflowNodeAppendProps) => {
  const [open, setOpen] = useState(false);
  const canAppend = !locked && options.length > 0 && Boolean(onAppend);

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
                onAppend?.(nodeId, option.id);
                setOpen(false);
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
    [nodeId, onAppend, options],
  );

  if (!canAppend) return null;

  return (
    <Popover
      trigger="click"
      placement="rightTop"
      open={open}
      onOpenChange={setOpen}
      content={content}
      overlayInnerStyle={{ padding: 0 }}
    >
      <button
        type="button"
        aria-label="添加后续任务"
        className={[
          'nodrag nopan absolute top-[18px] -right-[19px] z-20',
          'flex h-[18px] w-[18px] items-center justify-center rounded-full border',
          'border-[#fe2c55] bg-[#fe2c55] text-white shadow-[0_1px_4px_rgba(254,44,85,.28)]',
          'transition-all duration-150 hover:scale-110',
          selected || open
            ? 'pointer-events-auto scale-100 opacity-100'
            : 'pointer-events-none scale-90 opacity-0 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100',
        ].join(' ')}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <Plus size={11} strokeWidth={2.4} />
      </button>
    </Popover>
  );
};

export default WorkflowNodeAppend;
