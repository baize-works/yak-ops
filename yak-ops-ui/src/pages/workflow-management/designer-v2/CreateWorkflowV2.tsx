import { history } from '@umijs/max';
import { Alert, Button, Form, Input, message } from 'antd';
import {
  ArrowLeft,
  ArrowRight,
  DatabaseZap,
  GitBranch,
  Play,
  Workflow,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { workflowV2Repository } from '../workflow-v2.repository';
import { createInitialWorkflowV2Dag } from './model';

interface CreateWorkflowValues {
  name: string;
  description?: string;
}

const createWorkflowCode = () =>
  `workflow_v2_${Date.now().toString(36)}`;

const CreateWorkflowV2 = () => {
  const [form] = Form.useForm<CreateWorkflowValues>();
  const [saving, setSaving] = useState(false);
  const name = Form.useWatch('name', form);

  const create = async (values: CreateWorkflowValues) => {
    const normalizedName = values.name?.trim();
    if (!normalizedName) {
      message.warning('请输入工作流名称');
      return;
    }
    try {
      setSaving(true);
      const response = await workflowV2Repository.create({
        code: createWorkflowCode(),
        name: normalizedName,
        description: values.description?.trim() || undefined,
        failureStrategy: 'FAIL_FAST',
        maxParallelism: 4,
        dag: createInitialWorkflowV2Dag(),
      });
      if (response.code !== 200 || !response.data?.workflowId) {
        message.error(response.message || '创建 Workflow V2 失败');
        return;
      }
      message.success('工作流已创建，开始拖入任务吧');
      history.replace(
        `/workflow-management/v2/${response.data.workflowId}/designer`,
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!saving) form.submit();
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [form, saving]);

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-[#f7f7f8] text-[#161823]">
      <header className="flex h-[56px] items-center border-b border-[#e4e7ec] bg-white px-5">
        <Button
          type="text"
          icon={<ArrowLeft size={16} />}
          onClick={() => history.push('/workflow-management')}
        >
          返回工作流列表
        </Button>
      </header>

      <main className="grid h-[calc(100vh-56px)] grid-cols-[520px_minmax(620px,1fr)] overflow-hidden max-xl:grid-cols-1">
        <section className="overflow-y-auto border-r border-[#e4e7ec] bg-white px-14 py-14 max-xl:border-r-0 max-sm:px-6">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--yak-brand-color-soft)] text-[var(--yak-brand-color)]">
            <Workflow size={20} />
          </span>
          <h1 className="mb-0 mt-5 text-[24px] font-semibold leading-8 text-[#161823]">
            创建任务编排工作流
          </h1>
          <p className="mb-0 mt-2 text-[13px] leading-6 text-[#667085]">
            工作流只保存已发布任务版本引用，不再重复维护 HTTP、Shell、SQL 等任务配置。
          </p>

          <Alert
            className="mt-6"
            type="info"
            showIcon
            message="Workflow V2"
            description="创建后会自动生成开始和结束节点。你只需要从左侧资源库拖入已发布任务并连接顺序。"
          />

          <Form<CreateWorkflowValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            className="mt-7 [&_.ant-form-item]:mb-5"
            onFinish={(values: CreateWorkflowValues) => void create(values)}
          >
            <Form.Item
              name="name"
              label="工作流名称"
              rules={[
                { required: true, message: '请输入工作流名称' },
                { max: 255, message: '名称不能超过 255 个字符' },
              ]}
            >
              <Input
                autoFocus
                variant="filled"
                size="large"
                maxLength={255}
                placeholder="例如：订单同步与结果通知"
              />
            </Form.Item>

            <Form.Item name="description" label="描述（可选）">
              <Input.TextArea
                variant="filled"
                rows={4}
                maxLength={1000}
                placeholder="说明这个工作流解决什么问题"
              />
            </Form.Item>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button onClick={() => history.push('/workflow-management')}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                disabled={!name?.trim()}
                icon={<ArrowRight size={15} />}
                iconPosition="end"
              >
                创建并进入画布
              </Button>
            </div>
          </Form>
        </section>

        <section className="relative overflow-hidden bg-[#f7f7f8] max-xl:hidden">
          <div className="absolute inset-8 overflow-hidden border border-[#dfe3e8] bg-white shadow-[0_16px_44px_rgba(16,24,40,0.10)]">
            <div className="flex h-12 items-center justify-between border-b border-[#e4e7ec] px-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--yak-brand-color-soft)] text-[var(--yak-brand-color)]">
                  <Workflow size={15} />
                </span>
                <strong className="text-xs text-[#344054]">任务编排画布</strong>
              </div>
              <span className="rounded bg-[#f2f4f7] px-2 py-1 text-[10px] text-[#667085]">
                Schema V2
              </span>
            </div>

            <div className="flex h-[calc(100%-48px)]">
              <aside className="w-[210px] border-r border-[#e4e7ec] bg-white p-3">
                <strong className="text-[11px] text-[#475467]">已发布任务</strong>
                <div className="mt-3 space-y-2">
                  {['查询订单', '转换数据', '发送通知'].map((item, index) => (
                    <div
                      key={item}
                      className="rounded-lg border border-[#e4e7ec] bg-[#f7f7f8] px-2.5 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <DatabaseZap size={13} className="text-[var(--yak-brand-color)]" />
                        <span className="text-[10px] font-medium text-[#344054]">
                          {item}
                        </span>
                        <span className="ml-auto rounded bg-white px-1 text-[8px] text-[#98a2b3]">
                          v{index + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="relative flex-1 bg-[radial-gradient(#d8dde5_1px,transparent_1px)] [background-size:18px_18px]">
                <div className="absolute left-[7%] top-[42%] flex items-center gap-6">
                  <div className="w-[120px] rounded-xl border border-[#dfe3e8] bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-[#344054]">
                      <Play size={13} />开始
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-[#98a2b3]" />
                  <div className="w-[150px] rounded-xl border border-[var(--yak-brand-color-border)] bg-white p-3 shadow-md">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-[#344054]">
                      <DatabaseZap size={13} className="text-[var(--yak-brand-color)]" />
                      查询订单
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[8px] text-[#98a2b3]">
                      <GitBranch size={10} /> HTTP · v3
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-[#98a2b3]" />
                  <div className="w-[120px] rounded-xl border border-[#dfe3e8] bg-white p-3 shadow-sm">
                    <div className="text-[10px] font-semibold text-[#344054]">结束</div>
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

export default CreateWorkflowV2;
