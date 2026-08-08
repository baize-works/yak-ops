import { GitBranch, Plus, Variable } from 'lucide-react';
import type { NodeProps } from 'reactflow';
import { useStore } from 'reactflow';
import WorkflowTaskPicker from '../WorkflowTaskPicker';
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
  const hasNextNode = useStore((state) => state.edges.some((edge) => edge.source === id));
  const canAddFirstNode = !data.locked
    && !hasNextNode
    && Boolean(data.onAppend)
    && Boolean(data.appendOptions?.length);

  return (
    <div className="group relative w-60">
      <div
        className={[
          'relative overflow-hidden rounded-[15px] border bg-white',
          'shadow-[0_4px_14px_rgba(22,24,35,.07),0_1px_2px_rgba(22,24,35,.04)]',
          'transition-[border-color,box-shadow] duration-150',
          'group-hover:shadow-[0_10px_30px_rgba(22,24,35,.10),0_2px_6px_rgba(22,24,35,.04)]',
          selected
            ? 'border-[#fe2c55] shadow-[0_0_0_2px_rgba(254,44,85,.08),0_8px_22px_rgba(22,24,35,.09)]'
            : 'border-[#e5e8ec] group-hover:border-[#d4d8de]',
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

        {canAddFirstNode && data.onAppend ? (
          <div className="border-t border-[#f0f1f3] bg-[#fafbfc] p-2">
            <WorkflowTaskPicker
              options={data.appendOptions || []}
              placement="rightTop"
              onSelect={(taskId) => data.onAppend?.(id, taskId)}
            >
              <button
                type="button"
                className="nodrag nopan flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#d8dce3] bg-white text-[11px] font-medium text-[#667085] transition-colors hover:border-[rgba(254,44,85,.35)] hover:bg-[rgba(254,44,85,.035)] hover:text-[#fe2c55]"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <Plus size={13} strokeWidth={2} />
                添加第一个节点
              </button>
            </WorkflowTaskPicker>
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
