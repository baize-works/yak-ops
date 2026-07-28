import { history } from '@umijs/max';
import { Dropdown, Empty, Input, message, Modal, Spin, type MenuProps } from 'antd';
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
import NodeIcon from './designer/components/NodeIcon';
import './index.less';
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

type ListFilterType = 'all' | 'draft' | 'published';

const WorkflowManagementPage = () => {
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<ListFilterType>('all');
  const [workflowList, setWorkflowList] = useState<WorkflowDefinitionRecord[]>([]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetchWorkflowList();
      if (response.code !== 0) {
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
        if (response.code !== 0) {
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
    if (response.code !== 0 || !response.data?.workflowId) {
      message.error(response.message || '复制工作流失败');
      return;
    }
    message.success('工作流副本已创建');
    openDesigner(response.data.workflowId);
  };

  const menuItems = (workflow: WorkflowDefinitionRecord): MenuProps['items'] => [
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

  return (
    <div className="dify-workflow-list-page">
      <header className="dify-workflow-list-header">
        <div>
          <span>WORKFLOW</span>
          <h1>工作流</h1>
          <p>通过可视化节点编排业务流程、AI 能力和外部服务。</p>
        </div>
        <button
          type="button"
          className="dify-workflow-create-button"
          onClick={() => history.push('/workflow-management/create/designer')}
        >
          <Plus size={16} />
          创建工作流
        </button>
      </header>

      <section className="dify-workflow-list-toolbar">
        <div className="dify-workflow-filter-tabs">
          <button
            type="button"
            className={filter === 'all' ? 'is-active' : ''}
            onClick={() => setFilter('all')}
          >
            全部 <span>{workflowList.length}</span>
          </button>
          <button
            type="button"
            className={filter === 'draft' ? 'is-active' : ''}
            onClick={() => setFilter('draft')}
          >
            草稿
          </button>
          <button
            type="button"
            className={filter === 'published' ? 'is-active' : ''}
            onClick={() => setFilter('published')}
          >
            已发布
          </button>
        </div>
        <div className="dify-workflow-list-actions">
          <div className="dify-workflow-search">
            <Search size={15} />
            <Input
              bordered={false}
              value={keyword}
              placeholder="搜索工作流"
              allowClear
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <button type="button" title="筛选"><ListFilter size={16} /></button>
          <button type="button" title="网格视图"><Grid2X2 size={16} /></button>
          <button type="button" title="刷新" onClick={() => void loadWorkflows()}>
            <RefreshCw size={16} className={loading ? 'is-spinning' : ''} />
          </button>
        </div>
      </section>

      <Spin spinning={loading}>
        {filteredList.length || (!keyword && filter === 'all') ? (
          <section className="dify-workflow-card-grid">
            {!keyword && filter === 'all' && (
              <button
                type="button"
                className="dify-workflow-create-card"
                onClick={() => history.push('/workflow-management/create/designer')}
              >
                <span><Plus size={22} /></span>
                <strong>创建空白工作流</strong>
                <p>从基本信息和模板开始构建。</p>
              </button>
            )}

            {filteredList.map((workflow) => {
              const firstVisualType = String(
                workflow.draft?.nodes?.[0]?.config?.__uiType ||
                workflow.draft?.nodes?.[0]?.type ||
                'START',
              );
              return (
                <article key={workflow.id} className="dify-workflow-card">
                  <button
                    type="button"
                    className="dify-workflow-card__main"
                    onClick={() => openDesigner(workflow.id)}
                  >
                    <div className="dify-workflow-card__top">
                      <span className="dify-workflow-card__icon">
                        <NodeIcon type={firstVisualType} size={20} />
                      </span>
                      <span className={`dify-workflow-state is-${workflow.state.toLowerCase()}`}>
                        {stateLabelMap[workflow.state] || workflow.state}
                      </span>
                    </div>
                    <strong>{workflow.name}</strong>
                    <p>{workflow.description || '暂未填写工作流描述。'}</p>
                    <div className="dify-workflow-card__meta">
                      <span><Workflow size={13} /> {workflow.draft?.nodes?.length || 0} 个节点</span>
                      <span><Clock3 size={13} /> {workflow.updatedAt ? dayjs(workflow.updatedAt).format('YYYY-MM-DD HH:mm') : '-'}</span>
                    </div>
                  </button>
                  <footer>
                    <code>{workflow.code}</code>
                    <Dropdown menu={{ items: menuItems(workflow) }} trigger={['click']}>
                      <button type="button" onClick={(event) => event.stopPropagation()}>
                        <MoreHorizontal size={17} />
                      </button>
                    </Dropdown>
                  </footer>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="dify-workflow-list-empty">
            <Empty description="没有匹配的工作流" />
          </div>
        )}
      </Spin>

      <section className="dify-workflow-list-tip">
        <Sparkles size={16} />
        <div>
          <strong>设计器已升级为 Dify 风格工作台</strong>
          <span>支持节点面板、变量、环境配置、版本快照、导入导出和前端调试。</span>
        </div>
        <GitBranch size={18} />
      </section>
    </div>
  );
};

export default WorkflowManagementPage;
