import {
  CheckCircle2,
  CircleAlert,
  MoreHorizontal,
  Plus,
  RotateCw,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Handle, Position } from 'reactflow';
import type { WorkflowNodeData } from '../../../types';
import type { WorkflowNodeMeta } from '../../constants';
import NodeIcon from './NodeIcon';
import {
  nodeStatusBorderClass,
  nodeStatusLabel,
  nodeStatusTextClass,
} from './node.helpers';

interface BaseNodeProps {
  id: string;
  data: WorkflowNodeData;
  meta: WorkflowNodeMeta;
  selected: boolean;
  children: ReactNode;
}

const handleClass = [
  '!top-4 !h-4 !w-4 !translate-y-0 !rounded-none !border-0 !bg-transparent',
  '!outline-none transition-transform hover:scale-125',
].join(' ');

const StatusIcon = ({
  status,
}: {
  status: NonNullable<WorkflowNodeData['runningStatus']>;
}) => {
  if (status === 'running') return <RotateCw size={14} className="animate-spin" />;
  if (status === 'success') return <CheckCircle2 size={14} />;
  if (status === 'failed') return <CircleAlert size={14} />;
  return null;
};

const BaseNode = ({ id, data, meta, selected, children }: BaseNodeProps) => {
  const status = data.runningStatus || 'idle';
  const showRuntimeMeta =
    !data.enabled || data.retryTimes > 0 || data.timeoutSeconds > 0 || status !== 'idle';

  const openQuickAdd = () => {
    window.dispatchEvent(
      new CustomEvent('yak-workflow-quick-add', {
        detail: { nodeId: id },
      }),
    );
  };

  return (
    <div
      className={[
        'group relative flex rounded-2xl border p-[1px] transition-[filter,opacity] duration-150',
        selected ? 'border-[#155eef]' : 'border-transparent',
        data.enabled ? '' : 'opacity-60 grayscale-[0.25]',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--node-color': meta.color } as CSSProperties}
    >
      <div
        className={[
          'relative w-[240px] rounded-[15px] border bg-white pb-1',
          'shadow-[0_1px_2px_rgba(16,24,40,0.06),0_4px_10px_rgba(16,24,40,0.06)]',
          'transition-[border-color,box-shadow] duration-150',
          'group-hover:shadow-[0_8px_24px_rgba(16,24,40,0.12)]',
          status === 'idle' ? 'border-[#eaecf0]' : nodeStatusBorderClass[status],
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          className={[
            'invisible absolute -top-7 right-0 z-20 flex h-7 pb-1',
            'group-hover:visible',
            selected ? 'visible' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="nodrag nopan nowheel flex h-6 items-center rounded-lg border border-[#e4e7ec] bg-white/95 px-0.5 text-[#667085] shadow-md backdrop-blur-[5px]">
            <button
              type="button"
              aria-label="节点操作"
              title="节点操作"
              className="flex h-5 w-5 items-center justify-center rounded-md border-0 bg-transparent hover:bg-[#f2f4f7] hover:text-[#344054]"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal size={13} />
            </button>
          </div>
        </div>

        {data.nodeType !== 'START' && (
          <Handle
            id="target"
            type="target"
            position={Position.Left}
            className={`${handleClass} !-left-[9px]`}
          >
            <span className="absolute left-[7px] top-1 h-2 w-0.5 rounded-full bg-[#98a2b3]" />
          </Handle>
        )}

        {data.nodeType !== 'END' && (
          <>
            <Handle
              id="source"
              type="source"
              position={Position.Right}
              className={`${handleClass} !-right-[9px]`}
            >
              <span className="absolute right-[7px] top-1 h-2 w-0.5 rounded-full bg-[#98a2b3]" />
            </Handle>
            <button
              type="button"
              className={[
                'nodrag nopan absolute right-[-28px] top-[5px] z-10 flex h-[22px] w-[22px]',
                'items-center justify-center rounded-full border border-[#d0d5dd] bg-white text-[#667085]',
                'opacity-0 shadow-[0_3px_8px_rgba(16,24,40,0.10)] transition-all duration-150',
                'hover:border-[#84adff] hover:bg-[#f5f8ff] hover:text-[#155eef]',
                'group-hover:opacity-100',
                selected ? 'opacity-100' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label="添加后续节点"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                openQuickAdd();
              }}
            >
              <Plus size={12} strokeWidth={2.2} />
            </button>
          </>
        )}

        <header className="flex items-center rounded-t-2xl px-3 pb-2 pt-3">
          <span className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--node-color)_10%,white)]">
            <NodeIcon type={data.nodeType} size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <strong
              className="block truncate text-[12px] font-semibold uppercase tracking-[0.01em] text-[#344054]"
              title={data.title}
            >
              {data.title || meta.title}
            </strong>
            {data.title && data.title !== meta.title && (
              <span className="mt-0.5 block truncate text-[9px] text-[#98a2b3]">
                {meta.title}
              </span>
            )}
          </div>
          {status !== 'idle' && (
            <span
              className={`ml-2 inline-flex shrink-0 items-center ${nodeStatusTextClass[status]}`}
              title={nodeStatusLabel[status]}
            >
              <StatusIcon status={status} />
            </span>
          )}
        </header>

        {children}

        {data.description && (
          <p className="px-3 pb-2 pt-1 text-[10px] leading-[16px] text-[#98a2b3]">
            {data.description}
          </p>
        )}

        {showRuntimeMeta && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-[#f2f4f7] px-3 pb-1.5 pt-2 text-[9px] text-[#98a2b3]">
            {!data.enabled && (
              <span className="rounded-md bg-[#f2f4f7] px-1.5 py-0.5 text-[#667085]">
                已停用
              </span>
            )}
            {status !== 'idle' && (
              <span className={nodeStatusTextClass[status]}>{nodeStatusLabel[status]}</span>
            )}
            {data.retryTimes > 0 && <span>重试 {data.retryTimes}</span>}
            {data.timeoutSeconds > 0 && <span>超时 {data.timeoutSeconds}s</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseNode;
