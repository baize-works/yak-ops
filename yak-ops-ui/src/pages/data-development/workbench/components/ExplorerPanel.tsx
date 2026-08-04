import { Button, Dropdown, Input, Select, Tooltip, type MenuProps } from 'antd';
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Folder,
  FolderOpen,
  PanelLeftClose,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, type ChangeEvent } from 'react';
import { nodePluginRegistry } from '../core/registry';
import type {
  ExplorerFilter,
  ResourceType,
  WorkbenchFolderDefinition,
} from '../core/types';
import { useWorkbenchStore } from '../store/workbench.store';
import ResourceContextMenu from './ResourceContextMenu';

interface ExplorerPanelProps {
  onCreate: (resourceType: ResourceType) => void;
}

const PROJECT_LABEL = '用户数据平台';

const ExplorerPanel = ({ onCreate }: ExplorerPanelProps) => {
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

  const plugins = nodePluginRegistry.list();

  const folders = useMemo(() => {
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

  const createMenuItems: MenuProps['items'] = plugins
    .slice()
    .sort(
      (left, right) =>
        left.metadata.folderOrder - right.metadata.folderOrder ||
        left.metadata.label.localeCompare(right.metadata.label),
    )
    .map((plugin) => {
      const Icon = plugin.metadata.icon;
      return {
        key: plugin.type,
        label: plugin.metadata.label,
        icon: <Icon size={15} className={plugin.metadata.iconClassName} />,
      };
    });

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
        (explorerFilter === 'owned' && resource.owner === 'me') ||
        (explorerFilter === 'favorite' && resource.favorite);
      return matchesKeyword && matchesFilter;
    })
    .map((resource) => resource.id);
  const visibleResourceIdSet = new Set(visibleResourceIds);

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
        folders={folders}
        projectLabel={PROJECT_LABEL}
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
            {resource.favorite && (
              <Circle
                size={6}
                fill="currentColor"
                className="shrink-0 text-[rgba(22,24,35,0.24)]"
              />
            )}
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
    <aside className="flex h-full w-full min-w-0 flex-col bg-[#fbfbfc]">
      <div className="border-b border-[#e7e9ec] p-3">
        <div className="flex items-center justify-between gap-2">
          <Select
            variant="borderless"
            className="min-w-0 flex-1 [&_.ant-select-selector]:!px-0"
            defaultValue="user-data-platform"
            options={[
              { label: PROJECT_LABEL, value: 'user-data-platform' },
              { label: '实时数仓项目', value: 'realtime-warehouse' },
            ]}
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
            ['favorite', '我收藏的'],
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
            menu={{
              items: createMenuItems,
              onClick: ({ key }: { key: string }) => onCreate(key),
            }}
          >
            <Button
              type="primary"
              size="small"
              aria-label="新建开发节点"
              icon={<Plus size={15} />}
              className="!h-7 !w-7 !px-0"
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

        {folders.map((folder) => {
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
  );
};

export default ExplorerPanel;
