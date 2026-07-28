import { Globe2, Play, Plus, TerminalSquare } from 'lucide-react';
import type { WorkflowNodeType } from '../../types';

interface NodeSelectorProps {
  onAdd: (type: WorkflowNodeType) => void;
}

const nodeOptions = [
  {
    type: 'NOOP' as const,
    title: '基础节点',
    description: '用于开始、结束或占位步骤',
    icon: Play,
  },
  {
    type: 'HTTP' as const,
    title: 'HTTP 请求',
    description: '调用外部 REST API',
    icon: Globe2,
  },
  {
    type: 'SHELL' as const,
    title: 'Shell 脚本',
    description: '配置命令或脚本任务',
    icon: TerminalSquare,
  },
];

const NodeSelector = ({ onAdd }: NodeSelectorProps) => (
  <aside className="workflow-node-selector">
    <div className="workflow-node-selector__header">
      <div>
        <strong>节点</strong>
        <span>选择后添加到画布</span>
      </div>
      <Plus size={16} />
    </div>

    <div className="workflow-node-selector__list">
      {nodeOptions.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.type}
            type="button"
            className="workflow-node-selector__item"
            onClick={() => onAdd(option.type)}
          >
            <span className={`is-${option.type.toLowerCase()}`}>
              <Icon size={17} />
            </span>
            <div>
              <strong>{option.title}</strong>
              <small>{option.description}</small>
            </div>
            <Plus size={15} />
          </button>
        );
      })}
    </div>
  </aside>
);

export default NodeSelector;
