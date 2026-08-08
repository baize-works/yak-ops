import ClickSpark from '@/components/ClickSpark';
import {
  createWorkflowDefinition,
  deleteWorkflowDefinition,
  listWorkflowDefinitions,
  offlineWorkflowDefinition,
  onlineWorkflowDefinition,
  pauseWorkflowDefinition,
  resumeWorkflowDefinition,
  runWorkflowDefinition,
  type WorkflowDefinition,
  type WorkflowDefinitionStatus,
} from '@/services/workflow/definitions';
import { history } from '@umijs/max';
import {
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Spin,
  message,
} from 'antd';
import {
  CheckCircle2,
  ChevronRight,
  CirclePause,
  CirclePlay,
  CloudOff,
  CloudUpload,
  FilePenLine,
  GitBranch,
  Grid2X2,
  LayoutList,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Workflow,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

type ViewMode = 'grid' | 'list';

type FilterKey = 'ALL' | WorkflowDefinitionStatus;

interface StatusMeta {
  label: string;
  className: string;
  dotClassName: string;
}

const DEFINITION_STATUS: Record<string, StatusMeta> = {
  DRAFT: {
    label: '草稿',
    className: 'border-[#e4e7ec] bg-[#f7f7f8] text-[#667085]',
    dotClassName: 'bg-[#98a2b3]',
  },
  ONLINE: {
    label: '已上线',
    className: 'border-[#ffd8e0] bg-[#fff4f6] text-[#e5254e]',
    dotClassName: 'bg-[#fe2c55]',
  },
  OFFLINE: {
    label: '已下线',
    className: 'border-[#e4e7ec] bg-[#f5f5f6] text-[#667085]',
    dotClassName: 'bg-[#98a2b3]',
  },
};

const RUNTIME_LABEL: Record<string, string> = {
  CREATED: '已创建',
  WAITING: '等待中',
  READY: '就绪',
  SUBMITTED: '待执行',
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
};

const ACTIVE_RUNTIME_STATUSES = new Set([
  'CREATED',
  'WAITING',
  'READY',
  'SUBMITTED',
  'RUNNING',
  'PAUSING',
  'PAUSED',
  'RESUMING',
]);

const RUNNING_RUNTIME_STATUSES = new Set([
  'CREATED',
  'WAITING',
  'READY',
  'SUBMITTED',
  'RUNNING',
  'PAUSING',
  'RESUMING',
]);

const isActiveRuntime = (status?: string) =>
  Boolean(status && ACTIVE_RUNTIME_STATUSES.has(status));

const isRunningRuntime = (status?: string) =>
  Boolean(status && RUNNING_RUNTIME_STATUSES.has(status));

const formatTime = (value?: string) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const runtimeStatusClassName = (status?: string) => {
  switch (status) {
    case 'RUNNING':
    case 'RESUMING':
    case 'PAUSING':
      return 'text-[#fe2c55]';

    case 'FAILED':
    case 'TIMED_OUT':
      return 'text-[#d92d20]';

    case 'SUCCESS':
    case 'SUCCESS_WITH_WARNINGS':
      return 'text-[#161823]';

    case 'PAUSED':
      return 'text-[#667085]';

    default:
      return 'text-[rgba(22,24,35,.48)]';
  }
};

const WorkflowManagementPage = () => {
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string>();

  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form] = Form.useForm<{
    name: string;
    description?: string;
  }>();

  const loadDefinitions = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await listWorkflowDefinitions();
      setDefinitions(data || []);
    } catch (error) {
      if (!silent) {
        message.error(
          error instanceof Error ? error.message : '工作流加载失败',
        );
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDefinitions();
  }, [loadDefinitions]);

  useEffect(() => {
    const hasActiveExecution = definitions.some((item) =>
      isActiveRuntime(item.latestExecutionStatus),
    );

    if (!hasActiveExecution) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadDefinitions(true);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [definitions, loadDefinitions]);

  const summary = useMemo(
    () => ({
      total: definitions.length,
      online: definitions.filter((item) => item.status === 'ONLINE').length,
      draft: definitions.filter((item) => item.status === 'DRAFT').length,
      running: definitions.filter((item) =>
        ['RUNNING', 'PAUSING', 'RESUMING'].includes(
          item.latestExecutionStatus || '',
        ),
      ).length,
    }),
    [definitions],
  );

  const offlineCount = useMemo(
    () => definitions.filter((item) => item.status === 'OFFLINE').length,
    [definitions],
  );

  const filteredDefinitions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return definitions.filter((item) => {
      if (filter !== 'ALL' && item.status !== filter) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(normalizedKeyword) ||
        (item.description || '').toLowerCase().includes(normalizedKeyword) ||
        item.id.toLowerCase().includes(normalizedKeyword)
      );
    });
  }, [definitions, filter, keyword]);

  const filterTabs: Array<{
    key: FilterKey;
    label: string;
    count: number;
  }> = [
    {
      key: 'ALL',
      label: '全部工作流',
      count: summary.total,
    },
    {
      key: 'ONLINE',
      label: '已上线',
      count: summary.online,
    },
    {
      key: 'DRAFT',
      label: '草稿',
      count: summary.draft,
    },
    {
      key: 'OFFLINE',
      label: '已下线',
      count: offlineCount,
    },
  ];

  const executeAction = async (
    id: string,
    action: () => Promise<WorkflowDefinition>,
    success: string,
  ) => {
    if (actionId) {
      return;
    }

    setActionId(id);

    try {
      await action();
      message.success(success);
      await loadDefinitions(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setActionId(undefined);
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();

      setCreating(true);

      const created = await createWorkflowDefinition({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      });

      message.success('工作流草稿已创建，请继续配置任务节点');

      setCreateOpen(false);
      form.resetFields();

      history.push(`/workflow/definition/${created.id}?scene=create`);
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }

      message.error(
        error instanceof Error ? error.message : '创建工作流失败',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClose = () => {
    if (creating) {
      return;
    }

    setCreateOpen(false);
    form.resetFields();
  };

  const handleDelete = (record: WorkflowDefinition) => {
    Modal.confirm({
      centered: true,
      title: '确认删除工作流吗？',
      content: (
        <div className="text-[13px] leading-6 text-[rgba(22,24,35,.58)]">
          即将删除工作流
          <span className="mx-1 font-semibold text-[#fe2c55]">
            [{record.name}]
          </span>
          。
          <br />
          删除后无法恢复，请谨慎操作。
        </div>
      ),
      okText: '删除',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
        size: 'small',
      },
      cancelButtonProps: {
        size: 'small',
      },
      maskClosable: true,
      async onOk() {
        try {
          await deleteWorkflowDefinition(record.id);
          message.success('工作流已删除');
          await loadDefinitions(true);
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : '删除工作流失败',
          );
        }
      },
    });
  };

  const goToDefinition = (record: WorkflowDefinition) => {
    history.push(`/workflow/definition/${record.id}?scene=edit`);
  };

  const renderActions = (
    record: WorkflowDefinition,
    mode: ViewMode,
  ) => {
    const busy = actionId === record.id;
    const runtimeStatus = record.latestExecutionStatus;

    const running = isRunningRuntime(runtimeStatus);
    const paused = runtimeStatus === 'PAUSED';

    const iconButtonClassName = [
      'inline-flex h-[29px] w-[29px] items-center justify-center',
      'rounded-[7px] border border-[rgba(22,24,35,.07)]',
      'bg-[rgba(255,255,255,.88)]',
      'text-[rgba(22,24,35,.52)]',
      'transition-all hover:border-[rgba(254,44,85,.16)]',
      'hover:bg-white hover:text-[#fe2c55]',
      'disabled:cursor-not-allowed disabled:opacity-40',
    ].join(' ');

    if (mode === 'grid') {
      return (
        <div className="flex items-center gap-[5px]">
          <button
            type="button"
            title={record.status === 'ONLINE' ? '查看工作流' : '编辑工作流'}
            className={iconButtonClassName}
            onClick={() => goToDefinition(record)}
          >
            <Pencil size={14} strokeWidth={1.9} />
          </button>

          {record.status !== 'ONLINE' ? (
            <button
              type="button"
              title="上线工作流"
              disabled={busy}
              className={iconButtonClassName}
              onClick={() =>
                void executeAction(
                  record.id,
                  () => onlineWorkflowDefinition(record.id),
                  '工作流已上线',
                )
              }
            >
              {busy ? (
                <RefreshCw
                  size={14}
                  strokeWidth={1.9}
                  className="animate-spin"
                />
              ) : (
                <CloudUpload size={14} strokeWidth={1.9} />
              )}
            </button>
          ) : (
            <button
              type="button"
              title="下线工作流"
              disabled={busy || isActiveRuntime(runtimeStatus)}
              className={iconButtonClassName}
              onClick={() =>
                void executeAction(
                  record.id,
                  () => offlineWorkflowDefinition(record.id),
                  '工作流已下线',
                )
              }
            >
              {busy ? (
                <RefreshCw
                  size={14}
                  strokeWidth={1.9}
                  className="animate-spin"
                />
              ) : (
                <CloudOff size={14} strokeWidth={1.9} />
              )}
            </button>
          )}

          {record.status === 'ONLINE' &&
            !isActiveRuntime(runtimeStatus) && (
              <button
                type="button"
                title="运行工作流"
                disabled={busy}
                className={iconButtonClassName}
                onClick={() =>
                  void executeAction(
                    record.id,
                    () => runWorkflowDefinition(record.id),
                    '工作流已启动',
                  )
                }
              >
                <CirclePlay size={14} strokeWidth={1.9} />
              </button>
            )}

          {record.status === 'ONLINE' && running && (
            <button
              type="button"
              title="暂停工作流"
              disabled={busy}
              className={iconButtonClassName}
              onClick={() =>
                void executeAction(
                  record.id,
                  () => pauseWorkflowDefinition(record.id),
                  '已请求暂停工作流',
                )
              }
            >
              <CirclePause size={14} strokeWidth={1.9} />
            </button>
          )}

          {record.status === 'ONLINE' && paused && (
            <button
              type="button"
              title="恢复工作流"
              disabled={busy}
              className={iconButtonClassName}
              onClick={() =>
                void executeAction(
                  record.id,
                  () => resumeWorkflowDefinition(record.id),
                  '工作流已恢复',
                )
              }
            >
              <CirclePlay size={14} strokeWidth={1.9} />
            </button>
          )}

          {record.status !== 'ONLINE' &&
            !isActiveRuntime(runtimeStatus) && (
              <button
                type="button"
                title="删除工作流"
                className={[
                  iconButtonClassName,
                  'hover:border-[rgba(229,72,77,.18)]',
                  'hover:bg-[#fff5f5]',
                  'hover:text-[#e5484d]',
                ].join(' ')}
                onClick={() => handleDelete(record)}
              >
                <Trash2 size={14} strokeWidth={1.9} />
              </button>
            )}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-1">
        <Button
          type="text"
          size="small"
          icon={<Pencil size={13} />}
          onClick={() => goToDefinition(record)}
        >
          {record.status === 'ONLINE' ? '查看' : '编辑'}
        </Button>

        {record.status !== 'ONLINE' ? (
          <Button
            type="text"
            size="small"
            loading={busy}
            icon={<CloudUpload size={13} />}
            onClick={() =>
              void executeAction(
                record.id,
                () => onlineWorkflowDefinition(record.id),
                '工作流已上线',
              )
            }
          >
            上线
          </Button>
        ) : (
          <Button
            type="text"
            size="small"
            loading={busy}
            disabled={isActiveRuntime(runtimeStatus)}
            icon={<CloudOff size={13} />}
            onClick={() =>
              void executeAction(
                record.id,
                () => offlineWorkflowDefinition(record.id),
                '工作流已下线',
              )
            }
          >
            下线
          </Button>
        )}

        {record.status === 'ONLINE' &&
          !isActiveRuntime(runtimeStatus) && (
            <Button
              type="text"
              size="small"
              loading={busy}
              icon={<CirclePlay size={13} />}
              onClick={() =>
                void executeAction(
                  record.id,
                  () => runWorkflowDefinition(record.id),
                  '工作流已启动',
                )
              }
            >
              运行
            </Button>
          )}

        {record.status === 'ONLINE' && running && (
          <Button
            type="text"
            size="small"
            loading={busy}
            icon={<CirclePause size={13} />}
            onClick={() =>
              void executeAction(
                record.id,
                () => pauseWorkflowDefinition(record.id),
                '已请求暂停工作流',
              )
            }
          >
            暂停
          </Button>
        )}

        {record.status === 'ONLINE' && paused && (
          <Button
            type="text"
            size="small"
            loading={busy}
            icon={<CirclePlay size={13} />}
            onClick={() =>
              void executeAction(
                record.id,
                () => resumeWorkflowDefinition(record.id),
                '工作流已恢复',
              )
            }
          >
            恢复
          </Button>
        )}

        {record.status !== 'ONLINE' &&
          !isActiveRuntime(runtimeStatus) && (
            <Button
              danger
              type="text"
              size="small"
              icon={<Trash2 size={13} />}
              onClick={() => handleDelete(record)}
            >
              删除
            </Button>
          )}
      </div>
    );
  };

  const renderGridCard = (record: WorkflowDefinition) => {
    const status =
      DEFINITION_STATUS[record.status] || DEFINITION_STATUS.DRAFT;

    const runtimeText = record.latestExecutionStatus
      ? RUNTIME_LABEL[record.latestExecutionStatus] ||
        record.latestExecutionStatus
      : '尚未运行';

    return (
      <article
        key={record.id}
        className={[
          'group min-w-0 overflow-hidden rounded-[9px]',
          'border border-[rgba(22,24,35,.075)] bg-white',
          'transition-all duration-200',
          'hover:-translate-y-[2px]',
          'hover:border-[rgba(22,24,35,.11)]',
          'hover:shadow-[0_10px_28px_rgba(22,24,35,.07)]',
        ].join(' ')}
      >
        <div
          className={[
            'flex min-h-[94px] items-start justify-between gap-4',
            'px-[19px] pb-4 pt-[19px]',
            'bg-[radial-gradient(circle_at_100%_0,rgba(88,110,255,.08),transparent_38%),linear-gradient(110deg,#fbfcff_0%,#f7f8fc_100%)]',
          ].join(' ')}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={[
                'flex h-[47px] w-[47px] shrink-0 items-center justify-center',
                'rounded-xl border border-[rgba(22,24,35,.055)]',
                'bg-white text-[#4e62d6]',
                'shadow-[0_5px_14px_rgba(22,24,35,.055)]',
              ].join(' ')}
            >
              <GitBranch size={23} strokeWidth={1.7} />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  title={record.name}
                  onClick={() => goToDefinition(record)}
                  className={[
                    'min-w-0 truncate border-0 bg-transparent p-0',
                    'text-left text-[15px] font-semibold text-[#161823]',
                    'transition-colors hover:text-[#fe2c55]',
                  ].join(' ')}
                >
                  {record.name || '未命名工作流'}
                </button>

                <span
                  className={[
                    'inline-flex h-5 shrink-0 items-center gap-1.5',
                    'rounded-[10px] border px-2',
                    'text-[9px] font-semibold',
                    status.className,
                  ].join(' ')}
                >
                  <span
                    className={[
                      'h-[5px] w-[5px] rounded-full',
                      status.dotClassName,
                    ].join(' ')}
                  />
                  {status.label}
                </span>
              </div>

              <div
                title={record.id}
                className="mt-1.5 max-w-[380px] truncate text-[10px] text-[rgba(22,24,35,.34)]"
              >
                ID {record.id}
              </div>
            </div>
          </div>

          <div
            className={[
              'flex shrink-0 gap-[5px]',
              'pointer-events-none -translate-y-1 opacity-0',
              'transition-all duration-150',
              'group-hover:pointer-events-auto',
              'group-hover:translate-y-0 group-hover:opacity-100',
            ].join(' ')}
          >
            {renderActions(record, 'grid')}
          </div>
        </div>

        <div className="border-b border-[rgba(22,24,35,.055)] px-[19px] py-3">
          <p
            title={record.description || ''}
            className={[
              'm-0 line-clamp-2 min-h-10',
              'text-[11px] leading-5 text-[rgba(22,24,35,.43)]',
            ].join(' ')}
          >
            {record.description || '暂无工作流描述'}
          </p>
        </div>

        <div className="grid grid-cols-3 px-[19px] py-[15px]">
          <div className="min-w-0">
            <div className="text-[10px] text-[rgba(22,24,35,.38)]">
              节点数量
            </div>
            <div className="mt-1.5 truncate text-[11px] font-semibold text-[rgba(22,24,35,.78)]">
              {record.nodeCount}
            </div>
          </div>

          <div className="min-w-0 border-l border-[rgba(22,24,35,.06)] pl-[14px]">
            <div className="text-[10px] text-[rgba(22,24,35,.38)]">
              连线数量
            </div>
            <div className="mt-1.5 truncate text-[11px] font-semibold text-[rgba(22,24,35,.78)]">
              {record.edgeCount}
            </div>
          </div>

          <div className="min-w-0 border-l border-[rgba(22,24,35,.06)] pl-[14px]">
            <div className="text-[10px] text-[rgba(22,24,35,.38)]">
              最近运行
            </div>

            <div
              className={[
                'mt-1.5 truncate text-[11px] font-semibold',
                runtimeStatusClassName(record.latestExecutionStatus),
              ].join(' ')}
            >
              {runtimeText}
            </div>
          </div>
        </div>

        <div
          className={[
            'flex min-h-[46px] items-center justify-between gap-4',
            'border-t border-[rgba(22,24,35,.055)]',
            'bg-[#fcfcfd] px-[19px]',
          ].join(' ')}
        >
          <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-[rgba(22,24,35,.4)]">
            {record.latestExecutionStatus === 'RUNNING' ? (
              <>
                <PlayCircle size={13} strokeWidth={1.8} />
                <span className="text-[#fe2c55]">当前正在运行</span>
              </>
            ) : record.latestExecutionStatus === 'PAUSED' ? (
              <>
                <PauseCircle size={13} strokeWidth={1.8} />
                <span>当前已暂停</span>
              </>
            ) : record.latestExecutionStatus === 'SUCCESS' ? (
              <>
                <CheckCircle2 size={13} strokeWidth={1.8} />
                <span>最近运行成功</span>
              </>
            ) : (
              <>
                <FilePenLine size={13} strokeWidth={1.8} />
                <span>
                  最近更新 {formatTime(record.updateTime)}
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => goToDefinition(record)}
            className={[
              'inline-flex shrink-0 items-center gap-0.5',
              'border-0 bg-transparent p-0',
              'text-[11px] font-semibold text-[rgba(22,24,35,.58)]',
              'transition-colors hover:text-[#fe2c55]',
            ].join(' ')}
          >
            {record.status === 'ONLINE' ? '查看详情' : '编辑详情'}
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>
      </article>
    );
  };

  const renderListItem = (record: WorkflowDefinition) => {
    const status =
      DEFINITION_STATUS[record.status] || DEFINITION_STATUS.DRAFT;

    const runtimeText = record.latestExecutionStatus
      ? RUNTIME_LABEL[record.latestExecutionStatus] ||
        record.latestExecutionStatus
      : '尚未运行';

    return (
      <article
        key={record.id}
        className={[
          'group grid min-h-[108px]',
          'grid-cols-[minmax(330px,1.45fr)_minmax(300px,1fr)_250px]',
          'overflow-hidden rounded-[9px]',
          'border border-[rgba(22,24,35,.075)]',
          'bg-white',
          'transition-all duration-200',
          'hover:border-[rgba(22,24,35,.11)]',
          'hover:shadow-[0_8px_24px_rgba(22,24,35,.055)]',
        ].join(' ')}
      >
        <div
          className={[
            'flex min-w-0 items-center gap-3 px-[19px]',
            'bg-[radial-gradient(circle_at_100%_0,rgba(88,110,255,.07),transparent_40%),linear-gradient(110deg,#fbfcff_0%,#f8f9fc_100%)]',
          ].join(' ')}
        >
          <div
            className={[
              'flex h-[47px] w-[47px] shrink-0 items-center justify-center',
              'rounded-xl border border-[rgba(22,24,35,.055)]',
              'bg-white text-[#4e62d6]',
              'shadow-[0_5px_14px_rgba(22,24,35,.05)]',
            ].join(' ')}
          >
            <GitBranch size={22} strokeWidth={1.7} />
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                title={record.name}
                onClick={() => goToDefinition(record)}
                className={[
                  'min-w-0 truncate border-0 bg-transparent p-0',
                  'text-left text-[14px] font-semibold text-[#161823]',
                  'hover:text-[#fe2c55]',
                ].join(' ')}
              >
                {record.name}
              </button>

              <span
                className={[
                  'inline-flex h-5 shrink-0 items-center gap-1.5',
                  'rounded-[10px] border px-2',
                  'text-[9px] font-semibold',
                  status.className,
                ].join(' ')}
              >
                <span
                  className={[
                    'h-[5px] w-[5px] rounded-full',
                    status.dotClassName,
                  ].join(' ')}
                />
                {status.label}
              </span>
            </div>

            <div
              title={record.id}
              className="mt-1.5 truncate text-[10px] text-[rgba(22,24,35,.34)]"
            >
              ID {record.id}
            </div>

            <div
              title={record.description || ''}
              className="mt-2 truncate text-[11px] text-[rgba(22,24,35,.43)]"
            >
              {record.description || '暂无工作流描述'}
            </div>
          </div>
        </div>

        <div
          className={[
            'grid grid-cols-3 items-center',
            'border-l border-[rgba(22,24,35,.055)]',
            'px-[19px]',
          ].join(' ')}
        >
          <div className="min-w-0">
            <div className="text-[10px] text-[rgba(22,24,35,.38)]">
              节点
            </div>
            <div className="mt-1.5 text-[11px] font-semibold text-[rgba(22,24,35,.78)]">
              {record.nodeCount}
            </div>
          </div>

          <div className="min-w-0 border-l border-[rgba(22,24,35,.06)] pl-4">
            <div className="text-[10px] text-[rgba(22,24,35,.38)]">
              连线
            </div>
            <div className="mt-1.5 text-[11px] font-semibold text-[rgba(22,24,35,.78)]">
              {record.edgeCount}
            </div>
          </div>

          <div className="min-w-0 border-l border-[rgba(22,24,35,.06)] pl-4">
            <div className="text-[10px] text-[rgba(22,24,35,.38)]">
              运行状态
            </div>
            <div
              className={[
                'mt-1.5 truncate text-[11px] font-semibold',
                runtimeStatusClassName(record.latestExecutionStatus),
              ].join(' ')}
            >
              {runtimeText}
            </div>
          </div>
        </div>

        <div
          className={[
            'flex flex-col items-stretch justify-center gap-2',
            'border-l border-[rgba(22,24,35,.055)]',
            'px-[18px]',
          ].join(' ')}
        >
          <div className="text-right text-[10px] text-[rgba(22,24,35,.35)]">
            {formatTime(record.updateTime)}
          </div>

          {renderActions(record, 'list')}
        </div>
      </article>
    );
  };

  return (
    <>
      <ClickSpark
        sparkColor="#fe2c55"
        sparkSize={9}
        sparkRadius={14}
        sparkCount={7}
        duration={360}
        easing="ease-out"
        extraScale={1}
      >
        <div
          className={[
            'min-h-[calc(100vh-48px)]',
            'bg-[#f7f8fa] p-7',
            'text-[#161823]',
            'max-[1280px]:p-[22px]',
          ].join(' ')}
        >
          <div
            className={[
              'min-h-[calc(100vh-132px)]',
              'rounded-[10px]',
              'border border-[rgba(22,24,35,.025)]',
              'bg-white',
              'px-[34px] pb-[38px] pt-[30px]',
              'shadow-[0_2px_12px_rgba(22,24,35,.025)]',
              'max-[1280px]:p-[26px]',
            ].join(' ')}
          >
            {/* Header */}
            <header className="flex items-start justify-between gap-8">
              <div>
                <h1 className="m-0 text-[24px] font-bold tracking-[-0.45px] text-[#161823]">
                  工作流定义
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className={[
                  'inline-flex h-10 shrink-0 items-center justify-center gap-[7px]',
                  'rounded-[7px] border-0 px-[17px]',
                  'bg-[linear-gradient(102deg,#fe516e_0%,#fe2c55_100%)]',
                  'text-[13px] font-semibold text-white',
                  'shadow-[0_7px_18px_rgba(254,44,85,.20)]',
                  'transition-all duration-150',
                  'hover:-translate-y-px',
                  'hover:shadow-[0_9px_22px_rgba(254,44,85,.25)]',
                ].join(' ')}
              >
                <Plus size={17} strokeWidth={2.2} />
                新建工作流
              </button>
            </header>

            {/* Overview */}
            <section
              className={[
                'mt-[26px] grid grid-cols-4 overflow-hidden',
                'rounded-[9px]',
                'border border-[rgba(22,24,35,.055)]',
                'bg-[radial-gradient(circle_at_85%_10%,rgba(88,110,255,.08),transparent_31%),linear-gradient(105deg,#fcfcff_0%,#f8f9ff_100%)]',
                'max-[1280px]:grid-cols-2',
              ].join(' ')}
            >
              <div className="flex min-h-[92px] items-center gap-[13px] px-6 py-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#edf0ff] text-[#4e62d6]">
                  <Workflow size={20} strokeWidth={1.8} />
                </span>

                <div className="flex min-w-0 flex-col">
                  <span className="text-[12px] text-[rgba(22,24,35,.45)]">
                    全部工作流
                  </span>
                  <strong className="mt-[5px] text-[24px] font-bold leading-7 text-[#161823]">
                    {summary.total}
                  </strong>
                </div>
              </div>

              <div
                className={[
                  'flex min-h-[92px] items-center gap-[13px]',
                  'border-l border-[rgba(22,24,35,.055)]',
                  'px-6 py-5',
                ].join(' ')}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#fff0f3] text-[#fe2c55]">
                  <CloudUpload size={20} strokeWidth={1.8} />
                </span>

                <div className="flex min-w-0 flex-col">
                  <span className="text-[12px] text-[rgba(22,24,35,.45)]">
                    已上线
                  </span>
                  <strong className="mt-[5px] text-[24px] font-bold leading-7 text-[#161823]">
                    {summary.online}
                  </strong>
                </div>
              </div>

              <div
                className={[
                  'flex min-h-[92px] items-center gap-[13px]',
                  'border-l border-[rgba(22,24,35,.055)]',
                  'px-6 py-5',
                  'max-[1280px]:border-l-0',
                  'max-[1280px]:border-t',
                  'max-[1280px]:border-t-[rgba(22,24,35,.055)]',
                ].join(' ')}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#f2f4f7] text-[#667085]">
                  <FilePenLine size={20} strokeWidth={1.8} />
                </span>

                <div className="flex min-w-0 flex-col">
                  <span className="text-[12px] text-[rgba(22,24,35,.45)]">
                    草稿
                  </span>
                  <strong className="mt-[5px] text-[24px] font-bold leading-7 text-[#161823]">
                    {summary.draft}
                  </strong>
                </div>
              </div>

              <div
                className={[
                  'flex min-h-[92px] items-center gap-[13px]',
                  'border-l border-[rgba(22,24,35,.055)]',
                  'px-6 py-5',
                  'max-[1280px]:border-t',
                  'max-[1280px]:border-t-[rgba(22,24,35,.055)]',
                ].join(' ')}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#eef2f6] text-[#617084]">
                  <PlayCircle size={20} strokeWidth={1.8} />
                </span>

                <div className="flex min-w-0 flex-col">
                  <span className="text-[12px] text-[rgba(22,24,35,.45)]">
                    运行中
                  </span>
                  <strong className="mt-[5px] text-[24px] font-bold leading-7 text-[#161823]">
                    {summary.running}
                  </strong>
                </div>
              </div>
            </section>

            {/* Workbench */}
            <section
              className={[
                'mt-[26px] flex min-h-[62px] items-end justify-between gap-6',
                'border-b border-[rgba(22,24,35,.075)]',
                'max-[1280px]:flex-col',
                'max-[1280px]:items-stretch',
                'max-[1280px]:gap-3',
              ].join(' ')}
            >
              <div className="flex h-[43px] items-start gap-[27px]">
                {filterTabs.map((item) => {
                  const active = filter === item.key;

                  return (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => setFilter(item.key)}
                      className={[
                        'relative inline-flex h-[43px] items-center gap-[7px]',
                        'border-0 bg-transparent p-0 text-[13px]',
                        active
                          ? 'font-semibold text-[#161823]'
                          : 'text-[rgba(22,24,35,.48)]',
                        active
                          ? 'after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:rounded-sm after:bg-[#fe2c55]'
                          : '',
                      ].join(' ')}
                    >
                      {item.label}

                      <span
                        className={[
                          'inline-flex h-[18px] min-w-5 items-center justify-center',
                          'rounded-[9px] px-[5px] text-[10px]',
                          active
                            ? 'bg-[#ffecef] text-[#fe2c55]'
                            : 'bg-[#f2f3f5] text-[rgba(22,24,35,.42)]',
                        ].join(' ')}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                className={[
                  'flex items-center gap-2 pb-[11px]',
                  'max-[1280px]:justify-end',
                  'max-[1280px]:pb-3',
                ].join(' ')}
              >
                <label
                  className={[
                    'flex h-[34px] w-[300px] items-center gap-2',
                    'rounded-[7px]',
                    'border border-[rgba(22,24,35,.10)]',
                    'bg-[#fafafa] px-[11px]',
                    'text-[rgba(22,24,35,.38)]',
                    'transition-all',
                    'focus-within:border-[rgba(254,44,85,.42)]',
                    'focus-within:bg-white',
                    'focus-within:shadow-[0_0_0_3px_rgba(254,44,85,.06)]',
                  ].join(' ')}
                >
                  <Search size={16} strokeWidth={1.8} />

                  <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="搜索工作流名称、描述或 ID"
                    className={[
                      'min-w-0 flex-1 border-0 bg-transparent outline-none',
                      'text-[12px] text-[#161823]',
                      'placeholder:text-[rgba(22,24,35,.33)]',
                    ].join(' ')}
                  />

                  {keyword && (
                    <button
                      type="button"
                      aria-label="清空搜索"
                      onClick={() => setKeyword('')}
                      className="flex h-5 w-5 items-center justify-center rounded-full border-0 bg-[#eceef0] text-[12px] text-[rgba(22,24,35,.42)]"
                    >
                      ×
                    </button>
                  )}
                </label>

                <button
                  type="button"
                  title="刷新"
                  disabled={loading}
                  onClick={() => void loadDefinitions()}
                  className={[
                    'flex h-[34px] w-[34px] items-center justify-center',
                    'rounded-[7px]',
                    'border border-[rgba(22,24,35,.09)]',
                    'bg-white text-[rgba(22,24,35,.53)]',
                    'transition-colors',
                    'hover:border-[rgba(254,44,85,.20)]',
                    'hover:bg-[#fff7f8] hover:text-[#fe2c55]',
                    'disabled:opacity-50',
                  ].join(' ')}
                >
                  <RefreshCw
                    size={16}
                    strokeWidth={1.8}
                    className={loading ? 'animate-spin' : ''}
                  />
                </button>

                <div className="flex overflow-hidden rounded-[7px]">
                  <button
                    type="button"
                    title="卡片视图"
                    onClick={() => setViewMode('grid')}
                    className={[
                      'flex h-[34px] w-[34px] items-center justify-center',
                      'rounded-l-[7px]',
                      'border border-[rgba(22,24,35,.09)]',
                      'bg-white',
                      viewMode === 'grid'
                        ? 'border-[rgba(254,44,85,.20)] bg-[#fff7f8] text-[#fe2c55]'
                        : 'text-[rgba(22,24,35,.53)] hover:bg-[#fff7f8] hover:text-[#fe2c55]',
                    ].join(' ')}
                  >
                    <Grid2X2 size={16} strokeWidth={1.8} />
                  </button>

                  <button
                    type="button"
                    title="列表视图"
                    onClick={() => setViewMode('list')}
                    className={[
                      '-ml-px flex h-[34px] w-[34px] items-center justify-center',
                      'rounded-r-[7px]',
                      'border border-[rgba(22,24,35,.09)]',
                      'bg-white',
                      viewMode === 'list'
                        ? 'border-[rgba(254,44,85,.20)] bg-[#fff7f8] text-[#fe2c55]'
                        : 'text-[rgba(22,24,35,.53)] hover:bg-[#fff7f8] hover:text-[#fe2c55]',
                    ].join(' ')}
                  >
                    <LayoutList size={17} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </section>

            {/* Result summary */}
            <div className="mb-3 mt-[15px] text-[11px] text-[rgba(22,24,35,.4)]">
              共找到
              <strong className="mx-1 font-semibold text-[rgba(22,24,35,.75)]">
                {filteredDefinitions.length}
              </strong>
              个工作流
            </div>

            {/* Result */}
            <Spin spinning={loading}>
              <section
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4'
                    : 'space-y-3'
                }
              >
                {filteredDefinitions.map((record) =>
                  viewMode === 'grid'
                    ? renderGridCard(record)
                    : renderListItem(record),
                )}
              </section>

              {!loading && filteredDefinitions.length === 0 && (
                <div
                  className={[
                    'mt-1 flex min-h-[360px] flex-col items-center justify-center',
                    'rounded-lg bg-[#fafafa]',
                  ].join(' ')}
                >
                  <div className="relative flex h-[72px] w-[78px] items-end justify-center text-[rgba(22,24,35,.33)]">
                    <Workflow size={38} strokeWidth={1.4} />

                    <span className="absolute right-[9px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#ffecef] text-[#fe2c55]">
                      <Plus size={15} strokeWidth={2.2} />
                    </span>
                  </div>

                  <h3 className="mt-[14px] text-[14px] font-semibold text-[rgba(22,24,35,.78)]">
                    {keyword || filter !== 'ALL'
                      ? '没有找到符合条件的工作流'
                      : '还没有创建工作流'}
                  </h3>

                  <p className="mt-[7px] text-[11px] text-[rgba(22,24,35,.4)]">
                    {keyword || filter !== 'ALL'
                      ? '可以调整搜索关键词或切换筛选条件后重试。'
                      : '创建第一个工作流，并从已有任务开始进行流程编排。'}
                  </p>

                  {!keyword && filter === 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setCreateOpen(true)}
                      className={[
                        'mt-[17px] inline-flex h-[34px] items-center gap-[5px]',
                        'rounded-[7px] border-0 bg-[#fe2c55] px-[13px]',
                        'text-[11px] font-semibold text-white',
                      ].join(' ')}
                    >
                      <Plus size={16} strokeWidth={2.2} />
                      新建工作流
                    </button>
                  )}
                </div>
              )}
            </Spin>
          </div>
        </div>
      </ClickSpark>

      <Drawer
        open={createOpen}
        width={560}
        placement="right"
        closable={false}
        destroyOnClose
        maskClosable={!creating}
        keyboard={!creating}
        onClose={handleCreateClose}
        title={
          <div>
            <div className="text-[18px] font-semibold leading-7 text-[#101828]">
              新建工作流
            </div>
            <div className="mt-1 text-[11px] font-normal text-[rgba(22,24,35,.42)]">
              第一步创建基础信息，下一步进入画布完成任务编排
            </div>
          </div>
        }
        extra={
          <div className="flex items-center gap-2">
            <Button
              disabled={creating}
              onClick={handleCreateClose}
              className="!h-9 !rounded-lg !px-4"
            >
              取消
            </Button>

            <Button
              type="primary"
              loading={creating}
              onClick={() => void handleCreate()}
              className="!h-9 !rounded-lg !px-5 !text-white"
            >
              创建并配置
            </Button>
          </div>
        }
        styles={{
          header: {
            padding: '18px 24px',
            borderBottom: '1px solid #eaecf0',
          },
          body: {
            padding: 24,
          },
        }}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
        >
          <Form.Item
            name="name"
            label="工作流名称"
            rules={[
              {
                required: true,
                message: '请输入工作流名称',
              },
              {
                max: 100,
                message: '名称不能超过 100 个字符',
              },
            ]}
          >
            <Input
              variant="filled"
              placeholder="例如：每日订单同步工作流"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="工作流描述"
            rules={[
              {
                max: 500,
                message: '描述不能超过 500 个字符',
              },
            ]}
          >
            <Input.TextArea
              variant="filled"
              rows={4}
              placeholder="简单说明这个工作流负责什么"
            />
          </Form.Item>

          <div
            className={[
              'mt-2 rounded-[9px]',
              'border border-[rgba(22,24,35,.055)]',
              'bg-[#f8f9fa] p-4',
            ].join(' ')}
          >
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[#161823]">
              <GitBranch
                size={15}
                strokeWidth={1.9}
                className="text-[#667085]"
              />
              创建后进入工作流配置
            </div>

            <div className="mt-2 text-[11px] leading-5 text-[rgba(22,24,35,.48)]">
              在下一步从左侧拖入已经配置好的任务，完成 DAG
              连线，并设置节点重试、超时、触发规则和失败策略。
            </div>
          </div>
        </Form>
      </Drawer>
    </>
  );
};

export default WorkflowManagementPage;