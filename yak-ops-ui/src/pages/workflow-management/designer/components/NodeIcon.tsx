import {
  Bot,
  Braces,
  CircleStop,
  Code2,
  FileText,
  GitBranch,
  Globe2,
  Layers3,
  ListTree,
  MessageSquareText,
  Play,
  Search,
  StickyNote,
  TerminalSquare,
  Variable,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import type { WorkflowNodeType } from '../../types';
import { getNodeMeta } from '../constants';

const iconMap = {
  START: Play,
  END: CircleStop,
  LLM: Bot,
  HTTP: Globe2,
  SHELL: TerminalSquare,
  CODE: Code2,
  CONDITION: GitBranch,
  TEMPLATE: FileText,
  VARIABLE: Variable,
  ITERATION: Layers3,
  KNOWLEDGE: Search,
  QUESTION_CLASSIFIER: ListTree,
  NOTE: StickyNote,
  NOOP: Braces,
};

interface NodeIconProps {
  type: WorkflowNodeType | string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const NodeIcon = ({ type, size = 17, className, style }: NodeIconProps) => {
  const meta = getNodeMeta(type);
  const Icon = iconMap[meta.type] || MessageSquareText;
  return (
    <span
      className={['workflow-node-icon', className].filter(Boolean).join(' ')}
      style={{ '--node-color': meta.color, ...style } as CSSProperties}
    >
      <Icon size={size} strokeWidth={1.9} />
    </span>
  );
};

export default NodeIcon;
