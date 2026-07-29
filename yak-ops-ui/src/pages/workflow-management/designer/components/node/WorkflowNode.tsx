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
  '!h-2 !w-2 !border-2 !border-white !bg-[#98a2b3]',
  '!shadow-[0_0_0_1px_#98a2b3]',
  'hover:!h-[10px] hover:!w-[10px] hover:!bg-[#155eef]',
  'hover:!shadow-[0_0_0_1px_#155eef]',
].join(' ');

const WorkflowNode = ({ id, data, selected }: NodeProps<WorkflowNodeData>) => {
  const meta = getNodeMeta(data.nodeType);
  const status = data.runningStatus || 'idle';

  if (data.nodeType === 'NOTE') {
    return (
      <div
        className={[
          'min-h-[110px] w-[220px] rounded-xl border border-[#f4d35e]',
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
          <strong className="text-[12px]">{data.title || '注释'}</strong>
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
        'group relative w-[224px] rounded-xl transition-[filter,opacity] duration-150',
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
          'overflow-hidden rounded-xl border bg-white',
          'shadow-[0_1px_2px_rgba(16,24,40,0.05),0_4px_12px_rgba(16,24,40,0.06)]',
          'transition-[box-shadow,border-color] duration-150',
          'group-hover:border-[#b9c2cf] group-hover:shadow-[0_8px_20px_rgba(16,24,40,0.10)]',
          selected
            ? 'border-[#155eef] shadow-[0_0_0_2px_rgba(21,94,239,0.16),0_8px_22px_rgba(21,94,239,0.10)]'
            : 'border-[#dfe4ea]',
          shellStatusClass[status],
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <header className="flex h-[43px] items-center justify-between px-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--node-color)_10%,white)]">
              <NodeIcon type={data.nodeType} size={17} />
            </span>
            <div className="min-w-0">
              <strong
                className="block max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold text-[#344054]"
                title={data.title}
              >
                {data.title || meta.title}
              </strong>
              <span className="block text-[9px] uppercase tracking-[0.04em] text-[#98a2b3]">
                {meta.title}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label="节点操作"
            className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#98a2b3] opacity-0 hover:bg-[#f2f4f7] hover:text-[#475467] group-hover:opacity-100"
          >
            <MoreHorizontal size={15} />
          </button>
        </header>

        <div className="min-h-[56px] border-t border-[#f0f1f4] px-3 py-2.5">
          <p className="line-clamp-2 text-[10px] leading-[16px] text-[#667085]">
            {data.description || meta.description}
          </p>
          {data.nodeType === 'LLM' && (
            <div className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap rounded-md bg-[#f5f7fa] px-2 py-1 text-[9px] text-[#475467]">
              {String(data.config.provider || 'OpenAI')} ·{' '}
              {String(data.config.model || '模型未选择')}
            </div>
          )}
          {data.nodeType === 'HTTP' && (
            <div className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap rounded-md bg-[#f5f7fa] px-2 py-1 text-[9px] text-[#475467]">
              {String(data.config.method || 'GET')} ·{' '}
              {String(data.config.url || '未配置 URL')}
            </div>
          )}
          {data.nodeType === 'CONDITION' && (
            <div className="mt-2 flex gap-1.5">
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

        <footer className="flex h-[29px] items-center justify-between border-t border-[#f0f1f4] bg-[#fcfcfd] px-3 text-[9px] text-[#98a2b3]">
          <span
            className={[
              'inline-flex items-center gap-1',
              footerStatusClass[status],
            ].join(' ')}
          >
            {status === 'running' && <RotateCw size={11} className="animate-spin" />}
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
              'nodrag absolute right-[-31px] top-1/2 flex h-[21px] w-[21px] -translate-y-1/2',
              'items-center justify-center rounded-full border border-[#d0d5dd] bg-white text-[#667085]',
              'opacity-0 shadow-[0_3px_8px_rgba(16,24,40,0.09)] transition-all duration-150',
              'hover:border-[#84adff] hover:text-[#155eef] group-hover:opacity-100',
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
