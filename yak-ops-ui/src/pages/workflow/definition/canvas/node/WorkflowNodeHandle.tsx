import type { CSSProperties, MouseEvent } from 'react';
import { useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';
import {
  WORKFLOW_HANDLE_OFFSET,
  WORKFLOW_HANDLE_TOP,
} from '../constants';
import type { WorkflowCanvasTaskOption } from '../types';
import WorkflowNodeAppend from './WorkflowNodeAppend';

interface WorkflowNodeHandleProps {
  nodeId: string;
  type: 'source' | 'target';
  selected?: boolean;
  locked?: boolean;
  appendOptions?: WorkflowCanvasTaskOption[];
  onAppend?: (nodeId: string, taskId: string) => void;
}

const HANDLE_STYLE: CSSProperties = {
  top: WORKFLOW_HANDLE_TOP,
};

const WorkflowNodeHandle = ({
  nodeId,
  type,
  selected,
  locked,
  appendOptions = [],
  onAppend,
}: WorkflowNodeHandleProps) => {
  const isTarget = type === 'target';
  const canAppend = !isTarget && !locked && appendOptions.length > 0 && Boolean(onAppend);
  const [appendOpen, setAppendOpen] = useState(false);

  useEffect(() => {
    if (!canAppend && appendOpen) setAppendOpen(false);
  }, [appendOpen, canAppend]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!canAppend) return;
    event.stopPropagation();
    setAppendOpen((current) => !current);
  };

  return (
    <Handle
      type={type}
      position={isTarget ? Position.Left : Position.Right}
      style={{
        ...HANDLE_STYLE,
        ...(isTarget
          ? { left: WORKFLOW_HANDLE_OFFSET }
          : { right: WORKFLOW_HANDLE_OFFSET }),
      }}
      isConnectable={!locked}
      onClick={handleClick}
      className={[
        'group/handle !h-4 !w-4 !translate-y-0 !rounded-none !border-0 !bg-transparent !outline-none',
        "after:absolute after:top-1 after:h-2 after:w-0.5 after:rounded-full after:content-['']",
        isTarget ? 'after:left-[7px]' : 'after:right-[7px]',
        selected || appendOpen
          ? 'after:bg-[#fe2c55]'
          : 'after:bg-[#c7c9ce] group-hover:after:bg-[#fe2c55]',
        'transition-all duration-150 hover:scale-125 hover:after:bg-[#fe2c55]',
      ].join(' ')}
    >
      {canAppend ? (
        <div className="pointer-events-none absolute -top-2 left-1/2 z-30 hidden origin-bottom -translate-x-1/2 -translate-y-full scale-[.8] rounded-lg border border-[#e8e9ec] bg-white px-2.5 py-2 shadow-[0_4px_12px_rgba(22,24,35,.10)] group-hover/handle:block">
          <div className="whitespace-nowrap text-[11px] leading-[18px] text-[rgba(22,24,35,.52)]">
            <div>
              <span className="font-medium text-[#161823]">点击</span>
              <span className="ml-1">添加节点</span>
            </div>
            <div>
              <span className="font-medium text-[#161823]">拖拽</span>
              <span className="ml-1">连接节点</span>
            </div>
          </div>
        </div>
      ) : null}

      {canAppend && onAppend ? (
        <WorkflowNodeAppend
          nodeId={nodeId}
          open={appendOpen}
          selected={selected}
          options={appendOptions}
          onOpenChange={setAppendOpen}
          onAppend={onAppend}
        />
      ) : null}
    </Handle>
  );
};

export default WorkflowNodeHandle;
