import { MoreHorizontal, Plus, RotateCw } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { WorkflowNodeData } from '../../../types';
import { getNodeMeta } from '../../constants';
import NodeIcon from './NodeIcon';

const statusLabelMap = {
  idle: '',
  running: '运行中',
  success: '成功',
  failed: '失败',
};

const shellStatusClass = {
  idle: '',
  running: 'border-[#6172f3]',
  success: 'border-[#12b76a]',
  failed: 'border-[#f04438]',
};

const footerStatusClass = {
  idle: '',
  running: 'text-[#4f46e5]',
  success: 'text-[#039855]',
  failed: 'text-[#d92d20]',
};

const handleClass = [
  '!h-[9px] !w-[9px] !border-2 !border-white !bg-[#98a2b3]',
  '!shadow-[0_0_0_1px_#98a2b3]',
  'hover:!h-[11px] hover:!w-[11px] hover:!bg-[#5d5fef]',
  'hover:!shadow-[0_0_0_1px_#5d5fef]',
].join(' ');

const WorkflowNode = ({ id, data, selected }: NodeProps<WorkflowNodeData>) => {
  const meta = getNodeMeta(data.nodeType);
  const status = data.runningStatus || 'idle';

  if (data.nodeType === 'NOTE') {
    return (
      <div
        className={[
          'w-[230px] min-h-[120px] rounded-lg border border-[#f4d35e]',
          'bg-[#fff9c9] px-3.5 py-3 text-[#713f12]',
          'shadow-[0_4px_12px_rgba(113,63,18,0.10)]',
          selected
            ? 'shadow-[0_0_0_2px_rgba(234,179,8,0.24),0_8px_20px_rgba(113,63,18,0.14)]'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flex items-center gap-1.5">
          <NodeIcon type="NOTE" size={16} />
          <strong className="text-[11px]">{data.title || '注释'}</strong>
        </div>
        <p className="mt-2.5 whitespace-pre-wrap text-[11px] leading-[18px] text-[#854d0e]">
          {String(data.config.content || data.description || '注释内容')}
        </p>
      </div>
    );
  }

  return (
    <div
      className={[
        'group relative w-[250px] rounded-[17px] transition-[filter,opacity] duration-150',
        data.enabled ? '' : 'opacity-55 grayscale-[0.3]',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--node-color': meta.color } as CSSProperties}
    >
      {data.nodeType !== 'START' && (
        <Handle type="target" position={Position.Left} className={handleClass} />
      )}

      <div
        className={[
          'overflow-hidden rounded-[15px] border bg-white/95',
          'shadow-[0_0_0_1px_rgba(208,213,221,0.8),0_4px_12px_rgba(16,24,40,0.08),0_1px_2px_rgba(16,24,40,0.04)]',
          'transition-[box-shadow,border-color] duration-150',
          'group-hover:shadow-[0_0_0_1px_rgba(152,162,179,0.9),0_10px_24px_rgba(16,24,40,0.11)]',
          selected
            ? 'border-[#7467f5] shadow-[0_0_0_2px_rgba(109,94,252,0.2),0_10px_26px_rgba(79,70,229,0.14)]'
            : 'border-transparent',
          shellStatusClass[status],
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <header className="flex h-[47px] items-center justify-between border-b border-[#f0f1f4] pl-3 pr-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--node-color)_10%,white)]">
              <NodeIcon type={data.nodeType} size={17} />
            </span>
            <strong
              className="max-w-[165px] overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-[#344054]"
              title={data.title}
            >
              {data.title || meta.title}
            </strong>
          </div>
          <button
            type="button"
            aria-label="节点操作"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md border-0 bg-transparent text-[#98a2b3] opacity-0 hover:bg-[#f2f4f7] hover:text-[#475467] group-hover:opacity-100"
          >
            <MoreHorizontal size={15} />
          </button>
        </header>

        <div className="min-h-[76px] px-3 pb-[9px] pt-2.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.05em] text-[var(--node-color)]">
            {meta.title}
          </span>
          <p className="mt-1 line-clamp-2 text-[11px] leading-[17px] text-[#667085]">
            {data.description || meta.description}
          </p>
          {data.nodeType === 'LLM' && (
            <div className="mt-[9px] overflow-hidden text-ellipsis whitespace-nowrap rounded-md bg-[#f8f9fb] px-2 py-1.5 text-[10px] text-[#475467]">
              {String(data.config.provider || 'OpenAI')} ·{' '}
              {String(data.config.model || '模型未选择')}
            </div>
          )}
          {data.nodeType === 'HTTP' && (
            <div className="mt-[9px] overflow-hidden text-ellipsis whitespace-nowrap rounded-md bg-[#f8f9fb] px-2 py-1.5 text-[10px] text-[#475467]">
              {String(data.config.method || 'GET')} ·{' '}
              {String(data.config.url || '未配置 URL')}
            </div>
          )}
          {data.nodeType === 'CONDITION' && (
            <div className="mt-[9px] flex gap-1.5">
              {['IF', 'ELSE'].map((branch) => (
                <span
                  key={branch}
                  className="flex-1 rounded-md border border-[#e4e7ec] bg-[#fcfcfd] px-2 py-1 text-center text-[9px] text-[#667085]"
                >
                  {branch}
                </span>
              ))}
            </div>
          )}
        </div>

        <footer className="flex h-[34px] items-center justify-between border-t border-[#f0f1f4] bg-[#fcfcfd] px-3 text-[9px] text-[#98a2b3]">
          <span className={['inline-flex items-center gap-1', footerStatusClass[status]].join(' ')}>
            {status === 'running' && <RotateCw size={12} className="animate-spin" />}
            {statusLabelMap[status] || (data.enabled ? '已配置' : '已停用')}
          </span>
          {(data.retryTimes > 0 || data.timeoutSeconds > 0) && (
            <small className="text-[9px]">
              {data.retryTimes > 0 ? `重试 ${data.retryTimes}` : ''}
              {data.retryTimes > 0 && data.timeoutSeconds > 0 ? ' · ' : ''}
              {data.timeoutSeconds > 0 ? `${data.timeoutSeconds}s` : ''}
            </small>
          )}
        </footer>
      </div>

      {data.nodeType !== 'END' && (
        <>
          <Handle type="source" position={Position.Right} className={handleClass} />
          <button
            type="button"
            className={[
              'nodrag absolute right-[-34px] top-1/2 flex h-[22px] w-[22px] -translate-y-1/2',
              'items-center justify-center rounded-full border border-[#d0d5dd] bg-white text-[#667085]',
              'opacity-0 shadow-[0_3px_8px_rgba(16,24,40,0.09)] transition-all duration-150',
              'hover:border-[#8b83fa] hover:text-[#5d5fef] group-hover:opacity-100',
              selected ? 'opacity-100' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label="添加后续节点"
            onClick={(event) => {
              event.stopPropagation();
              window.dispatchEvent(
                new CustomEvent('yak-workflow-quick-add', {
                  detail: { nodeId: id },
                }),
              );
            }}
          >
            <Plus size={12} />
          </button>
        </>
      )}
    </div>
  );
};

export default WorkflowNode;
