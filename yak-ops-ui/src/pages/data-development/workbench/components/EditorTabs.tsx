import type React from 'react';
import {
  Button,
  Dropdown,
  Modal,
  Tooltip,
  message,
  type MenuProps,
} from 'antd';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Columns2,
  Files,
  LockKeyhole,
  PanelLeftOpen,
  Pin,
  PinOff,
  Plus,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type WheelEvent,
} from 'react';
import { nodePluginRegistry } from '../core/registry';
import type { ResourceType } from '../core/types';
import { useWorkbenchStore } from '../store/workbench.store';

interface EditorTabsProps {
  onCreate: (resourceType: ResourceType) => void;
}

const MenuLabel = ({
  children,
  shortcut,
}: {
  children: React.ReactNode;
  shortcut?: string;
}) => (
  <span className="flex min-w-[190px] items-center justify-between gap-8">
    <span>{children}</span>
    {shortcut && (
      <span className="text-[11px] text-[rgba(22,24,35,0.36)]">
        {shortcut}
      </span>
    )}
  </span>
);

const EditorTabs = ({ onCreate }: EditorTabsProps) => {
  const resourcesById = useWorkbenchStore((state) => state.resourcesById);
  const documentsByResourceId = useWorkbenchStore(
    (state) => state.documentsByResourceId,
  );
  const openResourceIds = useWorkbenchStore((state) => state.openResourceIds);
  const activeResourceId = useWorkbenchStore((state) => state.activeResourceId);
  const previewResourceId = useWorkbenchStore(
    (state) => state.previewResourceId,
  );
  const pinnedResourceIds = useWorkbenchStore(
    (state) => state.pinnedResourceIds,
  );
  const explorerVisible = useWorkbenchStore((state) => state.explorerVisible);
  const fullscreen = useWorkbenchStore((state) => state.fullscreen);
  const previewEnabled = useWorkbenchStore((state) => state.previewEnabled);
  const tabGroupLocked = useWorkbenchStore((state) => state.tabGroupLocked);
  const setExplorerVisible = useWorkbenchStore(
    (state) => state.setExplorerVisible,
  );
  const setPreviewEnabled = useWorkbenchStore(
    (state) => state.setPreviewEnabled,
  );
  const setTabGroupLocked = useWorkbenchStore(
    (state) => state.setTabGroupLocked,
  );
  const setActiveResource = useWorkbenchStore(
    (state) => state.setActiveResource,
  );
  const closeResources = useWorkbenchStore((state) => state.closeResources);
  const pinResource = useWorkbenchStore((state) => state.pinResource);
  const moveResourceTab = useWorkbenchStore(
    (state) => state.moveResourceTab,
  );
  const markDocumentSaved = useWorkbenchStore(
    (state) => state.markDocumentSaved,
  );
  const setSplitResource = useWorkbenchStore(
    (state) => state.setSplitResource,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [openedEditorsOpen, setOpenedEditorsOpen] = useState(false);
  const [pendingCloseIds, setPendingCloseIds] = useState<string[]>([]);
  const [draggedResourceId, setDraggedResourceId] = useState<string>();

  const plugins = nodePluginRegistry.list();
  const createItems: MenuProps['items'] = plugins.map((plugin) => {
    const Icon = plugin.metadata.icon;
    return {
      key: plugin.type,
      label: plugin.metadata.label,
      icon: <Icon size={14} className={plugin.metadata.iconClassName} />,
    };
  });

  const pinnedSet = useMemo(
    () => new Set(pinnedResourceIds),
    [pinnedResourceIds],
  );

  const updateScrollState = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 2);
    setCanScrollRight(
      container.scrollLeft + container.clientWidth < container.scrollWidth - 2,
    );
  }, []);

  useEffect(() => {
    updateScrollState();
    const container = scrollRef.current;
    if (!container) return undefined;

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(container);
    Array.from(container.children).forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [openResourceIds, updateScrollState]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !activeResourceId) return;

    const activeTab = Array.from(
      container.querySelectorAll<HTMLElement>('[data-tab-resource-id]'),
    ).find((element) => element.dataset.tabResourceId === activeResourceId);

    activeTab?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeResourceId]);

  const requestClose = useCallback(
    (resourceIds: string[]) => {
      const requestedIds = Array.from(
        new Set(resourceIds.filter((resourceId) => openResourceIds.includes(resourceId))),
      );
      if (requestedIds.length === 0) return;

      if (tabGroupLocked) {
        message.warning('当前编辑器组已锁定，请先解除锁定');
        return;
      }

      const dirtyIds = requestedIds.filter(
        (resourceId) => documentsByResourceId[resourceId]?.dirty,
      );

      if (dirtyIds.length === 0) {
        closeResources(requestedIds);
        return;
      }

      setPendingCloseIds(requestedIds);
    },
    [
      closeResources,
      documentsByResourceId,
      openResourceIds,
      tabGroupLocked,
    ],
  );

  const bulkClosableIds = useCallback(
    (ids: string[]) => ids.filter((resourceId) => !pinnedSet.has(resourceId)),
    [pinnedSet],
  );

  const closeSaved = useCallback(() => {
    const ids = bulkClosableIds(
      openResourceIds.filter(
        (resourceId) => !documentsByResourceId[resourceId]?.dirty,
      ),
    );
    if (ids.length === 0) {
      message.info('没有可关闭的已保存标签页');
      return;
    }
    requestClose(ids);
  }, [
    bulkClosableIds,
    documentsByResourceId,
    openResourceIds,
    requestClose,
  ]);

  const closeAll = useCallback(() => {
    const ids = bulkClosableIds(openResourceIds);
    if (ids.length === 0) {
      message.info('固定标签页已保留，没有其它可关闭标签页');
      return;
    }
    requestClose(ids);
  }, [bulkClosableIds, openResourceIds, requestClose]);

  const revealInExplorer = useCallback(
    (resourceId: string) => {
      setExplorerVisible(true);
      setActiveResource(resourceId);
      window.requestAnimationFrame(() => {
        const rows = Array.from(
          document.querySelectorAll<HTMLElement>('[data-explorer-resource-id]'),
        );
        const row = rows.find(
          (element) => element.dataset.explorerResourceId === resourceId,
        );
        row?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      });
    },
    [setActiveResource, setExplorerVisible],
  );

  const buildTabMenu = useCallback(
    (resourceId: string): MenuProps['items'] => {
      const index = openResourceIds.indexOf(resourceId);
      const isPinned = pinnedSet.has(resourceId);
      const otherIds = bulkClosableIds(
        openResourceIds.filter((id) => id !== resourceId),
      );
      const rightIds = bulkClosableIds(openResourceIds.slice(index + 1));

      return [
        {
          key: 'close',
          label: <MenuLabel shortcut="Alt+W">关闭</MenuLabel>,
          disabled: tabGroupLocked,
        },
        {
          key: 'close-others',
          label: '关闭其他',
          disabled: tabGroupLocked || otherIds.length === 0,
        },
        {
          key: 'close-right',
          label: '关闭右侧标签页',
          disabled: tabGroupLocked || rightIds.length === 0,
        },
        {
          key: 'close-saved',
          label: <MenuLabel shortcut="Ctrl+K U">关闭已保存</MenuLabel>,
          disabled:
            tabGroupLocked ||
            !openResourceIds.some(
              (id) =>
                !pinnedSet.has(id) && !documentsByResourceId[id]?.dirty,
            ),
        },
        {
          key: 'close-all',
          label: <MenuLabel shortcut="Ctrl+K W">全部关闭</MenuLabel>,
          disabled: tabGroupLocked || bulkClosableIds(openResourceIds).length === 0,
        },
        { type: 'divider' },
        {
          key: 'reveal',
          label: '在资源管理器视图中显示',
        },
        { type: 'divider' },
        {
          key: 'pin',
          icon: isPinned ? <PinOff size={14} /> : <Pin size={14} />,
          label: isPinned ? '取消固定' : '固定',
        },
        {
          key: 'split-right',
          icon: <Columns2 size={14} />,
          label: <MenuLabel shortcut="Ctrl+\\">向右拆分</MenuLabel>,
        },
      ];
    },
    [
      bulkClosableIds,
      documentsByResourceId,
      openResourceIds,
      pinnedSet,
      tabGroupLocked,
    ],
  );

  const handleTabMenu = useCallback(
    (resourceId: string, key: string) => {
      const index = openResourceIds.indexOf(resourceId);

      switch (key) {
        case 'close':
          requestClose([resourceId]);
          break;
        case 'close-others':
          requestClose(
            bulkClosableIds(
              openResourceIds.filter((id) => id !== resourceId),
            ),
          );
          break;
        case 'close-right':
          requestClose(bulkClosableIds(openResourceIds.slice(index + 1)));
          break;
        case 'close-saved':
          closeSaved();
          break;
        case 'close-all':
          closeAll();
          break;
        case 'reveal':
          revealInExplorer(resourceId);
          break;
        case 'pin':
          pinResource(resourceId);
          break;
        case 'split-right':
          setSplitResource(resourceId);
          break;
        default:
          break;
      }
    },
    [
      bulkClosableIds,
      closeAll,
      closeSaved,
      openResourceIds,
      pinResource,
      requestClose,
      revealInExplorer,
      setSplitResource,
    ],
  );

  const emptyAreaItems: MenuProps['items'] = [
    {
      key: 'split-right',
      icon: <Columns2 size={14} />,
      label: <MenuLabel shortcut="Ctrl+\\">向右拆分编辑器</MenuLabel>,
      disabled: !activeResourceId,
    },
    {
      key: 'show-opened',
      icon: <Files size={14} />,
      label: '显示打开的编辑器',
      disabled: openResourceIds.length === 0,
    },
    { type: 'divider' },
    {
      key: 'close-all',
      label: <MenuLabel shortcut="Ctrl+K W">全部关闭</MenuLabel>,
      disabled: tabGroupLocked || bulkClosableIds(openResourceIds).length === 0,
    },
    {
      key: 'close-saved',
      label: <MenuLabel shortcut="Ctrl+K U">关闭已保存</MenuLabel>,
      disabled:
        tabGroupLocked ||
        !openResourceIds.some(
          (id) => !pinnedSet.has(id) && !documentsByResourceId[id]?.dirty,
        ),
    },
    { type: 'divider' },
    {
      key: 'preview',
      label: previewEnabled ? '禁用预览编辑器' : '启用预览编辑器',
    },
    {
      key: 'lock',
      icon: tabGroupLocked ? <LockKeyhole size={14} /> : undefined,
      label: tabGroupLocked ? '解除锁定组' : '锁定组',
    },
  ];

  const openedEditorItems: MenuProps['items'] = openResourceIds.flatMap(
    (resourceId) => {
      const resource = resourcesById[resourceId];
      if (!resource) return [];
      const plugin = nodePluginRegistry.get(resource.resourceType);
      if (!plugin) return [];
      const Icon = plugin.metadata.icon;
      const dirty = documentsByResourceId[resourceId]?.dirty;

      return [
        {
          key: resourceId,
          icon:
            activeResourceId === resourceId ? (
              <Check size={14} />
            ) : (
              <Icon size={14} className={plugin.metadata.iconClassName} />
            ),
          label: (
            <span className="flex min-w-[230px] items-center justify-between gap-4">
              <span className="max-w-[190px] truncate">{resource.name}</span>
              {dirty && (
                <Circle
                  size={7}
                  fill="currentColor"
                  className="text-[var(--yak-brand-color)]"
                />
              )}
            </span>
          ),
        },
      ];
    },
  );

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container || container.scrollWidth <= container.clientWidth) return;

    if (Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
      event.preventDefault();
      container.scrollLeft += event.deltaY;
      updateScrollState();
    }
  };

  const scrollTabs = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({
      left: direction * 260,
      behavior: 'smooth',
    });
  };

  const dirtyPendingIds = pendingCloseIds.filter(
    (resourceId) => documentsByResourceId[resourceId]?.dirty,
  );
  const pendingNames = dirtyPendingIds
    .map((resourceId) => resourcesById[resourceId]?.name)
    .filter((name): name is string => Boolean(name));

  const confirmSaveAndClose = () => {
    dirtyPendingIds.forEach(markDocumentSaved);
    closeResources(pendingCloseIds);
    setPendingCloseIds([]);
    message.success(
      dirtyPendingIds.length > 1
        ? `已保存并关闭 ${dirtyPendingIds.length} 个文件`
        : '文件已保存并关闭',
    );
  };

  const discardAndClose = () => {
    closeResources(pendingCloseIds);
    setPendingCloseIds([]);
  };

  return (
    <>
      <div className="flex h-10 shrink-0 items-stretch border-b border-[#e5e7ea] bg-[#fafbfc]">
        {!explorerVisible && !fullscreen && (
          <Tooltip title="展开项目目录">
            <Button
              type="text"
              className="!h-10 !rounded-none"
              icon={<PanelLeftOpen size={15} />}
              onClick={() => setExplorerVisible(true)}
            />
          </Tooltip>
        )}

        {canScrollLeft && (
          <Tooltip title="向左滚动标签页">
            <Button
              type="text"
              className="!h-10 !w-8 !shrink-0 !rounded-none !px-0"
              icon={<ChevronLeft size={15} />}
              onClick={() => scrollTabs(-1)}
            />
          </Tooltip>
        )}

        <Dropdown
          trigger={['contextMenu']}
          menu={{
            items: emptyAreaItems,
            onClick: ({ key }) => {
              if (key === 'split-right' && activeResourceId) {
                setSplitResource(activeResourceId);
              }
              if (key === 'show-opened') setOpenedEditorsOpen(true);
              if (key === 'close-all') closeAll();
              if (key === 'close-saved') closeSaved();
              if (key === 'preview') setPreviewEnabled(!previewEnabled);
              if (key === 'lock') setTabGroupLocked(!tabGroupLocked);
            },
          }}
        >
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            onWheel={handleWheel}
            className="flex min-w-0 flex-1 items-stretch overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {openResourceIds.map((resourceId) => {
              const resource = resourcesById[resourceId];
              const documentState = documentsByResourceId[resourceId];
              if (!resource) return null;

              const plugin = nodePluginRegistry.get(resource.resourceType);
              if (!plugin) return null;

              const Icon = plugin.metadata.icon;
              const active = resource.id === activeResourceId;
              const pinned = pinnedSet.has(resource.id);
              const preview = previewResourceId === resource.id;

              return (
                <Dropdown
                  key={resource.id}
                  trigger={['contextMenu']}
                  menu={{
                    items: buildTabMenu(resource.id),
                    onClick: ({ key }) => handleTabMenu(resource.id, key),
                  }}
                >
                  <button
                    type="button"
                    data-tab-resource-id={resource.id}
                    draggable={!tabGroupLocked}
                    onClick={() => setActiveResource(resource.id)}
                    onDoubleClick={() => pinResource(resource.id, true)}
                    onContextMenu={(event: MouseEvent<HTMLButtonElement>) => {
                      event.stopPropagation();
                      setActiveResource(resource.id);
                    }}
                    onAuxClick={(event: MouseEvent<HTMLButtonElement>) => {
                      if (event.button === 1) {
                        event.preventDefault();
                        requestClose([resource.id]);
                      }
                    }}
                    onDragStart={(event: DragEvent<HTMLButtonElement>) => {
                      setDraggedResourceId(resource.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', resource.id);
                    }}
                    onDragOver={(event: DragEvent<HTMLButtonElement>) => {
                      if (!tabGroupLocked) event.preventDefault();
                    }}
                    onDrop={(event: DragEvent<HTMLButtonElement>) => {
                      event.preventDefault();
                      const sourceId =
                        draggedResourceId || event.dataTransfer.getData('text/plain');
                      if (sourceId) moveResourceTab(sourceId, resource.id);
                      setDraggedResourceId(undefined);
                    }}
                    className={[
                      'group relative flex h-10 min-w-[150px] max-w-[230px] shrink-0 items-center gap-2 border-0 border-r border-[#e7e9ec] px-3 text-left text-[12px] transition-colors',
                      active
                        ? 'bg-white text-[#161823]'
                        : 'bg-[#f7f8f9] text-[rgba(22,24,35,0.54)] hover:bg-white',
                      draggedResourceId === resource.id ? 'opacity-50' : '',
                    ].join(' ')}
                  >
                    {active && (
                      <span className="absolute inset-x-0 top-0 h-0.5 bg-[var(--yak-brand-color)]" />
                    )}
                    <Icon size={14} className={plugin.metadata.iconClassName} />
                    <span
                      className={[
                        'min-w-0 flex-1 truncate',
                        preview ? 'italic' : '',
                      ].join(' ')}
                    >
                      {resource.name}
                    </span>
                    {pinned && (
                      <Pin
                        size={11}
                        className="shrink-0 text-[rgba(22,24,35,0.38)]"
                      />
                    )}
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                      {documentState?.dirty && (
                        <Circle
                          size={7}
                          fill="currentColor"
                          className="text-[var(--yak-brand-color)] group-hover:hidden"
                        />
                      )}
                      <X
                        size={13}
                        className={[
                          'transition-opacity',
                          documentState?.dirty
                            ? 'hidden group-hover:block'
                            : 'opacity-0 group-hover:opacity-100',
                        ].join(' ')}
                        onClick={(event: MouseEvent<SVGSVGElement>) => {
                          event.stopPropagation();
                          requestClose([resource.id]);
                        }}
                      />
                    </span>
                  </button>
                </Dropdown>
              );
            })}

            <div className="min-w-8 flex-1" />
          </div>
        </Dropdown>

        {canScrollRight && (
          <Tooltip title="向右滚动标签页">
            <Button
              type="text"
              className="!h-10 !w-8 !shrink-0 !rounded-none !px-0"
              icon={<ChevronRight size={15} />}
              onClick={() => scrollTabs(1)}
            />
          </Tooltip>
        )}

        {tabGroupLocked && (
          <Tooltip title="编辑器组已锁定，点击解除锁定">
            <Button
              type="text"
              className="!h-10 !w-9 !shrink-0 !rounded-none !px-0 text-[var(--yak-brand-color)]"
              icon={<LockKeyhole size={14} />}
              onClick={() => setTabGroupLocked(false)}
            />
          </Tooltip>
        )}

        <Dropdown
          trigger={['click']}
          open={openedEditorsOpen}
          onOpenChange={setOpenedEditorsOpen}
          menu={{
            items: openedEditorItems,
            onClick: ({ key }) => {
              setActiveResource(key);
              setOpenedEditorsOpen(false);
            },
          }}
        >
          <Tooltip title="显示打开的编辑器">
            <Button
              type="text"
              className="!h-10 !w-9 !shrink-0 !rounded-none !px-0"
              icon={<Files size={15} />}
            />
          </Tooltip>
        </Dropdown>

        <Dropdown
          trigger={['click']}
          menu={{
            items: createItems,
            onClick: ({ key }: { key: string }) => onCreate(key),
          }}
        >
          <Tooltip title="新建开发节点">
            <Button
              type="text"
              className="!h-10 !w-10 !shrink-0 !rounded-none"
              icon={<Plus size={15} />}
            />
          </Tooltip>
        </Dropdown>
      </div>

      <Modal
        open={pendingCloseIds.length > 0}
        centered
        width={520}
        title={null}
        closable
        maskClosable={false}
        onCancel={() => setPendingCloseIds([])}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="primary" onClick={confirmSaveAndClose}>
              {dirtyPendingIds.length > 1 ? '全部保存' : '保存'}
            </Button>
            <Button onClick={discardAndClose}>不保存</Button>
            <Button onClick={() => setPendingCloseIds([])}>取消</Button>
          </div>
        }
      >
        <div className="flex gap-4 px-1 pb-2 pt-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center text-[#faad14]">
            <AlertTriangle size={38} strokeWidth={1.7} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-medium leading-7 text-[#161823]">
              {pendingNames.length === 1
                ? `是否要保存对 ${pendingNames[0]} 的更改？`
                : `是否要保存对 ${pendingNames.length} 个文件的更改？`}
            </div>
            <div className="mt-2 text-[13px] leading-6 text-[rgba(22,24,35,0.58)]">
              如果不保存，你的更改将丢失。
            </div>
            {pendingNames.length > 1 && (
              <div className="mt-3 max-h-28 overflow-y-auto rounded-md bg-[#f7f8f9] px-3 py-2 text-[12px] leading-6 text-[rgba(22,24,35,0.62)]">
                {pendingNames.map((name) => (
                  <div key={name} className="truncate">
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EditorTabs;
