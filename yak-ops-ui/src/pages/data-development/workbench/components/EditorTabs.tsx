import type React from 'react';
import { Button, Dropdown, Tooltip, type MenuProps } from 'antd';
import { Circle, PanelLeftOpen, Plus, X } from 'lucide-react';
import { nodePluginRegistry } from '../core/registry';
import type { ResourceType } from '../core/types';
import { useWorkbenchStore } from '../store/workbench.store';

interface EditorTabsProps {
  onCreate: (resourceType: ResourceType) => void;
}

const EditorTabs = ({ onCreate }: EditorTabsProps) => {
  const resourcesById = useWorkbenchStore((state) => state.resourcesById);
  const documentsByResourceId = useWorkbenchStore(
    (state) => state.documentsByResourceId,
  );
  const openResourceIds = useWorkbenchStore((state) => state.openResourceIds);
  const activeResourceId = useWorkbenchStore((state) => state.activeResourceId);
  const explorerVisible = useWorkbenchStore((state) => state.explorerVisible);
  const fullscreen = useWorkbenchStore((state) => state.fullscreen);
  const setExplorerVisible = useWorkbenchStore(
    (state) => state.setExplorerVisible,
  );
  const setActiveResource = useWorkbenchStore(
    (state) => state.setActiveResource,
  );
  const closeResource = useWorkbenchStore((state) => state.closeResource);

  const plugins = nodePluginRegistry.list();
  const createItems: MenuProps['items'] = plugins.map((plugin) => {
    const Icon = plugin.metadata.icon;
    return {
      key: plugin.type,
      label: plugin.metadata.label,
      icon: <Icon size={14} className={plugin.metadata.iconClassName} />,
    };
  });

  return (
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

      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {openResourceIds.map((resourceId) => {
          const resource = resourcesById[resourceId];
          const document = documentsByResourceId[resourceId];
          if (!resource) return null;

          const plugin = nodePluginRegistry.get(resource.resourceType);
          if (!plugin) return null;

          const Icon = plugin.metadata.icon;
          const active = resource.id === activeResourceId;

          return (
            <button
              key={resource.id}
              type="button"
              onClick={() => setActiveResource(resource.id)}
              className={[
                'group relative flex h-10 min-w-[150px] max-w-[230px] items-center gap-2 border-0 border-r border-[#e7e9ec] px-3 text-left text-[12px]',
                active
                  ? 'bg-white text-[#161823]'
                  : 'bg-[#f7f8f9] text-[rgba(22,24,35,0.54)] hover:bg-white',
              ].join(' ')}
            >
              {active && (
                <span className="absolute inset-x-0 top-0 h-0.5 bg-[var(--yak-brand-color)]" />
              )}
              <Icon size={14} className={plugin.metadata.iconClassName} />
              <span className="min-w-0 flex-1 truncate">{resource.name}</span>
              {document?.dirty ? (
                <Circle
                  size={7}
                  fill="currentColor"
                  className="shrink-0 text-[var(--yak-brand-color)]"
                />
              ) : (
                <X
                  size={13}
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(event: React.MouseEvent<SVGSVGElement>) => {
                    event.stopPropagation();
                    closeResource(resource.id);
                  }}
                />
              )}
            </button>
          );
        })}

        <Dropdown
          trigger={['click']}
          menu={{
            items: createItems,
            onClick: ({ key }: { key: string }) => onCreate(key),
          }}
        >
          <Button
            type="text"
            className="!h-10 !w-10 !shrink-0 !rounded-none"
            icon={<Plus size={15} />}
          />
        </Dropdown>
      </div>
    </div>
  );
};

export default EditorTabs;
