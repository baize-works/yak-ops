import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';
import {
  dataSourceCatalogApi,
  fetchDataSourceAll,
} from '@/pages/data-source/service';
import type { DataSourceRecord } from '@/pages/data-source/types';
import { history } from '@umijs/max';
import {
  Button,
  ConfigProvider,
  Empty,
  Input,
  Select,
  Spin,
  Table,
  Tooltip,
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
import { qualityMonitorApi } from '../service';
import type { CatalogTable, TableMonitorSummary } from '../types';
import { CheckResultTag } from '../components/QualityStatus';

const DEFAULT_LEFT_WIDTH = 280;
const MIN_LEFT_WIDTH = 220;
const MAX_LEFT_WIDTH = 480;

const unwrap = <T,>(response: { code: number; data: T; message?: string; msg?: string }) => {
  if (response.code !== API_SUCCESS_CODE) {
    throw new Error(response.message || response.msg || '请求失败');
  }
  return response.data;
};

const TableConfigPage = () => {
  const [dataSources, setDataSources] = useState<DataSourceRecord[]>([]);
  const [dataSourceId, setDataSourceId] = useState<number>();
  const [databases, setDatabases] = useState<string[]>([]);
  const [databaseName, setDatabaseName] = useState<string>();
  const [schemas, setSchemas] = useState<string[]>([]);
  const [schemaName, setSchemaName] = useState<string>();
  const [tables, setTables] = useState<CatalogTable[]>([]);
  const [summaries, setSummaries] = useState<TableMonitorSummary[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const dragRef = useRef<{ x: number; width: number }>();

  const selectedDataSource = useMemo(
    () => dataSources.find((item) => Number(item.id) === dataSourceId),
    [dataSourceId, dataSources],
  );
  const summaryMap = useMemo(
    () => new Map(summaries.map((item) => [item.tableName, item])),
    [summaries],
  );

  const loadDataSources = useCallback(async () => {
    try {
      const result = unwrap(await fetchDataSourceAll());
      const records = result.bizData || [];
      setDataSources(records);
      if (!dataSourceId && records[0]?.id) setDataSourceId(Number(records[0].id));
    } catch (error: any) {
      message.error(error?.message || '数据源加载失败');
    }
  }, [dataSourceId]);

  const loadDatabases = useCallback(async (id: number) => {
    const result = unwrap(await dataSourceCatalogApi.listDatabases(id));
    setDatabases(result);
    setDatabaseName(result[0]);
    if (!result.length) {
      setSchemas([]);
      setSchemaName(undefined);
    }
  }, []);

  const loadSchemas = useCallback(async (id: number, database?: string) => {
    const result = unwrap(await dataSourceCatalogApi.listSchemas(id, database));
    setSchemas(result);
    setSchemaName(result[0]);
  }, []);

  const loadTables = useCallback(async () => {
    if (!dataSourceId) return;
    setLoading(true);
    try {
      const [tableResult, summaryResult] = await Promise.all([
        dataSourceCatalogApi.listTables(dataSourceId, databaseName, schemaName, keyword),
        qualityMonitorApi.tableSummary({ dataSourceId, databaseName, schemaName }),
      ]);
      setTables(unwrap(tableResult));
      setSummaries(unwrap(summaryResult));
    } catch (error: any) {
      message.error(error?.message || '数据表加载失败');
    } finally {
      setLoading(false);
    }
  }, [dataSourceId, databaseName, schemaName, keyword]);

  useEffect(() => void loadDataSources(), [loadDataSources]);
  useEffect(() => {
    if (!dataSourceId) return;
    setDatabaseName(undefined);
    setSchemaName(undefined);
    setTables([]);
    loadDatabases(dataSourceId).catch((error) => message.error(error?.message || '数据库加载失败'));
  }, [dataSourceId, loadDatabases]);
  useEffect(() => {
    if (!dataSourceId) return;
    loadSchemas(dataSourceId, databaseName).catch((error) => message.error(error?.message || 'Schema 加载失败'));
  }, [dataSourceId, databaseName, loadSchemas]);
  useEffect(() => void loadTables(), [loadTables]);

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const initial = collapsed ? MIN_LEFT_WIDTH : leftWidth;
    if (collapsed) setCollapsed(false);
    dragRef.current = { x: event.clientX, width: initial };
    const move = (current: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      setLeftWidth(Math.min(MAX_LEFT_WIDTH, Math.max(MIN_LEFT_WIDTH, drag.width + current.clientX - drag.x)));
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
      schemaName: record.schema || schemaName || '',
      tableName: record.name,
    }).toString();

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="flex h-[calc(100vh-64px)] min-h-[620px] flex-col overflow-hidden bg-white">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e8e9ec] px-5">
          <h1 className="m-0 text-[20px] font-semibold text-[#161823]">按表配置</h1>
          <Button icon={<RefreshCw size={14} />} onClick={loadTables}>刷新</Button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside
            className="shrink-0 overflow-hidden bg-white"
            style={{ width: collapsed ? 0 : leftWidth }}
          >
            <div className="h-full overflow-y-auto px-4 py-3" style={{ width: leftWidth }}>
              <div className="mb-2 text-xs font-semibold text-[#161823]">数据源</div>
              <div className="space-y-1">
                {dataSources.map((item) => {
                  const active = Number(item.id) === dataSourceId;
                  return (
                    <button
                      key={String(item.id)}
                      type="button"
                      onClick={() => setDataSourceId(Number(item.id))}
                      className={`flex h-8 w-full items-center justify-between border-0 px-2 text-left text-[13px] ${
                        active
                          ? 'bg-[rgba(254,44,85,.08)] font-medium text-[#fe2c55]'
                          : 'bg-transparent text-[#30323b] hover:bg-[#f5f5f6]'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Database size={14} />
                        <span className="truncate">{item.name || `数据源 ${item.id}`}</span>
                      </span>
                      <span className="text-xs text-[#98a2b3]">{item.dbType || '--'}</span>
                    </button>
                  );
                })}
              </div>
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
              {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
          </div>

          <main className="min-w-0 flex-1 overflow-hidden px-4 py-3">
            <div className="flex h-full flex-col overflow-hidden">
              <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
                <Select
                  variant="filled"
                  value={databaseName}
                  placeholder="选择数据库"
                  options={databases.map((value) => ({ value, label: value }))}
                  onChange={setDatabaseName}
                  className="w-[190px]"
                />
                <Select
                  allowClear
                  variant="filled"
                  value={schemaName}
                  placeholder="选择 Schema"
                  options={schemas.map((value) => ({ value, label: value }))}
                  onChange={setSchemaName}
                  className="w-[190px]"
                />
                <Input
                  allowClear
                  variant="filled"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onPressEnter={loadTables}
                  prefix={<Search size={14} className="text-[#98a2b3]" />}
                  placeholder="搜索表名或描述"
                  className="min-w-[260px] flex-1"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <Spin spinning={loading}>
                  <Table<CatalogTable>
                    rowKey={(record) => `${record.database || ''}.${record.schema || ''}.${record.name}`}
                    size="small"
                    pagination={false}
                    dataSource={tables}
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据表" /> }}
                    columns={[
                      {
                        title: '表名/描述/路径',
                        dataIndex: 'name',
                        render: (_, record) => (
                          <div>
                            <div className="font-medium text-[#161823]">{record.name}</div>
                            {record.remarks && <div className="mt-0.5 text-xs text-[#8a8f99]">{record.remarks}</div>}
                            <div className="mt-0.5 text-xs text-[#98a2b3]">
                              {[record.database || databaseName, record.schema || schemaName, record.name]
                                .filter(Boolean)
                                .join(' / ')}
                            </div>
                          </div>
                        ),
                      },
                      {
                        title: '监控数',
                        width: 100,
                        render: (_, record) => summaryMap.get(record.name)?.monitorCount || 0,
                      },
                      {
                        title: '规则数',
                        width: 100,
                        render: (_, record) => summaryMap.get(record.name)?.ruleCount || 0,
                      },
                      {
                        title: '最近结果',
                        width: 120,
                        render: (_, record) => <CheckResultTag value={summaryMap.get(record.name)?.lastResult} />,
                      },
                      {
                        title: '最近运行',
                        width: 170,
                        render: (_, record) => summaryMap.get(record.name)?.lastRunTime || '--',
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
                                    onClick={() => history.push(`/data-quality/monitor/${summary.monitorId}`)}
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
                                          unwrap(await qualityMonitorApi.run(summary.monitorId!));
                                          message.success('质量检查已提交');
                                          loadTables();
                                        } catch (error: any) {
                                          message.error(error?.message || '运行失败');
                                        }
                                      }}
                                    />
                                  </Tooltip>
                                </>
                              ) : (
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => history.push(`/data-quality/monitor/create?${targetQuery(record)}`)}
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
              </div>
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default TableConfigPage;
