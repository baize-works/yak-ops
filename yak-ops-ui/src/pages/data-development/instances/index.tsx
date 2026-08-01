import YakOpsEmpty from '@/components/YakOpsEmpty';
import { BRAND_COLOR, BRAND_THEME } from '@/styles/brand';
import {
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
import { useMemo, useState } from 'react';

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
}

const engineOptions = [
  { label: 'Flink SQL', value: 'Flink SQL' },
  { label: 'Spark SQL', value: 'Spark SQL' },
  { label: 'Trino SQL', value: 'Trino SQL' },
  { label: 'Python', value: 'Python' },
];

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

const DataDevelopmentInstancesPage = () => {
  const [instances] = useState<DevelopmentInstance[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<InstanceStatusFilter>('ALL');
  const [engineFilter, setEngineFilter] = useState<string>();

  const summary = useMemo(
    () => ({
      total: instances.length,
      running: instances.filter((item) => item.status === 'RUNNING').length,
      success: instances.filter((item) => item.status === 'SUCCESS').length,
      failed: instances.filter((item) => item.status === 'FAILED').length,
    }),
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

  const resetFilters = () => {
    setKeyword('');
    setStatusFilter('ALL');
    setEngineFilter(undefined);
  };

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
              {value}
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
      title: '计算引擎',
      dataIndex: 'engine',
      key: 'engine',
      width: 130,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: InstanceStatus) => (
        <Tag bordered={false} className={statusMeta[value].className}>
          {statusMeta[value].label}
        </Tag>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 170,
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 170,
      render: (value?: string) => value || '-',
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (value?: string) => value || '-',
    },
    {
      title: '执行人',
      dataIndex: 'operator',
      key: 'operator',
      width: 120,
    },
  ];

  const hasFilters =
    Boolean(keyword) || statusFilter !== 'ALL' || Boolean(engineFilter);

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-48px)] bg-white px-5 pb-5 pt-4 text-[#161823]">
        <header className="flex min-h-11 items-center justify-between gap-4">
          <h1 className="m-0 text-[17px] font-semibold leading-6">运行实例</h1>
          <Button icon={<RefreshCw size={15} />} onClick={resetFilters}>
            重置筛选
          </Button>
        </header>

        <section className="mt-2 grid grid-cols-4 gap-2 max-[980px]:grid-cols-2">
          <div className="flex min-h-[70px] items-center gap-3 border border-[#f0f0f0] bg-[#fafbfc] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#f2f3f5] text-[rgba(22,24,35,0.58)]">
              <History size={19} />
            </span>
            <div>
              <Text type="secondary" className="!text-[11px]">全部实例</Text>
              <div className="mt-0.5 text-lg font-semibold">{summary.total}</div>
            </div>
          </div>
          <div className="flex min-h-[70px] items-center gap-3 border border-[#f0f0f0] bg-[#fafbfc] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[rgba(254,44,85,0.06)] text-[#fe2c55]">
              <Clock3 size={19} />
            </span>
            <div>
              <Text type="secondary" className="!text-[11px]">运行中</Text>
              <div className="mt-0.5 text-lg font-semibold">{summary.running}</div>
            </div>
          </div>
          <div className="flex min-h-[70px] items-center gap-3 border border-[#f0f0f0] bg-[#fafbfc] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#f2f3f5] text-[#344054]">
              <CircleCheck size={19} />
            </span>
            <div>
              <Text type="secondary" className="!text-[11px]">成功</Text>
              <div className="mt-0.5 text-lg font-semibold">{summary.success}</div>
            </div>
          </div>
          <div className="flex min-h-[70px] items-center gap-3 border border-[#f0f0f0] bg-[#fafbfc] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#fff1f0] text-[#ff4d4f]">
              <CircleX size={19} />
            </span>
            <div>
              <Text type="secondary" className="!text-[11px]">失败</Text>
              <div className="mt-0.5 text-lg font-semibold">{summary.failed}</div>
            </div>
          </div>
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
                placeholder="全部引擎"
                className="w-[140px]"
                options={engineOptions}
                value={engineFilter}
                onChange={setEngineFilter}
              />
            </Space>
          </div>

          <Table<DevelopmentInstance>
            rowKey="id"
            columns={columns}
            dataSource={filteredInstances}
            pagination={false}
            scroll={{ x: 1200 }}
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
