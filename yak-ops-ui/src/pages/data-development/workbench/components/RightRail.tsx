import {
  Clock3,
  FileJson2,
  GitBranch,
  SlidersHorizontal,
} from 'lucide-react';
import { nodePluginRegistry } from '../core/registry';
import type { RightPanelKey } from '../core/types';
import {
  selectActiveResource,
  useWorkbenchStore,
} from '../store/workbench.store';

const RightRail = () => {
  const resource = useWorkbenchStore(selectActiveResource);
  const rightPanel = useWorkbenchStore((state) => state.rightPanel);
  const setRightPanel = useWorkbenchStore((state) => state.setRightPanel);

  const plugin = resource
    ? nodePluginRegistry.get(resource.resourceType)
    : undefined;

  const items: Array<{
    key: RightPanelKey;
    label: string;
    icon: typeof FileJson2;
    visible: boolean;
  }> = [
    { key: 'properties', label: '属性', icon: FileJson2, visible: true },
    {
      key: 'run',
      label: '运行配置',
      icon: SlidersHorizontal,
      visible: Boolean(plugin?.runtime),
    },
    {
      key: 'schedule',
      label: '调度配置',
      icon: Clock3,
      visible: Boolean(plugin?.capabilities.schedulable),
    },
    {
      key: 'version',
      label: '版本',
      icon: GitBranch,
      visible: Boolean(plugin?.capabilities.versionable),
    },
  ];

  return (
    <nav className="flex w-14 shrink-0 flex-col border-l border-[#e5e7ea] bg-[#fbfbfc] py-1">
      {items
        .filter((item) => item.visible)
        .map((item) => {
          const active = rightPanel === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setRightPanel(active ? null : item.key)
              }
              className={[
                'relative flex min-h-[92px] flex-col items-center justify-center gap-2 border-0 bg-transparent px-1 text-[11px] transition-colors [writing-mode:vertical-rl]',
                active
                  ? 'bg-white text-[var(--yak-brand-color)]'
                  : 'text-[rgba(22,24,35,0.54)] hover:bg-white hover:text-[#161823]',
              ].join(' ')}
            >
              {active && (
                <span className="absolute inset-y-0 left-0 w-0.5 bg-[var(--yak-brand-color)]" />
              )}
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
    </nav>
  );
};

export default RightRail;
