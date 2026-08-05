import { Form, Input, Modal, Select, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { nodePluginRegistry } from '../core/registry';
import type { ResourceType } from '../core/types';
import {
  buildProjectFolderPaths,
  projectFolderRepository,
  type ProjectFolder,
} from '../repository/project-folder.repository';
import {
  workbenchErrorMessage,
  workbenchRepository,
} from '../repository/workbench.repository';
import { useWorkbenchControlStore } from '../store/workbench-control.store';
import { useWorkbenchStore } from '../store/workbench.store';

const ROOT_PATH = '__root__';

interface CreateResourceValues {
  resourceType: ResourceType;
  parentId: string;
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
  const [folderLoading, setFolderLoading] = useState(false);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const projectId = useWorkbenchControlStore((state) => state.projectId);
  const supportedTaskTypes = useWorkbenchControlStore(
    (state) => state.supportedTaskTypes,
  );
  const createResource = useWorkbenchStore((state) => state.createResource);

  const plugins = useMemo(() => {
    const supported = new Set(supportedTaskTypes.map((type) => type.toUpperCase()));
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

  const pathOptions = useMemo(
    () => [
      { value: ROOT_PATH, label: '/' },
      ...buildProjectFolderPaths(folders).map((folder) => ({
        value: folder.id,
        label: folder.path,
      })),
    ],
    [folders],
  );

  useEffect(() => {
    if (!open) return;

    const requestedPlugin =
      plugins.find((plugin) => plugin.type === initialResourceType) ?? plugins[0];
    form.setFieldsValue({
      resourceType: requestedPlugin?.type,
      parentId: ROOT_PATH,
      name: '',
    });

    if (!projectId) {
      setFolders([]);
      return;
    }

    let disposed = false;
    setFolderLoading(true);
    void projectFolderRepository
      .list(projectId)
      .then((items) => {
        if (!disposed) setFolders(items);
      })
      .catch((error) => {
        if (!disposed) message.error(workbenchErrorMessage(error));
      })
      .finally(() => {
        if (!disposed) setFolderLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [form, initialResourceType, open, plugins, projectId]);

  const handleCreate = async ({
    resourceType,
    parentId,
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
        resourceType,
        parentId === ROOT_PATH ? null : parentId,
      );
      createResource(resource, document);
      message.success(`${plugin.metadata.label} 节点已创建`);
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
      title="新建节点"
      open={open}
      centered
      width={600}
      okText="确认"
      cancelText="取消"
      confirmLoading={submitting}
      okButtonProps={{ disabled: plugins.length === 0 }}
      destroyOnHidden
      className="[&_.ant-modal-body]:!pt-5 [&_.ant-modal-footer]:!mt-6"
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={() => form.submit()}
    >
      <Form<CreateResourceValues>
        form={form}
        labelCol={{ flex: '82px' }}
        wrapperCol={{ flex: 1 }}
        colon
        requiredMark
        onFinish={handleCreate}
        className="pt-1 [&_.ant-form-item]:!mb-3 [&_.ant-form-item-label]:!text-left"
      >
        <Form.Item
          name="resourceType"
          label="类型"
          rules={[{ required: true, message: '请选择节点类型' }]}
        >
          <Select
            variant="filled"
            placeholder={
              plugins.length === 0 ? '后端没有注册可用任务插件' : '请选择类型'
            }
            options={plugins.map((plugin) => ({
              value: plugin.type,
              label: plugin.metadata.label,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="parentId"
          label="路径"
          rules={[{ required: true, message: '请选择节点路径' }]}
        >
          <Select
            showSearch
            variant="filled"
            loading={folderLoading}
            optionFilterProp="label"
            placeholder="请选择路径"
            options={pathOptions}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="名称"
          rules={[
            { required: true, whitespace: true, message: '请输入节点名称' },
            { max: 80, message: '节点名称不能超过 80 个字符' },
          ]}
        >
          <Input variant="filled" placeholder="请输入节点名称" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateResourceModal;
