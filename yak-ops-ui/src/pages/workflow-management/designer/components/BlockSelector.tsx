import { Input } from 'antd';
import { ChevronLeft, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchTaskPluginList } from '../../service';
import type { WorkflowNodeType, WorkflowTaskPluginRecord } from '../../types';
import {
  CATEGORY_LABELS,
  WORKFLOW_NODE_CATALOG,
  type WorkflowNodeMeta,
} from '../constants';
import { mergeTaskPluginCatalog } from '../taskPluginCatalog';
import NodeIcon from './node/NodeIcon';

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

const BlockSelector = ({ open, onClose, onSelect, compact = false }: BlockSelectorProps) => {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<WorkflowNodeMeta['category'] | 'all'>('all');
  const [plugins, setPlugins] = useState<WorkflowTaskPluginRecord[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const loadPlugins = async () => {
      try {
        const response = await fetchTaskPluginList();
        if (!active || response.code !== 0 || !Array.isArray(response.data)) return;
        mergeTaskPluginCatalog(response.data);
        setPlugins(response.data);
        setCatalogLoaded(true);
      } catch {
        // Keep the built-in visual catalog available when the backend catalog cannot be loaded.
      }
    };
    void loadPlugins();
    return () => {
      active = false;
    };
  }, []);

  const pluginsByType = useMemo(
    () => new Map(plugins.map((plugin) => [plugin.type, plugin])),
    [plugins],
  );

  const filtered = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return WORKFLOW_NODE_CATALOG.filter((item) => {
      if (catalogLoaded && !pluginsByType.has(item.backendType)) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (!normalized) return true;
      return `${item.title} ${item.description} ${item.type}`.toLowerCase().includes(normalized);
    });
  }, [catalogLoaded, category, keyword, pluginsByType]);

  if (!open) return null;

  return (
    <aside className={['dify-block-selector', compact ? 'is-compact' : ''].join(' ')}>
      <header>
        <div>
          <button type="button" aria-label="返回" onClick={onClose}>
            <ChevronLeft size={17} />
          </button>
          <strong>添加节点</strong>
        </div>
        <button type="button" aria-label="关闭" onClick={onClose}>
          <X size={17} />
        </button>
      </header>

      <div className="dify-block-selector__search">
        <Search size={15} />
        <Input
          bordered={false}
          autoFocus
          value={keyword}
          placeholder="搜索节点"
          onChange={(event) => setKeyword(event.target.value)}
          allowClear
        />
      </div>

      <div className="dify-block-selector__tabs">
        <button
          type="button"
          className={category === 'all' ? 'is-active' : ''}
          onClick={() => setCategory('all')}
        >
          全部
        </button>
        {categoryOrder.map((value) => (
          <button
            key={value}
            type="button"
            className={category === value ? 'is-active' : ''}
            onClick={() => setCategory(value)}
          >
            {CATEGORY_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="dify-block-selector__body">
        {categoryOrder.map((group) => {
          const items = filtered.filter((item) => item.category === group);
          if (!items.length) return null;
          return (
            <section key={group}>
              <h3>{CATEGORY_LABELS[group]}</h3>
              <div>
                {items.map((item) => {
                  const plugin = pluginsByType.get(item.backendType);
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        onSelect(item.type);
                        onClose();
                      }}
                    >
                      <NodeIcon type={item.type} size={18} />
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {item.description}
                          {plugin?.version ? ` · v${plugin.version}` : ''}
                        </small>
                      </span>
                      <Plus size={15} />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        {!filtered.length && <div className="dify-block-selector__empty">没有匹配的节点</div>}
      </div>
    </aside>
  );
};

export default BlockSelector;
