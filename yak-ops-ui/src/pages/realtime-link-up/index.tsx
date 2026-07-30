import {
  Activity,
  Copy,
  DatabaseZap,
  FileCode2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Trash2,
} from 'lucide-react';
import { history } from '@umijs/max';
import {
  Button,
  Dropdown,
  Empty,
  Input,
  message,
  Modal,
  Select,
  Table,
  Tag,
  type MenuProps,
  type TableColumnsType,
} from 'antd';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createTaskId,
  loadRealtimeTasks,
  modeMeta,
  removeRealtimeTask,
} from './data';
import type {
  RealtimeTaskMode,
  RealtimeTaskRecord,
  RealtimeTaskStatus,
} from './types';

const statusMeta: Record<
  RealtimeTaskStatus,
  { label: string; className: string; dotClassName: string }
> = {
  DRAFT: {
    label: '草稿',
    className: '!border-[#fedf89] !bg-[#fffaeb] !text-[#b54708]',
    dotClassName: 'bg-[#f79009]',
  },
  RUNNING: {
    label: '运行中',
    className: '!border-[#b7e4cf] !bg-[#edf9f3] !text-[#16845b]',
    dotClassName: 'bg-[#12b76a]',
  },
  STOPPED: {
    label: '已停止',
    className: '!border-black/[0.08] !bg-[#f7f8fa] !text-[rgba(22,24,35,0.55)]',
    dotClassName: 'bg-[#98a2b3]',
  },
  FAILED: {
    label: '异常',
    className: '!border-[#fecdca] !bg-[#fef3f2] !text-[#b42318]',
    dotClassName: 'bg-[#f04438]',
  },
};

const modeIcon: Record<RealtimeTaskMode, ReactNode> = {
  SINGLE_TABLE: <Table2 size={15} strokeWidth={1.8} />,
  MULTI_TABLE: <DatabaseZap size={15} strokeWidth={1.8} />,
  CUSTOM_YAML: <FileCode2 size={15} strokeWidth={1.8} />,
};

const modeQuery: Record<RealtimeTaskMode, string> = {
  SINGLE_TABLE: 'single',
  MULTI_TABLE: 'multi',
  CUSTOM_YAML: 'yaml',
};

const RealtimeLinkUpPage = () => {
  const [tasks, setTasks] = useState<RealtimeTaskRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [mode, setMode] = useState<RealtimeTaskMode | undefined>();
  const [status, setStatus] = useState<RealtimeTaskStatus | undefined>();

  const refresh = () => {
    setLoading(true);
    window.setTimeout(() => {
      setTasks(loadRealtimeTasks());
      setLoading(false);
    }, 180);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredTasks = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return tasks.filter((task) => {
      if (mode && task.mode !== mode) return false;
      if (status && task.status !== status) return false;
      if (!normalized) return true;
      return [
        task.id,
        task.name,
        task.description,
        task.sourceSummary,
        task.sinkSummary,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [keyword, mode, status, tasks]);

  const stats = useMemo(
    () => ({
      total: tasks.length,
      running: tasks.filter((task) => task.status === 'RUNNING').length,
      draft: tasks.filter((task) => task.status === 'DRAFT').length,
      yaml: tasks.filter((task) => task.mode === 'CUSTOM_YAML').length,
    }),
    [tasks],
  );

  const goEdit = (task: RealtimeTaskRecord) => {
    history.push(
      `/sync/realtime-link-up/${task.id}/config?mode=${modeQuery[task.mode]}&scene=edit`,
    );
  };

  const copyId = async (taskId: string) => {
    try {
      await navigator.clipboard.writeText(taskId);
      message.success('任务 ID 已复制');
    } catch {
      message.error('复制失败，请手动复制');
    }
  };

  const remove = (task: RealtimeTaskRecord) => {
    if (task.id.startsWith('rt-demo-')) {
      message.info('示例任务用于页面预览，不能删除');
      return;
    }
    Modal.confirm({
      title: '删除实时同步任务？',
      content: `确定删除“${task.name}”吗？此操作只删除当前浏览器中的前端草稿。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        removeRealtimeTask(task.id);
        refresh();
        message.success('任务已删除');
      },
    });
  };

  const columns: TableColumnsType<RealtimeTaskRecord> = [
    {
      title: '任务名称',
      dataIndex: 'name',
      width: 290,
      fixed: 'left',
      render: (_, task) => (
        <button
          type="button"
          onClick={() => goEdit(task)}
          className="group flex min-w-0 items-center gap-3 border-0 bg-transparent p-0 text-left"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f1f3f6] text-[#424754] transition group-hover:bg-[#e9edf2]">
            {modeIcon[task.mode]}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-semibold text-[#252832] group-hover:text-[#315efb]">
              {task.name}
            </span>
            <span className="mt-1 block truncate text-[10px] text-[rgba(22,24,35,0.42)]">
              {task.description || task.id}
            </span>
          </span>
        </button>
      ),
    },
    {
      title: '任务类型',
      dataIndex: 'mode',
      width: 130,
      render: (value: RealtimeTaskMode) => {
        const meta = modeMeta[value];
        return (
          <Tag className={`!m-0 !rounded-full !px-2.5 !text-[10px] ${meta.className}`}>
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: '同步链路',
      key: 'pipeline',
      width: 360,
      render: (_, task) => (
        <div className="flex min-w-0 items-center gap-2 text-[10px]">
          <div className="min-w-0 flex-1 rounded-[6px] border border-black/[0.055] bg-[#fafafa] px-2.5 py-2">
            <div className="font-semibold text-[#343741]">{task.sourceType}</div>
            <div className="mt-0.5 truncate font-mono text-[9px] text-[rgba(22,24,35,0.42)]">
              {task.sourceSummary}
            </div>
          </div>
          <span className="text-[rgba(22,24,35,0.30)]">→</span>
          <div className="min-w-0 flex-1 rounded-[6px] border border-black/[0.055] bg-[#fafafa] px-2.5 py-2">
            <div className="font-semibold text-[#343741]">{task.sinkType}</div>
            <div className="mt-0.5 truncate font-mono text-[9px] text-[rgba(22,24,35,0.42)]">
              {task.sinkSummary}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '运行版本',
      key: 'version',
      width: 160,
      render: (_, task) => (
        <div className="text-[10px] leading-5 text-[#343741]">
          <div>Flink {task.flinkVersion}</div>
          <div className="text-[rgba(22,24,35,0.42)]">CDC {task.cdcVersion}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 105,
      render: (value: RealtimeTaskStatus) => {
        const meta = statusMeta[value];
        return (
          <Tag className={`!m-0 !inline-flex !items-center !gap-1.5 !rounded-full !px-2.5 !text-[10px] ${meta.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClassName}`} />
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 170,
      render: (value: string) => (
        <span className="text-[10px] text-[rgba(22,24,35,0.48)]">{value}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 100,
      align: 'center',
      render: (_, task) => {
        const items: MenuProps['items'] = [
          {
            key: 'copy',
            icon: <Copy size={14} />,
            label: '复制任务 ID',
            onClick: () => void copyId(task.id),
          },
          { type: 'divider' },
          {
            key: 'delete',
            danger: true,
            icon: <Trash2 size={14} />,
            label: '删除任务',
            onClick: () => remove(task),
          },
        ];
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              type="link"
              size="small"
              onClick={() => goEdit(task)}
              className="!px-1 !text-[10px] !font-semibold !text-[#315efb]"
            >
              编辑
            </Button>
            <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-[6px] border-0 bg-transparent text-[rgba(22,24,35,0.40)] hover:bg-[#f1f3f6] hover:text-[#161823]"
              >
                <MoreHorizontal size={15} />
              </button>
            </Dropdown>
          </div>
        );
      },
    },
  ];

  const createTask = () => {
    const taskId = createTaskId();
    history.push(`/sync/realtime-link-up/${taskId}/detail?scene=create`);
  };

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#f7f8fa] px-5 py-5">
      <div className="mx-auto max-w-[1560px]">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#161823] text-white">
                <Activity size={18} strokeWidth={1.8} />
              </span>
              <div>
                <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-[#161823]">实时同步</h1>
                <p className="mt-0.5 text-[11px] text-[rgba(22,24,35,0.46)]">
                  基于 Flink CDC Pipeline 管理单表、多表和自定义 YAML 实时任务定义
                </p>
              </div>
            </div>
          </div>
          <Button
            type="primary"
            icon={<Plus size={15} strokeWidth={2} />}
            onClick={createTask}
            className="!h-9 !rounded-[8px] !border-[#161823] !bg-[#161823] !px-4 !text-[11px] !font-semibold hover:!border-[#2b2d38] hover:!bg-[#2b2d38]"
          >
            新建实时同步
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
          {[
            { label: '任务总数', value: stats.total, help: '当前全部任务定义' },
            { label: '运行中', value: stats.running, help: '后续由执行接口更新' },
            { label: '草稿任务', value: stats.draft, help: '尚未发布的配置' },
            { label: '自定义 YAML', value: stats.yaml, help: '高级 Pipeline 模式' },
          ].map((item) => (
            <div key={item.label} className="rounded-[10px] border border-black/[0.065] bg-white px-4 py-4">
              <div className="text-[10px] font-medium text-[rgba(22,24,35,0.44)]">{item.label}</div>
              <div className="mt-2 text-[23px] font-semibold tracking-[-0.02em] text-[#161823]">{item.value}</div>
              <div className="mt-1 text-[9px] text-[rgba(22,24,35,0.36)]">{item.help}</div>
            </div>
          ))}
        </div>

        <section className="mt-4 overflow-hidden rounded-[10px] border border-black/[0.065] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.055] px-4 py-3.5">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Input
                allowClear
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                prefix={<Search size={14} className="text-[rgba(22,24,35,0.30)]" />}
                placeholder="搜索任务名称、ID、来源表或目标表"
                className="!h-9 !w-[320px] !rounded-[7px] !border-black/[0.075] !text-[11px] max-md:!w-full"
              />
              <Select
                allowClear
                value={mode}
                onChange={setMode}
                placeholder="全部类型"
                options={Object.entries(modeMeta).map(([value, meta]) => ({
                  label: meta.label,
                  value,
                }))}
                className="w-[150px] [&_.ant-select-selector]:!h-9 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075] [&_.ant-select-selection-item]:!text-[10px] [&_.ant-select-selection-item]:!leading-[34px] [&_.ant-select-selection-placeholder]:!text-[10px] [&_.ant-select-selection-placeholder]:!leading-[34px]"
              />
              <Select
                allowClear
                value={status}
                onChange={setStatus}
                placeholder="全部状态"
                options={Object.entries(statusMeta).map(([value, meta]) => ({
                  label: meta.label,
                  value,
                }))}
                className="w-[140px] [&_.ant-select-selector]:!h-9 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075] [&_.ant-select-selection-item]:!text-[10px] [&_.ant-select-selection-item]:!leading-[34px] [&_.ant-select-selection-placeholder]:!text-[10px] [&_.ant-select-selection-placeholder]:!leading-[34px]"
              />
            </div>
            <button
              type="button"
              onClick={refresh}
              className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-black/[0.07] bg-white text-[rgba(22,24,35,0.42)] transition hover:border-black/[0.14] hover:text-[#161823]"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <Table<RealtimeTaskRecord>
            rowKey="id"
            columns={columns}
            dataSource={filteredTasks}
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              className: '!mx-4 !my-3 !text-[10px]',
            }}
            scroll={{ x: 1320 }}
            className={[
              '[&_.ant-table]:!rounded-none',
              '[&_.ant-table-container]:!border-0',
              '[&_.ant-table-thead>tr>th]:!h-11',
              '[&_.ant-table-thead>tr>th]:!border-b',
              '[&_.ant-table-thead>tr>th]:!border-black/[0.055]',
              '[&_.ant-table-thead>tr>th]:!bg-[#fafafa]',
              '[&_.ant-table-thead>tr>th]:!text-[10px]',
              '[&_.ant-table-thead>tr>th]:!font-semibold',
              '[&_.ant-table-thead>tr>th]:!text-[rgba(22,24,35,0.55)]',
              '[&_.ant-table-tbody>tr>td]:!border-black/[0.045]',
              '[&_.ant-table-tbody>tr>td]:!py-3',
              '[&_.ant-table-tbody>tr:hover>td]:!bg-[#fcfcfd]',
            ].join(' ')}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<span className="text-[11px] text-[rgba(22,24,35,0.42)]">暂无符合条件的实时同步任务</span>}
                />
              ),
            }}
          />
        </section>
      </div>
    </div>
  );
};

export default RealtimeLinkUpPage;
