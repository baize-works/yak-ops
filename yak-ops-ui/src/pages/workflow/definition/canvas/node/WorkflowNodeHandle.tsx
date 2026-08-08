import type { CSSProperties } from 'react';
import { Handle, Position } from 'reactflow';

interface WorkflowNodeHandleProps {
  type: 'source' | 'target';
  selected?: boolean;
}

const HANDLE_STYLE: CSSProperties = {
  top: 20,
  transform: 'none',
};

const WorkflowNodeHandle = ({ type, selected }: WorkflowNodeHandleProps) => {
  const isTarget = type === 'target';

  return (
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
          : 'after:bg-[#c7c9ce] group-hover:after:bg-[#8a8f99]',
        'after:transition-all hover:scale-125 hover:after:bg-[#fe2c55]',
      ].join(' ')}
    />
  );
};

export default WorkflowNodeHandle;
