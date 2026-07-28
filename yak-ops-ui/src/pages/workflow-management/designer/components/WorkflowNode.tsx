import { MoreHorizontal, Plus, RotateCw } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { WorkflowNodeData } from '../../types';
import { getNodeMeta } from '../constants';
import NodeIcon from './NodeIcon';

const statusLabelMap = {
  idle: '',
  running: '运行中',
  success: '成功',
  failed: '失败',
};

const WorkflowNode = ({ id, data, selected }: NodeProps<WorkflowNodeData>) => {
  const meta = getNodeMeta(data.nodeType);
  const isNote = data.nodeType === 'NOTE';
  const status = data.runningStatus || 'idle';

  if (isNote) {
    return (
      <div className={['dify-note-node', selected ? 'is-selected' : ''].join(' ')}>
        <div>
          <NodeIcon type="NOTE" size={16} />
          <strong>{data.title || '注释'}</strong>
        </div>
        <p>{String(data.config.content || data.description || '注释内容')}</p>
      </div>
    );
  }

  return (
    <div
      className={[
        'dify-workflow-node',
        selected ? 'is-selected' : '',
        data.enabled ? '' : 'is-disabled',
        status !== 'idle' ? `is-${status}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--node-color': meta.color } as CSSProperties}
    >
      {data.nodeType !== 'START' && (
        <Handle type="target" position={Position.Left} className="dify-workflow-node__handle" />
      )}

      <div className="dify-workflow-node__shell">
        <header>
          <div className="dify-workflow-node__identity">
            <NodeIcon type={data.nodeType} size={17} />
            <strong title={data.title}>{data.title || meta.title}</strong>
          </div>
          <button type="button" aria-label="节点操作">
            <MoreHorizontal size={15} />
          </button>
        </header>

        <div className="dify-workflow-node__body">
          <span>{meta.title}</span>
          <p>{data.description || meta.description}</p>
          {data.nodeType === 'LLM' && (
            <div className="dify-workflow-node__summary">
              {String(data.config.provider || 'OpenAI')} · {String(data.config.model || '模型未选择')}
            </div>
          )}
          {data.nodeType === 'HTTP' && (
            <div className="dify-workflow-node__summary">
              {String(data.config.method || 'GET')} · {String(data.config.url || '未配置 URL')}
            </div>
          )}
          {data.nodeType === 'CONDITION' && (
            <div className="dify-workflow-node__branches">
              <span>IF</span><span>ELSE</span>
            </div>
          )}
        </div>

        <footer>
          <span className={status !== 'idle' ? `is-${status}` : ''}>
            {status === 'running' && <RotateCw size={12} className="is-spinning" />}
            {statusLabelMap[status] || (data.enabled ? '已配置' : '已停用')}
          </span>
          {(data.retryTimes > 0 || data.timeoutSeconds > 0) && (
            <small>
              {data.retryTimes > 0 ? `重试 ${data.retryTimes}` : ''}
              {data.retryTimes > 0 && data.timeoutSeconds > 0 ? ' · ' : ''}
              {data.timeoutSeconds > 0 ? `${data.timeoutSeconds}s` : ''}
            </small>
          )}
        </footer>
      </div>

      {data.nodeType !== 'END' && (
        <>
          <Handle type="source" position={Position.Right} className="dify-workflow-node__handle" />
          <button
            type="button"
            className="dify-workflow-node__quick-add nodrag"
            aria-label="添加后续节点"
            onClick={(event) => {
              event.stopPropagation();
              window.dispatchEvent(
                new CustomEvent('yak-workflow-quick-add', { detail: { nodeId: id } }),
              );
            }}
          >
            <Plus size={12} />
          </button>
        </>
      )}
    </div>
  );
};

export default WorkflowNode;
