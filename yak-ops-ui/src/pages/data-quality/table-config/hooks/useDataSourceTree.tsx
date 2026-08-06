import { fetchDataSourceAll } from '@/pages/data-source/service';
import type { DataSourceRecord } from '@/pages/data-source/types';
import type { TreeProps } from 'antd';
import { Tooltip, message } from 'antd';
import { Database } from 'lucide-react';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  DEFAULT_LEFT_WIDTH,
  MAX_LEFT_WIDTH,
  MIN_LEFT_WIDTH,
  dataSourceNodeKey,
  normalizeDataSourceType,
  type DataSourceTreeNode,
  unwrap,
} from '../model';

export const useDataSourceTree = () => {
  const [dataSources, setDataSources] = useState<DataSourceRecord[]>([]);
  const [sourceNodes, setSourceNodes] = useState<DataSourceTreeNode[]>([]);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string>();
  const [dataSourceId, setDataSourceId] = useState<number>();
  const [treeLoading, setTreeLoading] = useState(false);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const dragRef = useRef<{ x: number; width: number }>();

  const selectedDataSource = useMemo(
    () => dataSources.find((item) => Number(item.id) === dataSourceId),
    [dataSourceId, dataSources],
  );

  const selectedSourceNode = useMemo(
    () => sourceNodes.find((node) => node.key === selectedNodeKey),
    [selectedNodeKey, sourceNodes],
  );

  const treeData = useMemo<NonNullable<TreeProps['treeData']>>(() => {
    const groupMap = new Map<string, DataSourceTreeNode[]>();
    sourceNodes.forEach((node) => {
      const current = groupMap.get(node.dataSourceType) || [];
      current.push(node);
      groupMap.set(node.dataSourceType, current);
    });

    return Array.from(groupMap.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([type, nodes]) => ({
        key: `type:${type}`,
        selectable: false,
        title: (
          <div className="flex min-w-0 flex-1 items-center gap-2 pr-1 text-[13px] font-semibold text-[#30323b]">
            <Database size={14} className="shrink-0 text-[#667085]" />
            <span className="min-w-0 flex-1 truncate">{type}</span>
            <span className="text-xs font-normal text-[#98a2b3]">
              {nodes.length}
            </span>
          </div>
        ),
        children: [...nodes]
          .sort((left, right) =>
            left.dataSourceName.localeCompare(right.dataSourceName),
          )
          .map((node) => {
            const active = node.key === selectedNodeKey;
            return {
              key: node.key,
              title: (
                <Tooltip
                  placement="right"
                  title={
                    node.environment
                      ? `环境：${node.environment}`
                      : `数据源：${node.dataSourceName}`
                  }
                >
                  <div
                    className={`flex min-w-0 flex-1 items-center gap-2 text-[13px] ${
                      active ? 'font-medium text-[#fe2c55]' : 'text-[#30323b]'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        active ? 'bg-[#fe2c55]' : 'bg-[#c6c9d0]'
                      }`}
                    />
                    <span className="truncate">{node.dataSourceName}</span>
                  </div>
                </Tooltip>
              ),
            };
          }),
      }));
  }, [selectedNodeKey, sourceNodes]);

  const loadSourceTree = useCallback(async (preferredKey?: string) => {
    setTreeLoading(true);
    try {
      const result = unwrap(await fetchDataSourceAll());
      const records = result.bizData || [];
      setDataSources(records);

      const nodes = records
        .map((record) => {
          const id = Number(record.id);
          if (!Number.isFinite(id) || id <= 0) return undefined;

          return {
            key: dataSourceNodeKey(id),
            dataSourceId: id,
            dataSourceName: record.name || `数据源 ${id}`,
            dataSourceType: normalizeDataSourceType(record.dbType),
            environment: record.environmentName || record.environment,
          } satisfies DataSourceTreeNode;
        })
        .filter((item): item is DataSourceTreeNode => Boolean(item));

      setSourceNodes(nodes);

      const selected =
        nodes.find((node) => node.key === preferredKey) || nodes[0];
      setSelectedNodeKey(selected?.key);
      setDataSourceId(selected?.dataSourceId);
      return selected;
    } catch (error: any) {
      setDataSources([]);
      setSourceNodes([]);
      setSelectedNodeKey(undefined);
      setDataSourceId(undefined);
      message.error(error?.message || '数据源加载失败');
      return undefined;
    } finally {
      setTreeLoading(false);
    }
  }, []);

  const selectNode = useCallback(
    (key: string) => {
      const node = sourceNodes.find((item) => item.key === key);
      if (!node) return undefined;
      setSelectedNodeKey(node.key);
      setDataSourceId(node.dataSourceId);
      return node;
    },
    [sourceNodes],
  );

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const initial = collapsed ? MIN_LEFT_WIDTH : leftWidth;
    if (collapsed) setCollapsed(false);
    dragRef.current = { x: event.clientX, width: initial };

    const move = (current: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      setLeftWidth(
        Math.min(
          MAX_LEFT_WIDTH,
          Math.max(MIN_LEFT_WIDTH, drag.width + current.clientX - drag.x),
        ),
      );
    };

    const end = () => {
      dragRef.current = undefined;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
  };

  return {
    dataSourceId,
    selectedDataSource,
    selectedSourceNode,
    selectedNodeKey,
    treeData,
    treeLoading,
    leftWidth,
    collapsed,
    setCollapsed,
    loadSourceTree,
    selectNode,
    startResize,
  };
};
