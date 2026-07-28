import { history } from '@umijs/max';
import { Form, Input, InputNumber, message, Select } from 'antd';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createWorkflow } from '../../../service';
import type { WorkflowFailureStrategy } from '../../../types';
import { WORKFLOW_TEMPLATES } from '../../constants';
import NodeIcon from '../node/NodeIcon';

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
    () =>
      WORKFLOW_TEMPLATES.find((item) => item.id === templateId) ||
      WORKFLOW_TEMPLATES[0],
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
      history.replace(
        `/workflow-management/${response.data.workflowId}/designer`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={[
        'fixed inset-0 z-[120] overflow-y-auto text-[#101828]',
        'bg-[radial-gradient(circle_at_50%_-15%,rgba(109,94,252,0.16),transparent_36%)] bg-[#f7f8fb]',
      ].join(' ')}
    >
      <header className="flex h-[66px] items-center justify-between border-b border-[#e4e7ec]/85 bg-white/80 px-6 backdrop-blur-[12px]">
        <button
          type="button"
          onClick={() => history.push('/workflow-management')}
          className="inline-flex items-center gap-2 border-0 bg-transparent text-[11px] text-[#475467]"
        >
          <ArrowLeft size={18} />
          返回工作流列表
        </button>
        <div className="flex items-center gap-2.5">
          <span
            className={[
              'inline-flex items-center gap-1.5 text-[10px]',
              step > 0
                ? 'text-[#039855]'
                : 'font-semibold text-[#4f46e5]',
            ].join(' ')}
          >
            {step > 0 ? <Check size={13} /> : '1'}
            基本信息
          </span>
          <i className="h-px w-[34px] bg-[#d0d5dd]" />
          <span
            className={[
              'text-[10px]',
              step === 1
                ? 'font-semibold text-[#4f46e5]'
                : 'text-[#98a2b3]',
            ].join(' ')}
          >
            2 选择模板
          </span>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-66px)] items-start justify-center px-6 pb-[70px] pt-11">
        <section
          className={[
            'w-full max-w-[900px] rounded-[17px] border border-[#e4e7ec]/90 bg-white/95 p-[30px]',
            'shadow-[0_22px_60px_rgba(16,24,40,0.10)]',
          ].join(' ')}
        >
          <div className="mb-7 text-center">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-[0.1em] text-[#6d5efc]">
              <Sparkles size={16} /> CREATE WORKFLOW
            </span>
            <h1 className="mb-1.5 mt-2 text-[26px] text-[#1d2939]">
              {step === 0 ? '创建新的工作流' : '从模板开始'}
            </h1>
            <p className="m-0 text-xs text-[#667085]">
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
              initialValues={{
                failureStrategy: 'FAIL_FAST',
                maxParallelism: 4,
              }}
              className={[
                'mx-auto w-full max-w-[620px]',
                '[&_.ant-form-item-label_label]:text-[11px]',
                '[&_.ant-form-item-label_label]:font-semibold',
                '[&_.ant-form-item-label_label]:text-[#475467]',
                '[&_.ant-form-item-extra]:text-[9px] [&_.ant-form-item-extra]:text-[#98a2b3]',
              ].join(' ')}
            >
              <Form.Item
                label="工作流名称"
                name="name"
                rules={[
                  { required: true, message: '请输入工作流名称' },
                  { max: 255, message: '名称不能超过 255 个字符' },
                ]}
              >
                <Input
                  size="large"
                  placeholder="例如：知识库问答工作流"
                  maxLength={255}
                />
              </Form.Item>
              <Form.Item
                label="工作流编码"
                name="code"
                extra="创建后不可修改，建议使用英文、数字、下划线或短横线。"
                rules={[
                  { required: true, message: '请输入工作流编码' },
                  {
                    pattern: /^[a-zA-Z][a-zA-Z0-9_-]{1,127}$/,
                    message:
                      '编码需以字母开头，只能包含字母、数字、下划线和短横线',
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder="knowledge-answer"
                  maxLength={128}
                />
              </Form.Item>
              <Form.Item label="描述" name="description">
                <Input.TextArea
                  rows={4}
                  maxLength={1000}
                  showCount
                  placeholder="描述这个工作流负责解决什么问题"
                />
              </Form.Item>
              <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
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
                  <InputNumber
                    size="large"
                    min={1}
                    max={256}
                    className="w-full"
                  />
                </Form.Item>
              </div>
            </Form>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {WORKFLOW_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={[
                    'relative grid min-h-[132px] grid-cols-[40px_minmax(0,1fr)] items-start gap-3 rounded-[11px]',
                    'border bg-white p-4 text-left text-[#475467]',
                    template.id === templateId
                      ? 'border-[#9b94fb] bg-[#faf9ff] shadow-[0_0_0_2px_rgba(109,94,252,0.08)]'
                      : 'border-[#e4e7ec] hover:border-[#9b94fb] hover:bg-[#faf9ff]',
                  ].join(' ')}
                  onClick={() => setTemplateId(template.id)}
                >
                  <span className="flex h-[39px] w-[39px] items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--node-color)_10%,white)]">
                    <NodeIcon type={template.icon} size={20} />
                  </span>
                  <div>
                    <span className="block text-[8px] font-bold uppercase text-[#7f56d9]">
                      {template.category}
                    </span>
                    <strong className="mt-1 block text-xs text-[#344054]">
                      {template.name}
                    </strong>
                    <p className="mb-2.5 mt-1.5 text-[10px] leading-4 text-[#667085]">
                      {template.description}
                    </p>
                    <small className="text-[8px] text-[#98a2b3]">
                      {template.nodes.length} 个节点
                    </small>
                  </div>
                  {template.id === templateId && (
                    <Check
                      size={17}
                      className="absolute right-3 top-3 text-[#5d5fef]"
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          <footer className="mt-6 flex items-center justify-between border-t border-[#eaecf0] pt-[18px]">
            {step === 1 ? (
              <button
                type="button"
                className="inline-flex h-[37px] items-center gap-1.5 rounded-lg border border-[#d0d5dd] bg-white px-3.5 text-[11px] font-semibold text-[#475467]"
                onClick={() => setStep(0)}
              >
                上一步
              </button>
            ) : (
              <span />
            )}
            {step === 0 ? (
              <button
                type="button"
                className="inline-flex h-[37px] items-center gap-1.5 rounded-lg border-0 bg-[#5d5fef] px-3.5 text-[11px] font-semibold text-white shadow-[0_7px_17px_rgba(93,95,239,0.22)]"
                onClick={() => void goNext()}
              >
                下一步
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex h-[37px] items-center gap-1.5 rounded-lg border-0 bg-[#5d5fef] px-3.5 text-[11px] font-semibold text-white shadow-[0_7px_17px_rgba(93,95,239,0.22)] disabled:opacity-50"
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
