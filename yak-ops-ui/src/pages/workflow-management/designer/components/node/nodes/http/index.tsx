import type { WorkflowNodeData } from '../../../../../types';
import { getText } from '../../node.helpers';

const HttpNodeContent = ({ data }: { data: WorkflowNodeData }) => (
  <div className="px-3 pb-2">
    <div className="flex min-h-8 items-center gap-2 rounded-lg bg-[#f5f7fa] px-2.5 py-2 text-[10px] text-[#475467]">
      <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[var(--yak-brand-color)] shadow-[0_0_0_1px_var(--yak-brand-color-border)]">
        {getText(data.config.method, 'GET').toUpperCase()}
      </span>
      <span
        className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[#667085]"
        title={getText(data.config.url)}
      >
        {getText(data.config.url, '未配置 URL')}
      </span>
    </div>
  </div>
);

export default HttpNodeContent;
