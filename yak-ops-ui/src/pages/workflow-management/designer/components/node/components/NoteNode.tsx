import type { WorkflowNodeData } from '../../../../types';
import NodeIcon from '../NodeIcon';

interface NoteNodeProps {
  data: WorkflowNodeData;
  selected: boolean;
}

const NoteNode = ({ data, selected }: NoteNodeProps) => (
  <div
    className={[
      'w-[240px] rounded-xl border border-[#f5d565] bg-[#fffbe6] px-3.5 py-3',
      'text-[#713f12] shadow-[0_1px_2px_rgba(113,63,18,0.06),0_5px_14px_rgba(113,63,18,0.08)]',
      'transition-[border-color,box-shadow] duration-150 hover:border-[#eab308]',
      selected
        ? 'border-[#eab308] shadow-[0_0_0_2px_rgba(234,179,8,0.18),0_8px_20px_rgba(113,63,18,0.12)]'
        : '',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fff3b0]">
        <NodeIcon type="NOTE" size={16} />
      </span>
      <strong className="min-w-0 flex-1 truncate text-[12px] font-semibold">
        {data.title || '注释'}
      </strong>
    </div>
    <p className="mt-2.5 whitespace-pre-wrap text-[11px] leading-[18px] text-[#854d0e]">
      {String(data.config.content || data.description || '注释内容')}
    </p>
  </div>
);

export default NoteNode;
