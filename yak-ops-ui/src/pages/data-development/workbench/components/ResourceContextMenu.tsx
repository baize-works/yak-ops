import { history } from '@umijs/max';
import { Dropdown, Input, Modal, message, type MenuProps } from 'antd';
import {
  Activity,
  Columns2,
  Copy,
  Files,
  History,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useMemo, useState, type ReactElement } from 'react';
import type {
  DevelopmentDocument,
  DevelopmentResource,
  WorkbenchFolderDefinition,
} from '../core/types';
import {
  workbenchErrorMessage,
  workbenchRepository,
} from '../repository/workbench.repository';
import { useWorkbenchControlStore } from '../store/workbench-control.store';
import { useWorkbenchStore } from '../store/workbench.store';

interface ResourceContextMenuProps {
  resource: DevelopmentResource;
  folders: WorkbenchFolderDefinition[];
  projectLabel: string;
  children: ReactElement;
}

const MenuLabel = ({
  children,
  shortcut,
}: {
  children: string;
  shortcut?: string;
}) => (
  <span className="flex min-w-[210px] items-center justify-between gap-8">
    <span>{children}</span>
    {shortcut && (
      <span className="text-[11px] text-[rgba(22,24,35,0.36)]">
        {shortcut}
      </span>
    )}
  </span>
);

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

const ResourceContextMenu = ({
  resource,
  folders,
  projectLabel,
  children,
}: ResourceContextMenuProps) => {
  const projectId = useWorkbenchControlStore((state) => state.projectId);
  const createResource = useWorkbenchStore((state) => state.createResource);
  const deleteResource = useWorkbenchStore((state) => state.deleteResource);
  const updateResource = useWorkbenchStore((state) => state.updateResource);
  const openResource = useWorkbenchStore((state) => state.openResource);
  const setActiveResource = useWorkbenchStore(
    (state) => state.setActiveResource,
  );
  const setRightPanel = useWorkbenchStore((state) => state.setRightPanel);
  const setSplitResource = useWorkbenchStore(
    (state) => state.setSplitResource,
  );
  const document = useWorkbenchStore(
    (state) => state.documentsByResourceId[resource.id],
  );

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(resource.name);
  const [submitting, setSubmitting] = useState(false);

  const folderLabel =
    folders.find((folder) => folder.id === resource.folderId)?.label ??
    resource.folderId;
  const resourcePath = `/${projectLabel}/${folderLabel}/${resource.name}`;

  const menuItems = useMemo<MenuProps['items']>(
    () => [
      {
        key: 'clone',
        icon: <Files size={14} />,
        label: <MenuLabel>克隆</MenuLabel>,
      },
      {
        key: 'copy-name',
        icon: <Copy size={14} />,
        label: <MenuLabel>复制名称</MenuLabel>,
      },
      {
        key: 'copy-path',
        icon: <Copy size={14} />,
        label: <MenuLabel>复制路径</MenuLabel>,
      },
      { type: 'divider' },
      {
        key: 'publish-history',
        icon: <History size={14} />,
        label: <MenuLabel>发布历史</MenuLabel>,
      },
      {
        key: 'operations',
        icon: <Activity size={14} />,
        label: <MenuLabel>在运维中心查看</MenuLabel>,
      },
      { type: 'divider' },
      {
        key: 'open-side',
        icon: <Columns2 size={14} />,
        label: <MenuLabel shortcut="Ctrl+Enter">在侧边打开</MenuLabel>,
      },
      { type: 'divider' },
      {
        key: 'rename',
        icon: <Pencil size={14} />,
        label: <MenuLabel shortcut="Enter">重命名...</MenuLabel>,
      },
      {
        key: 'delete',
        danger: true,
        icon: <Trash2 size={14} />,
        label: <MenuLabel shortcut="Delete">删除</MenuLabel>,
      },
    ],
    [],
  );

  const cloneTask = async () => {
    if (!projectId || !document) return;
    const key = `clone-${resource.id}`;
    message.loading({ content: '正在克隆节点', key });
    try {
      const created = await workbenchRepository.createTask(
        projectId,
        resource.resourceType,
        `${resource.name} 副本`,
        resource.engine,
      );
      const clonedDocument: DevelopmentDocument = {
        ...created.document,
        content: structuredClone(document.content),
        config: structuredClone(document.config),
        runtime: structuredClone(document.runtime),
        dirty: true,
      };
      const saved = await workbenchRepository.saveDraft(
        created.resource,
        clonedDocument,
      );
      createResource(created.resource, saved);
      message.success({ content: '节点已克隆并保存', key });
    } catch (error) {
      message.error({ content: workbenchErrorMessage(error), key });
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      centered: true,
      title: '删除开发节点',
      content: document?.dirty
        ? `“${resource.name}”存在未保存的更改，删除后无法恢复。`
        : `确认删除“${resource.name}”吗？删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await workbenchRepository.deleteResource(resource.id);
          deleteResource(resource.id);
          useWorkbenchControlStore.getState().clearExecutionRecord(resource.id);
          message.success('节点已删除');
        } catch (error) {
          message.error(workbenchErrorMessage(error));
          throw error;
        }
      },
    });
  };

  const handleMenuClick: MenuProps['onClick'] = async ({ key, domEvent }) => {
    domEvent.stopPropagation();

    switch (key) {
      case 'clone':
        await cloneTask();
        break;
      case 'copy-name':
        await copyText(resource.name);
        message.success('名称已复制');
        break;
      case 'copy-path':
        await copyText(resourcePath);
        message.success('路径已复制');
        break;
      case 'publish-history':
        openResource(resource.id, { pinned: true });
        setActiveResource(resource.id);
        setRightPanel('version');
        break;
      case 'operations':
        history.push(
          `/data-development/instances?resourceId=${encodeURIComponent(resource.id)}`,
        );
        break;
      case 'open-side':
        openResource(resource.id, { pinned: true });
        setSplitResource(resource.id);
        break;
      case 'rename':
        setRenameValue(resource.name);
        setRenameOpen(true);
        break;
      case 'delete':
        handleDelete();
        break;
      default:
        break;
    }
  };

  const submitRename = async () => {
    const nextName = renameValue.trim();
    if (!nextName) {
      message.warning('请输入节点名称');
      return;
    }

    setSubmitting(true);
    try {
      await workbenchRepository.updateResource(resource, {
        name: nextName,
        description: resource.description,
      });
      updateResource(resource.id, { name: nextName });
      setRenameOpen(false);
      message.success('节点已重命名');
    } catch (error) {
      message.error(workbenchErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dropdown
        trigger={['contextMenu']}
        menu={{ items: menuItems, onClick: handleMenuClick }}
      >
        {children}
      </Dropdown>

      <Modal
        title="重命名节点"
        open={renameOpen}
        centered
        width={440}
        okText="确定"
        cancelText="取消"
        confirmLoading={submitting}
        destroyOnHidden
        onOk={() => void submitRename()}
        onCancel={() => setRenameOpen(false)}
      >
        <Input
          autoFocus
          variant="filled"
          value={renameValue}
          maxLength={120}
          onChange={(event) => setRenameValue(event.target.value)}
          onPressEnter={() => void submitRename()}
        />
      </Modal>
    </>
  );
};

export default ResourceContextMenu;
