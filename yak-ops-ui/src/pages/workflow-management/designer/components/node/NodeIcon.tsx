import {
  CircleHelp,
  CircleStop,
  Globe2,
  Play,
  TerminalSquare,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import type { WorkflowNodeType } from '../../../types';
import { getNodeMeta } from '../../constants';

const iconMap = {
  START: Play,
  END: CircleStop,
  HTTP: Globe2,
  SHELL: TerminalSquare,
};

interface NodeIconProps {
  type: WorkflowNodeType | string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const NodeIcon = ({ type, size = 17, className, style }: NodeIconProps) => {
  const meta = getNodeMeta(type);
  const Icon = iconMap[type as keyof typeof iconMap] || CircleHelp;

  return (
    <span
      className={['inline-flex text-[var(--node-color)]', className]
        .filter(Boolean)
        .join(' ')}
      style={{ '--node-color': meta.color, ...style } as CSSProperties}
    >
      <Icon size={size} strokeWidth={1.9} />
    </span>
  );
};

export default NodeIcon;
