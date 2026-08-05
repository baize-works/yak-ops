import {
  Button,
  Dropdown,
  Input,
  Select,
  Tooltip,
  message,
  type MenuProps,
} from 'antd';
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Database,
  Folder,
  FolderOpen,
  FolderPlus,
  Globe2,
  PanelLeftClose,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { nodePluginRegistry } from '../core/registry';
import type {
  ExplorerFilter,
  ResourceType,
  WorkbenchFolderDefinition,
} from '../core/types';
import {
  projectFolderRepository,
  type ProjectFolder,
} from '../repository/project-folder.repository';
import { workbenchErrorMessage } from '../repository/workbench.repository';
import { useWorkbenchControlStore } from '../store/workbench-control.store';
import { useWorkbenchStore } from '../store/workbench.store';
import CreateFolderModal from './CreateFolderModal';
import ResourceContextMenu from './ResourceContextMenu';

interface ExplorerPanelProps {
  onCreate: (resourceType: ResourceType, engineType?: string) => void;
}

const QUICK_CREATE_MENU_CLASS = [
  '!min-w-[178px] !rounded-[10px] !border !border-[#e5e7eb] !bg-white !p-1.5',
  '!shadow-[0_12px_32px_rgba(22,24,35,0.12)]',
  '[&_.ant-dropdown-menu-item]:!flex [&_.ant-dropdown-menu-item]:!h-8',
  '[&_.ant-dropdown-menu-item]:!items-center [&_.ant-dropdown-menu-item]:!rounded-md',
  '[&_.ant-dropdown-menu-item]:!px-2.5 [&_.ant-dropdown-menu-item]:!text-[13px]',
  '[&_.ant-dropdown-menu-submenu-title]:!flex [&_.ant-dropdown-menu-submenu-title]:!h-8',
  '[&_.ant-dropdown-menu-submenu-title]:!items-center',
  '[&_.ant-dropdown-menu-submenu-title]:!rounded-md',
  '[&_.ant-dropdown-menu-submenu-title]:!px-2.5',
  '[&_.ant-dropdown-menu-submenu-title]:!text-[13px]',
  '[&_.ant-dropdown-menu-item:hover]:!bg-[var(--yak-brand-color-soft)]',
  '[&_.ant-dropdown-menu-item:hover]:!text-[var(--yak-brand-color)]',
  '[&_.ant-dropdown-menu-submenu-title:hover]:!bg-[var(--yak-brand-color-soft)]',
  '[&_.ant-dropdown-menu-submenu-title:hover]:!text-[var(--yak-brand-color)]',
  '[&_.ant-dropdown-menu-item-divider]:!mx-1',
  '[&_.ant-dropdown-menu-item-divider]:!my-1.5',
].join(' ');

const QUICK_CREATE_SUBMENU_CLASS = [
  '[&_.ant-dropdown-menu]:!min-w-[176px]',
  '[&_.ant-dropdown-menu]:!rounded-[10px]',
  '[&_.ant-dropdown-menu]:!border',
  '[&_.ant-dropdown-menu]:!border-[#e5e7eb]',
  '[&_.ant-dropdown-menu]:!bg-white',
  '[&_.ant-dropdown-menu]:!p-1.5',
  '[&_.ant-dropdown-menu]:!shadow-[0_12px_32px_rgba(22,24,35,0.12)]',
  '[&_.ant-dropdown-menu-item]:!flex',
  '[&_.ant-dropdown-menu-item]:!h-8',
  '[&_.ant-dropdown-menu-item]:!items-center',
  '[&_.ant-dropdown-menu-item]:!rounded-md',
  '[&_.ant-dropdown-menu-item]:!px-2.5',
  '[&_.ant-dropdown-menu-item]:!text-[13px]',
  '[&_.ant-dropdown-menu-submenu-title]:!flex',
  '[&_.ant-dropdown-menu-submenu-title]:!h-8',
  '[&_.ant-dropdown-menu-submenu-title]:!items-center',
  '[&_.ant-dropdown-menu-submenu-title]:!rounded-md',
  '[&_.ant-dropdown-menu-submenu-title]:!px-2.5',
  '[&_.ant-dropdown-menu-submenu-title]:!text-[13px]',
  '[&_.ant-dropdown-menu-item:hover]:!bg-[var(--yak-brand-color-soft)]',
  '[&_.ant-dropdown-menu-item:hover]:!text-[var(--yak-brand-color)]',
  '[&_.ant-dropdown-menu-submenu-title:hover]:!bg-[var(--yak-brand-color-soft)]',
  '[&_.ant-dropdown-menu-submenu-title:hover]:!text-[var(--yak-brand-color)]',
].join(' ');

const sortProjectFolders = (folders: ProjectFolder[]) =>
  folders.slice().sort((left, right) => {
    const order = left.sortOrder - right.sortOrder;
    return order || left.name.localeCompare(right.name);
  });

const ExplorerPanel = ({ onCreate }: ExplorerPanelProps) => {
  const projectId = useWorkbenchControlStore((state) => state.projectId);
  const projectName = useWorkbenchControlStore((state) => state.projectName);
  const supportedTaskTypes = useWorkbenchControlStore(
    (state) => state.supportedTaskTypes,
  );
  const resourcesById = useWorkbenchStore((state) => state.resourcesById);
  const documentsByResourceId = useWorkbenchStore(
    (state) => state.documentsByResourceId,
  );
  const resourceIdsByFolder = useWorkbenchStore(
    (state) => state.resourceIdsByFolder,
  );
  const activeResourceId = useWorkbenchStore((state) => state.activeResourceId);
  const expandedFolderIds = useWorkbenchStore(
    (state) => state.expandedFolderIds,
  );
  const explorerFilter = useWorkbenchStore((state) => state.explorerFilter);
  const explorerKeyword = useWorkbenchStore((state) => state.explorerKeyword);
  const explorerWidth = useWorkbenchStore((state) => state.explorerWidth);
  const openResource = useWorkbenchStore((state) => state.openResource);
  const toggleFolder = useWorkbenchStore((state) => state.toggleFolder);
  const setExplorerFilter = useWorkbenchStore(
    (state) => state.setExplorerFilter,
  );
  const setExplorerKeyword = useWorkbenchStore(
    (state) => state.setExplorerKeyword,
  );
  const setExplorerVisible = useWorkbenchStore(
    (state) => state.setExplorerVisible,
  );
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [projectFolders, setProjectFolders] = useState<ProjectFolder[]>([]);

  const plugins = useMemo(() => {
    const supported = new Set(supportedTaskTypes);
    return nodePluginRegistry
      .list()
      .filter((plugin) => supported.has(plugin.type.toUpperCase()));
  }, [supportedTaskTypes]);

  const pluginFolders = useMemo(() => {
    const folderMap = new Map<string, WorkbenchFolderDefinition>();
    plugins.forEach((plugin) => {
      folderMap.set(plugin.metadata.folderId, {
        id: plugin.metadata.folderId,
        label: plugin.metadata.folderLabel,
        order: plugin.metadata.folderOrder,
      });
    });
    return Array.from(folderMap.values()).sort(
      (left, right) => left.order - right.order,
    );
  }, [plugins]);

  useEffect(() => {
    if (!projectId) {
      setProjectFolders([]);
      return;
    }

    let disposed = false;
    void projectFolderRepository
      .list(projectId)
      .then((folders) => {
        if (!disposed) setProjectFolders(folders);
      })
      .catch((error) => {
        if (!disposed) message.error(workbenchErrorMessage(error));
      });

    return () => {
      disposed = true;
    };
  }, [projectId]);

  const supportedTypeSet = useMemo(
    () => new Set(plugins.map((plugin) => plugin.type.toUpperCase())),
    [plugins],
  );
  const sqlSupported = supportedTypeSet.has('SQL');
  const httpSupported = supportedTypeSet.has('HTTP');

  const createMenuItems: MenuProps['items'] = [
    {
      key: 'create-node',
      label: '新建节点',
      disabled: !sqlSupported && !httpSupported,
      popupClassName: QUICK_CREATE_SUBMENU_CLASS,
      children: [
        {
          key: 'database',
          label: '数据库',
          icon: <Database size={14} />,
          disabled: !sqlSupported,
          popupClassName: QUICK_CREATE_SUBMENU_CLASS,
          children: [
            {
              key: 'create-sql-mysql',
              label: 'MySQL',
              disabled: !sqlSupported,
            },
            {
              key: 'create-sql-oracle',
              label: 'ORACLE',
              disabled: !sqlSupported,
            },
          ],
        },
        {
          key: 'general',
          label: '通用',
          icon: <Globe2 size={14} />,
          disabled: !httpSupported,
          popupClassName: QUICK_CREATE_SUBMENU_CLASS,
          children: [
            {
              key: 'create-http',
              label: 'HTTP 节点',
              disabled: !httpSupported,
            },
          ],
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      key: 'create-folder',
      label: '新建目录',
      icon: <FolderPlus size={14} />,
      disabled: !projectId,
    },
  ];

  const handleCreateMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'create-sql-mysql') {
      onCreate('SQL', 'MySQL');
      return;
    }
    if (key === 'create-sql-oracle') {
      onCreate('SQL', 'Oracle');
      return;
    }
    if (key === 'create-http') {
      onCreate('HTTP', 'HTTP');
      return;
    }
    if (key === 'create-folder') {
      setCreateFolderOpen(true);
    }
  };

  const normalizedKeyword = explorerKeyword.trim().toLowerCase();
  const visibleResourceIds = Object.values(resourcesById)
    .filter((resource) => {
      const matchesKeyword =
        !normalizedKeyword ||
        resource.name.toLowerCase().includes(normalizedKeyword) ||
        resource.id.toLowerCase().includes(normalizedKeyword) ||
        resource.updatedBy.toLowerCase().includes(normalizedKeyword);
      const matchesFilter =
        explorerFilter === 'all' ||
        (explorerFilter === 'owned' && resource.owner === 'me');
      return matchesKeyword && matchesFilter;
    })
    .map((resource) => resource.id);
  const visibleResourceIdSet = new Set(visibleResourceIds);
  const visibleProjectFolders = projectFolders.filter(
    (folder) =>
      !normalizedKeyword || folder.name.toLowerCase().includes(normalizedKeyword),
  );

  const showUpdatedBy = explorerWidth >= 360;
  const showUpdatedAt = explorerWidth >= 450;
  const gridClassName = showUpdatedAt
    ? 'grid-cols-[minmax(110px,1fr)_104px_122px]'
    : showUpdatedBy
      ? 'grid-cols-[minmax(110px,1fr)_112px]'
      : 'grid-cols-[minmax(0,1fr)]';

  const renderResourceRow = (resourceId: string) => {
    const resource = resourcesById[resourceId];
    if (!resource || !visibleResourceIdSet.has(resourceId)) return null;

    const plugin = nodePluginRegistry.get(resource.resourceType);
    if (!plugin) return null;

    const Icon = plugin.metadata.icon;
    const selected = activeResourceId === resource.id;
    const document = documentsByResourceId[resource.id];

    return (
      <ResourceContextMenu
        key={resource.id}
        resource={resource}
        folders={pluginFolders}
        projectLabel={projectName}
      >
        <button
          type="button"
          onClick={() => openResource(resource.id)}
          onDoubleClick={() => openResource(resource.id, { pinned: true })}
          className={[
            `group grid h-8 w-full items-center gap-x-2 rounded-[5px] border-0 px-2 text-left text-[12px] transition-colors ${gridClassName}`,
            selected
              ? 'bg-[var(--yak-brand-color-soft)] text-[var(--yak-brand-color)]'
              : 'bg-transparent text-[rgba(22,24,35,0.72)] hover:bg-[#f5f6f7]',
          ].join(' ')}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Icon
              size={14}
              className={selected ? undefined : plugin.metadata.iconClassName}
            />
            <span className="min-w-0 flex-1 truncate" title={resource.name}>
              {resource.name}
            </span>
            {document?.dirty && (
              <Circle
                size={6}
                fill="currentColor"
                className="shrink-0 text-[var(--yak-brand-color)]"
              />
            )}
          </span>

          {showUpdatedBy && (
            <span
              className="truncate text-[11px] text-[rgba(22,24,35,0.42)]"
              title={`${resource.updatedBy} 修改`}
            >
              {resource.updatedBy} 修改
            </span>
          )}

          {showUpdatedAt && (
            <span
              className="truncate text-right text-[11px] tabular-nums text-[rgba(22,24,35,0.36)]"
              title={resource.updatedAt}
            >
              {resource.updatedAt}
            </span>
          )}
        </button>
      </ResourceContextMenu>
    );
  };

  return (
    <>
      <aside className="flex h-full w-full min-w-0 flex-col bg-[#fbfbfc]">
        <div className="border-b border-[#e7e9ec] p-3">
          <div className="flex items-center justify-between gap-2">
            <Select
              variant="borderless"
              className="min-w-0 flex-1 [&_.ant-select-selector]:!px-0"
              value="current-project"
              options={[{ label: projectName, value: 'current-project' }]}
            />
            <Tooltip title="收起项目目录">
              <Button
                type="text"
                size="small"
                icon={<PanelLeftClose size={15} />}
                onClick={() => setExplorerVisible(false)}
              />
            </Tooltip>
          </div>

          <Input
            allowClear
            variant="filled"
            prefix={<Search size={14} />}
            placeholder="搜索名称 / 节点 ID / 修改人"
            value={explorerKeyword}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setExplorerKeyword(event.target.value)
            }
            className="mt-2"
          />

          <div className="mt-2 flex items-center gap-1">
            {[
              ['all', '全部'],
              ['owned', '我负责的'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setExplorerFilter(value as ExplorerFilter)}
                className={[
                  'h-7 flex-1 rounded-md border-0 px-2 text-[11px] transition-colors',
                  explorerFilter === value
                    ? 'bg-[var(--yak-brand-color-soft)] font-medium text-[var(--yak-brand-color)]'
                    : 'bg-transparent text-[rgba(22,24,35,0.56)] hover:bg-[#f0f1f2]',
                ].join(' ')}
              >
                {label}
              </button>
            ))}

            <Dropdown
              trigger={['click']}
              placement="bottomLeft"
              menu={{
                items: createMenuItems,
                onClick: handleCreateMenuClick,
                className: QUICK_CREATE_MENU_CLASS,
              }}
            >
              <Button
                type="primary"
                size="small"
                disabled={!projectId}
                aria-label="新建节点或目录"
                icon={<Plus size={15} />}
                className="!h-7 !w-7 !rounded-md !px-0 shadow-[0_4px_12px_rgba(254,44,85,0.2)]"
              />
            </Dropdown>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
          <div
            className={`sticky top-0 z-10 grid h-8 items-center gap-x-2 border-b border-[#eceef0] bg-[#fbfbfc] px-2 text-[10px] font-medium text-[rgba(22,24,35,0.38)] ${gridClassName}`}
          >
            <span>名称</span>
            {showUpdatedBy && <span>修改人</span>}
            {showUpdatedAt && <span className="text-right">修改时间</span>}
          </div>

          <div className="px-2 pb-1 pt-2 text-[11px] font-semibold text-[rgba(22,24,35,0.48)]">
            项目目录
          </div>

          {visibleProjectFolders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              className="flex h-8 w-full items-center gap-1.5 rounded-[5px] border-0 bg-transparent px-1.5 text-left text-[12px] font-medium text-[rgba(22,24,35,0.76)] hover:bg-[#f2f3f4]"
            >
              <ChevronRight size={13} className="text-[rgba(22,24,35,0.34)]" />
              <Folder size={15} className="text-[#f2a800]" />
              <span className="min-w-0 flex-1 truncate" title={folder.name}>
                {folder.name}
              </span>
            </button>
          ))}

          {pluginFolders.map((folder) => {
            const resourceIds = (resourceIdsByFolder[folder.id] ?? []).filter(
              (id) => visibleResourceIdSet.has(id),
            );
            const expanded = expandedFolderIds[folder.id] ?? true;

            if (resourceIds.length === 0 && explorerKeyword) return null;

            return (
              <div key={folder.id} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => toggleFolder(folder.id)}
                  className="flex h-8 w-full items-center gap-1.5 rounded-[5px] border-0 bg-transparent px-1.5 text-left text-[12px] font-medium text-[rgba(22,24,35,0.76)] hover:bg-[#f2f3f4]"
                >
                  {expanded ? (
                    <ChevronDown size={13} />
                  ) : (
                    <ChevronRight size={13} />
                  )}
                  {expanded ? (
                    <FolderOpen size={15} className="text-[#f2a800]" />
                  ) : (
                    <Folder size={15} className="text-[#f2a800]" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{folder.label}</span>
                  <span className="text-[10px] font-normal text-[rgba(22,24,35,0.3)]">
                    {resourceIds.length}
                  </span>
                </button>

                {expanded && (
                  <div className="ml-[20px] border-l border-[#e6e8eb] pl-1.5">
                    {resourceIds.length > 0 ? (
                      resourceIds.map(renderResourceRow)
                    ) : (
                      <div className="px-2 py-1 text-[11px] text-[rgba(22,24,35,0.32)]">
                        暂无节点
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex h-9 shrink-0 items-center justify-between border-t border-[#e7e9ec] px-3 text-[11px] text-[rgba(22,24,35,0.46)]">
          <span className="flex items-center gap-1.5">
            <Trash2 size={13} /> 回收站
          </span>
          <span>{Object.keys(resourcesById).length} 个节点</span>
        </div>
      </aside>

      <CreateFolderModal
        open={createFolderOpen}
        projectId={projectId}
        onClose={() => setCreateFolderOpen(false)}
        onCreated={(folder) =>
          setProjectFolders((current) =>
            sortProjectFolders([
              ...current.filter((item) => item.id !== folder.id),
              folder,
            ]),
          )
        }
      />
    </>
  );
};

export default ExplorerPanel;
