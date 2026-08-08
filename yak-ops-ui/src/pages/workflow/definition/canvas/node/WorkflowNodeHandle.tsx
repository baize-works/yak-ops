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
  transform: 'none',
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
        'group/handle !h-4 !w-4 !rounded-none !border-0 !bg-transparent !outline-none',
        "after:absolute after:top-1 after:h-2 after:w-0.5 after:rounded-full after:content-['']",
        isTarget ? 'after:left-[7px]' : 'after:right-[7px]',
        selected || appendOpen
          ? 'after:bg-[#fe2c55]'
          : 'after:bg-[#c7c9ce] group-hover:after:bg-[#fe2c55]',
        'after:transition-colors after:duration-150 hover:after:bg-[#fe2c55]',
      ].join(' ')}
    >
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
