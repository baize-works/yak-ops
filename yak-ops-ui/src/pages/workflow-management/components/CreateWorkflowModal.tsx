import { Form, Input, InputNumber, message, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { createWorkflow } from '../service';
import type {
  WorkflowCreatePayload,
  WorkflowFailureStrategy,
} from '../types';

interface CreateWorkflowModalProps {
  open: boolean;
  onCancel: () => void;
  onCreated: (workflowId: number) => void;
}

interface CreateWorkflowFormValues {
  code: string;
  name: string;
  description?: string;
  failureStrategy: WorkflowFailureStrategy;
  maxParallelism: number;
}

const CreateWorkflowModal = ({
  open,
  onCancel,
  onCreated,
}: CreateWorkflowModalProps) => {
  const [form] = Form.useForm<CreateWorkflowFormValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        failureStrategy: 'FAIL_FAST',
        maxParallelism: 4,
      });
    }
  }, [form, open]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload: WorkflowCreatePayload = {
      ...values,
      code: values.code.trim(),
      name: values.name.trim(),
      dag: {
        nodes: [
          {
            key: 'start',
            name: '开始',
            type: 'NOOP',
            description: '工作流入口节点',
            positionX: 120,
            positionY: 180,
            config: {},
            retryTimes: 0,
            retryIntervalSeconds: 0,
            timeoutSeconds: 0,
            enabled: true,
            idempotent: true,
            retryOnRestart: true,
          },
        ],
        edges: [],
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
      },
    };

    try {
      setSaving(true);
      const response = await createWorkflow(payload);
      if (response.code !== 0 || !response.data?.workflowId) {
        message.error(response.message || '创建工作流失败');
        return;
      }
      message.success('工作流已创建');
      form.resetFields();
      onCreated(response.data.workflowId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="新建工作流"
      open={open}
      okText="创建并设计"
      cancelText="取消"
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={handleSubmit}
      destroyOnClose
      centered
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          label="工作流名称"
          name="name"
          rules={[
            { required: true, message: '请输入工作流名称' },
            { max: 255, message: '名称不能超过 255 个字符' },
          ]}
        >
          <Input placeholder="例如：每日数据同步流程" maxLength={255} />
        </Form.Item>

        <Form.Item
          label="工作流编码"
          name="code"
          extra="创建后不可修改，建议使用小写字母、数字和短横线。"
          rules={[
            { required: true, message: '请输入工作流编码' },
            {
              pattern: /^[a-zA-Z][a-zA-Z0-9_-]{1,127}$/,
              message: '编码需以字母开头，只能包含字母、数字、下划线和短横线',
            },
          ]}
        >
          <Input placeholder="daily-data-sync" maxLength={128} />
        </Form.Item>

        <Form.Item label="描述" name="description">
          <Input.TextArea
            placeholder="描述这个工作流负责解决什么问题"
            rows={3}
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <div className="workflow-create-modal__row">
          <Form.Item
            label="失败策略"
            name="failureStrategy"
            className="workflow-create-modal__field"
          >
            <Select
              options={[
                { label: '失败即停止', value: 'FAIL_FAST' },
                { label: '继续后续分支', value: 'CONTINUE' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="最大并行度"
            name="maxParallelism"
            className="workflow-create-modal__field"
            rules={[{ required: true, message: '请输入最大并行度' }]}
          >
            <InputNumber min={1} max={256} className="w-full" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateWorkflowModal;
