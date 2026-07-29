import { Input } from 'antd';
import { Plus, Search } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';

import type { WorkflowNodeType } from '../../../types';
import {
  CATEGORY_LABELS,
  WORKFLOW_NODE_CATALOG,
  type WorkflowNodeCategory,
} from '../../constants';
import NodeIcon from '../node/NodeIcon';

interface NodePickerProps {
  onSelect: (type: WorkflowNodeType) => void;
  allowedTypes?: WorkflowNodeType[];
}

const categoryOrder: WorkflowNodeCategory[] = ['control', 'action'];

const NodePicker = ({ onSelect, allowedTypes }: NodePickerProps) => {
  const [keyword, setKeyword] = useState('');

  const visibleItems = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    const allowed = allowedTypes?.length ? new Set(allowedTypes) : undefined;

    return WORKFLOW_NODE_CATALOG.filter((item) => {
      if (allowed && !allowed.has(item.type)) return false;
      if (!normalized) return true;
      return `${item.title} ${item.description} ${item.type}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [allowedTypes, keyword]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-3 py-3">
        <Input
          allowClear
          autoFocus
          value={keyword}
          prefix={<Search size={15} className="text-[#98a2b3]" />}
          placeholder="搜索开始、结束、HTTP、Shell"
          className="h-9 rounded-lg border-[#d0d5dd] bg-[#fcfcfd]"
          onChange={(event) => setKeyword(event.target.value)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {categoryOrder.map((category) => {
          const items = visibleItems.filter((item) => item.category === category);
          if (!items.length) return null;

          return (
            <section key={category} className="mb-4 last:mb-0">
              <h3 className="mb-1.5 px-1 text-[12px] font-medium text-[#667085]">
                {CATEGORY_LABELS[category]}
              </h3>

              <div className="space-y-1">
                {items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className={[
                      'group flex min-h-[52px] w-full items-center gap-2.5',
                      'rounded-lg border border-transparent px-2 py-2 text-left',
                      'transition-colors duration-150',
                      'hover:border-[#d1e0ff] hover:bg-[#f5f8ff]',
                    ].join(' ')}
                    style={{ '--node-color': item.color } as CSSProperties}
                    onClick={() => onSelect(item.type)}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--node-color)_10%,white)]">
                      <NodeIcon type={item.type} size={18} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[13px] font-medium text-[#344054]">
                        {item.title}
                      </strong>
                      <span className="mt-0.5 block truncate text-[11px] text-[#98a2b3]">
                        {item.description}
                      </span>
                    </span>

                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#98a2b3] transition-colors group-hover:bg-white group-hover:text-[#155eef]">
                      <Plus size={15} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}

        {!visibleItems.length && (
          <div className="flex h-40 flex-col items-center justify-center text-[#98a2b3]">
            <Search size={20} />
            <span className="mt-2 text-[12px]">没有匹配的节点</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodePicker;
