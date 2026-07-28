import { history } from '@umijs/max';
import { Form, Input, InputNumber, message, Select } from 'antd';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createWorkflow } from '../../service';
import type { WorkflowFailureStrategy } from '../../types';
import { WORKFLOW_TEMPLATES } from '../constants';
import NodeIcon from './NodeIcon';

interface CreateValues {
  name: string;
  code: string;
  description?: string;
  failureStrategy: WorkflowFailureStrategy;
  maxParallelism: number;
}

const WorkflowCreateGuide = () => {
  const [form] = Form.useForm<CreateValues>();
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState('blank');
  const [saving, setSaving] = useState(false);
  const selectedTemplate = useMemo(
    () => WORKFLOW_TEMPLATES.find((item) => item.id === templateId) || WORKFLOW_TEMPLATES[0],
    [templateId],
  );

  const goNext = async () => {
    await form.validateFields(['name', 'code', 'description']);
    setStep(1);
  };

  const create = async () => {
    const values = await form.validateFields();
    try {
      setSaving(true);
      const response = await createWorkflow({
        ...values,
        name: values.name.trim(),
        code: values.code.trim(),
        dag: {
          nodes: selectedTemplate.nodes,
          edges: selectedTemplate.edges,
          viewport: selectedTemplate.viewport,
        },
      });
      if (response.code !== 0 || !response.data?.workflowId) {
        message.error(response.message || '创建工作流失败');
        return;
      }
      message.success('工作流创建成功，开始编排吧');
      history.replace(`/workflow-management/${response.data.workflowId}/designer`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workflow-create-page">
      <header className="workflow-create-page__header">
        <button type="button" onClick={() => history.push('/workflow-management')}>
          <ArrowLeft size={18} />
          返回工作流列表
        </button>
        <div className="workflow-create-steps">
          <span className={step === 0 ? 'is-active' : 'is-complete'}>
            {step > 0 ? <Check size={13} /> : '1'}
            基本信息
          </span>
          <i />
          <span className={step === 1 ? 'is-active' : ''}>2 选择模板</span>
        </div>
      </header>

      <main className="workflow-create-page__main">
        <section className="workflow-create-card">
          <div className="workflow-create-card__intro">
            <span><Sparkles size={16} /> CREATE WORKFLOW</span>
            <h1>{step === 0 ? '创建新的工作流' : '从模板开始'}</h1>
            <p>
              {step === 0
                ? '填写工作流的基本信息，创建成功后进入可视化编排画布。'
                : '选择一个接近目标的工作流模板，也可以从空白画布开始。'}
            </p>
          </div>

          {step === 0 ? (
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              initialValues={{ failureStrategy: 'FAIL_FAST', maxParallelism: 4 }}
              className="workflow-create-form"
            >
              <Form.Item
                label="工作流名称"
                name="name"
                rules={[
                  { required: true, message: '请输入工作流名称' },
                  { max: 255, message: '名称不能超过 255 个字符' },
                ]}
              >
                <Input size="large" placeholder="例如：知识库问答工作流" maxLength={255} />
              </Form.Item>
              <Form.Item
                label="工作流编码"
                name="code"
                extra="创建后不可修改，建议使用英文、数字、下划线或短横线。"
                rules={[
                  { required: true, message: '请输入工作流编码' },
                  {
                    pattern: /^[a-zA-Z][a-zA-Z0-9_-]{1,127}$/,
                    message: '编码需以字母开头，只能包含字母、数字、下划线和短横线',
                  },
                ]}
              >
                <Input size="large" placeholder="knowledge-answer" maxLength={128} />
              </Form.Item>
              <Form.Item label="描述" name="description">
                <Input.TextArea
                  rows={4}
                  maxLength={1000}
                  showCount
                  placeholder="描述这个工作流负责解决什么问题"
                />
              </Form.Item>
              <div className="workflow-create-form__row">
                <Form.Item label="失败策略" name="failureStrategy">
                  <Select
                    size="large"
                    options={[
                      { label: '失败即停止', value: 'FAIL_FAST' },
                      { label: '继续后续分支', value: 'CONTINUE' },
                    ]}
                  />
                </Form.Item>
                <Form.Item label="最大并行度" name="maxParallelism">
                  <InputNumber size="large" min={1} max={256} className="w-full" />
                </Form.Item>
              </div>
            </Form>
          ) : (
            <div className="workflow-template-grid">
              {WORKFLOW_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={template.id === templateId ? 'is-selected' : ''}
                  onClick={() => setTemplateId(template.id)}
                >
                  <NodeIcon type={template.icon} size={20} />
                  <div>
                    <span>{template.category}</span>
                    <strong>{template.name}</strong>
                    <p>{template.description}</p>
                    <small>{template.nodes.length} 个节点</small>
                  </div>
                  {template.id === templateId && <Check size={17} />}
                </button>
              ))}
            </div>
          )}

          <footer className="workflow-create-card__footer">
            {step === 1 ? (
              <button type="button" className="workflow-create-secondary" onClick={() => setStep(0)}>
                上一步
              </button>
            ) : <span />}
            {step === 0 ? (
              <button type="button" className="workflow-create-primary" onClick={() => void goNext()}>
                下一步
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="workflow-create-primary"
                disabled={saving}
                onClick={() => void create()}
              >
                {saving ? '创建中...' : '创建并进入编辑器'}
                <ArrowRight size={16} />
              </button>
            )}
          </footer>
        </section>
      </main>
    </div>
  );
};

export default WorkflowCreateGuide;
