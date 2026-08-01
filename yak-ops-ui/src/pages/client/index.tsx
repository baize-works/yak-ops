import {
  CloudServerOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import {
  Button,
  ConfigProvider,
  Empty,
  Input,
  Popconfirm,
  Skeleton,
  Tag,
  Tooltip,
} from 'antd';
import { useMemo, useState } from 'react';

import {
  BRAND_COLOR,
  BRAND_THEME,
} from '@/styles/brand';

import type { LinkupClient, LinkupClientMetrics } from './api';
import AddClientModal from './components/AddClientModal';
import { useClientPageState } from './hooks/useClientPageState';

type ClientStatusFilter = 'all' | 'online' | 'warning' | 'offline';

interface StatusTab {
  key: ClientStatusFilter;
  label: string;
}

const statusTabs: StatusTab[] = [
  { key: 'all', label: '全部客户端' },
  { key: 'online', label: '在线' },
  { key: 'warning', label: '异常' },
  { key: 'offline', label: '离线' },
];

const getHealthMeta = (healthStatus?: number) => {
  if (healthStatus === 1) {
    return {
      filter: 'online' as const,
      label: '在线',
      dotClass: 'bg-emerald-500',
      tagClass: '!border-emerald-200 !bg-emerald-50 !text-emerald-700',
      iconClass: 'border-emerald-100 bg-emerald-50 text-emerald-600',
    };
  }

  if (healthStatus === 2) {
    return {
      filter: 'warning' as const,
      label: '异常',
      dotClass: 'bg-amber-500',
      tagClass: '!border-amber-200 !bg-amber-50 !text-amber-700',
      iconClass: 'border-amber-100 bg-amber-50 text-amber-600',
    };
  }

  return {
    filter: 'offline' as const,
    label: '离线',
    dotClass: 'bg-rose-500',
    tagClass: '!border-rose-200 !bg-rose-50 !text-rose-700',
    iconClass: 'border-rose-100 bg-rose-50 text-rose-600',
  };
};

const normalizeKeyword = (value?: string) => value?.trim().toLowerCase() || '';

const formatPercent = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '--';
  }

  return `${Math.round(Number(value) * 10) / 10}%`;
};

const formatNumber = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '--';
  }

  return Number(value).toLocaleString();
};

const formatTime = (value?: string) => value || '--';

const getClientAddress = (client: LinkupClient) => {
  if (client.baseUrl) return client.baseUrl;

  if (client.clientAddress) {
    const port = (client as LinkupClient & { clientPort?: number | string })
      .clientPort;
    return port ? `${client.clientAddress}:${port}` : client.clientAddress;
  }

  return '--';
};

interface ClientMetricItemProps {
  label: string;
  value: string;
  loading?: boolean;
}

const ClientMetricItem = ({ label, value, loading }: ClientMetricItemProps) => (
  <div className="min-w-[112px] px-4 first:pl-0">
    <div className="text-[12px] leading-5 text-[#98a2b3]">{label}</div>
    <div className="mt-1 min-h-6 text-[14px] font-semibold leading-6 text-[#101828]">
      {loading ? <Skeleton.Input active size="small" className="!h-5 !w-12" /> : value}
    </div>
  </div>
);

interface ClientRowProps {
  client: LinkupClient;
  metrics?: LinkupClientMetrics;
  metricsLoading: boolean;
  deleting: boolean;
  onRefreshMetrics: (id: number) => void;
  onEdit: (client: LinkupClient) => void;
  onDelete: (client: LinkupClient) => void;
}

const ClientRow = ({
  client,
  metrics,
  metricsLoading,
  deleting,
  onRefreshMetrics,
  onEdit,
  onDelete,
}: ClientRowProps) => {
  const healthMeta = getHealthMeta(client.healthStatus);
  const clientId = Number(client.id);

  return (
    <article className="group overflow-hidden rounded-[10px] border border-[#eceef2] bg-white transition-all duration-200 hover:border-[#dfe3e8] hover:shadow-[0_8px_28px_rgba(16,24,40,0.04)]">
      <div className="flex min-w-0 flex-col gap-5 p-4 lg:flex-row lg:items-stretch lg:p-5">
        <div
          className={[
            'relative flex h-[108px] w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border',
            'lg:h-[116px] lg:w-[116px]',
            healthMeta.iconClass,
          ].join(' ')}
        >
          <CloudServerOutlined className="text-[38px]" />
          <span className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${healthMeta.dotClass}`} />
          <span className="absolute bottom-2.5 left-3 text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
            {client.engineType || 'CLIENT'}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <h2 className="m-0 max-w-full truncate text-[16px] font-semibold leading-7 text-[#101828]">
                  {client.clientName || '未命名客户端'}
                </h2>

                <Tag className={`!m-0 !rounded-md !px-2 !text-[12px] ${healthMeta.tagClass}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${healthMeta.dotClass}`} />
                    {healthMeta.label}
                  </span>
                </Tag>

                {client.clientVersion ? (
                  <Tag className="!m-0 !rounded-md !border-[#e4e7ec] !bg-[#f8f9fb] !px-2 !text-[12px] !text-[#667085]">
                    v{client.clientVersion}
                  </Tag>
                ) : null}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] leading-6 text-[#98a2b3]">
                <span>客户端 ID：{client.id ?? '--'}</span>
                <span>最近心跳：{formatTime(client.heartbeatTime)}</span>
              </div>

              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-[13px] text-[#667085]">
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md bg-[#f7f7f8] px-2.5 py-1.5">
                  <LinkOutlined className="shrink-0 text-[#98a2b3]" />
                  <span className="truncate">{getClientAddress(client)}</span>
                </span>
                {client.remark ? <span className="truncate">{client.remark}</span> : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-0.5 xl:justify-end">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                className="!h-8 !px-2.5 !text-[#667085] hover:!bg-[#f5f5f6] hover:!text-[#101828]"
                onClick={() => history.push(`/client/${client.id}/detail`)}
              >
                详情
              </Button>

              <Tooltip title="重新获取该客户端的运行指标">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined spin={metricsLoading} />}
                  className="!h-8 !px-2.5 !text-[#667085] hover:!bg-[#f5f5f6] hover:!text-[#101828]"
                  disabled={!clientId}
                  onClick={() => onRefreshMetrics(clientId)}
                >
                  刷新
                </Button>
              </Tooltip>

              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                className="!h-8 !px-2.5 !text-[#667085] hover:!bg-[#f5f5f6] hover:!text-[#101828]"
                onClick={() => onEdit(client)}
              >
                编辑
              </Button>

              <Popconfirm
                title="删除客户端"
                description="删除后不可恢复，确定继续吗？"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true, loading: deleting }}
                onConfirm={() => onDelete(client)}
              >
                <Button
                  danger
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={deleting}
                  className="!h-8 !px-2.5"
                >
                  删除
                </Button>
              </Popconfirm>
            </div>
          </div>

          <div className="mt-auto flex min-w-0 flex-wrap divide-x divide-[#eceef2] border-t border-[#f0f1f3] pt-3">
            <ClientMetricItem label="CPU 使用率" value={formatPercent(metrics?.cpuUsage)} loading={metricsLoading} />
            <ClientMetricItem label="内存使用率" value={formatPercent(metrics?.memoryUsage)} loading={metricsLoading} />
            <ClientMetricItem label="活跃线程" value={formatNumber(metrics?.threadCount)} loading={metricsLoading} />
            <ClientMetricItem label="运行中任务" value={formatNumber(metrics?.runningOps)} loading={metricsLoading} />
            <ClientMetricItem label="引擎类型" value={client.engineType || '--'} />
          </div>
        </div>
      </div>
    </article>
  );
};

const ClientPage = () => {
  const {
    clients,
    loading,
    confirmLoading,
    openAddModal,
    editingClient,
    deleteLoadingId,
    metricsByClientId,
    metricsLoadingIds,
    form,
    handleOpenCreate,
    handleOpenEdit,
    handleDeleteClient,
    handleSaveClient,
    handleCancelModal,
    loadClients,
    loadClientMetrics,
  } = useClientPageState();

  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>('all');
  const [keyword, setKeyword] = useState('');

  const statusCounts = useMemo(() => {
    return clients.reduce(
      (result, client) => {
        const filter = getHealthMeta(client.healthStatus).filter;
        result.all += 1;
        result[filter] += 1;
        return result;
      },
      { all: 0, online: 0, warning: 0, offline: 0 },
    );
  }, [clients]);

  const filteredClients = useMemo(() => {
    const normalizedKeyword = normalizeKeyword(keyword);

    return clients.filter((client) => {
      const healthFilter = getHealthMeta(client.healthStatus).filter;
      const matchesStatus = statusFilter === 'all' || healthFilter === statusFilter;

      if (!matchesStatus) return false;
      if (!normalizedKeyword) return true;

      return [
        client.clientName,
        client.engineType,
        client.baseUrl,
        client.clientAddress,
        client.clientVersion,
        client.remark,
        String(client.id ?? ''),
      ].some((item) => normalizeKeyword(item).includes(normalizedKeyword));
    });
  }, [clients, keyword, statusFilter]);

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-48px)] bg-[#f7f7f8] px-5 py-5 lg:px-6">
        <div className="mx-auto w-full max-w-[1680px]">
          <div className="flex flex-col gap-4 border-b border-[#e8e9ec] pb-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="m-0 text-[22px] font-semibold leading-8 text-[#161823]">客户端管理</h1>
              <div className="mt-1 text-[13px] leading-6 text-[#8a8f99]">
                管理 Link-Up 客户端连接、健康状态与运行指标。
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                allowClear
                variant="filled"
                value={keyword}
                prefix={<SearchOutlined className="text-[#98a2b3]" />}
                placeholder="搜索客户端"
                className="!h-9 !w-[240px]"
                onChange={(event) => setKeyword(event.target.value)}
              />

              <Tooltip title="刷新客户端列表">
                <Button
                  icon={<ReloadOutlined spin={loading} />}
                  className="!h-9 !w-9 !px-0"
                  onClick={() => loadClients()}
                />
              </Tooltip>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="!h-9 !px-4"
                onClick={handleOpenCreate}
              >
                新增客户端
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-[#e8e9ec] lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-6 overflow-x-auto">
              {statusTabs.map((tab) => {
                const active = tab.key === statusFilter;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={[
                      'relative h-12 shrink-0 border-0 bg-transparent px-0 text-[13px] transition-colors',
                      active ? 'font-semibold text-[#161823]' : 'font-normal text-[#667085] hover:text-[#161823]',
                    ].join(' ')}
                    onClick={() => setStatusFilter(tab.key)}
                  >
                    <span>{tab.label}</span>
                    <span className="ml-1.5 text-[12px] text-[#98a2b3]">{statusCounts[tab.key]}</span>
                    {active ? (
                      <span
                        className="absolute inset-x-0 bottom-0 h-0.5"
                        style={{ background: BRAND_COLOR }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="pb-3 text-[12px] text-[#8a8f99] lg:pb-0">
              共 <span className="font-semibold text-[#344054]">{filteredClients.length}</span> 个客户端
            </div>
          </div>

          <div className="py-4">
            {loading && !clients.length ? (
              <div className="space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="rounded-[10px] border border-[#eceef2] bg-white p-5">
                    <Skeleton active avatar paragraph={{ rows: 3 }} />
                  </div>
                ))}
              </div>
            ) : filteredClients.length ? (
              <div className="space-y-3">
                {filteredClients.map((client) => {
                  const id = Number(client.id);

                  return (
                    <ClientRow
                      key={client.id ?? client.clientName}
                      client={client}
                      metrics={id ? metricsByClientId[id] : undefined}
                      metricsLoading={id ? metricsLoadingIds.has(id) : false}
                      deleting={deleteLoadingId === client.id}
                      onRefreshMetrics={loadClientMetrics}
                      onEdit={handleOpenEdit}
                      onDelete={handleDeleteClient}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-[10px] border border-dashed border-[#dfe2e7] bg-white">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={keyword || statusFilter !== 'all' ? '没有匹配的客户端' : '还没有客户端'}
                >
                  {!keyword && statusFilter === 'all' ? (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                      新增客户端
                    </Button>
                  ) : null}
                </Empty>
              </div>
            )}
          </div>
        </div>

        <AddClientModal
          open={openAddModal}
          form={form}
          mode={editingClient ? 'edit' : 'create'}
          initialValues={editingClient}
          confirmLoading={confirmLoading}
          onCancel={handleCancelModal}
          onSubmit={handleSaveClient}
        />
      </div>
    </ConfigProvider>
  );
};

export default ClientPage;
