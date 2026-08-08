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
  CirclePause,
  CirclePlay,
  CloudOff,
  CloudUpload,
  GitBranch,
  Grid2X2,
  LayoutList,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Workflow,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ViewMode = 'grid' | 'list';
type FilterKey = 'ALL' | WorkflowDefinitionStatus;

const DEFINITION_STATUS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: '草稿', className: 'bg-[#f2f4f7] text-[#667085]' },
  ONLINE: { label: '已上线', className: 'bg-[#fff0f3] text-[#d92d50]' },
  OFFLINE: { label: '已下线', className: 'bg-[#f4f4f5] text-[#52525b]' },
};

const RUNTIME_LABEL: Record<string, string> = {
  CREATED: '已创建', WAITING: '等待中', READY: '就绪', SUBMITTED: '待执行',
  RUNNING: '运行中', PAUSING: '暂停中', PAUSED: '已暂停', RESUMING: '恢复中',
  SUCCESS: '成功', SUCCESS_WITH_WARNINGS: '完成（有告警）', FAILED: '失败',
  WARNING: '告警', CANCELED: '已取消', TIMED_OUT: '已超时',
};

const ACTIVE_RUNTIME_STATUSES = new Set([
  'CREATED', 'WAITING', 'READY', 'SUBMITTED', 'RUNNING', 'PAUSING', 'PAUSED', 'RESUMING',
]);

const isActiveRuntime = (status?: string) =>
  Boolean(status && ACTIVE_RUNTIME_STATUSES.has(status));

const WorkflowManagementPage = () => {
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string>();
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<{ name: string; description?: string }>();

  const loadDefinitions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setDefinitions(await listWorkflowDefinitions());
    } catch (error) {
      if (!silent) message.error(error instanceof Error ? error.message : '工作流加载失败');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDefinitions(); }, [loadDefinitions]);

  useEffect(() => {
    if (!definitions.some((item) => isActiveRuntime(item.latestExecutionStatus))) return;
    const timer = window.setInterval(() => void loadDefinitions(true), 1800);
    return () => window.clearInterval(timer);
  }, [definitions, loadDefinitions]);

  const summary = useMemo(() => ({
    total: definitions.length,
    online: definitions.filter((item) => item.status === 'ONLINE').length,
    draft: definitions.filter((item) => item.status === 'DRAFT').length,
    running: definitions.filter((item) => ['RUNNING', 'PAUSING', 'RESUMING'].includes(item.latestExecutionStatus || '')).length,
  }), [definitions]);

  const filteredDefinitions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return definitions.filter((item) => {
      if (filter !== 'ALL' && item.status !== filter) return false;
      if (!normalizedKeyword) return true;
      return item.name.toLowerCase().includes(normalizedKeyword)
        || (item.description || '').toLowerCase().includes(normalizedKeyword)
        || item.id.toLowerCase().includes(normalizedKeyword);
    });
  }, [definitions, filter, keyword]);

  const executeAction = async (
    id: string,
    action: () => Promise<WorkflowDefinition>,
    success: string,
  ) => {
    if (actionId) return;
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
      if (error?.errorFields) return;
      message.error(error instanceof Error ? error.message : '创建工作流失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (record: WorkflowDefinition) => {
    Modal.confirm({
      title: '确认删除工作流？',
      content: `即将删除「${record.name}」，删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await deleteWorkflowDefinition(record.id);
          message.success('工作流已删除');
          await loadDefinitions(true);
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除工作流失败');
        }
      },
    });
  };

  const renderActions = (record: WorkflowDefinition) => {
    const busy = actionId === record.id;
    const runtimeStatus = record.latestExecutionStatus;
    const running = ['RUNNING', 'PAUSING', 'RESUMING', 'CREATED', 'WAITING', 'READY', 'SUBMITTED'].includes(runtimeStatus || '');
    const paused = runtimeStatus === 'PAUSED';
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="small" type="text" icon={<Pencil size={13} />}
          onClick={() => history.push(`/workflow/definition/${record.id}?scene=edit`)}>
          {record.status === 'ONLINE' ? '查看' : '编辑'}
        </Button>
        {record.status !== 'ONLINE' ? (
          <Button size="small" type="text" icon={<CloudUpload size={13} />} loading={busy}
            onClick={() => void executeAction(record.id, () => onlineWorkflowDefinition(record.id), '工作流已上线')}>
            上线
          </Button>
        ) : (
          <Button size="small" type="text" icon={<CloudOff size={13} />} loading={busy}
            disabled={isActiveRuntime(runtimeStatus)}
            onClick={() => void executeAction(record.id, () => offlineWorkflowDefinition(record.id), '工作流已下线')}>
            下线
          </Button>
        )}
        {record.status === 'ONLINE' && !isActiveRuntime(runtimeStatus) ? (
          <Button size="small" type="text" icon={<CirclePlay size={13} />} loading={busy}
            onClick={() => void executeAction(record.id, () => runWorkflowDefinition(record.id), '工作流已启动')}>
            运行
          </Button>
        ) : null}
        {record.status === 'ONLINE' && running ? (
          <Button size="small" type="text" icon={<CirclePause size={13} />} loading={busy}
            onClick={() => void executeAction(record.id, () => pauseWorkflowDefinition(record.id), '已请求暂停工作流')}>
            暂停
          </Button>
        ) : null}
        {record.status === 'ONLINE' && paused ? (
          <Button size="small" type="text" icon={<CirclePlay size={13} />} loading={busy}
            onClick={() => void executeAction(record.id, () => resumeWorkflowDefinition(record.id), '工作流已恢复')}>
            恢复
          </Button>
        ) : null}
        {record.status !== 'ONLINE' && !isActiveRuntime(runtimeStatus) ? (
          <Button size="small" type="text" danger icon={<Trash2 size={13} />} onClick={() => handleDelete(record)}>
            删除
          </Button>
        ) : null}
      </div>
    );
  };

  const renderDefinition = (record: WorkflowDefinition) => {
    const status = DEFINITION_STATUS[record.status] || DEFINITION_STATUS.DRAFT;
    const runtimeText = record.latestExecutionStatus
      ? RUNTIME_LABEL[record.latestExecutionStatus] || record.latestExecutionStatus
      : '尚未运行';
    return (
      <article key={record.id} className={[
        'border border-[#e5e7eb] bg-white transition-shadow hover:shadow-sm',
        viewMode === 'grid' ? 'rounded-xl p-4' : 'grid grid-cols-[minmax(280px,1.5fr)_120px_150px_180px_auto] items-center gap-4 rounded-lg px-4 py-3',
      ].join(' ')}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f6] text-[#161823]">
              <Workflow size={16} />
            </span>
            <div className="min-w-0">
              <button type="button" className="block max-w-full truncate border-0 bg-transparent p-0 text-left text-[14px] font-semibold text-[#161823] hover:text-[#fe2c55]"
                onClick={() => history.push(`/workflow/definition/${record.id}?scene=edit`)}>
                {record.name}
              </button>
              <div className="mt-0.5 truncate text-[10px] text-[rgba(22,24,35,.36)]">ID {record.id}</div>
            </div>
          </div>
          {viewMode === 'grid' ? (
            <div className="mt-3 line-clamp-2 min-h-9 text-[12px] leading-5 text-[rgba(22,24,35,.48)]">
              {record.description || '暂无工作流描述'}
            </div>
          ) : null}
        </div>

        <div className={viewMode === 'grid' ? 'mt-4 flex items-center justify-between border-t border-[#f0f1f2] pt-3' : ''}>
          <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-medium ${status.className}`}>{status.label}</span>
          {viewMode === 'grid' ? (
            <span className="text-[10px] text-[rgba(22,24,35,.38)]">{runtimeText}</span>
          ) : null}
        </div>

        <div className={viewMode === 'grid' ? 'mt-3 grid grid-cols-3 gap-2 rounded-lg bg-[#fafafa] p-2.5' : 'text-[12px] text-[rgba(22,24,35,.58)]'}>
          {viewMode === 'grid' ? (
            <>
              <div><div className="text-[9px] text-[rgba(22,24,35,.36)]">节点</div><div className="mt-1 text-[12px] font-semibold">{record.nodeCount}</div></div>
              <div><div className="text-[9px] text-[rgba(22,24,35,.36)]">连线</div><div className="mt-1 text-[12px] font-semibold">{record.edgeCount}</div></div>
              <div><div className="text-[9px] text-[rgba(22,24,35,.36)]">运行状态</div><div className="mt-1 truncate text-[11px] font-medium">{runtimeText}</div></div>
            </>
          ) : <span>{record.nodeCount} 节点 · {record.edgeCount} 连线</span>}
        </div>

        {viewMode === 'list' ? <div className="truncate text-[12px] text-[rgba(22,24,35,.52)]">{runtimeText}</div> : null}
        <div className={viewMode === 'grid' ? 'mt-3 text-[10px] text-[rgba(22,24,35,.34)]' : 'text-[11px] text-[rgba(22,24,35,.42)]'}>
          {record.updateTime ? new Date(record.updateTime).toLocaleString() : '-'}
        </div>
        <div className={viewMode === 'grid' ? 'mt-3 flex justify-end border-t border-[#f0f1f2] pt-3' : 'justify-self-end'}>
          {renderActions(record)}
        </div>
      </article>
    );
  };

  const filterTabs: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: 'ALL', label: '全部工作流', count: summary.total },
    { key: 'ONLINE', label: '已上线', count: summary.online },
    { key: 'DRAFT', label: '草稿', count: summary.draft },
    { key: 'OFFLINE', label: '已下线', count: definitions.filter((item) => item.status === 'OFFLINE').length },
  ];

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#f7f7f8] px-5 py-5 lg:px-6">
      <div className="mx-auto w-full max-w-[1680px]">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="m-0 text-[22px] font-semibold text-[#161823]">工作流定义</h1>
            <div className="mt-1 text-[12px] text-[rgba(22,24,35,.46)]">先创建工作流，再进入画布引用已上线任务完成编排。</div>
          </div>
          <Button type="primary" icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>新建工作流</Button>
        </header>

        <section className="mt-5 grid grid-cols-4 gap-3">
          {[
            ['全部工作流', summary.total],
            ['已上线', summary.online],
            ['草稿', summary.draft],
            ['运行中', summary.running],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-[#e6e7e9] bg-white px-4 py-3">
              <div className="text-[11px] text-[rgba(22,24,35,.42)]">{label}</div>
              <div className="mt-1 text-[22px] font-semibold text-[#161823]">{value}</div>
            </div>
          ))}
        </section>

        <section className="mt-4 flex items-center justify-between rounded-xl border border-[#e6e7e9] bg-white px-3 py-2.5">
          <div className="flex items-center gap-1">
            {filterTabs.map((item) => (
              <button key={item.key} type="button" onClick={() => setFilter(item.key)}
                className={[
                  'rounded-lg border-0 px-3 py-1.5 text-[12px]',
                  filter === item.key ? 'bg-[#f2f2f4] font-medium text-[#161823]' : 'bg-transparent text-[rgba(22,24,35,.5)] hover:bg-[#f7f7f8]',
                ].join(' ')}>
                {item.label} <span className="ml-1 text-[10px] opacity-60">{item.count}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex h-8 w-[260px] items-center gap-2 rounded-lg bg-[#f5f5f6] px-3">
              <Search size={14} className="text-[#8a8f99]" />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索名称、描述或 ID"
                className="min-w-0 flex-1 border-0 bg-transparent text-[12px] outline-none" />
            </label>
            <Button size="small" icon={<RefreshCw size={14} />} loading={loading} onClick={() => void loadDefinitions()} />
            <div className="flex rounded-lg bg-[#f5f5f6] p-0.5">
              <button type="button" title="卡片视图" onClick={() => setViewMode('grid')}
                className={`rounded-md border-0 p-1.5 ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'bg-transparent text-[#8a8f99]'}`}><Grid2X2 size={14} /></button>
              <button type="button" title="列表视图" onClick={() => setViewMode('list')}
                className={`rounded-md border-0 p-1.5 ${viewMode === 'list' ? 'bg-white shadow-sm' : 'bg-transparent text-[#8a8f99]'}`}><LayoutList size={15} /></button>
            </div>
          </div>
        </section>

        {viewMode === 'list' && filteredDefinitions.length ? (
          <div className="mt-3 grid grid-cols-[minmax(280px,1.5fr)_120px_150px_180px_auto] gap-4 px-4 text-[10px] text-[rgba(22,24,35,.36)]">
            <span>工作流</span><span>状态</span><span>规模</span><span>最近运行</span><span className="text-right">操作</span>
          </div>
        ) : null}

        <Spin spinning={loading}>
          <section className={viewMode === 'grid' ? 'mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3' : 'mt-2 space-y-2'}>
            {filteredDefinitions.map(renderDefinition)}
          </section>
          {!loading && !filteredDefinitions.length ? (
            <div className="mt-3 rounded-xl border border-[#e6e7e9] bg-white py-16">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={keyword || filter !== 'ALL' ? '没有找到符合条件的工作流' : '还没有创建工作流'}>
                {!keyword && filter === 'ALL' ? <Button type="primary" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>新建工作流</Button> : null}
              </Empty>
            </div>
          ) : null}
        </Spin>
      </div>

      <Drawer open={createOpen} width={520} destroyOnClose maskClosable={!creating}
        onClose={() => !creating && setCreateOpen(false)}
        title={<div><div className="text-[18px] font-semibold">新建工作流</div><div className="mt-1 text-[11px] font-normal text-[rgba(22,24,35,.42)]">第一步只创建基础信息，创建后进入画布配置任务。</div></div>}
        extra={<div className="flex gap-2"><Button disabled={creating} onClick={() => setCreateOpen(false)}>取消</Button><Button type="primary" loading={creating} onClick={() => void handleCreate()}>创建并配置</Button></div>}>
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="name" label="工作流名称" rules={[{ required: true, message: '请输入工作流名称' }, { max: 100, message: '名称不能超过 100 个字符' }]}>
            <Input variant="filled" placeholder="例如：每日订单同步工作流" />
          </Form.Item>
          <Form.Item name="description" label="描述" rules={[{ max: 500, message: '描述不能超过 500 个字符' }]}>
            <Input.TextArea variant="filled" rows={4} placeholder="简单说明这个工作流负责什么" />
          </Form.Item>
          <div className="mt-2 rounded-xl bg-[#f7f7f8] p-3 text-[11px] leading-5 text-[rgba(22,24,35,.5)]">
            <div className="flex items-center gap-2 font-medium text-[#161823]"><GitBranch size={14} /> 创建后进入工作流配置</div>
            <div className="mt-1">在下一步从左侧拖入已配置任务、连接 DAG，并设置重试、超时和失败策略。</div>
          </div>
        </Form>
      </Drawer>
    </div>
  );
};

export default WorkflowManagementPage;
