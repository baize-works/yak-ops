import type { ComponentType, SVGProps } from 'react';
import SyncNodeIcon from './SyncNodeIcon';

interface WorkflowNodeIconProps {
  taskType?: string;
}

interface NodeIconMeta {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  className: string;
}

const DefaultNodeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <rect x="5" y="5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <rect x="14" y="14" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M10 7.5h3.5a3 3 0 0 1 3 3V14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const DEFAULT_ICON_META: NodeIconMeta = {
  icon: DefaultNodeIcon,
  className: 'bg-[#f4f4f5] text-[#52525b]',
};

const NODE_ICON_META: Record<string, NodeIconMeta> = {
  SYNC: {
    icon: SyncNodeIcon,
    className: 'bg-[#f4f4f5] text-[#52525b]',
  },
};

const WorkflowNodeIcon = ({ taskType }: WorkflowNodeIconProps) => {
  const meta = NODE_ICON_META[(taskType || '').toUpperCase()] || DEFAULT_ICON_META;
  const Icon = meta.icon;

  return (
    <span
      className={[
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
        meta.className,
      ].join(' ')}
    >
      <Icon className="h-[19px] w-[19px]" />
    </span>
  );
};

export default WorkflowNodeIcon;
