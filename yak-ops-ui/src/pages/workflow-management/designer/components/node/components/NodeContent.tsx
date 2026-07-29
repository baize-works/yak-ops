import type { WorkflowNodeData } from '../../../../types';
import { getArrayLength, getConditionBranches, getText } from '../node.helpers';

const detailShellClass = [
  'flex min-h-8 items-center gap-2 rounded-lg',
  'bg-[#f5f7fa] px-2.5 py-2 text-[10px] text-[#475467]',
].join(' ');

const mutedTextClass =
  'min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[#667085]';

const CountDetail = ({ label, count }: { label: string; count: number }) => (
  <div className={detailShellClass}>
    <span className="font-medium text-[#344054]">{label}</span>
    <span className="ml-auto rounded-md bg-white px-1.5 py-0.5 text-[9px] text-[#667085] shadow-[0_0_0_1px_#e4e7ec]">
      {count}
    </span>
  </div>
);

const NodeContent = ({ data }: { data: WorkflowNodeData }) => {
  switch (data.nodeType) {
    case 'START':
      return (
        <div className="px-3 pb-2">
          <CountDetail
            label="输入变量"
            count={getArrayLength(data.config.inputVariables)}
          />
        </div>
      );
    case 'END':
      return (
        <div className="px-3 pb-2">
          <CountDetail label="输出变量" count={getArrayLength(data.config.outputs)} />
        </div>
      );
    case 'LLM':
      return (
        <div className="px-3 pb-2">
          <div className={detailShellClass}>
            <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[9px] font-medium text-[#6941c6] shadow-[0_0_0_1px_#e4e7ec]">
              {getText(data.config.provider, 'OpenAI')}
            </span>
            <span className={mutedTextClass}>
              {getText(data.config.model, '模型未选择')}
            </span>
          </div>
        </div>
      );
    case 'HTTP':
      return (
        <div className="px-3 pb-2">
          <div className={detailShellClass}>
            <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[#155eef] shadow-[0_0_0_1px_#d1e0ff]">
              {getText(data.config.method, 'GET').toUpperCase()}
            </span>
            <span className={mutedTextClass} title={getText(data.config.url)}>
              {getText(data.config.url, '未配置 URL')}
            </span>
          </div>
        </div>
      );
    case 'SHELL':
      return (
        <div className="px-3 pb-2">
          <div className={`${detailShellClass} font-mono`}>
            <span className={mutedTextClass} title={getText(data.config.command)}>
              {getText(data.config.command, '未配置执行命令')}
            </span>
          </div>
        </div>
      );
    case 'CODE':
      return (
        <div className="px-3 pb-2">
          <div className={detailShellClass}>
            <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[9px] font-medium text-[#b54708] shadow-[0_0_0_1px_#fedf89]">
              {getText(data.config.language, 'JavaScript')}
            </span>
            <span className={mutedTextClass}>main(inputs)</span>
          </div>
        </div>
      );
    case 'CONDITION':
      return (
        <div className="px-3 pb-2">
          <div className="flex gap-1.5">
            {getConditionBranches(data).map((branch, index) => (
              <span
                key={`${branch}-${index}`}
                className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-[#e4e7ec] bg-[#fcfcfd] px-2 py-1.5 text-center text-[9px] font-medium text-[#667085]"
                title={branch}
              >
                {branch}
              </span>
            ))}
          </div>
        </div>
      );
    case 'TEMPLATE':
      return (
        <div className="px-3 pb-2">
          <div className={detailShellClass}>
            <span className={mutedTextClass} title={getText(data.config.template)}>
              {getText(data.config.template, '未配置模板内容')}
            </span>
          </div>
        </div>
      );
    case 'VARIABLE':
      return (
        <div className="px-3 pb-2">
          <CountDetail
            label="变量赋值"
            count={getArrayLength(data.config.assignments)}
          />
        </div>
      );
    case 'ITERATION':
      return (
        <div className="px-3 pb-2">
          <div className={detailShellClass}>
            <span className={mutedTextClass} title={getText(data.config.source)}>
              {getText(data.config.source, '未配置迭代数组')}
            </span>
            <span className="shrink-0 text-[9px] text-[#98a2b3]">
              并行 {Number(data.config.parallel || 1)}
            </span>
          </div>
        </div>
      );
    case 'KNOWLEDGE':
      return (
        <div className="px-3 pb-2">
          <div className={detailShellClass}>
            <span className={mutedTextClass} title={getText(data.config.dataset)}>
              {getText(data.config.dataset, '未选择知识库')}
            </span>
            <span className="shrink-0 text-[9px] text-[#98a2b3]">
              Top {Number(data.config.topK || 3)}
            </span>
          </div>
        </div>
      );
    case 'QUESTION_CLASSIFIER':
      return (
        <div className="px-3 pb-2">
          <CountDetail label="分类" count={getArrayLength(data.config.classes)} />
        </div>
      );
    default:
      return (
        <div className="px-3 pb-2">
          <div className={detailShellClass}>
            <span className="shrink-0 font-medium text-[#344054]">
              {data.taskType}
            </span>
            <span className={mutedTextClass}>自定义任务节点</span>
          </div>
        </div>
      );
  }
};

export default NodeContent;
