import {
  activateWorkflowInstance,
  cancelWorkflowInstance,
  getWorkflowInstance,
  getWorkflowInstances,
  isWorkflowTerminal,
  pauseWorkflowInstance,
  rerunWorkflowFromNode,
  restartWorkflowInstance,
  resumeWorkflowInstance,
  retryWorkflowFailedNodes,
  subscribeWorkflowEvents,
  type WorkflowAttempt,
  type WorkflowInstance,
  type WorkflowNodeInstance,
} from '@/services/workflow';
import { Button, Drawer, Empty, Popconfirm, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const statusLabel: Record<string, string> = {
  CREATED: '已创建',
  RUNNING: '运行中',
  PAUSING: '暂停中',
  PAUSED: '已暂停',
  RESUMING: '恢复中',
  SUCCESS: '成功',
  SUCCESS_WITH_WARNINGS: '完成（有告警）',
  FAILED: '失败',
  WARNING: '告警',
  CANCELED: '已取消',
  TIMED_OUT: '已超时',
  WAITING: '等待中',
  READY: '就绪',
  SUBMITTED: '已提交',
  UPSTREAM_FAILED: '已阻断',
  SKIPPED: '已跳过',
};

const failureReasonLabel: Record<string, string> = {
  EXECUTOR_FAILURE: '执行器失败',
  DISPATCH_TIMEOUT: '派发超时',
  EXECUTION_TIMEOUT: '执行超时',
};

const statusClassName = (status: string) => {
  if (status === 'FAILED' || status === 'TIMED_OUT') {
    return 'text-[#d92d20]';
  }
  if (status === 'UPSTREAM_FAILED' || status === 'PAUSED' || status === 'PAUSING') {
    return 'text-[rgba(22,24,35,.46)]';
  }
  if (
    status === 'RUNNING' ||
    status === 'RESUMING' ||
    status === 'SUBMITTED' ||
    status === 'READY'
  ) {
    return 'font-medium text-[#161823]';
  }
  return 'text-[rgba(22,24,35,.58)]';
};

const formatTime = (value?: string) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';

const JsonBlock = ({ value }: { value?: unknown }) => (
  <pre className="m-0 max-h-[220px] overflow-auto rounded-md bg-[#f7f7f8] p-2.5 text-[11px] leading-5 text-[rgba(22,24,35,.72)]">
    {JSON.stringify(value ?? {}, null, 2)}
  </pre>
);

const WorkflowInstancesPage = () => {
  const detailStreamRef = useRef<(() => void) | null>(null);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<WorkflowInstance>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string>();

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
    setInstances((current) => {
      const exists = current.some((item) => item.id === snapshot.id);
      return exists
        ? current.map((item) => (item.id === snapshot.id ? snapshot : item))
        : [snapshot, ...current];
    });
  }, []);

  const attachDetailStream = useCallback((instance: WorkflowInstance) => {
    detailStreamRef.current?.();
    detailStreamRef.current = null;
    if (!isWorkflowTerminal(instance.status)) {
      detailStreamRef.current = subscribeWorkflowEvents(
        instance.id,
        applyDetailSnapshot,
      );
    }
  }, [applyDetailSnapshot]);

  const openDetail = useCallback(async (record: WorkflowInstance) => {
    detailStreamRef.current?.();
    detailStreamRef.current = null;
    setDetail(record);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const current = await getWorkflowInstance(record.id);
      applyDetailSnapshot(current);
      attachDetailStream(current);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '实例详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  }, [applyDetailSnapshot, attachDetailStream]);

  const closeDetail = () => {
    detailStreamRef.current?.();
    detailStreamRef.current = null;
    setDetailOpen(false);
  };

  const runAction = useCallback(async (
    action: string,
    operation: () => Promise<WorkflowInstance>,
    successMessage: string,
  ) => {
    if (actionLoading) return;
    setActionLoading(action);
    try {
      const snapshot = await operation();
      applyDetailSnapshot(snapshot);
      attachDetailStream(snapshot);
      message.success(successMessage);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '工作流操作失败');
    } finally {
      setActionLoading(undefined);
    }
  }, [actionLoading, applyDetailSnapshot, attachDetailStream]);

  const activateNewExecution = useCallback(async (
    prepared: WorkflowInstance,
    successMessage: string,
  ) => {
    applyDetailSnapshot(prepared);
    attachDetailStream(prepared);
    const activated = await activateWorkflowInstance(prepared.id);
    applyDetailSnapshot(activated);
    message.success(successMessage);
  }, [applyDetailSnapshot, attachDetailStream]);

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
        width: 130,
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
        title: '工作流超时',
        dataIndex: 'workflowTimeoutSeconds',
        width: 120,
        render: (value: number) => value > 0 ? `${value}s` : '-',
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

  const handleRerunFromNode = useCallback(async (nodeId: string) => {
    if (!detail || actionLoading) return;
    setActionLoading(`rerun:${nodeId}`);
    try {
      const prepared = await rerunWorkflowFromNode(detail.id, nodeId);
      await activateNewExecution(prepared, `已从节点「${nodeId}」创建新的运行实例`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '从节点重跑失败');
    } finally {
      setActionLoading(undefined);
    }
  }, [actionLoading, activateNewExecution, detail]);

  const nodeColumns = useMemo<ColumnsType<WorkflowNodeInstance>>(
    () => [
      {
        title: '节点',
        dataIndex: 'name',
        minWidth: 200,
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
        width: 110,
        render: (status: string) => (
          <span className={statusClassName(status)}>
            {statusLabel[status] || status}
          </span>
        ),
      },
      {
        title: 'Attempt',
        width: 100,
        render: (_, record) => (
          <span className="text-[12px] text-[rgba(22,24,35,.62)]">
            {record.currentAttemptNumber
              ? `${record.currentAttemptNumber} / ${record.retryMaxAttempts}`
              : `0 / ${record.retryMaxAttempts}`}
          </span>
        ),
      },
      {
        title: '失败原因',
        dataIndex: 'failureReason',
        width: 120,
        render: (value?: string, record?: WorkflowNodeInstance) => {
          if (record?.status === 'UPSTREAM_FAILED') return '未执行';
          return value ? failureReasonLabel[value] || value : '-';
        },
      },
      {
        title: '操作',
        width: 110,
        render: (_, record) => (
          detail && isWorkflowTerminal(detail.status) ? (
            <Button
              type="link"
              className="!px-0 !text-[12px]"
              loading={actionLoading === `rerun:${record.id}`}
              onClick={() => void handleRerunFromNode(record.id)}
            >
              从此节点重跑
            </Button>
          ) : '-'
        ),
      },
    ],
    [actionLoading, detail, handleRerunFromNode],
  );

  const attemptColumns = useMemo<ColumnsType<WorkflowAttempt>>(
    () => [
      { title: '#', dataIndex: 'attemptNumber', width: 48 },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (status: string) => statusLabel[status] || status,
      },
      {
        title: '失败原因',
        dataIndex: 'failureReason',
        width: 120,
        render: (value?: string) => value ? failureReasonLabel[value] || value : '-',
      },
      {
        title: 'Attempt ID',
        dataIndex: 'id',
        render: (value: string) => (
          <span className="font-mono text-[10px] text-[rgba(22,24,35,.56)]">{value}</span>
        ),
      },
      {
        title: '开始',
        dataIndex: 'startedAt',
        width: 155,
        render: formatTime,
      },
      {
        title: '结束',
        dataIndex: 'endedAt',
        width: 155,
        render: formatTime,
      },
    ],
    [],
  );

  const renderNodeDetail = (record: WorkflowNodeInstance) => (
    <div className="space-y-4 bg-[#fafafa] p-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
        <div>
          <span className="text-[rgba(22,24,35,.42)]">当前 Attempt：</span>
          <span className="font-mono text-[rgba(22,24,35,.68)]">
            {record.currentAttemptId || '-'}
          </span>
        </div>
        <div>
          <span className="text-[rgba(22,24,35,.42)]">Retry：</span>
          <span>{record.retryMaxAttempts} 次 / 延迟 {record.retryDelaySeconds}s</span>
        </div>
        <div>
          <span className="text-[rgba(22,24,35,.42)]">派发超时：</span>
          <span>{record.dispatchTimeoutSeconds > 0 ? `${record.dispatchTimeoutSeconds}s` : '-'}</span>
        </div>
        <div>
          <span className="text-[rgba(22,24,35,.42)]">执行超时：</span>
          <span>{record.executionTimeoutSeconds > 0 ? `${record.executionTimeoutSeconds}s` : '-'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1.5 text-[11px] font-medium text-[#161823]">Input Mapping</div>
          <JsonBlock value={record.inputMapping} />
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-medium text-[#161823]">Resolved Node Input</div>
          <JsonBlock value={record.input} />
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-medium text-[#161823]">Direct Predecessor Outputs</div>
          <JsonBlock value={record.predecessorOutputs} />
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-medium text-[#161823]">Node Output</div>
          <JsonBlock value={record.output} />
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-medium text-[#161823]">Attempt History</div>
        <Table<WorkflowAttempt>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={record.attempts}
          columns={attemptColumns}
          scroll={{ x: 780 }}
        />
      </div>
    </div>
  );

  const canRetryFailed = Boolean(
    detail &&
    isWorkflowTerminal(detail.status) &&
    detail.status !== 'SUCCESS' &&
    detail.nodes.some((node) =>
      node.status === 'FAILED' ||
      node.status === 'UPSTREAM_FAILED' ||
      node.status === 'CANCELED',
    ),
  );

  return (
    <div className="min-h-[calc(100vh-48px)] bg-white px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[20px] font-semibold text-[#161823]">工作流实例</h1>
          <div className="mt-1 text-xs text-[rgba(22,24,35,.46)]">
            查看工作流生命周期、Attempt、超时、输入输出及恢复操作。
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
        scroll={{ x: 1180 }}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无工作流实例" />,
        }}
      />

      <Drawer
        title={detail ? `${detail.name} · 实例详情` : '实例详情'}
        width={980}
        open={detailOpen}
        loading={detailLoading}
        onClose={closeDetail}
        extra={detail ? (
          <div className="flex items-center gap-2">
            {detail.status === 'RUNNING' ? (
              <Button
                size="small"
                icon={<Pause size={13} />}
                loading={actionLoading === 'pause'}
                onClick={() => void runAction(
                  'pause',
                  () => pauseWorkflowInstance(detail.id),
                  '已请求暂停工作流',
                )}
              >暂停</Button>
            ) : null}
            {detail.status === 'PAUSED' ? (
              <Button
                size="small"
                icon={<Play size={13} />}
                loading={actionLoading === 'resume'}
                onClick={() => void runAction(
                  'resume',
                  () => resumeWorkflowInstance(detail.id),
                  '已请求恢复工作流',
                )}
              >恢复</Button>
            ) : null}
            {!isWorkflowTerminal(detail.status) ? (
              <Popconfirm
                title="取消当前工作流？"
                onConfirm={() => void runAction(
                  'cancel',
                  () => cancelWorkflowInstance(detail.id),
                  '工作流已取消',
                )}
              >
                <Button
                  size="small"
                  danger
                  icon={<Square size={12} />}
                  loading={actionLoading === 'cancel'}
                >取消</Button>
              </Popconfirm>
            ) : null}
            {canRetryFailed ? (
              <Button
                size="small"
                icon={<RefreshCw size={12} />}
                loading={actionLoading === 'retryFailed'}
                onClick={() => void runAction(
                  'retryFailed',
                  () => retryWorkflowFailedNodes(detail.id),
                  '已重新调度失败/阻断节点',
                )}
              >重试失败节点</Button>
            ) : null}
            {isWorkflowTerminal(detail.status) ? (
              <Button
                size="small"
                icon={<RotateCcw size={12} />}
                loading={actionLoading === 'restart'}
                onClick={() => void (async () => {
                  if (actionLoading) return;
                  setActionLoading('restart');
                  try {
                    const prepared = await restartWorkflowInstance(detail.id);
                    await activateNewExecution(prepared, '已创建并启动新的完整运行实例');
                  } catch (error) {
                    message.error(error instanceof Error ? error.message : '整体重跑失败');
                  } finally {
                    setActionLoading(undefined);
                  }
                })()}
              >整体重跑</Button>
            ) : null}
          </div>
        ) : null}
      >
        {detail ? (
          <>
            <div className="mb-4 grid grid-cols-3 gap-x-8 gap-y-3 text-[12px]">
              <div className="col-span-2">
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
                <span className="text-[rgba(22,24,35,.45)]">创建：</span>
                <span>{formatTime(detail.startedAt)}</span>
              </div>
              <div>
                <span className="text-[rgba(22,24,35,.45)]">当前运行段：</span>
                <span>{formatTime(detail.runStartedAt)}</span>
              </div>
              <div>
                <span className="text-[rgba(22,24,35,.45)]">结束：</span>
                <span>{formatTime(detail.endedAt)}</span>
              </div>
              <div>
                <span className="text-[rgba(22,24,35,.45)]">工作流超时：</span>
                <span>{detail.workflowTimeoutSeconds > 0 ? `${detail.workflowTimeoutSeconds}s` : '-'}</span>
              </div>
              {detail.sourceExecutionId ? (
                <div className="col-span-2">
                  <span className="text-[rgba(22,24,35,.45)]">来源实例：</span>
                  <span className="font-mono text-[rgba(22,24,35,.68)]">{detail.sourceExecutionId}</span>
                </div>
              ) : null}
            </div>

            <div className="mb-4">
              <div className="mb-1.5 text-[11px] font-medium text-[#161823]">Workflow Input</div>
              <JsonBlock value={detail.input} />
            </div>

            <Table<WorkflowNodeInstance>
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detail.nodes}
              columns={nodeColumns}
              scroll={{ x: 760 }}
              expandable={{
                expandedRowRender: renderNodeDetail,
                rowExpandable: () => true,
              }}
            />
          </>
        ) : null}
      </Drawer>
    </div>
  );
};

export default WorkflowInstancesPage;
