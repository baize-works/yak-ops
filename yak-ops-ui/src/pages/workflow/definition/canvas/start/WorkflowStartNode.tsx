import { GitBranch, Variable } from 'lucide-react';
import type { NodeProps } from 'reactflow';
import WorkflowNodeHandle from '../node/WorkflowNodeHandle';
import type { WorkflowStartNodeData } from './types';

const TYPE_LABEL: Record<string, string> = {
  STRING: 'String',
  NUMBER: 'Number',
  BOOLEAN: 'Boolean',
  FILE: 'File',
  ARRAY_STRING: 'Array[String]',
};

const WorkflowStartNode = ({ id, data, selected }: NodeProps<WorkflowStartNodeData>) => {
  const visibleInputs = data.inputs.slice(0, 3);
  const moreCount = Math.max(0, data.inputs.length - visibleInputs.length);

  return (
    <div className="group relative w-60">
      <div
        className={[
          'relative overflow-hidden rounded-[15px] border bg-white',
          'shadow-[0_1px_2px_rgba(22,24,35,.06)]',
          'transition-[border-color,box-shadow] duration-150',
          'group-hover:shadow-[0_6px_18px_rgba(22,24,35,.10)]',
          selected
            ? 'border-[#fe2c55] shadow-[0_0_0_2px_rgba(254,44,85,.08)]'
            : 'border-[#e8e9ec] group-hover:border-[#d7d9de]',
        ].join(' ')}
      >
        <div className="flex min-h-9 items-center gap-2.5 px-3 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#eaf2ff] text-[#155eef]">
            <GitBranch size={18} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-5 text-[#161823]">
            开始
          </div>
        </div>

        {visibleInputs.length ? (
          <div className="border-t border-[#f0f1f3] px-3 py-2">
            <div className="space-y-1">
              {visibleInputs.map((field) => (
                <div
                  key={field.id}
                  className="flex h-6 items-center gap-1.5 rounded-md bg-[#f5f6f7] px-1.5 text-[10px]"
                >
                  <Variable size={12} className="shrink-0 text-[#155eef]" />
                  <span className="min-w-0 flex-1 truncate text-[#475467]">{field.name}</span>
                  {field.required ? (
                    <span className="shrink-0 text-[9px] font-medium text-[#98a2b3]">必填</span>
                  ) : null}
                  <span className="shrink-0 text-[9px] text-[#98a2b3]">{TYPE_LABEL[field.type] || field.type}</span>
                </div>
              ))}
              {moreCount ? (
                <div className="px-1 text-[9px] text-[#98a2b3]">还有 {moreCount} 个输入字段</div>
              ) : null}
            </div>
          </div>
        ) : null}
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
};

export default WorkflowStartNode;
