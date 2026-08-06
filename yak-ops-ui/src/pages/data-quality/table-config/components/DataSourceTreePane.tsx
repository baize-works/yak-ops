import type { TreeProps } from 'antd';
import { Empty, Spin, Tree } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface DataSourceTreePaneProps {
  treeData: NonNullable<TreeProps['treeData']>;
  treeLoading: boolean;
  selectedNodeKey?: string;
  leftWidth: number;
  collapsed: boolean;
  onSelect: TreeProps['onSelect'];
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onCollapsedChange: (collapsed: boolean) => void;
}

const DataSourceTreePane = ({
  treeData,
  treeLoading,
  selectedNodeKey,
  leftWidth,
  collapsed,
  onSelect,
  onResizeStart,
  onCollapsedChange,
}: DataSourceTreePaneProps) => (
  <>
    <aside
      className="shrink-0 overflow-hidden bg-white"
      style={{ width: collapsed ? 0 : leftWidth }}
    >
      <div
        className="h-full overflow-y-auto px-4 py-3"
        style={{ width: leftWidth }}
      >
        <div className="mb-2 text-xs font-semibold text-[#161823]">数据源</div>

        <Spin spinning={treeLoading}>
          {treeData.length ? (
            <Tree
              blockNode
              defaultExpandAll
              selectedKeys={selectedNodeKey ? [selectedNodeKey] : []}
              treeData={treeData}
              onSelect={onSelect}
              className="bg-transparent text-[13px] [&_.ant-tree-node-content-wrapper]:min-w-0 [&_.ant-tree-node-content-wrapper]:!rounded-none [&_.ant-tree-node-selected]:!bg-[rgba(254,44,85,.08)] [&_.ant-tree-switcher]:text-[#98a2b3]"
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无数据源"
              className="mt-12"
            />
          )}
        </Spin>
      </div>
    </aside>

    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onResizeStart}
      className="relative z-10 w-3 shrink-0 cursor-col-resize"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#e4e7ec]" />
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute left-1/2 top-1/2 z-20 flex h-8 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded border border-[#dfe1e5] bg-white text-[#7b808a]"
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
    </div>
  </>
);

export default DataSourceTreePane;
