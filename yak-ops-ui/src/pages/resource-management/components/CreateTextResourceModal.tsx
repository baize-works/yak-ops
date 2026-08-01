import { Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';

import type { TextResourceFormValues } from '../types';

interface CreateTextResourceModalProps {
  open: boolean;
  parentName: string;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: TextResourceFormValues) => Promise<void>;
}

const CONTENT_TYPES = [
  { label: '普通文本', value: 'text/plain;charset=UTF-8' },
  { label: 'JSON', value: 'application/json;charset=UTF-8' },
  { label: 'YAML', value: 'application/yaml;charset=UTF-8' },
  { label: 'SQL', value: 'application/sql;charset=UTF-8' },
  { label: 'Shell', value: 'text/x-shellscript;charset=UTF-8' },
];

const CreateTextResourceModal = ({
  open,
  parentName,
  saving,
  onCancel,
  onSubmit,
}: CreateTextResourceModalProps) => {
  const [form] = Form.useForm<TextResourceFormValues>();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldValue('contentType', CONTENT_TYPES[0].value);
  }, [form, open]);

  return (
    <Modal
      title="在线创建文件"
      open={open}
      width={760}
      centered
      okText="创建文件"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnClose
      onCancel={onCancel}
      onOk={() => void form.submit()}
    >
      <div className="resource-form-context">
        创建位置：<strong>{parentName}</strong>
      </div>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => void onSubmit(values)}
      >
        <div className="resource-form-grid">
          <Form.Item
            label="文件名称"
            name="name"
            rules={[
              { required: true, message: '请输入文件名称' },
              { max: 255, message: '文件名称不能超过 255 个字符' },
            ]}
          >
            <Input
              autoFocus
              variant="filled"
              placeholder="例如：job-config.yaml"
            />
          </Form.Item>
          <Form.Item label="内容类型" name="contentType">
            <Select variant="filled" options={CONTENT_TYPES} />
          </Form.Item>
        </div>
        <Form.Item
          label="文件内容"
          name="content"
          rules={[{ required: true, message: '请输入文件内容' }]}
        >
          <Input.TextArea
            variant="filled"
            className="resource-code-textarea"
            rows={14}
            placeholder="在这里输入文本内容"
          />
        </Form.Item>
        <Form.Item
          label="描述"
          name="description"
          rules={[{ max: 512, message: '描述不能超过 512 个字符' }]}
        >
          <Input.TextArea
            variant="filled"
            rows={2}
            showCount
            maxLength={512}
            placeholder="选填"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateTextResourceModal;
