import { Empty, Input, Spin, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useMemo } from 'react';

export interface SearchTreeNode extends DataNode {
  key: string | number;
  searchText: string;
  children?: SearchTreeNode[];
}

/** Client-side fallback filtering keeps every ancestor of a matching node. */
export const filterTreeWithAncestors = (nodes: SearchTreeNode[], keyword: string): SearchTreeNode[] => {
  const query = keyword.trim().toLocaleLowerCase();
  if (!query) return nodes;
  return nodes.flatMap((node) => {
    const children = filterTreeWithAncestors(node.children ?? [], query);
    return node.searchText.toLocaleLowerCase().includes(query) || children.length ? [{ ...node, children }] : [];
  });
};

interface TreeSearchProps {
  nodes: SearchTreeNode[];
  loading?: boolean;
  keyword: string;
  placeholder?: string;
  selectedKey?: string | number;
  onKeywordChange: (keyword: string) => void;
  onSelect: (key: string | number) => void;
}

export default function TreeSearch({
  nodes,
  loading,
  keyword,
  placeholder = '搜索树节点',
  selectedKey,
  onKeywordChange,
  onSelect,
}: TreeSearchProps) {
  const visibleNodes = useMemo(() => filterTreeWithAncestors(nodes, keyword), [keyword, nodes]);
  return (
    <div>
      <Input.Search
        allowClear
        value={keyword}
        placeholder={placeholder}
        onChange={(event) => onKeywordChange(event.target.value)}
      />
      <Spin spinning={Boolean(loading)}>
        {visibleNodes.length ? (
          <Tree
            className="mt-4"
            blockNode
            defaultExpandAll
            autoExpandParent
            treeData={visibleNodes}
            selectedKeys={selectedKey === undefined ? [] : [selectedKey]}
            onSelect={(keys) => keys[0] !== undefined && onSelect(keys[0] as string | number)}
          />
        ) : (
          <Empty
            className="mt-12"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={keyword ? '没有匹配节点' : '暂无树数据'}
          />
        )}
      </Spin>
    </div>
  );
}
