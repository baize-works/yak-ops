import type { NodeProps } from 'reactflow';
import type { WorkflowNodeData } from '../types';
import WorkflowNodeControl from './WorkflowNodeControl';
import WorkflowNodeHandle from './WorkflowNodeHandle';
import WorkflowNodeIcon from './icons/WorkflowNodeIcon';

const WorkflowNode = ({ id, data, selected }: NodeProps<WorkflowNodeData>) => (
  <div className="group relative w-60">
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
        'relative rounded-[15px] border bg-white px-3 py-3',
        'shadow-[0_1px_2px_rgba(22,24,35,.06)]',
        'transition-[border-color,box-shadow] duration-150',
        'group-hover:shadow-[0_6px_18px_rgba(22,24,35,.10)]',
        selected
          ? 'border-[#fe2c55] shadow-[0_0_0_2px_rgba(254,44,85,.06)]'
          : 'border-[#e8e9ec] group-hover:border-[#d7d9de]',
      ].join(' ')}
    >
      <div className="flex min-h-9 items-center gap-2.5">
        <WorkflowNodeIcon taskType={data.taskType} />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-medium leading-4 text-[rgba(22,24,35,.38)]">
            {data.typeLabel}
          </div>
          <div className="mt-0.5 truncate text-[14px] font-semibold leading-5 text-[#161823]">
            {data.label}
          </div>
        </div>
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

export default WorkflowNode;
