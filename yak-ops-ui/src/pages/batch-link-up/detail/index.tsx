import {
  ArrowLeftOutlined,
  CopyOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import {
  Button,
  ConfigProvider,
  Empty,
  Input,
  message,
  Segmented,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';

import {
  batchJobInstanceApi,
  linkupJobDefinitionApi,
  linkupJobInstanceApi,
  type OfflineJobDefinitionVO,
} from '../api';

type InstanceRecord = Record<string, any>;
type RuntimeTabKey = 'log' | 'config' | 'metrics';
type ResultTabKey = 'sync' | 'structure';

interface TableMetricRecord extends Record<string, any> {
  __key: string;
}

interface SqlRecord {
  key: string;
  title: string;
  tableName?: string;
  sql: string;
}

const STATUS_OPTIONS = [
  { label: '全部', value: 'ALL' },
  { label: '运行中', value: 'RUNNING' },
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' },
];

const RUNNING_STATUS = new Set([
  'INITIALIZING',
  'CREATED',
  'SUBMITTED',
  'QUEUED',
  'PENDING',
  'SCHEDULED',
  'RUNNING',
  'FAILING',
  'CANCELING',
]);

const SUCCESS_STATUS = new Set([
  'FINISHED',
  'COMPLETED',
  'SUCCESS',
  'SUCCEEDED',
]);

const FAILED_STATUS = new Set([
  'FAILED',
  'ERROR',
  'CANCELED',
  'CANCELLED',
  'KILLED',
  'STOPPED',
]);

const firstValue = <T,>(...values: T[]): T | undefined =>
  values.find(
    (value) => value !== undefined && value !== null && String(value) !== '',
  );

const normalizeStatus = (value?: unknown) =>
  String(value || 'UNKNOWN').trim().toUpperCase();

const getInstanceStatus = (record?: InstanceRecord | null) =>
  normalizeStatus(firstValue(record?.jobStatus, record?.status));

const statusGroup = (status?: unknown) => {
  const normalized = normalizeStatus(status);
  if (RUNNING_STATUS.has(normalized)) return 'RUNNING';
  if (SUCCESS_STATUS.has(normalized)) return 'SUCCESS';
  if (FAILED_STATUS.has(normalized)) return 'FAILED';
  return 'OTHER';
};

const statusMeta = (status?: unknown) => {
  const normalized = normalizeStatus(status);

  if (RUNNING_STATUS.has(normalized)) {
    return { label: '运行中', color: 'processing' as const };
  }
  if (SUCCESS_STATUS.has(normalized)) {
    return { label: '已完成', color: 'default' as const };
  }
  if (FAILED_STATUS.has(normalized)) {
    return {
      label: normalized === 'STOPPED' ? '已停止' : '失败',
      color: 'error' as const,
    };
  }
  if (normalized === 'PAUSED') {
    return { label: '已暂停', color: 'warning' as const };
  }
  return {
    label: normalized === 'UNKNOWN' ? '未知' : normalized,
    color: 'default' as const,
  };
};

const toNumber = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value: unknown) => toNumber(value).toLocaleString();

const formatDateTime = (value?: unknown) => {
  if (!value) return '-';
  const parsed = dayjs(String(value));
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : String(value);
};

const formatDuration = (value?: unknown) => {
  const milliseconds = toNumber(value);
  if (!milliseconds) return '-';
  if (milliseconds < 1000) return `${milliseconds} ms`;

  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) return `${seconds} 秒`;

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  if (minutes < 60) return `${minutes} 分 ${restSeconds} 秒`;

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return `${hours} 小时 ${restMinutes} 分`;
};

const formatBytes = (value?: unknown) => {
  const bytes = toNumber(value);
  if (!bytes) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const result = bytes / 1024 ** index;
  return `${result >= 100 ? result.toFixed(0) : result.toFixed(2)} ${units[index]}`;
};

const normalizePayload = (response: any) => response?.data ?? response;

const normalizeInstanceList = (response: any): InstanceRecord[] => {
  const data = normalizePayload(response);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.bizData)) return data.bizData;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.list)) return data.list;
  return [];
};

const normalizeTableMetrics = (response: any): TableMetricRecord[] => {
  const data = normalizePayload(response);
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.bizData)
      ? data.bizData
      : Array.isArray(data?.records)
        ? data.records
        : Array.isArray(data?.list)
          ? data.list
          : [];

  return list.map((item: InstanceRecord, index: number) => ({
    ...item,
    __key: String(
      firstValue(
        item?.id,
        item?.tableId,
        `${firstValue(item?.sourceTable, item?.sourceTableName, 'source')}-${firstValue(
          item?.sinkTable,
          item?.targetTable,
          item?.sinkTableName,
          'sink',
        )}-${index}`,
      ),
    ),
  }));
};

const stringifyConfig = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
};

const formatLogContent = (response: any) => {
  const data = normalizePayload(response);
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data?.logs)) return formatLogContent(data.logs);

  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === 'string') return item;
        const header = [
          item?.node ? `# Node: ${item.node}` : '',
          item?.logName ? `# File: ${item.logName}` : '',
          item?.logLink ? `# Link: ${item.logLink}` : '',
        ]
          .filter(Boolean)
          .join('\n');
        const content = firstValue(
          item?.content,
          item?.logContent,
          item?.log,
          item?.message,
          item?.data,
        );
        return [header, content ? String(content) : JSON.stringify(item, null, 2)]
          .filter(Boolean)
          .join('\n\n');
      })
      .filter(Boolean)
      .join('\n\n');
  }

  const content = firstValue(
    data?.content,
    data?.logContent,
    data?.log,
    data?.message,
  );
  return content ? String(content) : JSON.stringify(data, null, 2);
};

const copyText = async (value: unknown, successText = '已复制') => {
  const text = String(value ?? '');
  if (!text) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    message.success(successText);
  } catch {
    message.error('复制失败，请手动复制');
  }
};

const DetailField = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) => (
  <div className="min-w-0 py-2.5">
    <div className="text-[11px] leading-4 text-[#98a2b3]">{label}</div>
    <div
      className={[
        'mt-1 min-h-5 break-words text-[13px] font-medium leading-5 text-[#344054]',
        mono ? 'font-mono text-[12px]' : '',
      ].join(' ')}
    >
      {value ?? '-'}
    </div>
  </div>
);

const MetricItem = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) => (
  <div className="min-w-0 px-5 py-4">
    <div className="text-[11px] leading-4 text-[#98a2b3]">{label}</div>
    <div className="mt-1.5 truncate text-[20px] font-semibold leading-7 tracking-[-0.02em] text-[#161823]">
      {value}
    </div>
    {hint ? <div className="mt-1 text-[11px] text-[#98a2b3]">{hint}</div> : null}
  </div>
);

export default function BatchLinkUpExecutionDetailPage() {
  const routeParams = useParams<{ id?: string }>();
  const location = useLocation();
  const taskId = routeParams.id ? decodeURIComponent(routeParams.id) : '';

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const requestedInstanceId = queryParams.get('instanceId') || '';
  const requestedTab = queryParams.get('tab');

  const [definition, setDefinition] = useState<OfflineJobDefinitionVO | null>(null);
  const [instances, setInstances] = useState<InstanceRecord[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState('');
  const [instanceDetail, setInstanceDetail] = useState<InstanceRecord | null>(null);
  const [tableMetrics, setTableMetrics] = useState<TableMetricRecord[]>([]);
  const [logContent, setLogContent] = useState('');

  const [pageLoading, setPageLoading] = useState(true);
  const [instanceLoading, setInstanceLoading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [runtimeTab, setRuntimeTab] = useState<RuntimeTabKey>(
    requestedTab === 'config' || requestedTab === 'metrics' ? requestedTab : 'log',
  );
  const [resultTab, setResultTab] = useState<ResultTabKey>('sync');

  const updateRouteState = useCallback(
    (instanceId?: string, tab?: RuntimeTabKey) => {
      if (!taskId) return;
      const params = new URLSearchParams();
      if (instanceId) params.set('instanceId', instanceId);
      if (tab && tab !== 'log') params.set('tab', tab);
      const search = params.toString();
      history.replace(
        `/sync/batch-link-up/${encodeURIComponent(taskId)}/detail${
          search ? `?${search}` : ''
        }`,
      );
    },
    [taskId],
  );

  const loadPage = useCallback(async () => {
    if (!taskId) return;

    setPageLoading(true);
    try {
      const [definitionResponse, instanceResponse] = await Promise.all([
        linkupJobDefinitionApi.selectById(taskId),
        linkupJobInstanceApi.page({
          pageNum: 1,
          pageSize: 100,
          jobDefinitionId: taskId,
        }),
      ]);

      if (
        definitionResponse?.code !== API_SUCCESS_CODE ||
        !definitionResponse?.data
      ) {
        throw new Error(definitionResponse?.message || '获取离线同步任务失败');
      }

      setDefinition(definitionResponse.data);
      const nextInstances = normalizeInstanceList(instanceResponse);
      setInstances(nextInstances);

      const nextSelectedId = String(
        requestedInstanceId ||
          selectedInstanceId ||
          firstValue(nextInstances[0]?.id, nextInstances[0]?.instanceId) ||
          '',
      );
      setSelectedInstanceId(nextSelectedId);

      if (nextSelectedId && nextSelectedId !== requestedInstanceId) {
        updateRouteState(nextSelectedId, runtimeTab);
      }
    } catch (error: any) {
      message.error(error?.message || '获取离线同步详情失败');
      setDefinition(null);
      setInstances([]);
      setSelectedInstanceId('');
    } finally {
      setPageLoading(false);
    }
  }, [
    requestedInstanceId,
    runtimeTab,
    selectedInstanceId,
    taskId,
    updateRouteState,
  ]);

  useEffect(() => {
    if (!taskId) {
      history.replace('/sync/batch-link-up');
      return;
    }
    void loadPage();
    // 仅在任务 ID 变化时加载任务和实例，筛选在前端完成。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  useEffect(() => {
    if (requestedInstanceId && requestedInstanceId !== selectedInstanceId) {
      setSelectedInstanceId(requestedInstanceId);
    }
  }, [requestedInstanceId, selectedInstanceId]);

  useEffect(() => {
    if (
      requestedTab === 'config' ||
      requestedTab === 'metrics' ||
      requestedTab === 'log'
    ) {
      setRuntimeTab(requestedTab);
    }
  }, [requestedTab]);

  const loadInstanceDetail = useCallback(async () => {
    if (!selectedInstanceId) {
      setInstanceDetail(null);
      return;
    }

    setInstanceLoading(true);
    try {
      const response = await linkupJobInstanceApi.selectById(selectedInstanceId);
      if (response?.code === API_SUCCESS_CODE && response?.data) {
        const detail = response.data;
        setInstanceDetail(detail);
        setInstances((previous) => {
          const detailId = String(firstValue(detail?.id, detail?.instanceId) || '');
          if (!detailId) return previous;
          const exists = previous.some(
            (item) =>
              String(firstValue(item?.id, item?.instanceId) || '') === detailId,
          );
          return exists ? previous : [detail, ...previous];
        });
        return;
      }

      const fallback = instances.find(
        (item) =>
          String(firstValue(item?.id, item?.instanceId)) === selectedInstanceId,
      );
      setInstanceDetail(fallback || null);
    } catch {
      const fallback = instances.find(
        (item) =>
          String(firstValue(item?.id, item?.instanceId)) === selectedInstanceId,
      );
      setInstanceDetail(fallback || null);
    } finally {
      setInstanceLoading(false);
    }
  }, [instances, selectedInstanceId]);

  useEffect(() => {
    void loadInstanceDetail();
  }, [loadInstanceDetail]);

  const loadLog = useCallback(async () => {
    if (!selectedInstanceId) {
      setLogContent('');
      return;
    }

    setLogLoading(true);
    try {
      const response = await linkupJobInstanceApi.getLog(selectedInstanceId);
      if (response?.code !== API_SUCCESS_CODE) {
        setLogContent(response?.message || '日志加载失败');
        return;
      }
      setLogContent(formatLogContent(response) || '当前实例暂无运行日志');
    } catch (error: any) {
      setLogContent(error?.message || '日志加载失败');
    } finally {
      setLogLoading(false);
    }
  }, [selectedInstanceId]);

  useEffect(() => {
    if (runtimeTab === 'log') void loadLog();
  }, [loadLog, runtimeTab]);

  const loadTableMetrics = useCallback(async () => {
    if (!selectedInstanceId) {
      setTableMetrics([]);
      return;
    }

    setMetricsLoading(true);
    try {
      const response = await batchJobInstanceApi.tableMetrics(selectedInstanceId);
      setTableMetrics(normalizeTableMetrics(response));
    } catch {
      setTableMetrics([]);
    } finally {
      setMetricsLoading(false);
    }
  }, [selectedInstanceId]);

  useEffect(() => {
    void loadTableMetrics();
  }, [loadTableMetrics]);

  const handleSelectInstance = (record: InstanceRecord) => {
    const id = String(firstValue(record?.id, record?.instanceId) || '');
    if (!id || id === selectedInstanceId) return;
    setSelectedInstanceId(id);
    setInstanceDetail(record);
    setLogContent('');
    setTableMetrics([]);
    updateRouteState(id, runtimeTab);
  };

  const handleRuntimeTabChange = (key: string) => {
    const nextKey = key as RuntimeTabKey;
    setRuntimeTab(nextKey);
    updateRouteState(selectedInstanceId, nextKey);
  };

  const filteredInstances = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return instances.filter((item) => {
      const status = getInstanceStatus(item);
      const statusMatched =
        statusFilter === 'ALL' || statusGroup(status) === statusFilter;
      if (!statusMatched) return false;
      if (!normalizedKeyword) return true;

      return [
        item?.id,
        item?.instanceId,
        item?.jobName,
        item?.engineJobId,
        item?.externalExecutionId,
        item?.workerNodeName,
        item?.workerInstanceId,
      ].some((value) =>
        String(value || '').toLowerCase().includes(normalizedKeyword),
      );
    });
  }, [instances, keyword, statusFilter]);

  const currentInstance = useMemo(() => {
    if (instanceDetail) return instanceDetail;
    return (
      instances.find(
        (item) =>
          String(firstValue(item?.id, item?.instanceId)) === selectedInstanceId,
      ) || null
    );
  }, [instanceDetail, instances, selectedInstanceId]);

  const mergedInstance = useMemo(
    () => ({
      ...(definition || {}),
      ...(currentInstance || {}),
    }),
    [currentInstance, definition],
  );

  const sourceType = firstValue(
    mergedInstance?.sourceType,
    definition?.sourceType,
  );
  const sinkType = firstValue(mergedInstance?.sinkType, definition?.sinkType);
  const sourceTable = firstValue(
    mergedInstance?.sourceTable,
    mergedInstance?.sourceTableName,
    definition?.sourceTable,
  );
  const sinkTable = firstValue(
    mergedInstance?.sinkTable,
    mergedInstance?.targetTable,
    mergedInstance?.sinkTableName,
    definition?.sinkTable,
  );

  const readRows = firstValue(
    mergedInstance?.readRowCount,
    mergedInstance?.sourceRecordCount,
    0,
  );
  const writeRows = firstValue(
    mergedInstance?.writeRowCount,
    mergedInstance?.sinkSuccessRecordCount,
    0,
  );
  const durationMillis = firstValue(
    mergedInstance?.durationMillis,
    mergedInstance?.duration,
    0,
  );
  const qps = firstValue(
    mergedInstance?.qps,
    mergedInstance?.writeQps,
    mergedInstance?.readQps,
    0,
  );

  const runtimeConfig = stringifyConfig(
    firstValue(
      currentInstance?.runtimeConfig,
      currentInstance?.jobConfig,
      currentInstance?.config,
      definition?.jobDefinitionInfo,
    ),
  );

  const tableRows = useMemo<TableMetricRecord[]>(() => {
    if (tableMetrics.length > 0) return tableMetrics;
    if (!sourceTable && !sinkTable) return [];

    return [
      {
        __key: 'instance-summary',
        sourceTable,
        sinkTable,
        readRowCount: readRows,
        writeRowCount: writeRows,
        readQps: mergedInstance?.readQps,
        writeQps: mergedInstance?.writeQps || qps,
        status: getInstanceStatus(mergedInstance),
      },
    ];
  }, [
    mergedInstance,
    qps,
    readRows,
    sinkTable,
    sourceTable,
    tableMetrics,
    writeRows,
  ]);

  const sqlRecords = useMemo<SqlRecord[]>(() => {
    const records: SqlRecord[] = [];
    const used = new Set<string>();

    const append = (title: string, sql: unknown, tableName?: unknown) => {
      if (!sql || typeof sql !== 'string' || used.has(sql)) return;
      used.add(sql);
      records.push({
        key: `${title}-${records.length}`,
        title,
        tableName: tableName ? String(tableName) : undefined,
        sql,
      });
    };

    append(
      '实例建表语句',
      firstValue(
        currentInstance?.createTableSql,
        currentInstance?.targetCreateTableSql,
        currentInstance?.migrationSql,
        currentInstance?.schemaSql,
        currentInstance?.ddl,
      ),
      sinkTable,
    );

    tableRows.forEach((item, index) => {
      append(
        `表结构迁移 ${index + 1}`,
        firstValue(
          item?.createTableSql,
          item?.targetCreateTableSql,
          item?.migrationSql,
          item?.schemaSql,
          item?.ddl,
        ),
        firstValue(item?.sinkTable, item?.targetTable, item?.sourceTable),
      );
    });

    return records;
  }, [currentInstance, sinkTable, tableRows]);

  const tableColumns = useMemo<ColumnsType<TableMetricRecord>>(
    () => [
      {
        title: '来源表',
        dataIndex: 'sourceTable',
        minWidth: 190,
        render: (_value, record) => (
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-[#344054]">
              {firstValue(record?.sourceTable, record?.sourceTableName, '-')}
            </div>
            <div className="mt-0.5 text-[11px] text-[#98a2b3]">来源</div>
          </div>
        ),
      },
      {
        title: '目标表',
        dataIndex: 'sinkTable',
        minWidth: 190,
        render: (_value, record) => (
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-[#344054]">
              {firstValue(
                record?.sinkTable,
                record?.targetTable,
                record?.sinkTableName,
                '-',
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-[#98a2b3]">目标</div>
          </div>
        ),
      },
      {
        title: '读取行数',
        dataIndex: 'readRowCount',
        width: 120,
        align: 'right',
        render: (_value, record) => (
          <span className="font-medium text-[#344054]">
            {formatNumber(
              firstValue(record?.readRowCount, record?.sourceRecordCount, 0),
            )}
          </span>
        ),
      },
      {
        title: '写入行数',
        dataIndex: 'writeRowCount',
        width: 120,
        align: 'right',
        render: (_value, record) => (
          <span className="font-medium text-[#344054]">
            {formatNumber(
              firstValue(
                record?.writeRowCount,
                record?.sinkSuccessRecordCount,
                0,
              ),
            )}
          </span>
        ),
      },
      {
        title: '读取 QPS',
        dataIndex: 'readQps',
        width: 105,
        align: 'right',
        render: (value) => formatNumber(value),
      },
      {
        title: '写入 QPS',
        dataIndex: 'writeQps',
        width: 105,
        align: 'right',
        render: (value) => formatNumber(value),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (value) => {
          const meta = statusMeta(value);
          return (
            <Tag color={meta.color} className="!m-0">
              {meta.label}
            </Tag>
          );
        },
      },
    ],
    [],
  );

  if (pageLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f7f7f8]">
        <Spin size="large" />
      </div>
    );
  }

  if (!definition) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f7f7f8]">
        <Empty description="未找到离线同步任务">
          <Button onClick={() => history.push('/sync/batch-link-up')}>
            返回任务列表
          </Button>
        </Empty>
      </div>
    );
  }

  const currentStatus = statusMeta(getInstanceStatus(mergedInstance));
  const errorMessage = firstValue(
    currentInstance?.errorMessage,
    currentInstance?.lastErrorMessage,
    definition?.lastErrorMessage,
  );

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="h-[calc(100vh-64px)] overflow-hidden bg-white text-[#161823]">
        <div className="flex h-full flex-col">
          <header className="flex h-[62px] shrink-0 items-center justify-between gap-4 border-b border-[#eceef1] bg-white px-5">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                className="!h-8 !w-8 !min-w-0 !p-0 !text-[#667085]"
                onClick={() => history.push('/sync/batch-link-up')}
              />

              <div className="h-7 w-px bg-[#eceef1]" />

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="m-0 truncate text-[17px] font-semibold leading-6 text-[#161823]">
                    {definition.jobName || '离线同步详情'}
                  </h1>
                  <Tag bordered={false} className="!m-0 !bg-[#f2f3f5] !text-[11px] !text-[#667085]">
                    {definition.mode || 'BATCH'}
                  </Tag>
                  {currentInstance ? (
                    <Tag color={currentStatus.color} className="!m-0 !text-[11px]">
                      {currentStatus.label}
                    </Tag>
                  ) : null}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] leading-4 text-[#98a2b3]">
                  <span className="truncate">任务定义 ID：{definition.id || taskId}</span>
                  <Tooltip title="复制任务定义 ID">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      className="!h-5 !w-5 !min-w-0 !p-0 !text-[#98a2b3]"
                      onClick={() =>
                        void copyText(
                          definition.id || taskId,
                          '任务定义 ID 已复制',
                        )
                      }
                    />
                  </Tooltip>
                </div>
              </div>
            </div>

         
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-[286px_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col border-r border-[#eceef1] bg-white">
              <div className="px-4 pb-3 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-semibold leading-5 text-[#161823]">
                      执行实例
                    </div>
                    <div className="mt-0.5 text-[11px] leading-4 text-[#98a2b3]">
                      共 {instances.length} 次运行
                    </div>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    className="!h-7 !w-7 !min-w-0 !p-0 !text-[#667085]"
                    onClick={() => void loadPage()}
                  />
                </div>

                <Input
                  allowClear
                  variant="filled"
                  value={keyword}
                  prefix={<SearchOutlined className="text-[#98a2b3]" />}
                  placeholder="搜索实例或引擎任务 ID"
                  className="!mt-3 !h-8"
                  onChange={(event) => setKeyword(event.target.value)}
                />

                <Segmented
                  block
                  size="small"
                  value={statusFilter}
                  options={STATUS_OPTIONS}
                  className="!mt-2 !bg-[#f5f5f6]"
                  onChange={(value) => setStatusFilter(String(value))}
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#f0f1f3]">
                {filteredInstances.length > 0 ? (
                  <div>
                    {filteredInstances.map((item) => {
                      const id = String(
                        firstValue(item?.id, item?.instanceId) || '',
                      );
                      const active = id === selectedInstanceId;
                      const meta = statusMeta(getInstanceStatus(item));
                      const itemDuration = firstValue(
                        item?.durationMillis,
                        item?.duration,
                      );

                      return (
                        <button
                          key={id}
                          type="button"
                          className={[
                            'relative w-full border-0 border-b border-solid border-[#f0f1f3] px-4 py-3 text-left transition-colors',
                            active
                              ? 'bg-[rgba(254,44,85,0.045)] before:absolute before:bottom-0 before:left-0 before:top-0 before:w-[3px] before:bg-[rgba(254,44,85,1)]'
                              : 'bg-white hover:bg-[#fafafa]',
                          ].join(' ')}
                          onClick={() => handleSelectInstance(item)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 truncate text-[12px] font-medium leading-5 text-[#344054]">
                              实例 #{id || '-'}
                            </div>
                            <Tag
                              color={meta.color}
                              className="!m-0 shrink-0 !text-[10px]"
                            >
                              {meta.label}
                            </Tag>
                          </div>

                          <div className="mt-1 truncate text-[11px] leading-4 text-[#98a2b3]">
                            {formatDateTime(
                              firstValue(item?.startTime, item?.createTime),
                            )}
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] leading-4 text-[#667085]">
                            <span className="truncate">
                              {firstValue(
                                item?.runMode,
                                item?.triggerType,
                                item?.assignmentMode,
                                '手动运行',
                              )}
                            </span>
                            <span className="shrink-0 text-[#98a2b3]">
                              {formatDuration(itemDuration)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[260px] items-center justify-center px-4">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span className="text-[12px] text-[#98a2b3]">
                          暂无匹配的执行实例
                        </span>
                      }
                    />
                  </div>
                )}
              </div>
            </aside>

            <main className="min-h-0 overflow-y-auto bg-white">
              {!selectedInstanceId || !currentInstance ? (
                <div className="flex h-full min-h-[420px] items-center justify-center">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="请选择左侧执行实例查看详情"
                  />
                </div>
              ) : instanceLoading ? (
                <div className="flex h-full min-h-[420px] items-center justify-center">
                  <Spin />
                </div>
              ) : (
                <div className="min-w-0">
                  <section className="border-b border-[#eceef1] px-6 pb-5 pt-5">
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="m-0 text-[16px] font-semibold leading-6 text-[#161823]">
                            实例 #{selectedInstanceId}
                          </h2>
                          <Tag color={currentStatus.color} className="!m-0">
                            {currentStatus.label}
                          </Tag>
                        </div>
                        <div className="mt-1 text-[12px] leading-5 text-[#98a2b3]">
                          {formatDateTime(
                            firstValue(
                              currentInstance?.startTime,
                              currentInstance?.createTime,
                            ),
                          )}
                          <span className="mx-2 text-[#d0d5dd]">·</span>
                          {firstValue(
                            currentInstance?.runMode,
                            currentInstance?.triggerType,
                            currentInstance?.assignmentMode,
                            '手动运行',
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-[11px] text-[#98a2b3]">运行耗时</div>
                        <div className="mt-1 text-[15px] font-semibold text-[#344054]">
                          {formatDuration(durationMillis)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex min-w-0 items-center gap-3 bg-[#fafafa] px-4 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#f0f2f5] text-[#667085]">
                        <DatabaseOutlined />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2 text-[13px] font-medium leading-5 text-[#344054]">
                          <span className="truncate">
                            {firstValue(
                              definition?.sourceDatasourceName,
                              sourceType,
                              '来源数据源',
                            )}
                            {sourceTable ? ` / ${sourceTable}` : ''}
                          </span>
                          <SyncOutlined className="shrink-0 text-[rgba(254,44,85,0.72)]" />
                          <span className="truncate">
                            {firstValue(
                              definition?.sinkDatasourceName,
                              sinkType,
                              '目标数据源',
                            )}
                            {sinkTable ? ` / ${sinkTable}` : ''}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] leading-4 text-[#98a2b3]">
                          {sourceType || '-'} → {sinkType || '-'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-8 xl:grid-cols-4">
                      <DetailField
                        label="引擎任务 ID"
                        mono
                        value={firstValue(
                          currentInstance?.engineJobId,
                          currentInstance?.externalExecutionId,
                          '-',
                        )}
                      />
                      <DetailField
                        label="执行节点"
                        value={firstValue(
                          currentInstance?.workerNodeName,
                          currentInstance?.engineNodeId,
                          currentInstance?.workerInstanceId,
                          '-',
                        )}
                      />
                      <DetailField
                        label="开始时间"
                        value={formatDateTime(currentInstance?.startTime)}
                      />
                      <DetailField
                        label="结束时间"
                        value={formatDateTime(currentInstance?.endTime)}
                      />
                    </div>

                    {errorMessage ? (
                      <div className="mt-2 border-l-2 border-[#ff4d4f] bg-[#fff7f7] px-3 py-2.5 text-[12px] leading-5 text-[#d92d20]">
                        <span className="font-medium">错误信息：</span>
                        {String(errorMessage)}
                      </div>
                    ) : null}
                  </section>

                  <section className="border-b border-[#eceef1]">
                    <Tabs
                      activeKey={runtimeTab}
                      className="[&_.ant-tabs-nav]:!mb-0 [&_.ant-tabs-nav]:!px-6 [&_.ant-tabs-nav]:!pt-1 [&_.ant-tabs-tab]:!py-3 [&_.ant-tabs-content-holder]:!border-t [&_.ant-tabs-content-holder]:!border-[#f0f1f3]"
                      onChange={handleRuntimeTabChange}
                      items={[
                        {
                          key: 'log',
                          label: '运行日志',
                          children: (
                            <div className="px-6 pb-6 pt-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="text-[12px] leading-5 text-[#98a2b3]">
                                  当前实例由 Yak Ops 聚合的 Link-Up 运行日志
                                </div>
                                <Button
                                  size="small"
                                  type="text"
                                  icon={<ReloadOutlined />}
                                  loading={logLoading}
                                  className="!h-7 !text-[#667085]"
                                  onClick={() => void loadLog()}
                                >
                                  刷新日志
                                </Button>
                              </div>
                              <div className="relative min-h-[320px] overflow-hidden border border-[#23262d] bg-[#16181d]">
                                {logLoading ? (
                                  <div className="flex min-h-[320px] items-center justify-center text-white/60">
                                    <Spin size="small" />
                                  </div>
                                ) : (
                                  <pre className="m-0 max-h-[480px] min-h-[320px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-5 text-[#d6d9df]">
                                    {logContent || '当前实例暂无运行日志'}
                                  </pre>
                                )}
                              </div>
                            </div>
                          ),
                        },
                        {
                          key: 'config',
                          label: '运行配置',
                          children: (
                            <div className="px-6 pb-6 pt-4">
                              {runtimeConfig ? (
                                <pre className="m-0 max-h-[480px] min-h-[280px] overflow-auto whitespace-pre-wrap break-words border border-[#e6e8ec] bg-[#fafafa] p-4 font-mono text-[12px] leading-5 text-[#344054]">
                                  {runtimeConfig}
                                </pre>
                              ) : (
                                <div className="flex min-h-[280px] items-center justify-center">
                                  <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="当前实例未返回运行配置"
                                  />
                                </div>
                              )}
                            </div>
                          ),
                        },
                        {
                          key: 'metrics',
                          label: '执行指标',
                          children: (
                            <div className="grid grid-cols-2 divide-x divide-y divide-[#f0f1f3] lg:grid-cols-3 xl:grid-cols-6">
                              <MetricItem
                                label="读取行数"
                                value={formatNumber(readRows)}
                              />
                              <MetricItem
                                label="写入行数"
                                value={formatNumber(writeRows)}
                              />
                              <MetricItem
                                label="平均 QPS"
                                value={formatNumber(qps)}
                              />
                              <MetricItem
                                label="读取数据量"
                                value={formatBytes(
                                  currentInstance?.sourceReadBytes,
                                )}
                              />
                              <MetricItem
                                label="写入数据量"
                                value={formatBytes(
                                  currentInstance?.sinkWrittenBytes,
                                )}
                              />
                              <MetricItem
                                label="运行耗时"
                                value={formatDuration(durationMillis)}
                              />
                            </div>
                          ),
                        },
                      ]}
                    />
                  </section>

                  <section>
                    <Tabs
                      activeKey={resultTab}
                      className="[&_.ant-tabs-nav]:!mb-0 [&_.ant-tabs-nav]:!px-6 [&_.ant-tabs-nav]:!pt-1 [&_.ant-tabs-tab]:!py-3 [&_.ant-tabs-content-holder]:!border-t [&_.ant-tabs-content-holder]:!border-[#f0f1f3]"
                      onChange={(key) => setResultTab(key as ResultTabKey)}
                      items={[
                        {
                          key: 'sync',
                          label: '同步情况',
                          children: (
                            <div className="px-6 pb-8 pt-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 text-[13px] font-medium leading-5 text-[#344054]">
                                    <TableOutlined />
                                    表级同步结果
                                  </div>
                                  {/* <div className="mt-0.5 text-[11px] leading-4 text-[#98a2b3]">
                                    来源表、目标表及读取写入情况
                                  </div> */}
                                </div>
                                <span className="text-[12px] text-[#667085]">
                                  {tableRows.length} 张表
                                </span>
                              </div>

                              <Table<TableMetricRecord>
                                rowKey="__key"
                                size="small"
                                loading={metricsLoading}
                                columns={tableColumns}
                                dataSource={tableRows}
                                pagination={false}
                                scroll={{ x: 920 }}
                                locale={{
                                  emptyText: (
                                    <Empty
                                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                                      description="当前实例暂无表级同步指标"
                                    />
                                  ),
                                }}
                                className="[&_.ant-table-container]:!border-[#eceef1] [&_.ant-table-thead>tr>th]:!h-10 [&_.ant-table-thead>tr>th]:!bg-[#fafafa] [&_.ant-table-thead>tr>th]:!text-[12px] [&_.ant-table-tbody>tr>td]:!py-3 [&_.ant-table-tbody>tr>td]:!text-[12px]"
                              />
                            </div>
                          ),
                        },
                        {
                          key: 'structure',
                          label: '结构迁移',
                          children: (
                            <div className="px-6 pb-8 pt-4">
                              {sqlRecords.length > 0 ? (
                                <div className="space-y-3">
                                  {sqlRecords.map((item) => (
                                    <div
                                      key={item.key}
                                      className="overflow-hidden border border-[#e6e8ec]"
                                    >
                                      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-[#e6e8ec] bg-[#fafafa] px-3">
                                        <div className="min-w-0">
                                          <span className="text-[12px] font-medium text-[#344054]">
                                            {item.title}
                                          </span>
                                          {item.tableName ? (
                                            <span className="ml-2 text-[11px] text-[#98a2b3]">
                                              {item.tableName}
                                            </span>
                                          ) : null}
                                        </div>
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<CopyOutlined />}
                                          className="!h-7 !text-[#667085]"
                                          onClick={() =>
                                            void copyText(
                                              item.sql,
                                              '建表语句已复制',
                                            )
                                          }
                                        >
                                          复制
                                        </Button>
                                      </div>
                                      <pre className="m-0 max-h-[360px] overflow-auto whitespace-pre-wrap break-words bg-[#16181d] p-4 font-mono text-[12px] leading-5 text-[#d6d9df]">
                                        {item.sql}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex min-h-[240px] flex-col items-center justify-center border border-dashed border-[#dfe1e5] bg-[#fafafa] px-6 text-center">
                                  <FileTextOutlined className="text-[28px] text-[#c0c4cc]" />
                                  <div className="mt-3 text-[13px] font-medium text-[#667085]">
                                    暂无结构迁移语句
                                  </div>
                                  <div className="mt-1 max-w-[560px] text-[12px] leading-5 text-[#98a2b3]">
                                    当前 Link-Up 实例接口尚未返回目标表建表语句。后续接口补充 createTableSql、ddl 或 migrationSql 后，本页会自动展示并支持复制。
                                  </div>
                                </div>
                              )}
                            </div>
                          ),
                        },
                      ]}
                    />
                  </section>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
