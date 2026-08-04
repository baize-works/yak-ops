import YakOpsEmpty from '@/components/YakOpsEmpty';
import { BRAND_COLOR, BRAND_THEME } from '@/styles/brand';
import {
  Alert,
  Button,
  ConfigProvider,
  Empty,
  Input,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  type TableColumnsType,
} from 'antd';
import {
  CircleCheck,
  CircleX,
  Clock3,
  History,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  executionRepository,
  type ApiExecutionStatus,
  type ExecutionSummaryItem,
} from '../workbench/execution/execution.repository';

const { Text } = Typography;

type InstanceStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED';
type InstanceStatusFilter = 'ALL' | InstanceStatus;

interface DevelopmentInstance {
  id: string;
  taskName: string;
  taskType: string;
  engine: string;
  status: InstanceStatus;
  startTime: string;
  endTime?: string;
  duration?: string;
  operator: string;
  errorMessage?: string;
}

const statusMeta: Record<
  InstanceStatus,
  { label: string; className: string }
> = {
  RUNNING: {
    label: '运行中',
    className: '!bg-[rgba(254,44,85,0.06)] !text-[#fe2c55]',
  },
  SUCCESS: {
    label: '成功',
    className: '!bg-[#f2f3f5] !text-[#344054]',
  },
  FAILED: {
    label: '失败',
    className: '!bg-[#fff1f0] !text-[#ff4d4f]',
  },
  CANCELED: {
    label: '已取消',
    className: '!bg-[#f2f3f5] !text-[rgba(22,24,35,0.58)]',
  },
};

const toInstanceStatus = (status: ApiExecutionStatus): InstanceStatus => {
  if (status === 'SUCCEEDED') return 'SUCCESS';
  if (status === 'CANCELED') return 'CANCELED';
  if (status === 'FAILED' || status === 'TIMED_OUT' || status === 'LOST') {
    return 'FAILED';
  }
  return 'RUNNING';
};

const formatTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date(value))
    : undefined;

const formatDuration = (startedAt?: string, finishedAt?: string) => {
  if (!startedAt) return undefined;
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const durationMs = Math.max(0, end - new Date(startedAt).getTime());
  if (durationMs < 1000) return `${durationMs} ms`;
  if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(2)} s`;
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.floor((durationMs % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
};

const mapInstance = (item: ExecutionSummaryItem): DevelopmentInstance => ({
  id: String(item.id),
  taskName: item.taskName,
  taskType: item.taskType,
  engine: item.engineType || item.taskType,
  status: toInstanceStatus(item.status),
  startTime: formatTime(item.startedAt ?? item.createdAt) ?? '-',
  endTime: formatTime(item.finishedAt),
  duration: formatDuration(item.startedAt ?? item.createdAt, item.finishedAt),
  operator: item.createdBy || 'system',
  errorMessage: item.errorMessage,
});

const DataDevelopmentInstancesPage = () => {
  const [instances, setInstances] = useState<DevelopmentInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<InstanceStatusFilter>('ALL');
  const [engineFilter, setEngineFilter] = useState<string>();

  const loadInstances = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    try {
      const page = await executionRepository.list({ limit: 500 });
      setInstances(page.items.map(mapInstance));
    } catch (error) {
      const text = error instanceof Error ? error.message : '运行实例加载失败';
      setLoadError(text);
      message.error(text);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInstances();
    const timer = window.setInterval(() => void loadInstances(), 5000);
    return () => window.clearInterval(timer);
  }, [loadInstances]);

  const summary = useMemo(
    () => ({
      total: instances.length,
      running: instances.filter((item) => item.status === 'RUNNING').length,
      success: instances.filter((item) => item.status === 'SUCCESS').length,
      failed: instances.filter((item) => item.status === 'FAILED').length,
    }),
    [instances],
  );

  const engineOptions = useMemo(
    () =>
      Array.from(new Set(instances.map((item) => item.engine)))
        .sort()
        .map((engine) => ({ label: engine, value: engine })),
    [instances],
  );

  const filteredInstances = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return instances.filter((instance) => {
      const matchesKeyword =
        !normalizedKeyword ||
        instance.id.toLowerCase().includes(normalizedKeyword) ||
        instance.taskName.toLowerCase().includes(normalizedKeyword);
      const matchesStatus =
        statusFilter === 'ALL' || instance.status === statusFilter;
      const matchesEngine = !engineFilter || instance.engine === engineFilter;
      return matchesKeyword && matchesStatus && matchesEngine;
    });
  }, [engineFilter, instances, keyword, statusFilter]);

  const columns: TableColumnsType<DevelopmentInstance> = [
    {
      title: '实例',
      dataIndex: 'id',
      key: 'id',
      width: 230,
      render: (value: string, instance) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] bg-[rgba(254,44,85,0.06)] text-[#fe2c55]">
            <History size={18} />
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-[13px] font-medium text-[#161823]">
              #{value}
            </strong>
            <small className="block truncate text-[11px] text-[rgba(22,24,35,0.42)]">
              {instance.taskName}
            </small>
          </span>
        </div>
      ),
    },
    {
      title: '任务类型',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 110,
      render: (value: string) => <Tag bordered={false}>{value}</Tag>,
    },
    {
      title: '执行器',
      dataIndex: 'engine',
      key: 'engine',
      width: 130,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: InstanceStatus, record) => (
        <Tag
          bordered={false}
          title={record.errorMessage}
          className={statusMeta[value].className}
        >
          {statusMeta[value].label}
        </Tag>
      ),
    },
    { title: '开始时间', dataIndex: 'startTime', key: 'startTime', width: 180 },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 180,
      render: (value?: string) => value || '-',
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 110,
      render: (value?: string) => value || '-',
    },
    { title: '执行人', dataIndex: 'operator', key: 'operator', width: 120 },
  ];

  const hasFilters =
    Boolean(keyword) || statusFilter !== 'ALL' || Boolean(engineFilter);

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-48px)] bg-white px-5 pb-5 pt-4 text-[#161823]">
        <header className="flex min-h-11 items-center justify-between gap-4">
          <div>
            <h1 className="m-0 text-[17px] font-semibold leading-6">运行实例</h1>
            <div className="mt-0.5 text-[11px] text-[rgba(22,24,35,0.42)]">
              展示 Execution Gateway 中的真实任务执行、耗时与最终状态
            </div>
          </div>
          <Button
            loading={loading}
            icon={<RefreshCw size={15} />}
            onClick={() => void loadInstances()}
          >
            刷新
          </Button>
        </header>

        {loadError && (
          <Alert
            showIcon
            type="error"
            className="mt-3"
            message="运行实例加载失败"
            description={loadError}
          />
        )}

        <section className="mt-3 grid grid-cols-4 gap-2 max-[980px]:grid-cols-2">
          {[
            ['全部实例', summary.total, <History key="all" size={19} />],
            ['运行中', summary.running, <Clock3 key="running" size={19} />],
            ['成功', summary.success, <CircleCheck key="success" size={19} />],
            ['失败', summary.failed, <CircleX key="failed" size={19} />],
          ].map(([label, value, icon]) => (
            <div
              key={String(label)}
              className="flex min-h-[70px] items-center gap-3 border border-[#f0f0f0] bg-[#fafbfc] px-4 py-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#f2f3f5] text-[rgba(22,24,35,0.58)]">
                {icon}
              </span>
              <div>
                <Text type="secondary" className="!text-[11px]">
                  {label}
                </Text>
                <div className="mt-0.5 text-lg font-semibold">{value}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-3 border border-[#e4e7ec] bg-white">
          <div className="flex min-h-[54px] items-center justify-between gap-4 border-b border-[#eaecf0] px-3 py-2 max-[960px]:flex-col max-[960px]:items-stretch">
            <Segmented
              value={statusFilter}
              options={[
                { label: '全部', value: 'ALL' },
                { label: '运行中', value: 'RUNNING' },
                { label: '成功', value: 'SUCCESS' },
                { label: '失败', value: 'FAILED' },
                { label: '已取消', value: 'CANCELED' },
              ]}
              onChange={(value) =>
                setStatusFilter(value as InstanceStatusFilter)
              }
            />

            <Space size={8} wrap>
              <Input
                allowClear
                variant="filled"
                prefix={<Search size={15} />}
                placeholder="搜索实例 ID 或任务名称"
                className="w-[250px]"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
              <Select
                allowClear
                variant="filled"
                placeholder="全部执行器"
                className="w-[150px]"
                options={engineOptions}
                value={engineFilter}
                onChange={setEngineFilter}
              />
            </Space>
          </div>

          <Table<DevelopmentInstance>
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filteredInstances}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            scroll={{ x: 1180 }}
            locale={{
              emptyText: (
                <Empty
                  image={
                    <YakOpsEmpty
                      width={220}
                      height={174}
                      primaryColor={BRAND_COLOR}
                    />
                  }
                  description={
                    hasFilters ? '没有匹配的运行实例' : '暂时没有运行实例'
                  }
                />
              ),
            }}
          />
        </section>
      </div>
    </ConfigProvider>
  );
};

export default DataDevelopmentInstancesPage;
