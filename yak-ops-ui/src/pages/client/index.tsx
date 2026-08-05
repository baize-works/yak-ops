import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  LinkOutlined,
  MoreOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  ConfigProvider,
  Dropdown,
  Empty,
  Input,
  Popconfirm,
  Progress,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  type MenuProps,
} from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import { BRAND_THEME } from '@/styles/brand';

import type {
  LinkupClient,
  WorkerSchedulingStatus,
} from './api';
import AddClientModal from './components/AddClientModal';
import { useClientPageState } from './hooks/useClientPageState';

type WorkerFilter = 'all' | 'online' | 'draining' | 'offline' | 'disabled';

const filters: Array<{ key: WorkerFilter; label: string }> = [
  { key: 'all', label: '全部节点' },
  { key: 'online', label: '在线可用' },
  { key: 'draining', label: '排空中' },
  { key: 'offline', label: '离线' },
  { key: 'disabled', label: '已禁用' },
];

const normalize = (value?: string) => value?.trim().toLowerCase() || '';

const capabilityMeta = (worker: LinkupClient) => {
  if (worker.capabilityStatus === 'READY') {
    return {
      label: `能力就绪${worker.connectorCount ? ` · ${worker.connectorCount}` : ''}`,
      className: '!border-[#b2ddff] !bg-[#eff8ff] !text-[#175cd3]',
    };
  }
  if (worker.capabilityStatus === 'ERROR') {
    return {
      label: '能力异常',
      className: '!border-[#fedf89] !bg-[#fffaeb] !text-[#b54708]',
    };
  }
  return {
    label: '能力待同步',
    className: '!border-[#e4e7ec] !bg-[#f8f9fb] !text-[#667085]',
  };
};

const healthMeta = (worker: LinkupClient) => {
  if (worker.schedulingStatus === 'DISABLED') {
    return {
      filter: 'disabled' as const,
      label: '已禁用',
      dot: 'bg-[#98a2b3]',
      tag: '!border-[#e4e7ec] !bg-[#f2f4f7] !text-[#667085]',
    };
  }
  if (worker.status === 'UP' && worker.schedulingStatus === 'DRAINING') {
    return {
      filter: 'draining' as const,
      label: '排空中',
      dot: 'bg-[#f79009]',
      tag: '!border-[#fedf89] !bg-[#fffaeb] !text-[#b54708]',
    };
  }
  if (worker.status === 'UP') {
    const unavailableReason = worker.capabilityStatus !== 'READY'
      ? '能力未就绪'
      : '暂不可调度';
    return {
      filter: 'online' as const,
      label: worker.available ? '在线可用' : unavailableReason,
      dot: worker.available ? 'bg-[#12b76a]' : 'bg-[#f79009]',
      tag: worker.available
        ? '!border-[#abefc6] !bg-[#ecfdf3] !text-[#067647]'
        : '!border-[#fedf89] !bg-[#fffaeb] !text-[#b54708]',
    };
  }
  return {
    filter: 'offline' as const,
    label: '离线',
    dot: 'bg-[#f04438]',
    tag: '!border-[#fecdca] !bg-[#fef3f2] !text-[#b42318]',
  };
};

const formatTime = (value?: string) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '--';

const formatUptime = (startedAtMillis?: number) => {
  if (!startedAtMillis) return '--';
  const duration = Math.max(0, Date.now() - startedAtMillis);
  const days = Math.floor(duration / 86_400_000);
  const hours = Math.floor((duration % 86_400_000) / 3_600_000);
  const minutes = Math.floor((duration % 3_600_000) / 60_000);
  return days > 0 ? `${days} 天 ${hours} 小时` : `${hours} 小时 ${minutes} 分钟`;
};

const WorkerMetric = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="min-w-[118px] px-4 first:pl-0">
    <div className="text-[12px] leading-5 text-[#98a2b3]">{label}</div>
    <div className="mt-1 text-[14px] font-semibold leading-6 text-[#101828]">
      {value}
    </div>
  </div>
);

const WorkerRow = ({
  worker,
  refreshing,
  statusLoading,
  deleting,
  onRefresh,
  onEdit,
  onStatus,
  onDelete,
}: {
  worker: LinkupClient;
  refreshing: boolean;
  statusLoading: boolean;
  deleting: boolean;
  onRefresh: () => void;
  onEdit: () => void;
  onStatus: (status: WorkerSchedulingStatus) => void;
  onDelete: () => void;
}) => {
  const meta = healthMeta(worker);
  const capability = capabilityMeta(worker);
  const loadPercent = Math.round(Math.max(0, Math.min(1, worker.loadRatio || 0)) * 100);
  const configManaged = worker.registrationMode === 'CONFIG';

  const statusItems: MenuProps['items'] = [
    {
      key: 'ENABLED',
      icon: <CheckCircleOutlined />,
      label: '启用调度',
      disabled: worker.schedulingStatus === 'ENABLED',
    },
    {
      key: 'DRAINING',
      icon: <PauseCircleOutlined />,
      label: '排空节点',
      disabled: worker.schedulingStatus === 'DRAINING',
    },
    {
      key: 'DISABLED',
      icon: <StopOutlined />,
      label: '禁用节点',
      danger: true,
      disabled: worker.schedulingStatus === 'DISABLED',
    },
  ];

  return (
    <article className="overflow-hidden rounded-[10px] border border-[#eceef2] bg-white transition-all hover:border-[#dfe3e8] hover:shadow-[0_8px_28px_rgba(16,24,40,0.04)]">
      <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-stretch">
        <div className="relative flex h-[112px] w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e8e9ec] bg-[#f7f7f8] text-[#667085] xl:w-[112px]">
          <CloudServerOutlined className="text-[38px]" />
          <span className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          <span className="absolute bottom-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
            LINK-UP
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 truncate text-[16px] font-semibold leading-7 text-[#101828]">
                  {worker.nodeName || worker.nodeId}
                </h2>
                <Tag className={`!m-0 !rounded-md !px-2 ${meta.tag}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                </Tag>
                <Tag className={`!m-0 !rounded-md !px-2 ${capability.className}`}>
                  {capability.label}
                </Tag>
                <Tag className="!m-0 !rounded-md !border-[#e4e7ec] !bg-[#f8f9fb] !text-[#667085]">
                  {configManaged ? '配置托管' : '手工注册'}
                </Tag>
                {worker.engineVersion ? (
                  <Tag className="!m-0 !rounded-md !border-[#e4e7ec] !bg-white !text-[#667085]">
                    v{worker.engineVersion}
                  </Tag>
                ) : null}
              </div>

              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] leading-6 text-[#98a2b3]">
                <span>nodeId：{worker.nodeId}</span>
                <span>最近心跳：{formatTime(worker.lastHeartbeatTime)}</span>
                <span>能力同步：{formatTime(worker.capabilitySyncedAt)}</span>
                <span>连续失败：{worker.consecutiveFailures || 0}</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-[#667085]">
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-[#f7f7f8] px-2.5 py-1.5">
                  <LinkOutlined className="text-[#98a2b3]" />
                  <span className="truncate">{worker.baseUrl}</span>
                </span>
                {Object.entries(worker.labels || {}).map(([key, value]) => (
                  <Tag key={key} bordered={false} className="!m-0 !bg-[#f2f4f7] !text-[#667085]">
                    {key}={value}
                  </Tag>
                ))}
              </div>
            </div>

            <Space size={4} wrap>
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() =>
                  history.push(`/client/${encodeURIComponent(worker.nodeId)}/detail`)
                }
              >
                详情
              </Button>
              <Tooltip title="刷新节点心跳与 Connector 能力">
                <Button
                  type="text"
                  icon={<ReloadOutlined spin={refreshing} />}
                  loading={refreshing}
                  onClick={onRefresh}
                >
                  刷新
                </Button>
              </Tooltip>
              <Button type="text" icon={<EditOutlined />} onClick={onEdit}>
                编辑
              </Button>
              <Dropdown
                trigger={['click']}
                menu={{
                  items: statusItems,
                  onClick: ({ key }) => onStatus(key as WorkerSchedulingStatus),
                }}
              >
                <Button type="text" loading={statusLoading} icon={<MoreOutlined />}>
                  状态
                </Button>
              </Dropdown>
              {!configManaged ? (
                <Popconfirm
                  title="删除执行节点"
                  description="只删除 Yak Ops 中的登记信息，不会停止 Link-Up 进程。"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true, loading: deleting }}
                  onConfirm={onDelete}
                >
                  <Button danger type="text" loading={deleting} icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              ) : null}
            </Space>
          </div>

          {worker.lastErrorMessage ? (
            <Alert
              className="mt-3"
              type="error"
              showIcon
              message="最近一次心跳失败"
              description={worker.lastErrorMessage}
            />
          ) : null}

          {worker.capabilityErrorMessage ? (
            <Alert
              className="mt-3"
              type="warning"
              showIcon
              message="Connector 能力同步异常"
              description={worker.capabilityErrorMessage}
            />
          ) : null}

          <div className="mt-4 flex flex-col gap-4 border-t border-[#f0f1f3] pt-4 lg:flex-row lg:items-center">
            <div className="min-w-[220px] flex-1">
              <div className="mb-1 flex items-center justify-between text-[12px] text-[#667085]">
                <span>综合负载</span>
                <span>{loadPercent}%</span>
              </div>
              <Progress percent={loadPercent} showInfo={false} size="small" />
            </div>
            <div className="flex flex-wrap divide-x divide-[#eceef2]">
              <WorkerMetric
                label="运行任务"
                value={`${worker.runningJobs || 0} / ${worker.maxConcurrentJobs || 0}`}
              />
              <WorkerMetric
                label="排队任务"
                value={`${worker.queuedJobs || 0} / ${worker.maxQueuedJobs || 0}`}
              />
              <WorkerMetric label="Connector" value={worker.connectorCount || 0} />
              <WorkerMetric label="调度权重" value={worker.weight || 100} />
              <WorkerMetric label="进程运行" value={formatUptime(worker.startedAtMillis)} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

const ClientPage = () => {
  const {
    clients,
    total,
    loading,
    openAddModal,
    editingClient,
    confirmLoading,
    verifying,
    deleteLoadingId,
    refreshLoadingIds,
    statusLoadingIds,
    form,
    handleOpenCreate,
    handleOpenEdit,
    handleDeleteClient,
    handleSaveClient,
    handleCancelModal,
    handleVerifyWorker,
    handleRefreshWorker,
    handleChangeSchedulingStatus,
    loadClients,
  } = useClientPageState();

  const [filter, setFilter] = useState<WorkerFilter>('all');
  const [keyword, setKeyword] = useState('');

  const counts = useMemo(() => {
    return clients.reduce(
      (result, worker) => {
        result.all += 1;
        result[healthMeta(worker).filter] += 1;
        return result;
      },
      { all: 0, online: 0, draining: 0, offline: 0, disabled: 0 },
    );
  }, [clients]);

  const summary = useMemo(() => {
    return clients.reduce(
      (result, worker) => {
        result.activeJobs += Number(worker.activeJobs || 0);
        result.runningCapacity += Number(worker.maxConcurrentJobs || 0);
        result.queueCapacity += Number(worker.maxQueuedJobs || 0);
        result.connectors += Number(worker.connectorCount || 0);
        if (worker.available) result.available += 1;
        return result;
      },
      {
        activeJobs: 0,
        runningCapacity: 0,
        queueCapacity: 0,
        connectors: 0,
        available: 0,
      },
    );
  }, [clients]);

  const filtered = useMemo(() => {
    const value = normalize(keyword);
    return clients.filter((worker) => {
      if (filter !== 'all' && healthMeta(worker).filter !== filter) return false;
      if (!value) return true;
      return [
        worker.nodeId,
        worker.nodeName,
        worker.baseUrl,
        worker.engineVersion,
        worker.capabilityStatus,
        JSON.stringify(worker.labels || {}),
      ].some((item) => normalize(item).includes(value));
    });
  }, [clients, filter, keyword]);

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-48px)] bg-[#f7f7f8] px-5 py-5 lg:px-6">
        <div className="mx-auto w-full max-w-[1680px]">
          <header className="flex flex-col gap-4 border-b border-[#e8e9ec] pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="m-0 text-[22px] font-semibold leading-8 text-[#161823]">
                执行节点
              </h1>
              <p className="m-0 mt-1 text-[13px] leading-6 text-[#8a8f99]">
                管理 Link-Up Worker 的注册、心跳、容量、Connector 能力和调度状态。
              </p>
            </div>
            <Space size={8} wrap>
              <Button
                icon={<ReloadOutlined spin={loading} />}
                disabled={loading}
                onClick={() => void loadClients()}
              >
                刷新全部
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                注册节点
              </Button>
            </Space>
          </header>

          <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: '登记节点', value: total, icon: <CloudServerOutlined /> },
              { label: '能力可用', value: summary.available, icon: <CheckCircleOutlined /> },
              { label: '活跃任务', value: summary.activeJobs, icon: <ClockCircleOutlined /> },
              {
                label: 'Connector 能力',
                value: summary.connectors,
                icon: <ExclamationCircleOutlined />,
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-lg border border-[#eceef2] bg-white p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f3f3f4] text-[17px] text-[#667085]">
                  {item.icon}
                </span>
                <div>
                  <div className="text-[12px] text-[#98a2b3]">{item.label}</div>
                  <strong className="mt-1 block text-[20px] leading-6 text-[#101828]">{item.value}</strong>
                </div>
              </div>
            ))}
          </section>

          <section className="mt-4 rounded-lg border border-[#eceef2] bg-white px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-1">
                {filters.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={[
                      'cursor-pointer rounded-md border-0 px-3 py-1.5 text-[13px] transition-colors',
                      filter === item.key
                        ? 'bg-[#161823] font-medium text-white'
                        : 'bg-transparent text-[#667085] hover:bg-[#f5f5f6] hover:text-[#161823]',
                    ].join(' ')}
                    onClick={() => setFilter(item.key)}
                  >
                    {item.label} {counts[item.key]}
                  </button>
                ))}
              </div>
              <Input
                allowClear
                variant="filled"
                prefix={<SearchOutlined className="text-[#98a2b3]" />}
                placeholder="搜索名称、nodeId、地址、能力状态或标签"
                value={keyword}
                className="w-full lg:w-[320px]"
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>
          </section>

          <section className="mt-3 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-[#eceef2] bg-white p-5">
                  <Skeleton active paragraph={{ rows: 3 }} />
                </div>
              ))
            ) : filtered.length ? (
              filtered.map((worker) => (
                <WorkerRow
                  key={worker.nodeId}
                  worker={worker}
                  refreshing={refreshLoadingIds.has(worker.nodeId)}
                  statusLoading={statusLoadingIds.has(worker.nodeId)}
                  deleting={deleteLoadingId === worker.nodeId}
                  onRefresh={() => void handleRefreshWorker(worker.nodeId)}
                  onEdit={() => handleOpenEdit(worker)}
                  onStatus={(status) =>
                    void handleChangeSchedulingStatus(worker.nodeId, status)
                  }
                  onDelete={() => void handleDeleteClient(worker)}
                />
              ))
            ) : (
              <div className="rounded-lg border border-[#eceef2] bg-white py-20">
                <Empty
                  description={keyword || filter !== 'all' ? '没有匹配的执行节点' : '还没有登记 Link-Up Worker'}
                >
                  {!keyword && filter === 'all' ? (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                      注册第一个节点
                    </Button>
                  ) : null}
                </Empty>
              </div>
            )}
          </section>
        </div>

        <AddClientModal
          open={openAddModal}
          form={form}
          mode={editingClient ? 'edit' : 'create'}
          initialValues={editingClient}
          confirmLoading={confirmLoading}
          verifying={verifying}
          onCancel={handleCancelModal}
          onSubmit={() => void handleSaveClient()}
          onVerify={handleVerifyWorker}
        />
      </div>
    </ConfigProvider>
  );
};

export default ClientPage;
