import { Input } from 'antd';
import { ChevronLeft, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkflowNodeType } from '../../../types';
import {
  CATEGORY_LABELS,
  WORKFLOW_NODE_CATALOG,
  type WorkflowNodeMeta,
} from '../../constants';
import NodeIcon from '../node/NodeIcon';

interface BlockSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: WorkflowNodeType) => void;
  compact?: boolean;
}

const categoryOrder: WorkflowNodeMeta['category'][] = [
  'trigger',
  'ai',
  'integration',
  'transform',
  'logic',
  'annotation',
];

const BlockSelector = ({ open, onClose, onSelect }: BlockSelectorProps) => {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] =
    useState<WorkflowNodeMeta['category'] | 'all'>('all');

  const filtered = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return WORKFLOW_NODE_CATALOG.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!normalized) return true;
      return `${item.title} ${item.description} ${item.type}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [category, keyword]);

  if (!open) return null;

  return (
    <aside
      className={[
        'absolute left-4 top-[116px] z-40 flex w-[390px] max-h-[calc(100vh-145px)]',
        'flex-col overflow-hidden rounded-[14px] border border-[#d0d5dd]/90 bg-white/[0.97]',
        'shadow-[0_18px_50px_rgba(16,24,40,0.17)] backdrop-blur-[14px]',
        'max-sm:w-[calc(100vw-32px)]',
      ].join(' ')}
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
          <strong className="text-[13px] text-[#344054]">添加节点</strong>
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

      <div className="mx-2.5 mb-2 mt-2.5 flex h-[37px] shrink-0 items-center gap-1.5 rounded-lg border border-[#d0d5dd] bg-white px-2.5 text-[#98a2b3]">
        <Search size={15} />
        <Input
          bordered={false}
          autoFocus
          value={keyword}
          placeholder="搜索节点"
          onChange={(event) => setKeyword(event.target.value)}
          allowClear
          className="bg-transparent text-xs"
        />
      </div>

      <div className="flex shrink-0 gap-1 overflow-x-auto px-2.5 pb-2 [scrollbar-width:none]">
        <button
          type="button"
          className={[
            'h-[27px] shrink-0 rounded-md border-0 px-2.5 text-[10px]',
            category === 'all'
              ? 'bg-[#eeefff] font-semibold text-[#4f46e5]'
              : 'bg-[#f2f4f7] text-[#667085]',
          ].join(' ')}
          onClick={() => setCategory('all')}
        >
          全部
        </button>
        {categoryOrder.map((value) => (
          <button
            key={value}
            type="button"
            className={[
              'h-[27px] shrink-0 rounded-md border-0 px-2.5 text-[10px]',
              category === value
                ? 'bg-[#eeefff] font-semibold text-[#4f46e5]'
                : 'bg-[#f2f4f7] text-[#667085]',
            ].join(' ')}
            onClick={() => setCategory(value)}
          >
            {CATEGORY_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2.5">
        {categoryOrder.map((group) => {
          const items = filtered.filter((item) => item.category === group);
          if (!items.length) return null;
          return (
            <section key={group}>
              <h3 className="mx-1.5 mb-1.5 mt-2.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#98a2b3]">
                {CATEGORY_LABELS[group]}
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className={[
                      'grid min-h-[58px] grid-cols-[30px_minmax(0,1fr)_16px] items-center gap-2',
                      'rounded-lg border border-transparent bg-transparent px-2 py-2 text-left text-[#344054]',
                      'hover:border-[#dddafe] hover:bg-[#f8f7ff]',
                    ].join(' ')}
                    onClick={() => {
                      onSelect(item.type);
                      onClose();
                    }}
                  >
                    <span className="flex h-[29px] w-[29px] items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--node-color)_10%,white)]">
                      <NodeIcon type={item.type} size={18} />
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-[11px]">{item.title}</strong>
                      <small className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-[#98a2b3]">
                        {item.description}
                      </small>
                    </span>
                    <Plus size={15} className="text-[#98a2b3]" />
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
