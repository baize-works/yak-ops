import { Form, Input, Modal, Select, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { nodePluginRegistry } from '../core/registry';
import type { ResourceType } from '../core/types';
import {
  workbenchErrorMessage,
  workbenchRepository,
} from '../repository/workbench.repository';
import { useWorkbenchControlStore } from '../store/workbench-control.store';
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
  const [submitting, setSubmitting] = useState(false);
  const projectId = useWorkbenchControlStore((state) => state.projectId);
  const supportedTaskTypes = useWorkbenchControlStore(
    (state) => state.supportedTaskTypes,
  );
  const createResource = useWorkbenchStore((state) => state.createResource);
  const plugins = useMemo(() => {
    const supported = new Set(supportedTaskTypes);
    return nodePluginRegistry
      .list()
      .filter((plugin) => supported.has(plugin.type.toUpperCase()))
      .slice()
      .sort(
        (left, right) =>
          left.metadata.folderOrder - right.metadata.folderOrder ||
          left.metadata.label.localeCompare(right.metadata.label),
      );
  }, [supportedTaskTypes]);

  useEffect(() => {
    if (!open) return;
    const requested = plugins.some(
      (plugin) => plugin.type === initialResourceType,
    )
      ? initialResourceType
      : plugins[0]?.type;
    form.setFieldsValue({
      resourceType: requested,
      name: '',
    });
  }, [form, initialResourceType, open, plugins]);

  const handleCreate = async ({
    resourceType,
    name,
  }: CreateResourceValues) => {
    const plugin = nodePluginRegistry.get(resourceType);
    if (!plugin) {
      message.error(`未找到节点插件：${resourceType}`);
      return;
    }
    if (!projectId) {
      message.error('数据开发项目尚未加载');
      return;
    }

    setSubmitting(true);
    try {
      const { resource, document } = await workbenchRepository.createTask(
        projectId,
        resourceType,
        name,
        plugin.metadata.defaultEngine,
      );
      createResource(resource, document);
      message.success(`${plugin.metadata.label} 已创建并保存`);
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
      title="新建开发节点"
      open={open}
      centered
      width={540}
      okText="创建节点"
      cancelText="取消"
      confirmLoading={submitting}
      okButtonProps={{ disabled: plugins.length === 0 }}
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
            placeholder={
              plugins.length === 0 ? '后端没有注册可用任务插件' : undefined
            }
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
          <Input variant="filled" placeholder="例如：http_user_profile" />
        </Form.Item>

        <div className="rounded-lg bg-[#f7f8f9] p-3 text-[11px] leading-5 text-[rgba(22,24,35,0.5)]">
          节点类型由后端 TaskPluginCatalog 与前端 NodePluginDefinition
          共同确认。未在后端注册的节点不会出现在创建列表中。
        </div>
      </Form>
    </Modal>
  );
};

export default CreateResourceModal;
