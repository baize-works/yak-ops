import { history } from '@umijs/max';
import { Form, Input, InputNumber, message, Select } from 'antd';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  GitBranch,
  MessageSquareText,
  Play,
  Settings2,
  Workflow,
} from 'lucide-react';
import { useState } from 'react';
import { createWorkflow } from '../../../service';
import type { WorkflowFailureStrategy } from '../../../types';
import { WORKFLOW_TEMPLATES } from '../../constants';

export interface CreateValues {
  name: string;
  code: string;
  description?: string;
  failureStrategy: WorkflowFailureStrategy;
  maxParallelism: number;
}

const DEFAULT_CREATE_VALUES: Partial<CreateValues> = {
  failureStrategy: 'FAIL_FAST',
  maxParallelism: 4,
};

export const normalizeCreateValues = (
  values: Partial<CreateValues>,
): CreateValues | undefined => {
  const name = values.name?.trim();
  const code = values.code?.trim();

  if (!name || !code) return undefined;

  return {
    name,
    code,
    description: values.description?.trim() || undefined,
    failureStrategy: values.failureStrategy || 'FAIL_FAST',
    maxParallelism: values.maxParallelism || 4,
  };
};

const WorkflowCreateGuide = () => {
  const [form] = Form.useForm<CreateValues>();
  const [saving, setSaving] = useState(false);

  const create = async () => {
    const validatedValues = await form.validateFields();
    const normalizedValues = normalizeCreateValues(validatedValues);

    if (!normalizedValues) {
      message.warning('请先完整填写工作流名称和编码');
      return;
    }

    const blankTemplate =
      WORKFLOW_TEMPLATES.find((item) => item.id === 'blank') ||
      WORKFLOW_TEMPLATES[0];

    if (!blankTemplate) {
      message.error('未找到空白工作流配置');
      return;
    }

    try {
      setSaving(true);

      const response = await createWorkflow({
        ...normalizedValues,
        dag: {
          nodes: blankTemplate.nodes,
          edges: blankTemplate.edges,
          viewport: blankTemplate.viewport,
        },
      });

      if (response.code !== 0 || !response.data?.workflowId) {
        message.error(response.message || '创建工作流失败');
        return;
      }

      message.success('工作流创建成功');
      history.replace(
        `/workflow-management/${response.data.workflowId}/designer`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#f4f6f9] text-[#101828]">
      <header className="sticky top-0 z-20 flex h-16 items-center border-b border-[#e7eaf0] bg-white/95 px-6 backdrop-blur">
        <button
          type="button"
          onClick={() => history.push('/workflow-management')}
          className="inline-flex items-center gap-2 border-0 bg-transparent p-0 text-sm font-medium text-[#475467] transition-colors hover:text-[#101828]"
        >
          <ArrowLeft size={18} />
          返回工作流列表
        </button>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[1360px] items-center justify-center px-6 py-8">
        <section className="grid w-full overflow-hidden rounded-[20px] border border-[#e4e7ec] bg-white shadow-[0_20px_60px_rgba(16,24,40,0.08)] lg:grid-cols-[560px_minmax(0,1fr)]">
          <div className="flex min-h-[680px] flex-col px-10 py-9 max-sm:px-6">
            <div className="mb-8">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2ff] text-[#4f46e5]">
                <Workflow size={21} />
              </span>

              <h1 className="m-0 text-[26px] font-semibold leading-9 text-[#101828]">
                创建空白工作流
              </h1>

              <p className="mb-0 mt-2 text-sm leading-6 text-[#667085]">
                填写基本信息后直接进入编排画布，模板功能后续再接入。
              </p>
            </div>

            <div className="mb-7">
              <div className="mb-3 text-[13px] font-semibold text-[#344054]">
                应用类型
              </div>

              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <button
                  type="button"
                  className="relative flex min-h-[92px] items-start gap-3 rounded-[12px] border border-[#5d5fef] bg-[#fafaff] p-4 text-left shadow-[0_0_0_2px_rgba(93,95,239,0.08)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#5d5fef] text-white">
                    <Workflow size={17} />
                  </span>

                  <span className="min-w-0">
                    <strong className="block text-sm font-semibold text-[#1d2939]">
                      工作流
                    </strong>
                    <small className="mt-1 block text-xs leading-5 text-[#667085]">
                      面向自动化任务的可视化编排
                    </small>
                  </span>

                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#5d5fef] text-white">
                    <Check size={12} />
                  </span>
                </button>

                <button
                  type="button"
                  disabled
                  className="relative flex min-h-[92px] cursor-not-allowed items-start gap-3 rounded-[12px] border border-[#e4e7ec] bg-[#f9fafb] p-4 text-left opacity-65"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#eaf6ff] text-[#0ba5ec]">
                    <MessageSquareText size={17} />
                  </span>

                  <span className="min-w-0">
                    <strong className="block text-sm font-semibold text-[#1d2939]">
                      Chatflow
                    </strong>
                    <small className="mt-1 block text-xs leading-5 text-[#667085]">
                      面向多轮对话的流程编排
                    </small>
                  </span>

                  <span className="absolute right-3 top-3 rounded-full bg-[#eaecf0] px-2 py-0.5 text-[10px] text-[#667085]">
                    即将支持
                  </span>
                </button>
              </div>
            </div>

            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              initialValues={DEFAULT_CREATE_VALUES}
              className={[
                'flex-1',
                '[&_.ant-form-item]:mb-5',
                '[&_.ant-form-item-label]:pb-2',
                '[&_.ant-form-item-label_label]:text-[13px]',
                '[&_.ant-form-item-label_label]:font-semibold',
                '[&_.ant-form-item-label_label]:text-[#344054]',
                '[&_.ant-form-item-extra]:mt-1.5',
                '[&_.ant-form-item-extra]:text-[11px]',
                '[&_.ant-form-item-extra]:text-[#98a2b3]',
                '[&_.ant-input]:rounded-[10px]',
                '[&_.ant-input]:border-[#d0d5dd]',
                '[&_.ant-input]:shadow-none',
                '[&_.ant-input:hover]:border-[#98a2b3]',
                '[&_.ant-input:focus]:border-[#5d5fef]',
                '[&_.ant-input:focus]:shadow-[0_0_0_3px_rgba(93,95,239,0.08)]',
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
                  placeholder="简单描述这个工作流负责解决什么问题"
                />
              </Form.Item>

              <div className="mb-5 flex items-center gap-2 text-[13px] font-semibold text-[#344054]">
                <Settings2 size={15} />
                运行设置
              </div>

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

            <footer className="mt-3 flex items-center justify-end gap-3 border-t border-[#eaecf0] pt-5">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#d0d5dd] bg-white px-4 text-sm font-medium text-[#475467] transition-colors hover:bg-[#f9fafb] hover:text-[#344054]"
                onClick={() => history.push('/workflow-management')}
              >
                取消
              </button>

              <button
                type="button"
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border-0 bg-[#5d5fef] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(93,95,239,0.20)] transition-all hover:bg-[#5153dc] disabled:cursor-not-allowed disabled:opacity-55"
                onClick={() => void create()}
              >
                {saving ? '创建中...' : '创建工作流'}
                <ArrowRight size={16} />
              </button>
            </footer>
          </div>

          <aside className="relative hidden min-h-[680px] overflow-hidden border-l border-[#edf0f3] bg-[#fbfcfe] lg:flex lg:flex-col">
            <div className="border-b border-[#edf0f3] px-8 py-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#eef2ff] text-[#4f46e5]">
                  <Workflow size={19} />
                </span>

                <div>
                  <strong className="block text-sm font-semibold text-[#1d2939]">
                    WORKFLOW
                  </strong>
                  <span className="mt-1 block text-xs text-[#667085]">
                    使用节点连接业务逻辑、AI 能力和外部服务
                  </span>
                </div>
              </div>
            </div>

            <div className="relative flex flex-1 items-center justify-center overflow-hidden p-10">
              <div className="absolute inset-0 bg-[radial-gradient(#d9dee8_1px,transparent_1px)] [background-size:20px_20px]" />
              <div className="absolute left-[12%] top-[12%] h-52 w-52 rounded-full bg-[#e8e9ff] blur-[90px]" />
              <div className="absolute bottom-[8%] right-[10%] h-48 w-48 rounded-full bg-[#e6f4ff] blur-[90px]" />

              <div className="relative w-full max-w-[620px] rounded-[18px] border border-[#e4e7ec] bg-white/95 p-7 shadow-[0_18px_50px_rgba(16,24,40,0.10)] backdrop-blur">
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <strong className="block text-sm font-semibold text-[#1d2939]">
                      工作流画布预览
                    </strong>
                    <span className="mt-1 block text-xs text-[#98a2b3]">
                      创建后将直接进入可视化编排器
                    </span>
                  </div>

                  <span className="rounded-full border border-[#d0d5dd] bg-white px-2.5 py-1 text-[10px] text-[#667085]">
                    未发布
                  </span>
                </div>

                <div className="relative grid grid-cols-[1fr_64px_1fr_64px_1fr] items-center">
                  <div className="rounded-[14px] border border-[#dfe5ee] bg-white p-4 shadow-[0_8px_20px_rgba(16,24,40,0.06)]">
                    <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#ecfdf3] text-[#039855]">
                      <Play size={15} />
                    </span>
                    <strong className="block text-xs text-[#344054]">
                      开始
                    </strong>
                    <small className="mt-1 block text-[10px] leading-4 text-[#98a2b3]">
                      接收工作流输入参数
                    </small>
                  </div>

                  <div className="relative h-px bg-[#cfd6e2]">
                    <span className="absolute -right-0.5 -top-[3px] h-2 w-2 rotate-45 border-r border-t border-[#98a2b3]" />
                  </div>

                  <div className="rounded-[14px] border border-[#dfe5ee] bg-white p-4 shadow-[0_8px_20px_rgba(16,24,40,0.06)]">
                    <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#f4f3ff] text-[#7f56d9]">
                      <Bot size={15} />
                    </span>
                    <strong className="block text-xs text-[#344054]">
                      处理节点
                    </strong>
                    <small className="mt-1 block text-[10px] leading-4 text-[#98a2b3]">
                      编排 AI 或业务能力
                    </small>
                  </div>

                  <div className="relative h-px bg-[#cfd6e2]">
                    <span className="absolute -right-0.5 -top-[3px] h-2 w-2 rotate-45 border-r border-t border-[#98a2b3]" />
                  </div>

                  <div className="rounded-[14px] border border-[#dfe5ee] bg-white p-4 shadow-[0_8px_20px_rgba(16,24,40,0.06)]">
                    <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#eff8ff] text-[#1570ef]">
                      <GitBranch size={15} />
                    </span>
                    <strong className="block text-xs text-[#344054]">
                      输出
                    </strong>
                    <small className="mt-1 block text-[10px] leading-4 text-[#98a2b3]">
                      返回最终执行结果
                    </small>
                  </div>
                </div>

                <div className="mt-7 rounded-[12px] bg-[#f8fafc] px-4 py-3 text-xs leading-5 text-[#667085]">
                  工作流创建后，你可以继续添加条件判断、模型调用、数据转换和外部服务节点。
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default WorkflowCreateGuide;