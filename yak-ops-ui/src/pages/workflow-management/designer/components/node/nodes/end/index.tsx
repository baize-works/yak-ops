import type { WorkflowNodeData } from '../../../../../types';
import { getArrayLength } from '../../node.helpers';

const EndNodeContent = ({ data }: { data: WorkflowNodeData }) => (
  <div className="px-3 pb-2">
    <div className="flex min-h-8 items-center rounded-lg bg-[#f5f7fa] px-2.5 py-2 text-[10px] text-[#475467]">
      <span className="font-medium text-[#344054]">输出变量</span>
      <span className="ml-auto rounded-md bg-white px-1.5 py-0.5 text-[9px] text-[#667085] shadow-[0_0_0_1px_#e4e7ec]">
        {getArrayLength(data.config.outputs)}
      </span>
    </div>
  </div>
);

export default EndNodeContent;
