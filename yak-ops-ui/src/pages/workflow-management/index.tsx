import { API_SUCCESS_CODE } from '@/services/http/response';
import { history } from '@umijs/max';
import {
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
  Clock3,
  Copy,
  GitBranch,
  Grid2X2,
  ListFilter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
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
      if (response.code !== API_SUCCESS_CODE) {
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
      if (filter === 'draft' && workflow.state !== 'DRAFT') return false;
      if (filter === 'published' && workflow.state !== 'PUBLISHED') return false;
      if (!normalized) return true;
      return [workflow.name, workflow.code, workflow.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [filter, keyword, workflowList]);

  const openDesigner = (workflowId: number) => {
    history.push(`/workflow-management/${workflowId}/designer`);
  };

  const handleDelete = (workflow: WorkflowDefinitionRecord) => {
    Modal.confirm({
      title: '删除工作流',
      content: `确定删除“${workflow.name}”吗？草稿和历史版本将一并删除。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      centered: true,
      async onOk() {
        const response = await deleteWorkflow(workflow.id);
        if (response.code !== API_SUCCESS_CODE) {
          message.error(response.message || '删除工作流失败');
          return;
        }
        message.success('工作流已删除');
        await loadWorkflows();
      },
    });
  };

  const handleDuplicate = async (workflow: WorkflowDefinitionRecord) => {
    const suffix = Date.now().toString(36).slice(-5);
    const response = await createWorkflow({
      code: `${workflow.code}_copy_${suffix}`,
      name: `${workflow.name} 副本`,
      description: workflow.description,
      failureStrategy: workflow.failureStrategy,
      maxParallelism: workflow.maxParallelism,
      dag: workflow.draft,
    });
    if (
      response.code !== API_SUCCESS_CODE ||
      !response.data?.workflowId
    ) {
      message.error(response.message || '复制工作流失败');
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
      onClick: () => void handleDuplicate(workflow),
    },
    { type: 'divider' },
    {
      key: 'delete',
      danger: true,
      label: '删除',
      icon: <Trash2 size={14} />,
      onClick: () => handleDelete(workflow),
    },
  ];

  const filterButtonClass = (active: boolean) =>
    [
      'inline-flex h-[34px] items-center gap-1.5 rounded-lg border-0 px-3 text-[13px] font-medium',
      active
        ? 'bg-white font-semibold text-[#4f46e5] shadow-[0_1px_3px_rgba(16,24,40,0.08),inset_0_0_0_1px_#e4e7ec]'
        : 'bg-transparent text-[#667085] hover:bg-white hover:text-[#344054] hover:shadow-[0_1px_3px_rgba(16,24,40,0.08),inset_0_0_0_1px_#e4e7ec]',
    ].join(' ');

  return (
    <div
      className={[
        'min-h-full px-7 pb-9 pt-6 text-[#101828]',
        'bg-[radial-gradient(circle_at_88%_-8%,rgba(105,92,255,0.09),transparent_28%)] bg-[#f8f9fb]',
        'max-lg:px-5',
      ].join(' ')}
    >
      <header className="mb-6 flex items-start justify-between gap-5">
        <div>
          <span className="text-[11px] font-bold tracking-[0.12em] text-[#7f56d9]">
            WORKFLOW
          </span>
          <h1 className="mb-1 mt-1.5 text-[28px] leading-[38px] text-[#101828]">
            工作流
          </h1>
          <p className="m-0 text-sm text-[#667085]">
            通过可视化节点编排业务流程、AI 能力和外部服务。
          </p>
        </div>
        <button
          type="button"
          className={[
            'inline-flex h-[38px] items-center gap-2 rounded-lg border-0 bg-[#5d5fef] px-4',
            'text-sm font-semibold text-white shadow-[0_8px_18px_rgba(93,95,239,0.22)]',
            'transition-all hover:-translate-y-px hover:bg-[#5153dc] hover:shadow-[0_10px_24px_rgba(93,95,239,0.28)]',
          ].join(' ')}
          onClick={() =>
            history.push('/workflow-management/create/designer')
          }
        >
          <Plus size={16} />
          创建工作流
        </button>
      </header>

      <section className="mb-[18px] flex items-center justify-between border-b border-[#e7e9ee] pb-3.5 max-lg:flex-col max-lg:items-stretch max-lg:gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={filterButtonClass(filter === 'all')}
            onClick={() => setFilter('all')}
          >
            全部
            <span className="min-w-5 rounded-[10px] bg-[#eef0f4] px-1.5 py-0.5 text-[11px] text-[#667085]">
              {workflowList.length}
            </span>
          </button>
          <button
            type="button"
            className={filterButtonClass(filter === 'draft')}
            onClick={() => setFilter('draft')}
          >
            草稿
          </button>
          <button
            type="button"
            className={filterButtonClass(filter === 'published')}
            onClick={() => setFilter('published')}
          >
            已发布
          </button>
        </div>
        <div className="flex items-center gap-2 max-lg:justify-end">
          <div className="flex h-[34px] w-[250px] items-center gap-1.5 rounded-lg border border-[#e4e7ec] bg-white px-2.5 text-[#98a2b3] max-lg:flex-1">
            <Search size={15} />
            <Input
              bordered={false}
              value={keyword}
              placeholder="搜索工作流"
              allowClear
              className="bg-transparent text-[13px] text-[#344054]"
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          {[ListFilter, Grid2X2].map((Icon, index) => (
            <button
              key={index}
              type="button"
              title={index === 0 ? '筛选' : '网格视图'}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-[#667085] hover:bg-[#f9fafb] hover:text-[#344054]"
            >
              <Icon size={16} />
            </button>
          ))}
          <button
            type="button"
            title="刷新"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-[#667085] hover:bg-[#f9fafb] hover:text-[#344054]"
            onClick={() => void loadWorkflows()}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </section>

      <Spin spinning={loading}>
        {filteredList.length || (!keyword && filter === 'all') ? (
          <section className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-[15px]">
            {!keyword && filter === 'all' && (
              <button
                type="button"
                className={[
                  'flex min-h-[228px] flex-col items-center justify-center rounded-[13px] border border-dashed border-[#e4e7ec]',
                  'bg-white/90 text-center text-[#667085] transition-all',
                  'hover:-translate-y-0.5 hover:border-[#c9c7fb] hover:shadow-[0_10px_28px_rgba(16,24,40,0.08)]',
                ].join(' ')}
                onClick={() =>
                  history.push('/workflow-management/create/designer')
                }
              >
                <span className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eeefff] text-[#5d5fef]">
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
                workflow.draft?.nodes?.[0]?.config?.__uiType ||
                  workflow.draft?.nodes?.[0]?.type ||
                  'START',
              );
              return (
                <article
                  key={workflow.id}
                  className={[
                    'flex min-h-[228px] min-w-0 flex-col overflow-hidden rounded-[13px]',
                    'border border-[#e4e7ec] bg-white/90 shadow-[0_1px_2px_rgba(16,24,40,0.02)]',
                    'transition-all hover:-translate-y-0.5 hover:border-[#c9c7fb] hover:shadow-[0_10px_28px_rgba(16,24,40,0.08)]',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col items-stretch border-0 bg-transparent px-[18px] pb-3.5 pt-[18px] text-left text-inherit"
                    onClick={() => openDesigner(workflow.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[#e9e7ff] bg-gradient-to-br from-[#fafaff] to-[#f0efff]">
                        <NodeIcon type={firstVisualType} size={20} />
                      </span>
                      <span
                        className={[
                          'rounded-xl px-2 py-1 text-[10px] font-semibold',
                          stateClassMap[workflow.state] ||
                            'bg-[#f2f4f7] text-[#667085]',
                        ].join(' ')}
                      >
                        {stateLabelMap[workflow.state] || workflow.state}
                      </span>
                    </div>
                    <strong className="mt-[15px] overflow-hidden text-ellipsis whitespace-nowrap text-[15px] leading-[22px] text-[#1d2939]">
                      {workflow.name}
                    </strong>
                    <p className="mb-3.5 mt-1.5 line-clamp-2 min-h-[38px] text-xs leading-[19px] text-[#667085]">
                      {workflow.description || '暂未填写工作流描述。'}
                    </p>
                    <div className="mt-auto flex items-center gap-3.5 text-[11px] text-[#98a2b3]">
                      <span className="inline-flex items-center gap-1">
                        <Workflow size={13} />{' '}
                        {workflow.draft?.nodes?.length || 0} 个节点
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={13} />{' '}
                        {workflow.updatedAt
                          ? dayjs(workflow.updatedAt).format('YYYY-MM-DD HH:mm')
                          : '-'}
                      </span>
                    </div>
                  </button>
                  <footer className="flex h-[43px] items-center justify-between border-t border-[#f0f1f4] bg-[#fcfcfd] pl-[17px] pr-3">
                    <code className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[#98a2b3]">
                      {workflow.code}
                    </code>
                    <Dropdown
                      menu={{ items: menuItems(workflow) }}
                      trigger={['click']}
                    >
                      <button
                        type="button"
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7] hover:text-[#344054]"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontal size={17} />
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

      <section className="mt-6 flex items-center gap-2.5 rounded-[11px] border border-[#e6e4ff] bg-gradient-to-r from-[#f7f6ff] to-white px-4 py-3.5 text-[#5d5fef]">
        <Sparkles size={16} />
        <div className="min-w-0 flex-1">
          <strong className="block text-xs text-[#423f99]">
            设计器采用 TailwindCSS 与 Dify 风格目录结构
          </strong>
          <span className="mt-0.5 block text-[11px] text-[#7775ad]">
            节点、面板、操作区与上下文菜单已经按职责独立组织。
          </span>
        </div>
        <GitBranch size={18} />
      </section>
    </div>
  );
};

export default WorkflowManagementPage;
