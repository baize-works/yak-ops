import type { CSSProperties } from 'react';
import { Handle, Position } from 'reactflow';
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
  top: 20,
  transform: 'none',
};

const WorkflowNodeHandle = ({
  nodeId,
  type,
  selected,
  locked,
  appendOptions,
  onAppend,
}: WorkflowNodeHandleProps) => {
  const isTarget = type === 'target';

  return (
    <>
      <Handle
        type={type}
        position={isTarget ? Position.Left : Position.Right}
        style={HANDLE_STYLE}
        className={[
          '!h-4 !w-4 !rounded-none !border-0 !bg-transparent !outline-none',
          isTarget ? '!-left-[10px]' : '!-right-[10px]',
          "after:absolute after:top-1 after:h-2 after:w-0.5 after:rounded-full after:content-['']",
          isTarget ? 'after:left-[7px]' : 'after:right-[7px]',
          selected
            ? 'after:bg-[#fe2c55]'
            : 'after:bg-[#c7c9ce] group-hover:after:bg-[#fe2c55]',
          'after:transition-all hover:scale-125 hover:after:bg-[#fe2c55]',
        ].join(' ')}
      />

      {!isTarget ? (
        <WorkflowNodeAppend
          nodeId={nodeId}
          selected={selected}
          locked={locked}
          options={appendOptions}
          onAppend={onAppend}
        />
      ) : null}
    </>
  );
};

export default WorkflowNodeHandle;
