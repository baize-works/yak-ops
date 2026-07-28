import { history } from '@umijs/max';
import { Empty, Input, message, Modal, Spin } from 'antd';
import dayjs from 'dayjs';
import {
  Boxes,
  ChevronRight,
  Clock3,
  GitBranch,
  MoreHorizontal,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CreateWorkflowModal from './components/CreateWorkflowModal';
import './index.less';
import { deleteWorkflow, fetchWorkflowList } from './service';
import type { WorkflowDefinitionRecord } from './types';

const stateLabelMap: Record<string, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  OFFLINE: '已下线',
};

const WorkflowManagementPage = () => {
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [keyword, setKeyword] = useState('');
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
    loadWorkflows();
  }, []);

  const filteredList = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return workflowList;
    }
    return workflowList.filter((workflow) =>
      [workflow.name, workflow.code, workflow.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [keyword, workflowList]);

  const statistics = useMemo(() => {
    const draft = workflowList.filter((item) => item.state === 'DRAFT').length;
    const published = workflowList.filter(
      (item) => item.state === 'PUBLISHED',
    ).length;
    return {
      total: workflowList.length,
      draft,
      published,
      nodes: workflowList.reduce(
        (count, item) => count + (item.draft?.nodes?.length || 0),
        0,
      ),
    };
  }, [workflowList]);

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

  return (
    <div className="workflow-management-page">
      <header className="workflow-management-header">
        <div>
          <span className="workflow-management-header__eyebrow">
            WORKFLOW STUDIO
          </span>
          <h1>工作流管理</h1>
          <p>创建、维护和组织可视化工作流定义，当前阶段专注于设计与草稿管理。</p>
        </div>
        <button
          type="button"
          className="workflow-primary-button"
          onClick={() => setCreating(true)}
        >
          <Plus size={17} />
          新建工作流
        </button>
      </header>

      <section className="workflow-overview-grid">
        <div className="workflow-overview-card">
          <span className="workflow-overview-card__icon">
            <Boxes size={19} />
          </span>
          <div>
            <span>全部工作流</span>
            <strong>{statistics.total}</strong>
          </div>
        </div>
        <div className="workflow-overview-card">
          <span className="workflow-overview-card__icon is-draft">
            <PencilLine size={19} />
          </span>
          <div>
            <span>草稿</span>
            <strong>{statistics.draft}</strong>
          </div>
        </div>
        <div className="workflow-overview-card">
          <span className="workflow-overview-card__icon is-published">
            <GitBranch size={19} />
          </span>
          <div>
            <span>已发布</span>
            <strong>{statistics.published}</strong>
          </div>
        </div>
        <div className="workflow-overview-card">
          <span className="workflow-overview-card__icon is-node">
            <MoreHorizontal size={19} />
          </span>
          <div>
            <span>节点总数</span>
            <strong>{statistics.nodes}</strong>
          </div>
        </div>
      </section>

      <section className="workflow-list-panel">
        <div className="workflow-list-toolbar">
          <div className="workflow-search-box">
            <Search size={16} />
            <Input
              bordered={false}
              value={keyword}
              placeholder="搜索名称、编码或描述"
              onChange={(event) => setKeyword(event.target.value)}
              allowClear
            />
          </div>
          <button
            type="button"
            className="workflow-secondary-button"
            onClick={loadWorkflows}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'is-spinning' : ''} />
            刷新
          </button>
        </div>

        <Spin spinning={loading}>
          {filteredList.length ? (
            <div className="workflow-card-grid">
              {filteredList.map((workflow) => (
                <article key={workflow.id} className="workflow-definition-card">
                  <div className="workflow-definition-card__top">
                    <div className="workflow-definition-card__icon">
                      <GitBranch size={20} />
                    </div>
                    <span
                      className={`workflow-state-tag is-${workflow.state.toLowerCase()}`}
                    >
                      {stateLabelMap[workflow.state] || workflow.state}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="workflow-definition-card__title"
                    onClick={() => openDesigner(workflow.id)}
                  >
                    {workflow.name}
                  </button>
                  <code>{workflow.code}</code>
                  <p>{workflow.description || '暂未填写工作流描述。'}</p>

                  <div className="workflow-definition-card__meta">
                    <span>
                      <GitBranch size={14} />
                      {workflow.draft?.nodes?.length || 0} 个节点
                    </span>
                    <span>
                      <Clock3 size={14} />
                      {workflow.updatedAt
                        ? dayjs(workflow.updatedAt).format('YYYY-MM-DD HH:mm')
                        : '-'}
                    </span>
                  </div>

                  <div className="workflow-definition-card__footer">
                    <button
                      type="button"
                      className="workflow-card-danger-action"
                      onClick={() => handleDelete(workflow)}
                    >
                      <Trash2 size={15} />
                      删除
                    </button>
                    <button
                      type="button"
                      className="workflow-card-edit-action"
                      onClick={() => openDesigner(workflow.id)}
                    >
                      进入设计器
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="workflow-empty-state">
              <Empty
                description={keyword ? '没有匹配的工作流' : '还没有工作流'}
              />
              {!keyword && (
                <button
                  type="button"
                  className="workflow-primary-button"
                  onClick={() => setCreating(true)}
                >
                  <Plus size={17} />
                  创建第一个工作流
                </button>
              )}
            </div>
          )}
        </Spin>
      </section>

      <CreateWorkflowModal
        open={creating}
        onCancel={() => setCreating(false)}
        onCreated={(workflowId) => {
          setCreating(false);
          openDesigner(workflowId);
        }}
      />
    </div>
  );
};

export default WorkflowManagementPage;
