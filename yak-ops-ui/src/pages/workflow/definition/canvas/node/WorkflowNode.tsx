import type { NodeProps } from 'reactflow';
import type { WorkflowNodeData } from '../types';
import WorkflowNodeControl from './WorkflowNodeControl';
import WorkflowNodeHandle from './WorkflowNodeHandle';
import WorkflowNodeRetry from './WorkflowNodeRetry';
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
        'shadow-[0_4px_14px_rgba(22,24,35,.07),0_1px_2px_rgba(22,24,35,.04)]',
        'transition-[border-color,box-shadow] duration-150',
        'group-hover:shadow-[0_10px_30px_rgba(22,24,35,.10),0_2px_6px_rgba(22,24,35,.04)]',
        selected
          ? 'border-[#fe2c55] shadow-[0_0_0_2px_rgba(254,44,85,.07),0_8px_22px_rgba(22,24,35,.09)]'
          : 'border-[#e5e8ec] group-hover:border-[#d4d8de]',
      ].join(' ')}
    >
      <div className="flex min-h-9 items-center gap-2.5">
        <WorkflowNodeIcon taskType={data.taskType} />

        <div className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-5 text-[#161823]">
          {data.label}
        </div>
      </div>

      <WorkflowNodeRetry data={data} />
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
