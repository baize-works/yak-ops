import {
  getWorkflowInstance,
  getWorkflowInstances,
  isWorkflowTerminal,
  subscribeWorkflowEvents,
  type WorkflowInstance,
  type WorkflowNodeInstance,
} from '@/services/workflow';
import { Button, Drawer, Empty, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const statusLabel: Record<string, string> = {
  CREATED: '已创建',
  RUNNING: '运行中',
  SUCCESS: '成功',
  SUCCESS_WITH_WARNINGS: '完成（有告警）',
  FAILED: '失败',
  WARNING: '告警',
  CANCELED: '已取消',
  WAITING: '等待中',
  READY: '就绪',
  SUBMITTED: '已提交',
  UPSTREAM_FAILED: '已阻断',
  SKIPPED: '已跳过',
};

const statusClassName = (status: string) => {
  if (status === 'FAILED') {
    return 'text-[#d92d20]';
  }
  if (status === 'UPSTREAM_FAILED') {
    return 'text-[rgba(22,24,35,.42)]';
  }
  if (status === 'RUNNING' || status === 'SUBMITTED' || status === 'READY') {
    return 'font-medium text-[#161823]';
  }
  return 'text-[rgba(22,24,35,.58)]';
};

const formatTime = (value?: string) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';

const WorkflowInstancesPage = () => {
  const detailStreamRef = useRef<(() => void) | null>(null);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<WorkflowInstance>();
  const [detailLoading, setDetailLoading] = useState(false);

  const loadInstances = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      setInstances(await getWorkflowInstances());
    } catch (error) {
      if (showLoading) {
        message.error(error instanceof Error ? error.message : '工作流实例加载失败');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInstances(true);
    const timer = window.setInterval(() => void loadInstances(false), 2000);
    return () => {
      window.clearInterval(timer);
      detailStreamRef.current?.();
    };
  }, [loadInstances]);

  const applyDetailSnapshot = useCallback((snapshot: WorkflowInstance) => {
    setDetail(snapshot);
    setInstances((current) => current.map((item) =>
      item.id === snapshot.id ? snapshot : item,
    ));
  }, []);

  const openDetail = useCallback(async (record: WorkflowInstance) => {
    detailStreamRef.current?.();
    detailStreamRef.current = null;
    setDetail(record);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const current = await getWorkflowInstance(record.id);
      applyDetailSnapshot(current);
      if (!isWorkflowTerminal(current.status)) {
        detailStreamRef.current = subscribeWorkflowEvents(
          current.id,
          applyDetailSnapshot,
        );
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '实例详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  }, [applyDetailSnapshot]);

  const closeDetail = () => {
    detailStreamRef.current?.();
    detailStreamRef.current = null;
    setDetailOpen(false);
  };

  const columns = useMemo<ColumnsType<WorkflowInstance>>(
    () => [
      {
        title: '工作流 / 实例',
        dataIndex: 'name',
        minWidth: 320,
        render: (_, record) => (
          <div>
            <div className="text-[13px] font-semibold text-[#161823]">
              {record.name}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-[rgba(22,24,35,.42)]">
              {record.id}
            </div>
          </div>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: (status: string) => (
          <span className={statusClassName(status)}>
            {statusLabel[status] || status}
          </span>
        ),
      },
      {
        title: '节点 / 连线',
        width: 130,
        render: (_, record) => (
          <span className="text-[13px] text-[rgba(22,24,35,.66)]">
            {record.nodeCount} / {record.edgeCount}
          </span>
        ),
      },
      {
        title: '开始时间',
        dataIndex: 'startedAt',
        width: 180,
        render: formatTime,
      },
      {
        title: '结束时间',
        dataIndex: 'endedAt',
        width: 180,
        render: formatTime,
      },
      {
        title: '操作',
        width: 90,
        fixed: 'right',
        render: (_, record) => (
          <Button type="link" className="!px-0" onClick={() => openDetail(record)}>
            查看
          </Button>
        ),
      },
    ],
    [openDetail],
  );

  const nodeColumns = useMemo<ColumnsType<WorkflowNodeInstance>>(
    () => [
      {
        title: '节点',
        dataIndex: 'name',
        render: (_, record) => (
          <div>
            <div className="font-medium text-[#161823]">{record.name}</div>
            <div className="mt-0.5 text-[11px] text-[rgba(22,24,35,.42)]">
              {record.type} · {record.id}
            </div>
          </div>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: (status: string) => (
          <span className={statusClassName(status)}>
            {statusLabel[status] || status}
          </span>
        ),
      },
      {
        title: '错误信息',
        dataIndex: 'errorMessage',
        width: 240,
        render: (value?: string, record?: WorkflowNodeInstance) =>
          record?.status === 'UPSTREAM_FAILED' ? '-' : value || '-',
      },
    ],
    [],
  );

  return (
    <div className="min-h-[calc(100vh-48px)] bg-white px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[20px] font-semibold text-[#161823]">工作流实例</h1>
          <div className="mt-1 text-xs text-[rgba(22,24,35,.46)]">
            当前实例仅保存在内存中；打开实例详情后通过 SSE 实时更新节点状态。
          </div>
        </div>
        <Button
          icon={<RefreshCw size={14} />}
          loading={loading}
          onClick={() => void loadInstances(true)}
        >
          刷新
        </Button>
      </div>

      <Table<WorkflowInstance>
        rowKey="id"
        size="small"
        bordered
        pagination={false}
        loading={loading}
        dataSource={instances}
        columns={columns}
        scroll={{ x: 1080 }}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无工作流实例" />,
        }}
      />

      <Drawer
        title={detail ? `${detail.name} · 实例详情` : '实例详情'}
        width={720}
        open={detailOpen}
        loading={detailLoading}
        onClose={closeDetail}
      >
        {detail ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
              <div>
                <span className="text-[rgba(22,24,35,.45)]">实例 ID：</span>
                <span className="font-mono text-[#161823]">{detail.id}</span>
              </div>
              <div>
                <span className="text-[rgba(22,24,35,.45)]">状态：</span>
                <span className={statusClassName(detail.status)}>
                  {statusLabel[detail.status] || detail.status}
                </span>
              </div>
              <div>
                <span className="text-[rgba(22,24,35,.45)]">开始：</span>
                <span>{formatTime(detail.startedAt)}</span>
              </div>
              <div>
                <span className="text-[rgba(22,24,35,.45)]">结束：</span>
                <span>{formatTime(detail.endedAt)}</span>
              </div>
            </div>
            <Table<WorkflowNodeInstance>
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detail.nodes}
              columns={nodeColumns}
            />
          </>
        ) : null}
      </Drawer>
    </div>
  );
};

export default WorkflowInstancesPage;
