import { BRAND_CSS_VARIABLES, BRAND_THEME } from '@/styles/brand';
import { history } from '@umijs/max';
import {
  ConfigProvider,
  Dropdown,
  Empty,
  Input,
  message,
  Modal,
  Spin,
  type MenuProps,
} from 'antd';
import dayjs from 'dayjs';
import {
  ChevronDown,
  Clock3,
  Copy,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Workflow,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import NodeIcon from './designer/components/node/NodeIcon';
import {
  createWorkflow,
  deleteWorkflow,
  fetchWorkflowList,
} from './service';
import type { WorkflowDefinitionRecord } from './types';

const stateLabelMap: Record<string, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  OFFLINE: '已下线',
};

const stateClassMap: Record<string, string> = {
  DRAFT: 'bg-[#f4f3ff] text-[#6941c6]',
  PUBLISHED: 'bg-[#ecfdf3] text-[#027a48]',
  OFFLINE: 'bg-[#fef3f2] text-[#b42318]',
};

type ListFilterType = 'all' | 'draft' | 'published';

const WorkflowManagementPage = () => {
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<ListFilterType>('all');
  const [workflowList, setWorkflowList] = useState<
    WorkflowDefinitionRecord[]
  >([]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);

      const response = await fetchWorkflowList();

      if (response.code !== 200) {
        message.error(response.message || '加载工作流失败');
        return;
      }

      setWorkflowList(response.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkflows();
  }, []);

  const filteredList = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    return workflowList.filter((workflow) => {
      if (filter === 'draft' && workflow.state !== 'DRAFT') {
        return false;
      }

      if (filter === 'published' && workflow.state !== 'PUBLISHED') {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        workflow.name,
        workflow.code,
        workflow.description,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalized),
        );
    });
  }, [filter, keyword, workflowList]);

  const openDesigner = (workflowId: number) => {
    history.push(
      `/workflow-management/${workflowId}/designer`,
    );
  };

  const handleDelete = (
    workflow: WorkflowDefinitionRecord,
  ) => {
    Modal.confirm({
      title: '删除工作流',
      content: `确定删除“${workflow.name}”吗？草稿和历史版本将一并删除。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      centered: true,
      async onOk() {
        const response = await deleteWorkflow(workflow.id);

        if (response.code !== 200) {
          message.error(
            response.message || '删除工作流失败',
          );
          return;
        }

        message.success('工作流已删除');
        await loadWorkflows();
      },
    });
  };

  const handleDuplicate = async (
    workflow: WorkflowDefinitionRecord,
  ) => {
    const suffix = Date.now()
      .toString(36)
      .slice(-5);

    const response = await createWorkflow({
      code: `${workflow.code}_copy_${suffix}`,
      name: `${workflow.name} 副本`,
      description: workflow.description,
      failureStrategy: workflow.failureStrategy,
      maxParallelism: workflow.maxParallelism,
      dag: workflow.draft,
    });

    if (
      response.code !== 200 ||
      !response.data?.workflowId
    ) {
      message.error(
        response.message || '复制工作流失败',
      );
      return;
    }

    message.success('工作流副本已创建');
    openDesigner(response.data.workflowId);
  };

  const menuItems = (
    workflow: WorkflowDefinitionRecord,
  ): MenuProps['items'] => [
    {
      key: 'duplicate',
      label: '创建副本',
      icon: <Copy size={14} />,
      onClick: () =>
        void handleDuplicate(workflow),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      danger: true,
      label: '删除',
      icon: <Trash2 size={14} />,
      onClick: () => handleDelete(workflow),
    },
  ];

  const typeMenuItems: MenuProps['items'] = [
    {
      key: 'all',
      label: '全部类型',
    },
    {
      key: 'workflow',
      label: '工作流',
    },
  ];

  const tagMenuItems: MenuProps['items'] = [
    {
      key: 'all',
      label: '全部标签',
    },
    {
      type: 'divider',
    },
    {
      key: 'manage',
      label: '管理标签',
    },
  ];

  const sortMenuItems: MenuProps['items'] = [
    {
      key: 'updatedAt',
      label: '最近修改',
    },
    {
      key: 'createdAt',
      label: '最近创建',
    },
    {
      key: 'name',
      label: '名称排序',
    },
  ];

  const filterButtonClass = (
    active: boolean,
  ) =>
    [
      'relative inline-flex h-[46px] items-center border-0 bg-transparent px-0 text-[14px] transition-colors',
      'after:absolute after:inset-x-0 after:bottom-[-1px] after:h-[2px] after:rounded-full after:content-[""]',
      active
        ? 'font-semibold text-[#101828] after:bg-[var(--yak-brand-color)]'
        : 'font-normal text-[#667085] after:bg-transparent hover:text-[#344054]',
    ].join(' ');

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div
        style={BRAND_CSS_VARIABLES}
        className={[
          'min-h-full bg-white px-7 pb-9 pt-6 text-[#101828]',
          'max-lg:px-5',
        ].join(' ')}
      >
      <header className="mb-6 flex items-start justify-between gap-5">
        <div>
          <span className="text-[11px] font-bold tracking-[0.12em] text-[var(--yak-brand-color)]">
            WORKFLOW
          </span>

          <h1 className="mb-1 mt-1.5 text-[28px] leading-[38px] text-[#101828]">
            工作流
          </h1>

          <p className="m-0 text-sm text-[#667085]">
            通过可视化节点编排业务流程、AI
            能力和外部服务。
          </p>
        </div>

        <button
          type="button"
          className={[
            'inline-flex h-[38px] items-center gap-2 rounded-lg border-0 bg-[#ff0000] px-4',
            'text-sm font-semibold text-white shadow-[0_8px_18px_rgba(93,95,239,0.22)]',
            'transition-all hover:bg-[#ff0000] ',
          ].join(' ')}
          onClick={() =>
            history.push(
              '/workflow-management/create/designer',
            )
          }
        >
          创建工作流
        </button>
      </header>

      <section
        className={[
          'mb-[18px] flex items-end justify-between border-b border-[#e7e9ee] bg-white',
          'max-lg:flex-col max-lg:items-stretch max-lg:gap-3',
        ].join(' ')}
      >
        <div className="flex items-center gap-8">
          <button
            type="button"
            className={filterButtonClass(
              filter === 'all',
            )}
            onClick={() => setFilter('all')}
          >
            全部
          </button>

          <button
            type="button"
            className={filterButtonClass(
              filter === 'draft',
            )}
            onClick={() => setFilter('draft')}
          >
            草稿
          </button>

          <button
            type="button"
            className={filterButtonClass(
              filter === 'published',
            )}
            onClick={() =>
              setFilter('published')
            }
          >
            已发布
          </button>
        </div>

        <div className="mb-2 flex items-center gap-2 max-lg:flex-wrap max-lg:justify-end">
          <Dropdown
            menu={{
              items: typeMenuItems,
            }}
            trigger={['click']}
          >
            <button
              type="button"
              className={[
                'inline-flex h-[34px] items-center gap-1.5 rounded-lg border-0',
                'bg-[#f2f4f7] px-3 text-[13px] text-[#475467]',
                'transition-colors hover:bg-[#e9edf3] hover:text-[#344054]',
              ].join(' ')}
            >
              类型
              <ChevronDown size={13} />
            </button>
          </Dropdown>

          <Dropdown
            menu={{
              items: tagMenuItems,
            }}
            trigger={['click']}
          >
            <button
              type="button"
              className={[
                'inline-flex h-[34px] items-center gap-1.5 rounded-lg border-0',
                'bg-[#f2f4f7] px-3 text-[13px] text-[#475467]',
                'transition-colors hover:bg-[#e9edf3] hover:text-[#344054]',
              ].join(' ')}
            >
              <Tag size={13} />
              标签
              <ChevronDown size={13} />
            </button>
          </Dropdown>

          <Dropdown
            menu={{
              items: sortMenuItems,
            }}
            trigger={['click']}
          >
            <button
              type="button"
              className={[
                'inline-flex h-[34px] items-center gap-1.5 rounded-lg border-0',
                'bg-[#f2f4f7] px-3 text-[13px] text-[#475467]',
                'transition-colors hover:bg-[#e9edf3] hover:text-[#344054]',
              ].join(' ')}
            >
              排序方式

              <span className="font-medium text-[#344054]">
                最近修改
              </span>

              <ChevronDown size={13} />
            </button>
          </Dropdown>

          <div
            className={[
              'flex h-[34px] w-[250px] items-center gap-1.5 rounded-lg',
              'border border-transparent bg-[#f2f4f7] px-2.5 text-[#98a2b3]',
              'transition-colors focus-within:border-[#d0d5dd] focus-within:bg-white',
              'max-lg:flex-1',
            ].join(' ')}
          >
            <Search size={15} />

            <Input
              bordered={false}
              value={keyword}
              placeholder="搜索工作流"
              allowClear
              className="bg-transparent text-[13px] text-[#344054]"
              onChange={(event) =>
                setKeyword(event.target.value)
              }
            />
          </div>

          <button
            type="button"
            title="刷新"
            className={[
              'flex h-[34px] w-[34px] items-center justify-center rounded-lg',
              'border border-transparent bg-[#f2f4f7] text-[#667085]',
              'transition-colors hover:bg-[#e9edf3] hover:text-[#344054]',
            ].join(' ')}
            onClick={() =>
              void loadWorkflows()
            }
          >
            <RefreshCw
              size={15}
              className={
                loading ? 'animate-spin' : ''
              }
            />
          </button>
        </div>
      </section>

      <Spin spinning={loading}>
        {filteredList.length ||
        (!keyword && filter === 'all') ? (
          <section className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-[15px]">
            {!keyword &&
              filter === 'all' && (
                <button
                  type="button"
                  className={[
                    'flex min-h-[228px] flex-col items-center justify-center rounded-[13px] border border-dashed border-[#e4e7ec]',
                    'bg-white/90 text-center text-[#667085] transition-all',
                    'hover:-translate-y-0.5 hover:border-[#c9c7fb] hover:shadow-[0_10px_28px_rgba(16,24,40,0.08)]',
                  ].join(' ')}
                  onClick={() =>
                    history.push(
                      '/workflow-management/create/designer',
                    )
                  }
                >
                  <span className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--yak-brand-color-soft)] text-[var(--yak-brand-color)]">
                    <Plus size={22} />
                  </span>

                  <strong className="text-[15px] text-[#344054]">
                    创建空白工作流
                  </strong>

                  <p className="mt-1.5 text-xs text-[#98a2b3]">
                    从基本信息和模板开始构建。
                  </p>
                </button>
              )}

            {filteredList.map((workflow) => {
              const firstVisualType = String(
                workflow.draft?.nodes?.[0]
                  ?.config?.__uiType ||
                  workflow.draft?.nodes?.[0]
                    ?.type ||
                  'START',
              );

              return (
                <article
                  key={workflow.id}
                  className={[
                    'flex min-h-[228px] min-w-0 flex-col overflow-hidden rounded-[13px]',
                    'border border-[#e4e7ec] bg-white/90 shadow-[0_1px_2px_rgba(16,24,40,0.02)]',
                    'transition-all hover:border-[#c9c7fb] hover:shadow-[0_10px_28px_rgba(16,24,40,0.08)]',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    className={[
                      'flex min-w-0 flex-1 flex-col items-stretch border-0 bg-transparent',
                      'px-[18px] pb-3.5 pt-[18px] text-left text-inherit',
                    ].join(' ')}
                    onClick={() =>
                      openDesigner(workflow.id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={[
                          'flex h-[38px] w-[38px] items-center justify-center rounded-[10px]',
                          'border border-[#e9e7ff] bg-gradient-to-br from-[#fafaff] to-[#f0efff]',
                        ].join(' ')}
                      >
                        <NodeIcon
                          type={firstVisualType}
                          size={20}
                        />
                      </span>

                      <span
                        className={[
                          'rounded-xl px-2 py-1 text-[10px] font-semibold',
                          stateClassMap[
                            workflow.state
                          ] ||
                            'bg-[#f2f4f7] text-[#667085]',
                        ].join(' ')}
                      >
                        {stateLabelMap[
                          workflow.state
                        ] || workflow.state}
                      </span>
                    </div>

                    <strong className="mt-[15px] overflow-hidden text-ellipsis whitespace-nowrap text-[15px] leading-[22px] text-[#1d2939]">
                      {workflow.name}
                    </strong>

                    <p className="mb-3.5 mt-1.5 line-clamp-2 min-h-[38px] text-xs leading-[19px] text-[#667085]">
                      {workflow.description ||
                        '暂未填写工作流描述。'}
                    </p>

                    <div className="mt-auto flex items-center gap-3.5 text-[11px] text-[#98a2b3]">
                      <span className="inline-flex items-center gap-1">
                        <Workflow size={13} />

                        {workflow.draft?.nodes
                          ?.length || 0}{' '}
                        个节点
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={13} />

                        {workflow.updatedAt
                          ? dayjs(
                              workflow.updatedAt,
                            ).format(
                              'YYYY-MM-DD HH:mm',
                            )
                          : '-'}
                      </span>
                    </div>
                  </button>

                  <footer
                    className={[
                      'flex h-[43px] items-center justify-between border-t border-[#f0f1f4]',
                      'bg-[#fcfcfd] pl-[17px] pr-3',
                    ].join(' ')}
                  >
                    <code className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[#98a2b3]">
                      {workflow.code}
                    </code>

                    <Dropdown
                      menu={{
                        items:
                          menuItems(workflow),
                      }}
                      trigger={['click']}
                    >
                      <button
                        type="button"
                        className={[
                          'flex h-[30px] w-[30px] items-center justify-center rounded-md',
                          'border-0 bg-transparent text-[#667085]',
                          'hover:bg-[#f2f4f7] hover:text-[#344054]',
                        ].join(' ')}
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <MoreHorizontal
                          size={17}
                        />
                      </button>
                    </Dropdown>
                  </footer>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="flex min-h-[360px] items-center justify-center">
            <Empty description="没有匹配的工作流" />
          </div>
        )}
      </Spin>
      </div>
    </ConfigProvider>
  );
};

export default WorkflowManagementPage;
