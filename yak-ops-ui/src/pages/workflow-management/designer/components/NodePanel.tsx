import {
  Input,
  InputNumber,
  Select,
  Switch,
} from 'antd';
import { Trash2, X } from 'lucide-react';
import type { WorkflowFlowNode, WorkflowNodeData } from '../../types';

interface NodePanelProps {
  node: WorkflowFlowNode;
  onChange: (data: WorkflowNodeData) => void;
  onDelete: () => void;
  onClose: () => void;
}

const taskTypeLabelMap: Record<string, string> = {
  NOOP: '基础节点',
  HTTP: 'HTTP 请求',
  SHELL: 'Shell 脚本',
};

const NodePanel = ({
  node,
  onChange,
  onDelete,
  onClose,
}: NodePanelProps) => {
  const data = node.data;

  const patch = (values: Partial<WorkflowNodeData>) => {
    onChange({ ...data, ...values });
  };

  const patchConfig = (key: string, value: unknown) => {
    patch({
      config: {
        ...data.config,
        [key]: value,
      },
    });
  };

  return (
    <aside className="workflow-node-panel">
      <header className="workflow-node-panel__header">
        <div>
          <span>NODE PANEL</span>
          <strong>{data.name || '未命名节点'}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭节点面板">
          <X size={17} />
        </button>
      </header>

      <div className="workflow-node-panel__content">
        <section className="workflow-node-panel__section">
          <h3>基础信息</h3>
          <label>
            <span>节点名称</span>
            <Input
              value={data.name}
              maxLength={255}
              onChange={(event) => patch({ name: event.target.value })}
            />
          </label>
          <label>
            <span>节点类型</span>
            <Input value={taskTypeLabelMap[data.taskType] || data.taskType} disabled />
          </label>
          <label>
            <span>节点描述</span>
            <Input.TextArea
              value={data.description}
              rows={3}
              maxLength={500}
              placeholder="说明这个节点在流程中的职责"
              onChange={(event) => patch({ description: event.target.value })}
            />
          </label>
        </section>

        {data.taskType === 'HTTP' && (
          <section className="workflow-node-panel__section">
            <h3>HTTP 配置</h3>
            <label>
              <span>请求方法</span>
              <Select
                value={String(data.config.method || 'GET')}
                onChange={(value) => patchConfig('method', value)}
                options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(
                  (value) => ({ label: value, value }),
                )}
              />
            </label>
            <label>
              <span>请求地址</span>
              <Input
                value={String(data.config.url || '')}
                placeholder="https://api.example.com/tasks"
                onChange={(event) => patchConfig('url', event.target.value)}
              />
            </label>
            <label>
              <span>请求体</span>
              <Input.TextArea
                value={String(data.config.body || '')}
                rows={5}
                placeholder='{"name":"yak"}'
                onChange={(event) => patchConfig('body', event.target.value)}
              />
            </label>
            <label>
              <span>请求超时（秒）</span>
              <InputNumber
                min={1}
                max={3600}
                value={Number(data.config.requestTimeoutSeconds || 60)}
                onChange={(value) =>
                  patchConfig('requestTimeoutSeconds', value || 60)
                }
              />
            </label>
          </section>
        )}

        {data.taskType === 'SHELL' && (
          <section className="workflow-node-panel__section">
            <h3>Shell 配置</h3>
            <label>
              <span>执行命令</span>
              <Input.TextArea
                value={String(data.config.command || '')}
                rows={5}
                placeholder="echo 'hello yak ops'"
                onChange={(event) => patchConfig('command', event.target.value)}
              />
            </label>
            <label>
              <span>工作目录</span>
              <Input
                value={String(data.config.workDirectory || '')}
                placeholder="可选，例如 /opt/yak/jobs"
                onChange={(event) =>
                  patchConfig('workDirectory', event.target.value)
                }
              />
            </label>
          </section>
        )}

        <section className="workflow-node-panel__section">
          <h3>容错设置</h3>
          <div className="workflow-node-panel__grid">
            <label>
              <span>重试次数</span>
              <InputNumber
                min={0}
                max={20}
                value={data.retryTimes}
                onChange={(value) => patch({ retryTimes: value || 0 })}
              />
            </label>
            <label>
              <span>重试间隔（秒）</span>
              <InputNumber
                min={0}
                max={86400}
                value={data.retryIntervalSeconds}
                onChange={(value) =>
                  patch({ retryIntervalSeconds: value || 0 })
                }
              />
            </label>
          </div>
          <label>
            <span>节点超时（秒）</span>
            <InputNumber
              min={0}
              max={86400}
              value={data.timeoutSeconds}
              onChange={(value) => patch({ timeoutSeconds: value || 0 })}
            />
          </label>
          <div className="workflow-node-panel__switch-row">
            <div>
              <strong>启用节点</strong>
              <span>停用后仍保留节点配置</span>
            </div>
            <Switch
              checked={data.enabled}
              onChange={(checked) => patch({ enabled: checked })}
            />
          </div>
          <div className="workflow-node-panel__switch-row">
            <div>
              <strong>幂等任务</strong>
              <span>允许安全重复提交</span>
            </div>
            <Switch
              checked={data.idempotent}
              onChange={(checked) => patch({ idempotent: checked })}
            />
          </div>
          <div className="workflow-node-panel__switch-row">
            <div>
              <strong>重启后重试</strong>
              <span>服务重启后继续尝试该节点</span>
            </div>
            <Switch
              checked={data.retryOnRestart}
              onChange={(checked) => patch({ retryOnRestart: checked })}
            />
          </div>
        </section>
      </div>

      <footer className="workflow-node-panel__footer">
        <button type="button" onClick={onDelete}>
          <Trash2 size={16} />
          删除节点
        </button>
      </footer>
    </aside>
  );
};

export default NodePanel;
