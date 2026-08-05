import {
  Braces,
  Check,
  CircleStop,
  DatabaseZap,
  GitBranch,
  Play,
  Route,
} from 'lucide-react';
import { Handle, Position, type NodeProps } from 'reactflow';

import { inputMappingProgress } from '../mapping';
import type { WorkflowV2CanvasNodeData } from '../model';

const iconFor = (kind: WorkflowV2CanvasNodeData['kind']) => {
  if (kind === 'START') return <Play size={16} />;
  if (kind === 'END') return <CircleStop size={16} />;
  return <DatabaseZap size={16} />;
};

const kindLabel = (kind: WorkflowV2CanvasNodeData['kind']) => {
  if (kind === 'START') return 'START';
  if (kind === 'END') return 'END';
  return 'TASK VERSION';
};

const iconClass = (kind: WorkflowV2CanvasNodeData['kind']) => {
  if (kind === 'TASK') {
    return 'bg-[var(--yak-brand-color-soft)] text-[var(--yak-brand-color)]';
  }
  return 'bg-[#f2f4f7] text-[#344054]';
};

const handleClass =
  '!h-3 !w-3 !border-[2px] !border-white !shadow-[0_0_0_1px_rgba(16,24,40,0.18)]';

const MappingStatus = ({ data }: { data: WorkflowV2CanvasNodeData }) => {
  if (data.kind === 'END') {
    const count = Object.keys(data.outputBindings).length;
    return (
      <span className="inline-flex items-center gap-1 text-[9px] text-[#667085]">
        <Route size={11} />
        {count ? `${count} 个工作流输出` : '未定义工作流输出'}
      </span>
    );
  }
  if (data.kind !== 'TASK') return null;
  if (data.taskMeta?.schemaStatus === 'loading') {
    return <span className="text-[9px] text-[#98a2b3]">正在加载 Schema</span>;
  }
  if (data.taskMeta?.schemaStatus === 'error') {
    return <span className="text-[9px] text-[#d92d20]">Schema 加载失败</span>;
  }
  const progress = inputMappingProgress({ data });
  if (!progress.declared) {
    return <span className="text-[9px] text-[#98a2b3]">无声明输入</span>;
  }
  const complete = progress.requiredMapped === progress.required;
  return (
    <span
      className={[
        'inline-flex items-center gap-1 text-[9px]',
        complete ? 'text-[#027a48]' : 'text-[#d92d20]',
      ].join(' ')}
    >
      <Route size={11} />
      {progress.mapped}/{progress.declared} 输入已映射
    </span>
  );
};

const WorkflowV2NodeCard = ({
  data,
  selected,
}: NodeProps<WorkflowV2CanvasNodeData>) => {
  const task = data.taskRef;
  const meta = data.taskMeta;
  const subtitle =
    data.kind === 'TASK'
      ? [meta?.projectName, meta?.folderName].filter(Boolean).join(' / ') ||
        '已发布任务'
      : data.description;

  return (
    <div
      className={[
        'group relative w-[252px] overflow-hidden rounded-xl border bg-white',
        'shadow-[0_5px_16px_rgba(16,24,40,0.07)] transition-[border-color,box-shadow,transform]',
        selected
          ? 'border-[var(--yak-brand-color)] shadow-[0_0_0_3px_var(--yak-brand-color-outline),0_10px_24px_rgba(16,24,40,0.12)]'
          : 'border-[#dfe3e8] hover:-translate-y-px hover:border-[#c7ccd4] hover:shadow-[0_9px_22px_rgba(16,24,40,0.10)]',
        data.enabled ? '' : 'opacity-55',
      ].join(' ')}
    >
      {data.kind !== 'START' && (
        <Handle
          id="INPUT"
          type="target"
          position={Position.Left}
          className={`${handleClass} !bg-[#667085]`}
        />
      )}

      <div className="flex min-h-[54px] items-center gap-2.5 px-3.5 py-2.5">
        <span
          className={[
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            iconClass(data.kind),
          ].join(' ')}
        >
          {iconFor(data.kind)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <strong className="block min-w-0 flex-1 truncate text-[13px] font-semibold text-[#161823]">
              {data.title}
            </strong>
            {data.kind === 'TASK' && task && (
              <span className="shrink-0 rounded bg-[#f2f4f7] px-1.5 py-0.5 text-[9px] font-semibold text-[#667085]">
                v{task.taskVersionNumber}
              </span>
            )}
          </div>
          <span className="mt-0.5 block truncate text-[10px] font-medium uppercase tracking-[0.055em] text-[#98a2b3]">
            {kindLabel(data.kind)}
          </span>
        </div>
      </div>

      <div className="border-t border-[#f0f1f3] px-3.5 py-2.5">
        <p className="m-0 line-clamp-2 min-h-[34px] text-[11px] leading-[17px] text-[#667085]">
          {subtitle || '暂无描述'}
        </p>

        {(data.kind === 'TASK' || data.kind === 'END') && (
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#f2f4f7] pt-2">
            {data.kind === 'TASK' && task ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-[#475467]">
                <Braces size={12} className="shrink-0" />
                <span className="truncate">{task.taskType}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#475467]">
                <Braces size={12} />
                输出契约
              </span>
            )}
            <MappingStatus data={data} />
          </div>
        )}

        {data.kind === 'TASK' && task && (
          <div className="mt-1.5 flex justify-end">
            <span className="inline-flex items-center gap-1 text-[9px] text-[#98a2b3]">
              <Check size={11} />
              固定发布版本
            </span>
          </div>
        )}
      </div>

      {data.kind !== 'END' && (
        <Handle
          id="SUCCESS"
          type="source"
          position={Position.Right}
          className={`${handleClass} !bg-[#667085]`}
          style={{ top: data.kind === 'TASK' ? '42%' : '50%' }}
        />
      )}

      {data.kind === 'TASK' && (
        <>
          <Handle
            id="FAILURE"
            type="source"
            position={Position.Right}
            className={`${handleClass} !bg-[#f04438]`}
            style={{ top: '76%' }}
          />
          <span className="pointer-events-none absolute -right-[72px] top-[calc(76%-8px)] inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] text-[#d92d20] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
            <GitBranch size={10} />
            失败
          </span>
        </>
      )}
    </div>
  );
};

export default WorkflowV2NodeCard;
