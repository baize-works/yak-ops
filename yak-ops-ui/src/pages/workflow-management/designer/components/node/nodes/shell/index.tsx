import type { WorkflowNodeData } from '../../../../../types';
import { getText } from '../../node.helpers';

const ShellNodeContent = ({ data }: { data: WorkflowNodeData }) => (
  <div className="px-3 pb-2">
    <div className="flex min-h-8 items-center gap-2 rounded-lg bg-[#101828] px-2.5 py-2 font-mono text-[10px] text-[#d0d5dd]">
      <span
        className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
        title={getText(data.config.command)}
      >
        {getText(data.config.command, '未配置执行命令')}
      </span>
    </div>
  </div>
);

export default ShellNodeContent;
