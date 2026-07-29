import { Input } from 'antd';
import { ChevronLeft, Plus, Search, X } from 'lucide-react';
import { useMemo, useState, type MouseEvent } from 'react';
import type { WorkflowNodeType } from '../../../types';
import {
  CATEGORY_LABELS,
  WORKFLOW_NODE_CATALOG,
  type WorkflowNodeCategory,
} from '../../constants';
import NodeIcon from '../node/NodeIcon';

interface BlockSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: WorkflowNodeType) => void;
  compact?: boolean;
}

const categoryOrder: WorkflowNodeCategory[] = ['control', 'action'];

const BlockSelector = ({ open, onClose, onSelect }: BlockSelectorProps) => {
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    if (!normalized) return WORKFLOW_NODE_CATALOG;

    return WORKFLOW_NODE_CATALOG.filter((item) =>
      `${item.title} ${item.description} ${item.type}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [keyword]);

  if (!open) return null;

  return (
    <aside
      className={[
        'absolute left-4 top-[58px] z-40 flex max-h-[calc(100vh-132px)] w-[340px]',
        'flex-col overflow-hidden rounded-xl border border-[#d0d5dd] bg-white',
        'shadow-[0_18px_50px_rgba(16,24,40,0.16)] max-sm:w-[calc(100vw-32px)]',
      ].join(' ')}
      onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#eaecf0] px-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="返回"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7]"
          >
            <ChevronLeft size={17} />
          </button>
          <div>
            <strong className="block text-[13px] text-[#344054]">添加节点</strong>
            <span className="block text-[9px] text-[#98a2b3]">
              当前工作流仅支持 4 类节点
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="关闭"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7]"
        >
          <X size={17} />
        </button>
      </header>

      <div className="mx-2.5 mb-1.5 mt-2.5 flex h-[37px] shrink-0 items-center gap-1.5 rounded-lg border border-[#d0d5dd] bg-white px-2.5 text-[#98a2b3] focus-within:border-[#84adff] focus-within:shadow-[0_0_0_3px_rgba(21,94,239,0.08)]">
        <Search size={15} />
        <Input
          bordered={false}
          autoFocus
          value={keyword}
          placeholder="搜索开始、结束、HTTP、Shell"
          onChange={(event) => setKeyword(event.target.value)}
          allowClear
          className="bg-transparent text-xs"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {categoryOrder.map((group) => {
          const items = filtered.filter((item) => item.category === group);
          if (!items.length) return null;

          return (
            <section key={group}>
              <h3 className="mx-1.5 mb-1.5 mt-2.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#98a2b3]">
                {CATEGORY_LABELS[group]}
              </h3>
              <div className="space-y-1">
                {items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className={[
                      'group grid min-h-[62px] w-full grid-cols-[34px_minmax(0,1fr)_22px]',
                      'items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-left',
                      'text-[#344054] transition-colors hover:border-[#b2ccff] hover:bg-[#f5f8ff]',
                    ].join(' ')}
                    onClick={() => {
                      onSelect(item.type);
                      onClose();
                    }}
                  >
                    <span className="flex h-[32px] w-[32px] items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--node-color)_10%,white)]">
                      <NodeIcon type={item.type} size={18} />
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-[11px]">{item.title}</strong>
                      <small className="mt-0.5 block text-[9px] leading-[14px] text-[#98a2b3]">
                        {item.description}
                      </small>
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-md text-[#98a2b3] group-hover:bg-white group-hover:text-[#155eef]">
                      <Plus size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}

        {!filtered.length && (
          <div className="py-11 text-center text-[11px] text-[#98a2b3]">
            没有匹配的节点
          </div>
        )}
      </div>
    </aside>
  );
};

export default BlockSelector;
