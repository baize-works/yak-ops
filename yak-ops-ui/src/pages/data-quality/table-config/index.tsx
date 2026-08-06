import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';
import {
  dataSourceCatalogApi,
  fetchDataSourceAll,
} from '@/pages/data-source/service';
import type { DataSourceRecord } from '@/pages/data-source/types';
import { history } from '@umijs/max';
import type { TreeProps } from 'antd';
import {
  Button,
  ConfigProvider,
  Empty,
  Input,
  Spin,
  Table,
  Tooltip,
  Tree,
  message,
} from 'antd';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Play,
  RefreshCw,
  Search,
  Settings2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { CheckResultTag } from '../components/QualityStatus';
import { qualityMonitorApi } from '../service';
import type { CatalogTable, TableMonitorSummary } from '../types';

const DEFAULT_LEFT_WIDTH = 280;
const MIN_LEFT_WIDTH = 220;
const MAX_LEFT_WIDTH = 480;

interface DatabaseTreeNode {
  key: string;
  dataSourceId: number;
  dataSourceName: string;
  dataSourceType: string;
  databaseName: string;
}

const unwrap = <T,>(response: {
  code: number;
  data: T;
  message?: string;
  msg?: string;
}) => {
  if (response.code !== API_SUCCESS_CODE) {
    throw new Error(response.message || response.msg || '请求失败');
  }
  return response.data;
};

const normalizeDataSourceType = (value?: string) =>
  value?.trim().toUpperCase() || 'OTHER';

const databaseNodeKey = (dataSourceId: number, databaseName: string) =>
  `database:${dataSourceId}:${databaseName}`;

const TableConfigPage = () => {
  const [dataSources, setDataSources] = useState<DataSourceRecord[]>([]);
  const [databaseNodes, setDatabaseNodes] = useState<DatabaseTreeNode[]>([]);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string>();
  const [dataSourceId, setDataSourceId] = useState<number>();
  const [databaseName, setDatabaseName] = useState<string>();
  const [tables, setTables] = useState<CatalogTable[]>([]);
  const [summaries, setSummaries] = useState<TableMonitorSummary[]>([]);
  const [keyword, setKeyword] = useState('');
  const [queryKeyword, setQueryKeyword] = useState('');
  const [treeLoading, setTreeLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const dragRef = useRef<{ x: number; width: number }>();

  const selectedDataSource = useMemo(
    () => dataSources.find((item) => Number(item.id) === dataSourceId),
    [dataSourceId, dataSources],
  );

  const selectedDatabaseNode = useMemo(
    () => databaseNodes.find((node) => node.key === selectedNodeKey),
    [databaseNodes, selectedNodeKey],
  );

  const summaryMap = useMemo(
    () => new Map(summaries.map((item) => [item.tableName, item])),
    [summaries],
  );

  const treeData = useMemo<NonNullable<TreeProps['treeData']>>(() => {
    const groupMap = new Map<string, DatabaseTreeNode[]>();
    databaseNodes.forEach((node) => {
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
        children: nodes
          .sort((left, right) =>
            left.databaseName.localeCompare(right.databaseName),
          )
          .map((node) => {
            const active = node.key === selectedNodeKey;
            return {
              key: node.key,
              title: (
                <Tooltip
                  placement="right"
                  title={`数据源：${node.dataSourceName}`}
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
                    <span className="truncate">{node.databaseName}</span>
                  </div>
                </Tooltip>
              ),
            };
          }),
      }));
  }, [databaseNodes, selectedNodeKey]);

  const loadSourceTree = useCallback(async (preferredKey?: string) => {
    setTreeLoading(true);
    try {
      const result = unwrap(await fetchDataSourceAll());
      const records = result.bizData || [];
      setDataSources(records);

      const settled = await Promise.allSettled(
        records.map(async (record) => {
          const id = Number(record.id);
          const databases = unwrap(
            await dataSourceCatalogApi.listDatabases(id),
          );
          const configuredDatabase = databases[0];
          if (!configuredDatabase) return undefined;

          return {
            key: databaseNodeKey(id, configuredDatabase),
            dataSourceId: id,
            dataSourceName: record.name || `数据源 ${id}`,
            dataSourceType: normalizeDataSourceType(record.dbType),
            databaseName: configuredDatabase,
          } satisfies DatabaseTreeNode;
        }),
      );

      const nodes = settled
        .filter(
          (item): item is PromiseFulfilledResult<
            DatabaseTreeNode | undefined
          > => item.status === 'fulfilled',
        )
        .map((item) => item.value)
        .filter((item): item is DatabaseTreeNode => Boolean(item));

      setDatabaseNodes(nodes);

      const selected =
        nodes.find((node) => node.key === preferredKey) || nodes[0];
      setSelectedNodeKey(selected?.key);
      setDataSourceId(selected?.dataSourceId);
      setDatabaseName(selected?.databaseName);

      const failedCount = settled.filter(
        (item) => item.status === 'rejected',
      ).length;
      if (failedCount > 0 && !nodes.length) {
        message.error('数据库目录加载失败');
      } else if (failedCount > 0) {
        message.warning(`有 ${failedCount} 个数据源未能加载数据库`);
      }

      return selected;
    } catch (error: any) {
      message.error(error?.message || '数据源加载失败');
      return undefined;
    } finally {
      setTreeLoading(false);
    }
  }, []);

  const loadTables = useCallback(async () => {
    if (!dataSourceId || !databaseName) {
      setTables([]);
      setSummaries([]);
      return;
    }

    setLoading(true);
    try {
      const [tableResult, summaryResult] = await Promise.all([
        dataSourceCatalogApi.listTables(
          dataSourceId,
          databaseName,
          undefined,
          queryKeyword,
        ),
        qualityMonitorApi.tableSummary({ dataSourceId, databaseName }),
      ]);
      setTables(unwrap(tableResult));
      setSummaries(unwrap(summaryResult));
    } catch (error: any) {
      message.error(error?.message || '数据表加载失败');
    } finally {
      setLoading(false);
    }
  }, [dataSourceId, databaseName, queryKeyword]);

  useEffect(() => {
    void loadSourceTree();
  }, [loadSourceTree]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQueryKeyword(keyword.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    void loadTables();
  }, [loadTables]);

  const handleTreeSelect: TreeProps['onSelect'] = (keys) => {
    const key = String(keys[0] || '');
    const node = databaseNodes.find((item) => item.key === key);
    if (!node) return;

    setSelectedNodeKey(node.key);
    setDataSourceId(node.dataSourceId);
    setDatabaseName(node.databaseName);
  };

  const refreshPage = async () => {
    await loadSourceTree(selectedNodeKey);
    await loadTables();
  };

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

  const targetQuery = (record: CatalogTable) =>
    new URLSearchParams({
      dataSourceId: String(dataSourceId),
      dataSourceName: selectedDataSource?.name || '',
      databaseName: record.database || databaseName || '',
      schemaName: record.schema || '',
      tableName: record.name,
    }).toString();

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="flex h-[calc(100vh-64px)] min-h-[620px] flex-col overflow-hidden bg-white">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e8e9ec] px-5">
          <h1 className="m-0 text-[20px] font-semibold text-[#161823]">
            按表配置
          </h1>
          <Button
            icon={<RefreshCw size={14} />}
            loading={loading || treeLoading}
            onClick={refreshPage}
          >
            刷新
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside
            className="shrink-0 overflow-hidden bg-white"
            style={{ width: collapsed ? 0 : leftWidth }}
          >
            <div
              className="h-full overflow-y-auto px-4 py-3"
              style={{ width: leftWidth }}
            >
              <div className="mb-2 text-xs font-semibold text-[#161823]">
                数据源
              </div>

              <Spin spinning={treeLoading}>
                {treeData.length ? (
                  <Tree
                    blockNode
                    defaultExpandAll
                    selectedKeys={selectedNodeKey ? [selectedNodeKey] : []}
                    treeData={treeData}
                    onSelect={handleTreeSelect}
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
            onPointerDown={startResize}
            className="relative z-10 w-3 shrink-0 cursor-col-resize"
          >
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#e4e7ec]" />
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setCollapsed((value) => !value)}
              className="absolute left-1/2 top-1/2 z-20 flex h-8 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded border border-[#dfe1e5] bg-white text-[#7b808a]"
            >
              {collapsed ? (
                <ChevronRight size={13} />
              ) : (
                <ChevronLeft size={13} />
              )}
            </button>
          </div>

          <main className="min-w-0 flex-1 overflow-hidden px-4 py-3">
            <div className="flex h-full flex-col overflow-hidden">
              <div className="mb-3 flex shrink-0 items-center gap-2">
                {selectedDatabaseNode && (
                  <div className="flex h-8 shrink-0 items-center gap-3 bg-[#f5f5f6] px-3 text-xs text-[#667085]">
                    <span>
                      数据源类型：
                      <span className="font-medium text-[#30323b]">
                        {selectedDatabaseNode.dataSourceType}
                      </span>
                    </span>
                    <span className="h-3 w-px bg-[#dfe1e5]" />
                    <span>
                      数据库：
                      <span className="font-medium text-[#30323b]">
                        {selectedDatabaseNode.databaseName}
                      </span>
                    </span>
                  </div>
                )}

                <Input
                  allowClear
                  variant="filled"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  prefix={<Search size={14} className="text-[#98a2b3]" />}
                  placeholder="搜索表名或描述"
                  className="min-w-[260px] flex-1"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                {!dataSourceId || !databaseName ? (
                  <div className="flex h-full items-center justify-center">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="请从左侧选择数据库"
                    />
                  </div>
                ) : (
                  <Spin spinning={loading}>
                    <Table<CatalogTable>
                      rowKey={(record) =>
                        `${record.database || databaseName}.${
                          record.schema || ''
                        }.${record.name}`
                      }
                      size="small"
                      pagination={false}
                      dataSource={tables}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="暂无数据表"
                          />
                        ),
                      }}
                      columns={[
                        {
                          title: '表名/描述/路径',
                          dataIndex: 'name',
                          render: (_, record) => (
                            <div>
                              <div className="font-medium text-[#161823]">
                                {record.name}
                              </div>
                              {record.remarks && (
                                <div className="mt-0.5 text-xs text-[#8a8f99]">
                                  {record.remarks}
                                </div>
                              )}
                              <div className="mt-0.5 text-xs text-[#98a2b3]">
                                {[
                                  record.database || databaseName,
                                  record.schema,
                                  record.name,
                                ]
                                  .filter(Boolean)
                                  .join(' / ')}
                              </div>
                            </div>
                          ),
                        },
                        {
                          title: '监控数',
                          width: 100,
                          render: (_, record) =>
                            summaryMap.get(record.name)?.monitorCount || 0,
                        },
                        {
                          title: '规则数',
                          width: 100,
                          render: (_, record) =>
                            summaryMap.get(record.name)?.ruleCount || 0,
                        },
                        {
                          title: '最近结果',
                          width: 120,
                          render: (_, record) => (
                            <CheckResultTag
                              value={summaryMap.get(record.name)?.lastResult}
                            />
                          ),
                        },
                        {
                          title: '最近运行',
                          width: 170,
                          render: (_, record) =>
                            summaryMap.get(record.name)?.lastRunTime || '--',
                        },
                        {
                          title: '操作',
                          width: 230,
                          fixed: 'right',
                          render: (_, record) => {
                            const summary = summaryMap.get(record.name);
                            return (
                              <div className="flex items-center gap-1">
                                {summary?.monitorId ? (
                                  <>
                                    <Button
                                      type="link"
                                      size="small"
                                      icon={<Settings2 size={13} />}
                                      onClick={() =>
                                        history.push(
                                          `/data-quality/monitor/${summary.monitorId}`,
                                        )
                                      }
                                    >
                                      监控详情
                                    </Button>
                                    <Tooltip title="手动运行">
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<Play size={14} />}
                                        onClick={async () => {
                                          try {
                                            unwrap(
                                              await qualityMonitorApi.run(
                                                summary.monitorId!,
                                              ),
                                            );
                                            message.success('质量检查已提交');
                                            void loadTables();
                                          } catch (error: any) {
                                            message.error(
                                              error?.message || '运行失败',
                                            );
                                          }
                                        }}
                                      />
                                    </Tooltip>
                                  </>
                                ) : (
                                  <Button
                                    type="link"
                                    size="small"
                                    onClick={() =>
                                      history.push(
                                        `/data-quality/monitor/create?${targetQuery(
                                          record,
                                        )}`,
                                      )
                                    }
                                  >
                                    新建质量监控
                                  </Button>
                                )}
                              </div>
                            );
                          },
                        },
                      ]}
                    />
                  </Spin>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default TableConfigPage;
