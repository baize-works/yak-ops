import { history } from '@umijs/max';
import { Form, Input, message } from 'antd';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  ChevronRight,
  CirclePlay,
  Database,
  FileText,
  MessageSquareText,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { createWorkflow } from '../../../service';
import { WORKFLOW_TEMPLATES } from '../../constants';

export interface CreateValues {
  name: string;
  description?: string;
}

const DEFAULT_WORKFLOW_TEMPLATE =
  WORKFLOW_TEMPLATES.find((item) => item.id === 'blank') ||
  WORKFLOW_TEMPLATES[0];

const normalizeCreateValues = (
  values: Partial<CreateValues>,
): CreateValues | undefined => {
  const name = values.name?.trim();

  if (!name) {
    return undefined;
  }

  return {
    name,
    description: values.description?.trim() || undefined,
  };
};

const createWorkflowCode = () =>
  `workflow_${Date.now().toString(36)}`;

const WorkflowCreateGuide = () => {
  const [form] = Form.useForm<CreateValues>();
  const [saving, setSaving] = useState(false);

  const name = Form.useWatch('name', form);
  const createDisabled = !name?.trim() || saving;

  const backToList = () => {
    history.push('/workflow-management');
  };

  const create = async (values: CreateValues) => {
    const normalizedValues = normalizeCreateValues(values);

    if (!normalizedValues) {
      message.warning('请先填写工作流名称');
      return;
    }

    if (!DEFAULT_WORKFLOW_TEMPLATE) {
      message.error('未找到默认工作流模板');
      return;
    }

    try {
      setSaving(true);

      const response = await createWorkflow({
        name: normalizedValues.name,
        code: createWorkflowCode(),
        description: normalizedValues.description,
        failureStrategy: 'FAIL_FAST',
        maxParallelism: 4,
        dag: {
          nodes: DEFAULT_WORKFLOW_TEMPLATE.nodes,
          edges: DEFAULT_WORKFLOW_TEMPLATE.edges,
          viewport: DEFAULT_WORKFLOW_TEMPLATE.viewport,
        },
      });

      if (response.code !== 200 || !response.data?.workflowId) {
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

  useEffect(() => {
    const handleKeyboardCreate = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();

        if (!saving) {
          form.submit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardCreate);

    return () => {
      window.removeEventListener('keydown', handleKeyboardCreate);
    };
  }, [form, saving]);

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-[#fcfcfd] text-[#101828]">
      <header className="flex h-[60px] items-center border-b border-[#e4e7ec] bg-white px-6">
        <button
          type="button"
          className="inline-flex items-center gap-2 border-0 bg-transparent p-0 text-[13px] font-medium text-[#475467] transition-colors hover:text-[#101828]"
          onClick={backToList}
        >
          <ArrowLeft size={17} />
          返回工作流列表
        </button>
      </header>

      <main className="grid h-[calc(100vh-60px)] grid-cols-[680px_760px] justify-center overflow-hidden max-xl:grid-cols-1">
        <section className="h-full overflow-y-auto bg-[#fcfcfd] max-xl:border-b max-xl:border-[#edf0f3]">
          <div className="w-full px-[72px] pb-12 pt-[72px] max-sm:px-5 max-sm:pt-10">
            <h1 className="m-0 text-[22px] font-semibold leading-8 text-[#101828]">
              创建空白应用
            </h1>

            <div className="mb-2 mt-7 text-[13px] font-semibold leading-6 text-[#475467]">
              选择应用类型
            </div>

            <div className="flex gap-2 max-sm:flex-col">
              <button
                type="button"
                className={[
                  'relative h-[102px] w-[198px] rounded-xl border border-[#c7d2fe] bg-white p-3 text-left',
                  'shadow-[0_4px_12px_rgba(79,70,229,0.08)] outline outline-2 outline-[#6366f1]',
                  'max-sm:w-full',
                ].join(' ')}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#4f46e5] text-white">
                  <WorkflowIcon size={16} />
                </span>

                <strong className="mb-0.5 mt-2 block text-[14px] font-semibold text-[#344054]">
                  工作流
                </strong>

                <span className="line-clamp-2 block text-[12px] leading-[17px] text-[#98a2b3]">
                  面向单轮自动化任务的编排工作流
                </span>
              </button>

              <button
                type="button"
                title="暂未开放"
                disabled
                className={[
                  'relative h-[102px] w-[198px] cursor-not-allowed rounded-xl border border-[#e4e7ec]',
                  'bg-white p-3 text-left opacity-70 shadow-[0_1px_2px_rgba(16,24,40,0.03)]',
                  'max-sm:w-full',
                ].join(' ')}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0ea5e9] text-white">
                  <MessageSquareText size={16} />
                </span>

                <strong className="mb-0.5 mt-2 block text-[14px] font-semibold text-[#344054]">
                  Chatflow
                </strong>

                <span className="line-clamp-2 block text-[12px] leading-[17px] text-[#98a2b3]">
                  支持记忆的复杂多轮对话工作流
                </span>

                <span className="absolute right-3 top-3 rounded-full bg-[#f2f4f7] px-2 py-0.5 text-[10px] text-[#667085]">
                  暂未开放
                </span>
              </button>
            </div>

            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 border-0 bg-transparent p-0 text-[11px] font-medium uppercase tracking-[0.04em] text-[#98a2b3]"
            >
              新手适用
              <ChevronRight size={14} />
            </button>

            <div className="my-6 h-px bg-[#eaecf0]" />

            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={(values) => void create(values)}
              className={[
                '[&_.ant-form-item]:mb-4',
                '[&_.ant-form-item-label]:pb-1',
                '[&_.ant-form-item-label_label]:h-auto',
                '[&_.ant-form-item-label_label]:text-[13px]',
                '[&_.ant-form-item-label_label]:font-semibold',
                '[&_.ant-form-item-label_label]:text-[#475467]',
                '[&_.ant-form-item-explain-error]:mt-1',
                '[&_.ant-form-item-explain-error]:text-[11px]',
              ].join(' ')}
            >
              <div className="flex items-end gap-3">
                <Form.Item
                  label="应用名称 & 图标"
                  name="name"
                  className="min-w-0 flex-1"
                  rules={[
                    {
                      required: true,
                      message: '请输入工作流名称',
                    },
                    {
                      max: 255,
                      message: '名称不能超过 255 个字符',
                    },
                  ]}
                >
                  <Input
                    placeholder="给你的应用起个名字"
                    maxLength={255}
                    className={[
                      'h-10 rounded-lg border border-transparent bg-[#f2f4f7] px-3 text-[13px]',
                      'shadow-none hover:border-[#d0d5dd] hover:bg-white',
                      'focus:border-[#6366f1] focus:bg-white focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]',
                    ].join(' ')}
                  />
                </Form.Item>

                <button
                  type="button"
                  title="应用图标"
                  className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#dbe4ff] bg-[#eef2ff] text-[#4f46e5]"
                >
                  <WorkflowIcon size={25} />
                </button>
              </div>

              <Form.Item
                label={
                  <span>
                    描述
                    <span className="ml-1 font-normal text-[#98a2b3]">
                      （可选）
                    </span>
                  </span>
                }
                name="description"
              >
                <Input.TextArea
                  rows={3}
                  maxLength={1000}
                  placeholder="输入应用的描述"
                  className={[
                    'min-h-[86px] resize-none rounded-lg border border-transparent bg-[#f2f4f7]',
                    'px-3 py-2 text-[13px] shadow-none hover:border-[#d0d5dd] hover:bg-white',
                    'focus:border-[#6366f1] focus:bg-white focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]',
                  ].join(' ')}
                />
              </Form.Item>

              <div className="flex items-center justify-end gap-2 pb-2 pt-2">
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[#d0d5dd] bg-white px-4 text-[13px] font-medium text-[#475467] shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:bg-[#f9fafb]"
                  onClick={backToList}
                >
                  取消
                </button>

                <button
                  type="submit"
                  disabled={createDisabled}
                  className={[
                    'inline-flex h-9 items-center justify-center gap-1 rounded-lg border-0 px-4',
                    'text-[13px] font-medium text-white transition-colors',
                    createDisabled
                      ? 'cursor-not-allowed bg-[#d6d9ff] shadow-none'
                      : 'bg-[#4f46e5] shadow-[0_5px_12px_rgba(79,70,229,0.22)] hover:bg-[#4338ca]',
                  ].join(' ')}
                >
                  {saving ? '创建中...' : '创建'}

                  <span className="ml-1 inline-flex items-center gap-0.5">
                    <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-white/20 px-1 text-[9px] font-normal text-white">
                      Ctrl
                    </kbd>
                    <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-white/20 px-1 text-[9px] font-normal text-white">
                      ↵
                    </kbd>
                  </span>
                </button>
              </div>
            </Form>
          </div>
        </section>

        <section className="relative h-full overflow-hidden border-l border-[#edf0f3] bg-[#fcfcfd] max-xl:hidden">
          <div className="h-full w-[760px] border-r border-[#edf0f3]">
            <div className="h-[72px] border-b border-[#edf0f3]" />

            <div className="px-8 py-5">
              <h2 className="m-0 text-[13px] font-semibold uppercase tracking-[0.03em] text-[#475467]">
                工作流
              </h2>

              <p className="mb-0 mt-1 max-w-[430px] text-[12px] leading-[18px] text-[#98a2b3]">
                基于工作流编排，适用于自动化、批处理等单轮生成类任务的场景。
              </p>
            </div>

            <div className="border-y border-[#edf0f3] bg-[repeating-linear-gradient(135deg,transparent,transparent_2px,rgba(16,24,40,0.035)_4px,transparent_3px,transparent_7px)] p-7">
              <div className="relative h-[448px] w-full overflow-hidden border border-[#dfe5ec] bg-white shadow-[0_12px_28px_rgba(16,24,40,0.10)]">
                <div className="flex h-11 items-center justify-between border-b border-[#edf0f3] px-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#4f46e5] text-white">
                      <WorkflowIcon size={13} />
                    </span>

                    <span className="text-[11px] font-medium text-[#475467]">
                      新建工作流
                    </span>

                    <span className="rounded bg-[#f2f4f7] px-1.5 py-0.5 text-[9px] text-[#98a2b3]">
                      草稿
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-[#e4e7ec] px-2 py-1 text-[9px] text-[#667085]">
                      预览
                    </span>

                    <span className="rounded-md bg-[#4f46e5] px-2 py-1 text-[9px] text-white">
                      发布
                    </span>
                  </div>
                </div>

                <div className="flex h-[calc(100%-44px)]">
                  <aside className="flex w-11 flex-col items-center gap-3 border-r border-[#edf0f3] py-3 text-[#98a2b3]">
                    <CirclePlay size={15} />
                    <Database size={15} />
                    <Bot size={15} />
                    <FileText size={15} />
                  </aside>

                  <div className="relative flex-1 overflow-hidden bg-[radial-gradient(#d9dee7_1px,transparent_1px)] [background-size:16px_16px]">
                    <div className="absolute left-[8%] top-[44%] flex items-center gap-8">
                      <div className="w-[128px] rounded-lg border border-[#c7d2fe] bg-white p-3 shadow-[0_7px_18px_rgba(16,24,40,0.08)]">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#4f46e5] text-white">
                            <CirclePlay size={11} />
                          </span>

                          <strong className="text-[10px] text-[#344054]">
                            开始
                          </strong>
                        </div>

                        <div className="mt-3 h-1.5 rounded bg-[#f2f4f7]" />
                        <div className="mt-1.5 h-1.5 w-4/5 rounded bg-[#f2f4f7]" />
                      </div>

                      <ArrowRight size={20} className="text-[#98a2b3]" />

                      <div className="w-[138px] rounded-lg border border-[#dbe4ff] bg-white p-3 shadow-[0_7px_18px_rgba(16,24,40,0.08)]">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#7c3aed] text-white">
                            <Bot size={11} />
                          </span>

                          <strong className="text-[10px] text-[#344054]">
                            大模型
                          </strong>
                        </div>

                        <div className="mt-3 h-1.5 rounded bg-[#f2f4f7]" />
                        <div className="mt-1.5 h-1.5 w-3/5 rounded bg-[#f2f4f7]" />
                      </div>

                      <ArrowRight size={20} className="text-[#98a2b3]" />

                      <div className="w-[118px] rounded-lg border border-[#fed7aa] bg-white p-3 shadow-[0_7px_18px_rgba(16,24,40,0.08)]">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#f59e0b] text-white">
                            <FileText size={11} />
                          </span>

                          <strong className="text-[10px] text-[#344054]">
                            输出
                          </strong>
                        </div>

                        <div className="mt-3 h-1.5 rounded bg-[#f2f4f7]" />
                        <div className="mt-1.5 h-1.5 w-2/3 rounded bg-[#f2f4f7]" />
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-[#e4e7ec] bg-white px-2 py-1 text-[9px] text-[#667085] shadow-sm">
                      100%
                      <span className="h-3 w-px bg-[#e4e7ec]" />
                      自动布局
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default WorkflowCreateGuide;