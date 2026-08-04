import { Form, Input, Modal, Select, message } from 'antd';
import { useEffect, useMemo } from 'react';
import { nodePluginRegistry } from '../core/registry';
import type { ResourceType } from '../core/types';
import { createNewResource } from '../mock/workspace';
import { useWorkbenchStore } from '../store/workbench.store';

interface CreateResourceValues {
  resourceType: ResourceType;
  name: string;
}

interface CreateResourceModalProps {
  open: boolean;
  initialResourceType?: ResourceType;
  onClose: () => void;
}

const CreateResourceModal = ({
  open,
  initialResourceType,
  onClose,
}: CreateResourceModalProps) => {
  const [form] = Form.useForm<CreateResourceValues>();
  const createResource = useWorkbenchStore((state) => state.createResource);
  const plugins = useMemo(
    () =>
      nodePluginRegistry
        .list()
        .slice()
        .sort(
          (left, right) =>
            left.metadata.folderOrder - right.metadata.folderOrder ||
            left.metadata.label.localeCompare(right.metadata.label),
        ),
    [],
  );

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      resourceType: initialResourceType ?? plugins[0]?.type,
      name: '',
    });
  }, [form, initialResourceType, open, plugins]);

  const handleCreate = ({ resourceType, name }: CreateResourceValues) => {
    const plugin = nodePluginRegistry.get(resourceType);
    if (!plugin) {
      message.error(`未找到节点插件：${resourceType}`);
      return;
    }

    const { resource, document } = createNewResource(plugin, name);
    createResource(resource, document);
    message.success(`${plugin.metadata.label} 已创建`);
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="新建开发节点"
      open={open}
      centered
      width={540}
      okText="创建节点"
      cancelText="取消"
      destroyOnHidden
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={() => form.submit()}
    >
      <Form<CreateResourceValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleCreate}
        className="pt-3"
      >
        <Form.Item
          name="resourceType"
          label="节点类型"
          rules={[{ required: true, message: '请选择节点类型' }]}
        >
          <Select
            variant="filled"
            options={plugins.map((plugin) => ({
              value: plugin.type,
              label: `${plugin.metadata.category} / ${plugin.metadata.label}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="节点名称"
          rules={[
            { required: true, whitespace: true, message: '请输入节点名称' },
            { max: 80, message: '节点名称不能超过 80 个字符' },
          ]}
        >
          <Input variant="filled" placeholder="例如：mysql_sql_etl" />
        </Form.Item>

        <div className="rounded-lg bg-[#f7f8f9] p-3 text-[11px] leading-5 text-[rgba(22,24,35,0.5)]">
          节点由 NodePluginDefinition 注册。创建后，渲染器、运行参数、工具栏动作和能力开关会自动按插件定义加载。
        </div>
      </Form>
    </Modal>
  );
};

export default CreateResourceModal;
