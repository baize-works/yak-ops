import { Globe2, Play, TerminalSquare } from 'lucide-react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { WorkflowNodeData } from '../../types';

const iconMap = {
  NOOP: Play,
  HTTP: Globe2,
  SHELL: TerminalSquare,
};

const typeLabelMap: Record<string, string> = {
  NOOP: '基础节点',
  HTTP: 'HTTP 请求',
  SHELL: 'Shell 脚本',
};

const WorkflowNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => {
  const Icon = iconMap[data.taskType as keyof typeof iconMap] || Play;

  return (
    <div
      className={[
        'workflow-canvas-node',
        selected ? 'is-selected' : '',
        data.enabled ? '' : 'is-disabled',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="workflow-canvas-node__handle"
      />

      <div className="workflow-canvas-node__header">
        <span className={`workflow-canvas-node__icon is-${data.taskType.toLowerCase()}`}>
          <Icon size={17} />
        </span>
        <div>
          <strong>{data.name || '未命名节点'}</strong>
          <span>{typeLabelMap[data.taskType] || data.taskType}</span>
        </div>
      </div>

      <p>{data.description || '点击节点，在右侧配置面板中完善节点信息。'}</p>

      <div className="workflow-canvas-node__footer">
        <span>{data.enabled ? '已启用' : '已停用'}</span>
        {data.timeoutSeconds > 0 && <span>{data.timeoutSeconds}s 超时</span>}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="workflow-canvas-node__handle"
      />
    </div>
  );
};

export default WorkflowNode;
