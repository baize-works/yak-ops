import { Database, RefreshCcw, Timer } from 'lucide-react';
import type { NodeProps } from 'reactflow';
import type { WorkflowNodeData } from '../types';
import WorkflowNodeControl from './WorkflowNodeControl';
import WorkflowNodeHandle from './WorkflowNodeHandle';

const WorkflowNode = ({ id, data, selected }: NodeProps<WorkflowNodeData>) => {
  const hasRetry = data.maxAttempts > 1;
  const hasTimeout = data.executionTimeoutSeconds > 0;

  return (
    <div
      className={[
        'group relative w-60 rounded-[16px] border  transition-all duration-150',
        selected
          ? 'border-[#fe2c55] '
          : 'border-transparent',
      ].join(' ')}
    >
      <WorkflowNodeControl
        nodeId={id}
        selected={selected}
        locked={data.locked}
        onDuplicate={data.onDuplicate}
        onDelete={data.onDelete}
      />

      <WorkflowNodeHandle nodeId={id} type="target" selected={selected} locked={data.locked} />
      <div
        className={[
          'relative overflow-hidden rounded-[14px] bg-workflow-block-bg hover:shadow-lg  bg-white',
          'shadow-[0_1px_2px_rgba(22,24,35,.05)]',
          'transition-all duration-150 group-hover:border-[#d7d9de]',
          'group-hover:shadow-[0_6px_18px_rgba(22,24,35,.10)]',
        ].join(' ')}
      >
        <div className="flex items-center gap-2.5 px-3 pb-2.5 pt-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#f4f4f5] text-[#52525b]">
            <Database size={16} strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-semibold uppercase tracking-[.05em] text-[rgba(22,24,35,.38)]">
              {data.typeLabel}
            </div>
            <div className="mt-0.5 truncate text-[13px] font-semibold leading-5 text-[#161823]">
              {data.label}
            </div>
          </div>
        </div>

        <div className="border-t border-[#f0f0f2] bg-[#fcfcfd] px-3 py-2.5">
          <div className="truncate text-[9px] text-[rgba(22,24,35,.34)]">
            Task ID: {data.taskId}
          </div>

          {hasRetry || hasTimeout ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {hasRetry ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#f2f4f7] px-1.5 py-1 text-[9px] text-[rgba(22,24,35,.48)]">
                  <RefreshCcw size={10} /> 最多 {data.maxAttempts} 次
                </span>
              ) : null}
              {hasTimeout ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#f2f4f7] px-1.5 py-1 text-[9px] text-[rgba(22,24,35,.48)]">
                  <Timer size={10} /> {data.executionTimeoutSeconds}s
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <WorkflowNodeHandle
        nodeId={id}
        type="source"
        selected={selected}
        locked={data.locked}
        appendOptions={data.appendOptions}
        onAppend={data.onAppend}
      />
    </div>
  );
};

export default WorkflowNode;
