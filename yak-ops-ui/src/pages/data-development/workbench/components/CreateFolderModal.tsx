import { Form, Input, Modal, message } from 'antd';
import { useState } from 'react';
import {
  projectFolderRepository,
  type ProjectFolder,
} from '../repository/project-folder.repository';
import { workbenchErrorMessage } from '../repository/workbench.repository';

interface CreateFolderValues {
  name: string;
}

interface CreateFolderModalProps {
  open: boolean;
  projectId?: string;
  onClose: () => void;
  onCreated: (folder: ProjectFolder) => void;
}

const CreateFolderModal = ({
  open,
  projectId,
  onClose,
  onCreated,
}: CreateFolderModalProps) => {
  const [form] = Form.useForm<CreateFolderValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async ({ name }: CreateFolderValues) => {
    if (!projectId) {
      message.error('数据开发项目尚未加载');
      return;
    }

    setSubmitting(true);
    try {
      const folder = await projectFolderRepository.create(projectId, name);
      onCreated(folder);
      message.success('目录已创建');
      form.resetFields();
      onClose();
    } catch (error) {
      message.error(workbenchErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="新建目录"
      open={open}
      centered
      width={440}
      okText="创建目录"
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnHidden
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={() => form.submit()}
    >
      <Form<CreateFolderValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleCreate}
        className="pt-3"
      >
        <Form.Item
          name="name"
          label="目录名称"
          rules={[
            { required: true, whitespace: true, message: '请输入目录名称' },
            { max: 80, message: '目录名称不能超过 80 个字符' },
          ]}
        >
          <Input
            autoFocus
            variant="filled"
            placeholder="例如：订单数据开发"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateFolderModal;
