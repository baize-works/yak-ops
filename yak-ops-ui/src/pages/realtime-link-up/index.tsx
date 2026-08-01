import {
  CopyOutlined,
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import {
  Button,
  ConfigProvider,
  Empty,
  Input,
  message,
  Modal,
  Pagination,
  Popover,
  Select,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { BRAND_THEME } from '@/styles/brand';

import CreateRealtimeTaskDrawer from './components/CreateRealtimeTaskDrawer';
import {
  REALTIME_DRAFT_STORAGE_PREFIX,
  loadRealtimeTasks,
  modeMeta,
  removeRealtimeTask,
} from './data';
import type {
  RealtimeTaskMode,
  RealtimeTaskRecord,
  RealtimeTaskStatus,
} from './types';

interface SearchState {
  keyword?: string;
  id?: string;
  mode?: RealtimeTaskMode;
  status?: RealtimeTaskStatus;
  source?: string;
  sink?: string;
}

interface PaginationState {
  current: number;
  pageSize: number;
}

const modeQuery: Record<RealtimeTaskMode, string> = {
  SINGLE_TABLE: 'single',
  MULTI_TABLE: 'multi',
  CUSTOM_YAML: 'yaml',
};

const statusMeta: Record<
  RealtimeTaskStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: '草稿',
    className: '!border-[#fedf89] !bg-[#fffaeb] !text-[#b54708]',
  },
  RUNNING: {
    label: '运行中',
    className: '!border-[#b7e4cf] !bg-[#edf9f3] !text-[#16845b]',
  },
  STOPPED: {
    label: '已停止',
    className: '!border-[#eaecf0] !bg-[#f9fafb] !text-[#667085]',
  },
  FAILED: {
    label: '异常',
    className: '!border-[#fecdca] !bg-[#fef3f2] !text-[#b42318]',
  },
};

const statusTabs: Array<{
  label: string;
  value: 'ALL' | RealtimeTaskStatus;
}> = [
  { label: '全部任务', value: 'ALL' },
  { label: '运行中', value: 'RUNNING' },
  { label: '草稿', value: 'DRAFT' },
  { label: '已停止', value: 'STOPPED' },
  { label: '异常', value: 'FAILED' },
];

const RealtimeLinkUpPage = () => {
  const [tasks, setTasks] = useState<RealtimeTaskRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchState>({});
  const [filterDraft, setFilterDraft] = useState<SearchState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 10,
  });

  const refresh = () => {
    setLoading(true);
    window.setTimeout(() => {
      setTasks(loadRealtimeTasks());
      setLoading(false);
    }, 120);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredTasks = useMemo(() => {
    const keyword = searchParams.keyword?.trim().toLowerCase();
    const id = searchParams.id?.trim().toLowerCase();
    const source = searchParams.source?.trim().toLowerCase();
    const sink = searchParams.sink?.trim().toLowerCase();

    return tasks.filter((task) => {
      if (searchParams.mode && task.mode !== searchParams.mode) return false;
      if (searchParams.status && task.status !== searchParams.status) return false;
      if (id && !task.id.toLowerCase().includes(id)) return false;
      if (source && !task.sourceSummary.toLowerCase().includes(source)) return false;
      if (sink && !task.sinkSummary.toLowerCase().includes(sink)) return false;
      if (!keyword) return true;

      return [
        task.id,
        task.name,
        task.description,
        task.sourceType,
        task.sourceSummary,
        task.sinkType,
        task.sinkSummary,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [searchParams, tasks]);

  const pagedTasks = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return filteredTasks.slice(start, start + pagination.pageSize);
  }, [filteredTasks, pagination]);

  useEffect(() => {
    const maxPage = Math.max(
      1,
      Math.ceil(filteredTasks.length / pagination.pageSize),
    );

    if (pagination.current > maxPage) {
      setPagination((current) => ({ ...current, current: maxPage }));
    }
  }, [filteredTasks.length, pagination.current, pagination.pageSize]);

  const updateFilterDraft = (field: keyof SearchState, value: unknown) => {
    setFilterDraft((current) => ({ ...current, [field]: value || undefined }));
  };

  const applyFilter = (nextFilter = filterDraft) => {
    setFilterDraft(nextFilter);
    setSearchParams(nextFilter);
    setPagination((current) => ({ ...current, current: 1 }));
  };

  const handleReset = () => {
    setFilterDraft({});
    setSearchParams({});
    setPagination((current) => ({ ...current, current: 1 }));
  };

  const handleStatusChange = (value: 'ALL' | RealtimeTaskStatus) => {
    const nextFilter = {
      ...filterDraft,
      status: value === 'ALL' ? undefined : value,
    };
    applyFilter(nextFilter);
  };

  const goEdit = (task: RealtimeTaskRecord) => {
    history.push(
      `/sync/realtime-link-up/${encodeURIComponent(task.id)}/config?mode=${modeQuery[task.mode]}&scene=edit`,
    );
  };

  const copyTaskId = async (taskId: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(taskId);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = taskId;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      message.success('任务 ID 已复制');
    } catch {
      message.error('复制失败，请手动复制');
    }
  };

  const removeTask = (task: RealtimeTaskRecord) => {
    if (task.id.startsWith('rt-demo-')) {
      message.info('示例任务用于页面预览，暂不支持删除');
      return;
    }

    Modal.confirm({
      title: '删除实时同步任务？',
      content: `确定删除“${task.name}”吗？任务草稿和页面配置会一并删除。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        removeRealtimeTask(task.id);
        window.localStorage.removeItem(
          `${REALTIME_DRAFT_STORAGE_PREFIX}${task.id}`,
        );
        refresh();
        message.success('实时同步任务已删除');
      },
    });
  };

  const advancedFilterCount = [
    filterDraft.id,
    filterDraft.source,
    filterDraft.sink,
  ].filter(Boolean).length;

  const currentTab = filterDraft.status || searchParams.status || 'ALL';

  const columns = [
    {
      title: '名称 / ID',
      dataIndex: 'name',
      width: 260,
      render: (_: unknown, task: RealtimeTaskRecord) => (
        <div className="min-w-0 py-0.5">
          <button
            type="button"
            className="block max-w-full border-0 bg-transparent p-0 text-left"
            onClick={() => goEdit(task)}
          >
            <span
              className="block truncate text-[13px] font-medium leading-5 text-[#344054] hover:text-[#ff4d4f]"
              title={task.name}
            >
              {task.name || '-'}
            </span>
          </button>
          <div className="mt-0.5 flex h-5 items-center gap-1 text-[11px] leading-5 text-[#98a2b3]">
            <span className="truncate">ID：{task.id}</span>
            <Tooltip title="复制任务 ID">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined className="text-[11px]" />}
                className="!flex !h-5 !w-5 !min-w-0 !items-center !justify-center !p-0 !text-[#98a2b3] hover:!bg-[#f2f4f7] hover:!text-[#475467]"
                onClick={() => void copyTaskId(task.id)}
              />
            </Tooltip>
          </div>
        </div>
      ),
    },
    {
      title: '实时同步方案',
      dataIndex: 'pipeline',
      width: 340,
      render: (_: unknown, task: RealtimeTaskRecord) => (
        <div className="grid min-w-[300px] grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-1 text-[12px]">
          <div className="min-w-0">
            <div className="truncate font-medium text-[#475467]">
              {task.sourceType || '-'}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-[#98a2b3]">
              {task.sourceSummary || '-'}
            </div>
          </div>
          <span className="text-center text-[#d0d5dd]">→</span>
          <div className="min-w-0">
            <div className="truncate font-medium text-[#475467]">
              {task.sinkType || '-'}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-[#98a2b3]">
              {task.sinkSummary || '-'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '同步模式',
      dataIndex: 'mode',
      width: 120,
      align: 'center' as const,
      render: (value: RealtimeTaskMode) => {
        const meta = modeMeta[value];
        return (
          <Tag className={`!m-0 !rounded-full !px-2.5 !text-[11px] ${meta.className}`}>
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      align: 'center' as const,
      render: (value: RealtimeTaskStatus) => {
        const meta = statusMeta[value];
        return (
          <Tag className={`!m-0 !rounded-full !px-2.5 !text-[11px] ${meta.className}`}>
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: '运行版本',
      dataIndex: 'version',
      width: 150,
      render: (_: unknown, task: RealtimeTaskRecord) => (
        <div className="text-[12px] leading-5 text-[#667085]">
          <div>Flink {task.flinkVersion || '-'}</div>
          <div className="text-[11px] text-[#98a2b3]">
            CDC {task.cdcVersion || '-'}
          </div>
        </div>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 175,
      render: (value: string) => (
        <span className="whitespace-nowrap text-[12px] text-[#98a2b3]">
          {value || '-'}
        </span>
      ),
    },
    {
      title: '操作',
      dataIndex: 'operate',
      width: 130,
      fixed: 'right' as const,
      render: (_: unknown, task: RealtimeTaskRecord) => (
        <div className="flex items-center gap-1">
          <Button
            type="link"
            size="small"
            className="!h-7 !px-2 !text-[12px] !text-[#475467] hover:!text-[#ff4d4f]"
            onClick={() => goEdit(task)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            size="small"
            className="!h-7 !px-2 !text-[12px]"
            onClick={() => removeTask(task)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="flex min-h-[calc(100vh-64px)] flex-col bg-white px-5 pt-4">
        <h1 className="text-[17px] font-semibold text-[#101828]">实时同步</h1>

        <div className="mx-auto flex w-full max-w-full flex-1 flex-col">
          <div className="mb-3 border-b border-[#f0f0f0]">
            <div className="flex min-h-[54px] items-center justify-between gap-4 py-2">
              <div className="flex shrink-0 items-center gap-1 rounded-lg bg-[#f5f5f6] p-1">
                {statusTabs.map((item) => {
                  const active = currentTab === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleStatusChange(item.value)}
                      className={[
                        'h-8 rounded-md px-3.5 text-[13px] font-medium transition-all',
                        active
                          ? 'bg-white text-[#ff4d4f] shadow-[0_1px_4px_rgba(16,24,40,0.08)]'
                          : 'text-[#667085] hover:bg-white/70 hover:text-[#344054]',
                      ].join(' ')}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto">
                <Input
                  allowClear
                  variant="filled"
                  value={filterDraft.keyword}
                  prefix={<SearchOutlined className="text-[#98a2b3]" />}
                  placeholder="搜索任务名称或同步链路"
                  className="!h-9 !w-[240px] !min-w-[200px]"
                  onChange={(event) =>
                    updateFilterDraft('keyword', event.target.value)
                  }
                  onPressEnter={() => applyFilter()}
                />

                <Select
                  allowClear
                  variant="filled"
                  value={filterDraft.mode}
                  placeholder="同步模式"
                  className="!h-9 !w-[150px] !min-w-[140px]"
                  options={Object.entries(modeMeta).map(([value, meta]) => ({
                    label: meta.label,
                    value,
                  }))}
                  onChange={(value) => {
                    const nextFilter = { ...filterDraft, mode: value };
                    applyFilter(nextFilter);
                  }}
                />

                <Button className="!h-9 !px-4" onClick={() => applyFilter()}>
                  查询
                </Button>

                <Popover
                  trigger="click"
                  placement="bottomRight"
                  open={advancedOpen}
                  onOpenChange={setAdvancedOpen}
                  content={
                    <div className="w-[420px]">
                      <div className="mb-4">
                        <div className="text-[14px] font-semibold text-[#101828]">
                          高级搜索
                        </div>
                        <div className="mt-1 text-[12px] text-[#98a2b3]">
                          按任务标识、来源和目标信息进一步筛选
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <div className="mb-1.5 text-[12px] text-[#667085]">
                            任务 ID
                          </div>
                          <Input
                            allowClear
                            variant="filled"
                            value={filterDraft.id}
                            placeholder="请输入任务 ID"
                            onChange={(event) =>
                              updateFilterDraft('id', event.target.value)
                            }
                          />
                        </div>
                        <div>
                          <div className="mb-1.5 text-[12px] text-[#667085]">
                            来源信息
                          </div>
                          <Input
                            allowClear
                            variant="filled"
                            value={filterDraft.source}
                            placeholder="来源库或表"
                            onChange={(event) =>
                              updateFilterDraft('source', event.target.value)
                            }
                          />
                        </div>
                        <div>
                          <div className="mb-1.5 text-[12px] text-[#667085]">
                            目标信息
                          </div>
                          <Input
                            allowClear
                            variant="filled"
                            value={filterDraft.sink}
                            placeholder="目标库或表"
                            onChange={(event) =>
                              updateFilterDraft('sink', event.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#f0f0f0] pt-4">
                        <Button
                          size="small"
                          className="!h-8"
                          onClick={() => {
                            const nextFilter = {
                              ...filterDraft,
                              id: undefined,
                              source: undefined,
                              sink: undefined,
                            };
                            applyFilter(nextFilter);
                          }}
                        >
                          重置
                        </Button>
                        <Button
                          danger
                          type="primary"
                          size="small"
                          className="!h-8"
                          onClick={() => {
                            applyFilter();
                            setAdvancedOpen(false);
                          }}
                        >
                          应用筛选
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <Button
                    icon={<FilterOutlined />}
                    className={[
                      '!h-9 !px-3',
                      advancedFilterCount > 0
                        ? '!border-[#ffccc7] !bg-[#fff1f0] !text-[#ff4d4f]'
                        : '',
                    ].join(' ')}
                  >
                    高级搜索
                    {advancedFilterCount > 0 && (
                      <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff4d4f] px-1 text-[10px] text-white">
                        {advancedFilterCount}
                      </span>
                    )}
                  </Button>
                </Popover>
              </div>
            </div>
          </div>

          <div className="flex min-h-[48px] items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="text"
                icon={<ReloadOutlined spin={loading} />}
                className="!h-8 !px-2 !text-[#667085]"
                onClick={refresh}
              >
                刷新
              </Button>
              {(searchParams.keyword ||
                searchParams.mode ||
                searchParams.id ||
                searchParams.source ||
                searchParams.sink) && (
                <Button type="link" size="small" onClick={handleReset}>
                  清空筛选
                </Button>
              )}
            </div>

            <Button
              danger
              type="primary"
              size="small"
              className="!h-8"
              onClick={() => setCreateOpen(true)}
            >
              新建实时同步任务
            </Button>
          </div>

          <div className="flex-1">
            <Table
              columns={columns}
              dataSource={pagedTasks}
              rowKey="id"
              bordered
              size="small"
              pagination={false}
              loading={loading}
              scroll={{ x: 'max-content' }}
              className={[
                'compact-realtime-task-table',
                '[&_.ant-table]:!text-[13px]',
                '[&_.ant-table-container]:!border-[#eaecf0]',
                '[&_.ant-table-cell]:!align-middle',
                '[&_.ant-table-thead>tr>th]:!h-10',
                '[&_.ant-table-thead>tr>th]:!bg-[#f8f9fb]',
                '[&_.ant-table-thead>tr>th]:!px-4',
                '[&_.ant-table-thead>tr>th]:!py-2',
                '[&_.ant-table-thead>tr>th]:!text-[12px]',
                '[&_.ant-table-thead>tr>th]:!font-medium',
                '[&_.ant-table-thead>tr>th]:!text-[#667085]',
                '[&_.ant-table-thead>tr>th]:!border-[#eaecf0]',
                '[&_.ant-table-tbody>tr>td]:!px-4',
                '[&_.ant-table-tbody>tr>td]:!py-2.5',
                '[&_.ant-table-tbody>tr>td]:!border-[#f0f2f5]',
                '[&_.ant-table-tbody>tr>td]:!text-[#667085]',
                '[&_.ant-table-tbody>tr:hover>td]:!bg-[#fafbfc]',
                '[&_.ant-table-cell-fix-right]:!bg-white',
                '[&_.ant-table-tbody>tr:hover_.ant-table-cell-fix-right]:!bg-[#fafbfc]',
                '[&_.ant-table-placeholder>td]:!h-[260px]',
              ].join(' ')}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span className="text-[12px] text-[#98a2b3]">
                        暂无实时同步任务
                      </span>
                    }
                  />
                ),
              }}
            />
          </div>

          <div className="sticky bottom-0 z-20 mt-auto flex min-h-[56px] items-center justify-end border border-t-0 border-[#e5e7eb] bg-white px-5 py-3 shadow-[0_-4px_12px_rgba(16,24,40,0.04)]">
            <Pagination
              showSizeChanger
              showQuickJumper
              showTotal={(total) => `共 ${total} 条`}
              total={filteredTasks.length}
              current={pagination.current}
              pageSize={pagination.pageSize}
              onChange={(current, pageSize) =>
                setPagination({ current, pageSize })
              }
            />
          </div>
        </div>

        <CreateRealtimeTaskDrawer
          open={createOpen}
          onCancel={() => setCreateOpen(false)}
          onCreated={(taskId, mode) => {
            setCreateOpen(false);
            history.push(
              `/sync/realtime-link-up/${encodeURIComponent(taskId)}/config?mode=${modeQuery[mode]}&scene=create`,
            );
          }}
        />
      </div>
    </ConfigProvider>
  );
};

export default RealtimeLinkUpPage;
