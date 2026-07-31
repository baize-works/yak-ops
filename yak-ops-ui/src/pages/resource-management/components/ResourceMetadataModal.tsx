import { Form, Input, Modal } from 'antd';
import { useEffect } from 'react';

import type { ResourceItem, ResourceMetadataFormValues } from '../types';

interface ResourceMetadataModalProps {
  open: boolean;
  resource?: ResourceItem;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: ResourceMetadataFormValues) => Promise<void>;
}

const ResourceMetadataModal = ({
  open,
  resource,
  saving,
  onCancel,
  onSubmit,
}: ResourceMetadataModalProps) => {
  const [form] = Form.useForm<ResourceMetadataFormValues>();

  useEffect(() => {
    if (!open || !resource) return;
    form.setFieldsValue({
      name: resource.name,
      description: resource.description,
    });
  }, [form, open, resource]);

  return (
    <Modal
      title="编辑资源信息"
      open={open}
      centered
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnClose
      onCancel={onCancel}
      onOk={() => void form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => void onSubmit(values)}
      >
        <Form.Item
          label="资源名称"
          name="name"
          rules={[
            { required: true, message: '请输入资源名称' },
            { max: 255, message: '资源名称不能超过 255 个字符' },
          ]}
        >
          <Input autoFocus />
        </Form.Item>
        <Form.Item
          label="描述"
          name="description"
          rules={[{ max: 512, message: '描述不能超过 512 个字符' }]}
        >
          <Input.TextArea rows={4} showCount maxLength={512} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ResourceMetadataModal;
