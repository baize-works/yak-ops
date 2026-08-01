import { Form, Modal, TreeSelect } from 'antd';
import { useEffect } from 'react';

import type { MoveResourceFormValues, ResourceItem } from '../types';
import type { DirectoryTreeNode } from '../utils';

interface MoveResourceModalProps {
  open: boolean;
  resource?: ResourceItem;
  directories: DirectoryTreeNode[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: MoveResourceFormValues) => Promise<void>;
}

const MoveResourceModal = ({
  open,
  resource,
  directories,
  saving,
  onCancel,
  onSubmit,
}: MoveResourceModalProps) => {
  const [form] = Form.useForm<MoveResourceFormValues>();

  useEffect(() => {
    if (!open || !resource) return;
    form.setFieldsValue({ targetParentId: resource.parentId });
  }, [form, open, resource]);

  return (
    <Modal
      title="移动资源"
      open={open}
      centered
      okText="移动"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnClose
      onCancel={onCancel}
      onOk={() => void form.submit()}
    >
      <div className="resource-form-context">
        正在移动：<strong>{resource?.name}</strong>
      </div>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => void onSubmit(values)}
      >
        <Form.Item
          label="目标文件夹"
          name="targetParentId"
          rules={[{ required: true, message: '请选择目标文件夹' }]}
        >
          <TreeSelect
            variant="filled"
            treeData={directories}
            treeDefaultExpandAll
            showSearch
            treeNodeFilterProp="title"
            placeholder="选择目标文件夹"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MoveResourceModal;
