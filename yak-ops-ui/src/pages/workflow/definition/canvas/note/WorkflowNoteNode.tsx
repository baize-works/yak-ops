import { Copy, Trash2 } from 'lucide-react';
import { memo } from 'react';
import { NodeResizer, type NodeProps } from 'reactflow';
import type { WorkflowNoteData, WorkflowNoteTheme } from './types';

const THEME_META: Record<WorkflowNoteTheme, {
  background: string;
  accent: string;
  border: string;
}> = {
  blue: { background: '#eef6ff', accent: '#4f8cff', border: '#8cb8ff' },
  cyan: { background: '#ecfbfb', accent: '#22a6a6', border: '#78d7d7' },
  green: { background: '#effaf2', accent: '#3d9b62', border: '#8fd0a7' },
  yellow: { background: '#fff9e8', accent: '#d69a00', border: '#edcb6a' },
  pink: { background: '#fff1f5', accent: '#e05a83', border: '#f2a0b9' },
  violet: { background: '#f5f0ff', accent: '#8b5cf6', border: '#c3a6ff' },
};

const THEMES = Object.keys(THEME_META) as WorkflowNoteTheme[];

const WorkflowNoteNode = ({ id, data, selected }: NodeProps<WorkflowNoteData>) => {
  const theme = THEME_META[data.theme] || THEME_META.blue;
  const editable = selected && !data.locked;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-visible rounded-md border shadow-[0_1px_3px_rgba(22,24,35,.08)] transition-shadow hover:shadow-[0_6px_18px_rgba(22,24,35,.10)]"
      style={{
        backgroundColor: theme.background,
        borderColor: selected ? theme.border : 'rgba(22,24,35,.06)',
      }}
    >
      <NodeResizer
        isVisible={Boolean(selected && !data.locked)}
        minWidth={240}
        minHeight={88}
        color={theme.accent}
        lineStyle={{ borderWidth: 1 }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,.95)',
        }}
        onResizeEnd={() => data.onCommit?.(id, '注释大小已调整')}
      />

      <div
        className="h-2 shrink-0 rounded-t-[5px] opacity-55"
        style={{ backgroundColor: theme.accent }}
      />

      {selected && !data.locked ? (
        <div className="nodrag nopan pointer-events-auto absolute -top-10 left-1/2 z-40 flex h-8 -translate-x-1/2 items-center gap-1 rounded-lg border border-[#e4e7ec] bg-white px-1.5 shadow-[0_6px_18px_rgba(22,24,35,.12)]">
          <div className="flex items-center gap-0.5 pr-1">
            {THEMES.map((item) => (
              <button
                key={item}
                type="button"
                aria-label={`切换为${item}主题`}
                className="flex h-6 w-6 items-center justify-center rounded-md border-0 bg-transparent hover:bg-[#f5f6f7]"
                onClick={(event) => {
                  event.stopPropagation();
                  data.onChange?.(id, { theme: item });
                  data.onCommit?.(id, '注释主题已修改');
                }}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-black/5"
                  style={{ backgroundColor: THEME_META[item].accent }}
                />
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[#e4e7ec]" />

          <button
            type="button"
            aria-label="复制注释"
            className="flex h-6 w-6 items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f5f6f7] hover:text-[#344054]"
            onClick={(event) => {
              event.stopPropagation();
              data.onDuplicate?.(id);
            }}
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            aria-label="删除注释"
            className="flex h-6 w-6 items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#fff1f3] hover:text-[#d92d50]"
            onClick={(event) => {
              event.stopPropagation();
              data.onDelete?.(id);
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden px-3 py-2.5">
        <textarea
          value={data.text}
          readOnly={!editable}
          placeholder="输入注释..."
          className={[
            'h-full min-h-[52px] w-full resize-none border-0 bg-transparent p-0 text-[12px] leading-5 text-[#475467] outline-none placeholder:text-[#98a2b3]',
            editable ? 'nodrag nopan nowheel cursor-text' : 'pointer-events-none cursor-default',
          ].join(' ')}
          onChange={(event) => data.onChange?.(id, { text: event.target.value })}
          onBlur={() => data.onCommit?.(id, '注释内容已修改')}
          onKeyDown={(event) => event.stopPropagation()}
        />
      </div>
    </div>
  );
};

export default memo(WorkflowNoteNode);
