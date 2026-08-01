import { Form, Input, Modal } from 'antd';
import { useEffect } from 'react';

import type { DirectoryFormValues } from '../types';

interface CreateDirectoryModalProps {
  open: boolean;
  parentName: string;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: DirectoryFormValues) => Promise<void>;
}

const CreateDirectoryModal = ({
  open,
  parentName,
  saving,
  onCancel,
  onSubmit,
}: CreateDirectoryModalProps) => {
  const [form] = Form.useForm<DirectoryFormValues>();

  useEffect(() => {
    if (open) form.resetFields();
  }, [form, open]);

  return (
    <Modal
      title="新建文件夹"
      open={open}
      centered
      okText="创建"
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
        <Form.Item
          label="文件夹名称"
          name="name"
          rules={[
            { required: true, message: '请输入文件夹名称' },
            { max: 255, message: '文件夹名称不能超过 255 个字符' },
          ]}
        >
          <Input
            autoFocus
            variant="filled"
            placeholder="例如：同步脚本"
          />
        </Form.Item>
        <Form.Item
          label="描述"
          name="description"
          rules={[{ max: 512, message: '描述不能超过 512 个字符' }]}
        >
          <Input.TextArea
            variant="filled"
            rows={3}
            showCount
            maxLength={512}
            placeholder="选填，用于说明该目录保存的内容"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateDirectoryModal;
