import { Select } from 'antd';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { WorkflowCanvasTaskOption } from './types';
import WorkflowNodeIcon from './node/icons/WorkflowNodeIcon';

export interface WorkflowNextStepNode {
  id: string;
  label: string;
  taskType: string;
}

interface WorkflowNextStepProps {
  currentIcon: ReactNode;
  nextNodes: WorkflowNextStepNode[];
  appendOptions: WorkflowCanvasTaskOption[];
  locked: boolean;
  onAppend: (taskId: string) => void;
}

const WorkflowNextStep = ({
  currentIcon,
  nextNodes,
  appendOptions,
  locked,
  onAppend,
}: WorkflowNextStepProps) => {
  const options = appendOptions.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const canAppend = !locked && options.length > 0;
  const addLabel = nextNodes.length ? '添加并行节点' : '选择下一步';

  return (
    <div className="flex py-1">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white shadow-[0_1px_2px_rgba(16,24,40,.05)]">
        {currentIcon}
      </div>

      <svg className="h-9 w-6 shrink-0" viewBox="0 0 24 36" aria-hidden="true">
        <path d="M0 18H24" fill="none" stroke="#d0d5dd" strokeWidth="1" />
        <rect x="0" y="16" width="1" height="4" rx="0.5" fill="#c7c9ce" />
        <rect x="23" y="16" width="1" height="4" rx="0.5" fill="#c7c9ce" />
      </svg>

      <div className="min-w-0 flex-1 space-y-0.5 rounded-[10px] bg-[#f5f6f7] p-0.5">
        {nextNodes.map((item) => (
          <div
            key={item.id}
            className="group flex h-9 items-center rounded-lg border border-[#e4e7ec] bg-white px-2 shadow-[0_1px_2px_rgba(16,24,40,.04)] transition-colors hover:bg-[#fafafa]"
          >
            <WorkflowNodeIcon taskType={item.taskType} size="sm" />
            <div className="ml-1.5 min-w-0 flex-1 truncate text-[11px] font-medium text-[#475467]">
              {item.label}
            </div>
          </div>
        ))}

        {canAppend ? (
          <div className="rounded-lg border border-dashed border-[#d0d5dd] bg-[rgba(255,255,255,.42)] transition-colors hover:bg-white">
            <Select
              className="w-full"
              variant="borderless"
              value={undefined}
              options={options}
              popupMatchSelectWidth
              onChange={onAppend}
              placeholder={(
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#98a2b3]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-[#e9eaec] text-[#98a2b3]">
                    <Plus size={12} />
                  </span>
                  {addLabel}
                </span>
              )}
            />
          </div>
        ) : null}

        {!nextNodes.length && !canAppend ? (
          <div className="flex h-9 items-center rounded-lg border border-dashed border-[#d0d5dd] px-2 text-[11px] text-[#98a2b3]">
            暂无后续节点
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default WorkflowNextStep;
