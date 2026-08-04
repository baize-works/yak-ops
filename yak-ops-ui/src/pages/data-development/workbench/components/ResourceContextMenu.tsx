import { history } from '@umijs/max';
import {
  Dropdown,
  Input,
  Modal,
  Select,
  message,
  type MenuProps,
} from 'antd';
import {
  Activity,
  Columns2,
  Copy,
  Files,
  Folder,
  History,
  Pencil,
  Star,
  Trash2,
} from 'lucide-react';
import { useMemo, useState, type ReactElement } from 'react';
import type {
  DevelopmentResource,
  WorkbenchFolderDefinition,
} from '../core/types';
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
  const cloneResource = useWorkbenchStore((state) => state.cloneResource);
  const deleteResource = useWorkbenchStore((state) => state.deleteResource);
  const moveResource = useWorkbenchStore((state) => state.moveResource);
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
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveFolderId, setMoveFolderId] = useState(resource.folderId);

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
      {
        key: 'favorite',
        icon: (
          <Star
            size={14}
            fill={resource.favorite ? 'currentColor' : 'none'}
          />
        ),
        label: (
          <MenuLabel>{resource.favorite ? '取消收藏' : '收藏'}</MenuLabel>
        ),
      },
      { type: 'divider' },
      {
        key: 'move',
        icon: <Folder size={14} />,
        label: <MenuLabel>移动...</MenuLabel>,
      },
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
    [resource.favorite],
  );

  const handleMenuClick: MenuProps['onClick'] = async ({ key, domEvent }) => {
    domEvent.stopPropagation();

    switch (key) {
      case 'clone': {
        const clonedId = cloneResource(resource.id);
        if (clonedId) message.success('节点已克隆并打开');
        break;
      }
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
      case 'favorite':
        updateResource(resource.id, { favorite: !resource.favorite });
        message.success(resource.favorite ? '已取消收藏' : '已收藏');
        break;
      case 'move':
        setMoveFolderId(resource.folderId);
        setMoveOpen(true);
        break;
      case 'rename':
        setRenameValue(resource.name);
        setRenameOpen(true);
        break;
      case 'delete':
        Modal.confirm({
          centered: true,
          title: '删除开发节点',
          content: document?.dirty
            ? `“${resource.name}”存在未保存的更改，删除后无法恢复。`
            : `确认删除“${resource.name}”吗？删除后无法恢复。`,
          okText: '删除',
          cancelText: '取消',
          okButtonProps: { danger: true },
          onOk: () => {
            deleteResource(resource.id);
            message.success('节点已删除');
          },
        });
        break;
      default:
        break;
    }
  };

  const submitRename = () => {
    const nextName = renameValue.trim();
    if (!nextName) {
      message.warning('请输入节点名称');
      return;
    }

    updateResource(resource.id, { name: nextName });
    setRenameOpen(false);
    message.success('节点已重命名');
  };

  const submitMove = () => {
    if (!moveFolderId) return;
    moveResource(resource.id, moveFolderId);
    setMoveOpen(false);
    message.success('节点已移动');
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
        destroyOnHidden
        onOk={submitRename}
        onCancel={() => setRenameOpen(false)}
      >
        <Input
          autoFocus
          variant="filled"
          value={renameValue}
          maxLength={120}
          onChange={(event) => setRenameValue(event.target.value)}
          onPressEnter={submitRename}
        />
      </Modal>

      <Modal
        title="移动节点"
        open={moveOpen}
        centered
        width={440}
        okText="移动"
        cancelText="取消"
        destroyOnHidden
        onOk={submitMove}
        onCancel={() => setMoveOpen(false)}
      >
        <Select
          variant="filled"
          className="w-full"
          value={moveFolderId}
          options={folders.map((folder) => ({
            value: folder.id,
            label: folder.label,
          }))}
          onChange={setMoveFolderId}
        />
      </Modal>
    </>
  );
};

export default ResourceContextMenu;
