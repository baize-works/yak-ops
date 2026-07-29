import type { WorkflowNodeData } from '../../../../types';
import EndNodeContent from '../nodes/end';
import HttpNodeContent from '../nodes/http';
import ShellNodeContent from '../nodes/shell';
import StartNodeContent from '../nodes/start';

const NodeContent = ({ data }: { data: WorkflowNodeData }) => {
  switch (data.nodeType) {
    case 'START':
      return <StartNodeContent data={data} />;
    case 'END':
      return <EndNodeContent data={data} />;
    case 'HTTP':
      return <HttpNodeContent data={data} />;
    case 'SHELL':
      return <ShellNodeContent data={data} />;
    default:
      return (
        <div className="px-3 pb-2">
          <div className="rounded-lg border border-dashed border-[#d0d5dd] bg-[#f9fafb] px-2.5 py-2 text-[10px] text-[#667085]">
            旧节点类型：{data.nodeType}。当前设计器仅支持 Start、End、HTTP 和
            Shell。
          </div>
        </div>
      );
  }
};

export default NodeContent;
