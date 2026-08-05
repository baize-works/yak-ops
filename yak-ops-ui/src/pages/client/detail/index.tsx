import {
  ArrowLeftOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  ConfigProvider,
  Descriptions,
  Empty,
  message,
  Spin,
  Table,
  Tag,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';

import {
  linkupClientApi,
  type ConnectorCapability,
  type LinkupClient,
  type WorkerCapability,
} from '../api';

const capabilityStatusMeta = (status?: string, fresh?: boolean) => {
  if (status === 'READY' && fresh) {
    return { label: '能力就绪', color: 'success' as const };
  }
  if (status === 'ERROR') {
    return { label: '同步异常', color: 'error' as const };
  }
  if (status === 'READY') {
    return { label: '快照过期', color: 'warning' as const };
  }
  return { label: '等待同步', color: 'default' as const };
};

const formatTime = (value?: string) => value || '--';

export default function WorkerDetailPage() {
  const params = useParams<{ id?: string }>();
  const nodeId = params.id ? decodeURIComponent(params.id) : '';
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [worker, setWorker] = useState<LinkupClient | null>(null);
  const [capability, setCapability] = useState<WorkerCapability | null>(null);

  const load = useCallback(async () => {
    if (!nodeId) return;
    setLoading(true);
    try {
      const [workerResponse, capabilityResponse] = await Promise.all([
        linkupClientApi.selectById(nodeId),
        linkupClientApi.capabilities(nodeId),
      ]);
      if (workerResponse?.code !== API_SUCCESS_CODE || !workerResponse.data) {
        throw new Error(workerResponse?.message || '获取 Worker 详情失败');
      }
      setWorker(workerResponse.data);
      setCapability(
        capabilityResponse?.code === API_SUCCESS_CODE
          ? capabilityResponse.data || null
          : null,
      );
    } catch (error: any) {
      message.error(error?.message || '获取 Worker 详情失败');
      setWorker(null);
      setCapability(null);
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    if (!nodeId) return;
    setRefreshing(true);
    try {
      const response = await linkupClientApi.refresh(nodeId);
      if (response?.code !== API_SUCCESS_CODE) {
        throw new Error(response?.message || '刷新 Worker 失败');
      }
      message.success('Worker 心跳与 Connector 能力已刷新');
      await load();
    } catch (error: any) {
      message.error(error?.message || '刷新 Worker 失败');
    } finally {
      setRefreshing(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: 'Connector',
        dataIndex: 'connectorId',
        width: 160,
        render: (value: string, record: ConnectorCapability) => (
          <div>
            <div className="font-medium text-[#161823]">{value}</div>
            <div className="mt-0.5 text-xs text-[#8a8f99]">
              {record.implementationVersion || '--'}
            </div>
          </div>
        ),
      },
      {
        title: '角色',
        dataIndex: 'role',
        width: 100,
        render: (value: string) => (
          <Tag className="!m-0">{value}</Tag>
        ),
      },
      {
        title: 'Schema',
        width: 260,
        render: (_: unknown, record: ConnectorCapability) => (
          <div>
            <div className="text-sm text-[#344054]">
              v{record.schemaVersion || '--'}
            </div>
            <div className="mt-0.5 max-w-[240px] truncate font-mono text-xs text-[#98a2b3]">
              {record.schemaFingerprint || '--'}
            </div>
          </div>
        ),
      },
      {
        title: '执行能力',
        dataIndex: 'capabilities',
        render: (values: string[] = []) =>
          values.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {values.map((value) => (
                <Tag key={value} className="!m-0">
                  {value}
                </Tag>
              ))}
            </div>
          ) : (
            <span className="text-[#98a2b3]">无额外能力声明</span>
          ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f7f7f8]">
        <Spin size="large" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f7f7f8]">
        <Empty description="未找到执行节点">
          <Button onClick={() => history.push('/client')}>返回节点列表</Button>
        </Empty>
      </div>
    );
  }

  const status = capabilityStatusMeta(capability?.status, capability?.fresh);

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-64px)] bg-[#f7f7f8] px-6 py-6">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => history.push('/client')}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="m-0 truncate text-[22px] font-semibold text-[#161823]">
                    {worker.nodeName}
                  </h1>
                  <Tag color={worker.status === 'UP' ? 'success' : 'error'}>
                    {worker.status === 'UP' ? '在线' : '离线'}
                  </Tag>
                  <Tag color={status.color}>{status.label}</Tag>
                </div>
                <div className="mt-1 font-mono text-xs text-[#8a8f99]">
                  {worker.nodeId}
                </div>
              </div>
            </div>

            <Button
              icon={<ReloadOutlined />}
              loading={refreshing}
              onClick={() => void refresh()}
            >
              刷新心跳与能力
            </Button>
          </div>

          <section className="rounded-xl border border-[#eceef1] bg-white p-5">
            <Descriptions
              title="节点概览"
              column={{ xs: 1, sm: 2, lg: 3 }}
              items={[
                { key: 'url', label: 'Worker 地址', children: worker.baseUrl },
                { key: 'version', label: '引擎版本', children: worker.engineVersion || '--' },
                { key: 'instance', label: '进程实例', children: worker.workerInstanceId || '--' },
                {
                  key: 'schedule',
                  label: '调度状态',
                  children: worker.schedulingStatus,
                },
                {
                  key: 'capacity',
                  label: '运行容量',
                  children: `${worker.runningJobs}/${worker.maxConcurrentJobs}`,
                },
                {
                  key: 'queue',
                  label: '队列容量',
                  children: `${worker.queuedJobs}/${worker.maxQueuedJobs}`,
                },
                {
                  key: 'heartbeat',
                  label: '最近心跳',
                  children: formatTime(worker.lastHeartbeatTime),
                },
                {
                  key: 'capabilityTime',
                  label: '能力同步',
                  children: formatTime(capability?.syncedAt),
                },
                {
                  key: 'digest',
                  label: '能力摘要',
                  children: (
                    <span className="font-mono text-xs">
                      {capability?.digest || '--'}
                    </span>
                  ),
                },
              ]}
            />
          </section>

          {capability?.errorMessage ? (
            <Alert
              className="mt-4"
              type="warning"
              showIcon
              message="Connector 能力同步异常"
              description={capability.errorMessage}
            />
          ) : null}

          <section className="mt-4 rounded-xl border border-[#eceef1] bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="m-0 text-base font-semibold text-[#161823]">
                  Connector 能力
                </h2>
                <div className="mt-1 text-xs text-[#8a8f99]">
                  调度器会按 Connector、角色、Schema 指纹和任务特性能力进行硬过滤。
                </div>
              </div>
              <span className="text-sm text-[#667085]">
                {capability?.connectors?.length || 0} 个能力项
              </span>
            </div>

            <Table<ConnectorCapability>
              rowKey={(record) => `${record.connectorId}-${record.role}`}
              columns={columns}
              dataSource={capability?.connectors || []}
              pagination={false}
              locale={{ emptyText: '当前 Worker 尚未同步 Connector 能力' }}
            />
          </section>
        </div>
      </div>
    </ConfigProvider>
  );
}
