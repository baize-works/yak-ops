import {
  Input,
  InputNumber,
  Select,
  Slider,
  Switch,
  Tabs,
  Tag,
} from 'antd';
import {
  ChevronDown,
  Copy,
  Info,
  MoreHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import type { WorkflowFlowNode, WorkflowNodeData } from '../../types';
import { getNodeMeta } from '../constants';
import NodeIcon from './NodeIcon';

interface NodePanelProps {
  node: WorkflowFlowNode;
  onChange: (data: WorkflowNodeData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
}

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

const Field = ({ label, hint, children }: FieldProps) => (
  <label className="dify-node-panel__field">
    <span>
      {label}
      {hint && <small title={hint}><Info size={12} /></small>}
    </span>
    {children}
  </label>
);

const NodePanel = ({ node, onChange, onDelete, onDuplicate, onClose }: NodePanelProps) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const data = node.data;
  const meta = getNodeMeta(data.nodeType);

  const patch = (values: Partial<WorkflowNodeData>) => {
    onChange({ ...data, ...values });
  };

  const patchConfig = (key: string, value: unknown) => {
    patch({ config: { ...data.config, [key]: value, __uiType: data.nodeType } });
  };

  const jsonConfig = useMemo(
    () => JSON.stringify(
      Object.fromEntries(Object.entries(data.config).filter(([key]) => !key.startsWith('__'))),
      null,
      2,
    ),
    [data.config],
  );

  const renderMainConfiguration = () => {
    switch (data.nodeType) {
      case 'START':
        return (
          <section className="dify-node-panel__section">
            <h3>输入字段</h3>
            <p className="dify-node-panel__section-hint">定义运行工作流时需要填写的变量。</p>
            <Field label="变量定义（JSON）">
              <Input.TextArea
                rows={8}
                value={JSON.stringify(data.config.inputVariables || [], null, 2)}
                onChange={(event) => {
                  try { patchConfig('inputVariables', JSON.parse(event.target.value)); } catch { /* editing */ }
                }}
              />
            </Field>
          </section>
        );
      case 'END':
        return (
          <section className="dify-node-panel__section">
            <h3>输出变量</h3>
            <Field label="输出定义（JSON）">
              <Input.TextArea
                rows={8}
                value={JSON.stringify(data.config.outputs || [], null, 2)}
                onChange={(event) => {
                  try { patchConfig('outputs', JSON.parse(event.target.value)); } catch { /* editing */ }
                }}
              />
            </Field>
          </section>
        );
      case 'LLM':
        return (
          <>
            <section className="dify-node-panel__section">
              <h3>模型</h3>
              <div className="dify-node-panel__model-card">
                <NodeIcon type="LLM" size={19} />
                <div>
                  <strong>{String(data.config.model || 'gpt-4o-mini')}</strong>
                  <span>{String(data.config.provider || 'OpenAI')}</span>
                </div>
                <ChevronDown size={15} />
              </div>
              <div className="dify-node-panel__grid">
                <Field label="供应商">
                  <Select
                    value={String(data.config.provider || 'OpenAI')}
                    onChange={(value) => patchConfig('provider', value)}
                    options={['OpenAI', 'Azure OpenAI', 'Anthropic', 'DeepSeek', 'Ollama'].map(
                      (value) => ({ label: value, value }),
                    )}
                  />
                </Field>
                <Field label="模型">
                  <Select
                    value={String(data.config.model || 'gpt-4o-mini')}
                    onChange={(value) => patchConfig('model', value)}
                    options={['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet', 'deepseek-chat'].map(
                      (value) => ({ label: value, value }),
                    )}
                  />
                </Field>
              </div>
            </section>
            <section className="dify-node-panel__section">
              <h3>提示词</h3>
              <Field label="系统提示词">
                <Input.TextArea
                  rows={5}
                  value={String(data.config.systemPrompt || '')}
                  onChange={(event) => patchConfig('systemPrompt', event.target.value)}
                />
              </Field>
              <Field label="用户提示词">
                <Input.TextArea
                  rows={7}
                  value={String(data.config.prompt || '')}
                  onChange={(event) => patchConfig('prompt', event.target.value)}
                />
              </Field>
              <Field label={`温度 ${Number(data.config.temperature ?? 0.7).toFixed(1)}`}>
                <Slider
                  min={0}
                  max={2}
                  step={0.1}
                  value={Number(data.config.temperature ?? 0.7)}
                  onChange={(value) => patchConfig('temperature', value)}
                />
              </Field>
            </section>
          </>
        );
      case 'HTTP':
        return (
          <section className="dify-node-panel__section">
            <h3>HTTP 请求</h3>
            <div className="dify-node-panel__http-row">
              <Select
                value={String(data.config.method || 'GET')}
                onChange={(value) => patchConfig('method', value)}
                options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((value) => ({ label: value, value }))}
              />
              <Input
                value={String(data.config.url || '')}
                placeholder="https://api.example.com"
                onChange={(event) => patchConfig('url', event.target.value)}
              />
            </div>
            <Tabs
              size="small"
              items={[
                {
                  key: 'body',
                  label: 'Body',
                  children: (
                    <Input.TextArea
                      rows={7}
                      value={String(data.config.body || '')}
                      placeholder='{"query":"{{start.query}}"}'
                      onChange={(event) => patchConfig('body', event.target.value)}
                    />
                  ),
                },
                {
                  key: 'headers',
                  label: 'Headers',
                  children: (
                    <Input.TextArea
                      rows={7}
                      value={JSON.stringify(data.config.headers || {}, null, 2)}
                      onChange={(event) => {
                        try { patchConfig('headers', JSON.parse(event.target.value)); } catch { /* editing */ }
                      }}
                    />
                  ),
                },
              ]}
            />
            <Field label="请求超时（秒）">
              <InputNumber
                min={1}
                max={3600}
                value={Number(data.config.requestTimeoutSeconds || 60)}
                onChange={(value) => patchConfig('requestTimeoutSeconds', value || 60)}
              />
            </Field>
          </section>
        );
      case 'SHELL':
        return (
          <section className="dify-node-panel__section">
            <h3>Shell 配置</h3>
            <Field label="执行命令">
              <Input.TextArea
                rows={9}
                className="is-code"
                value={String(data.config.command || '')}
                placeholder="echo 'hello yak ops'"
                onChange={(event) => patchConfig('command', event.target.value)}
              />
            </Field>
            <Field label="工作目录">
              <Input
                value={String(data.config.workDirectory || '')}
                placeholder="/opt/yak/jobs"
                onChange={(event) => patchConfig('workDirectory', event.target.value)}
              />
            </Field>
          </section>
        );
      case 'CODE':
        return (
          <section className="dify-node-panel__section">
            <h3>代码</h3>
            <Field label="语言">
              <Select
                value={String(data.config.language || 'javascript')}
                onChange={(value) => patchConfig('language', value)}
                options={[
                  { label: 'JavaScript', value: 'javascript' },
                  { label: 'Python', value: 'python' },
                ]}
              />
            </Field>
            <Field label="代码内容">
              <Input.TextArea
                rows={14}
                className="is-code"
                value={String(data.config.code || '')}
                onChange={(event) => patchConfig('code', event.target.value)}
              />
            </Field>
          </section>
        );
      case 'CONDITION':
        return (
          <section className="dify-node-panel__section">
            <h3>条件</h3>
            <div className="dify-node-panel__condition-title">
              <Tag color="blue">IF</Tag>
              满足以下表达式
            </div>
            <Field label="表达式">
              <Input.TextArea
                rows={4}
                value={String(data.config.expression || '')}
                placeholder="{{http.statusCode}} == 200"
                onChange={(event) => patchConfig('expression', event.target.value)}
              />
            </Field>
            <Field label="分支名称（每行一个）">
              <Input.TextArea
                rows={4}
                value={Array.isArray(data.config.cases) ? data.config.cases.join('\n') : ''}
                onChange={(event) => patchConfig('cases', event.target.value.split('\n').filter(Boolean))}
              />
            </Field>
          </section>
        );
      case 'TEMPLATE':
        return (
          <section className="dify-node-panel__section">
            <h3>模板</h3>
            <Field label="Jinja2 风格模板">
              <Input.TextArea
                rows={14}
                className="is-code"
                value={String(data.config.template || '')}
                onChange={(event) => patchConfig('template', event.target.value)}
              />
            </Field>
          </section>
        );
      case 'VARIABLE':
        return (
          <section className="dify-node-panel__section">
            <h3>变量赋值</h3>
            <Field label="赋值配置（JSON）">
              <Input.TextArea
                rows={12}
                value={JSON.stringify(data.config.assignments || [], null, 2)}
                onChange={(event) => {
                  try { patchConfig('assignments', JSON.parse(event.target.value)); } catch { /* editing */ }
                }}
              />
            </Field>
          </section>
        );
      case 'ITERATION':
        return (
          <section className="dify-node-panel__section">
            <h3>迭代设置</h3>
            <Field label="迭代数组">
              <Input
                value={String(data.config.source || '')}
                placeholder="{{start.items}}"
                onChange={(event) => patchConfig('source', event.target.value)}
              />
            </Field>
            <Field label="并行数">
              <InputNumber
                min={1}
                max={20}
                value={Number(data.config.parallel || 1)}
                onChange={(value) => patchConfig('parallel', value || 1)}
              />
            </Field>
            <Field label="输出变量">
              <Input
                value={String(data.config.output || 'results')}
                onChange={(event) => patchConfig('output', event.target.value)}
              />
            </Field>
          </section>
        );
      case 'KNOWLEDGE':
        return (
          <section className="dify-node-panel__section">
            <h3>知识检索</h3>
            <Field label="知识库">
              <Select
                value={String(data.config.dataset || '') || undefined}
                placeholder="选择知识库"
                onChange={(value) => patchConfig('dataset', value)}
                options={[
                  { label: '产品知识库', value: 'product' },
                  { label: '技术文档库', value: 'technical' },
                  { label: '客户案例库', value: 'cases' },
                ]}
              />
            </Field>
            <Field label="查询变量">
              <Input
                value={String(data.config.query || '')}
                onChange={(event) => patchConfig('query', event.target.value)}
              />
            </Field>
            <div className="dify-node-panel__grid">
              <Field label="Top K">
                <InputNumber
                  min={1}
                  max={20}
                  value={Number(data.config.topK || 3)}
                  onChange={(value) => patchConfig('topK', value || 3)}
                />
              </Field>
              <Field label="分数阈值">
                <InputNumber
                  min={0}
                  max={1}
                  step={0.05}
                  value={Number(data.config.scoreThreshold || 0.5)}
                  onChange={(value) => patchConfig('scoreThreshold', value || 0)}
                />
              </Field>
            </div>
          </section>
        );
      case 'QUESTION_CLASSIFIER':
        return (
          <section className="dify-node-panel__section">
            <h3>问题分类</h3>
            <Field label="输入变量">
              <Input
                value={String(data.config.input || '')}
                onChange={(event) => patchConfig('input', event.target.value)}
              />
            </Field>
            <Field label="分类（每行一个）">
              <Input.TextArea
                rows={8}
                value={Array.isArray(data.config.classes) ? data.config.classes.join('\n') : ''}
                onChange={(event) => patchConfig('classes', event.target.value.split('\n').filter(Boolean))}
              />
            </Field>
          </section>
        );
      case 'NOTE':
        return (
          <section className="dify-node-panel__section">
            <h3>注释</h3>
            <Field label="内容">
              <Input.TextArea
                rows={12}
                value={String(data.config.content || '')}
                onChange={(event) => patchConfig('content', event.target.value)}
              />
            </Field>
          </section>
        );
      default:
        return (
          <section className="dify-node-panel__section">
            <h3>节点配置</h3>
            <p className="dify-node-panel__section-hint">当前节点没有专属表单，可在高级配置中编辑 JSON。</p>
          </section>
        );
    }
  };

  return (
    <aside className="dify-node-panel">
      <header className="dify-node-panel__header">
        <div className="dify-node-panel__title">
          <NodeIcon type={data.nodeType} size={19} />
          <div>
            <input
              value={data.title}
              maxLength={255}
              onChange={(event) => patch({ title: event.target.value })}
            />
            <span>{meta.title}</span>
          </div>
        </div>
        <div className="dify-node-panel__header-actions">
          <button type="button" aria-label="复制节点" onClick={onDuplicate}><Copy size={16} /></button>
          <button type="button" aria-label="更多操作"><MoreHorizontal size={16} /></button>
          <button type="button" aria-label="关闭" onClick={onClose}><X size={17} /></button>
        </div>
      </header>

      <div className="dify-node-panel__content">
        <section className="dify-node-panel__section is-description">
          <Input.TextArea
            value={data.description}
            rows={2}
            maxLength={500}
            placeholder="添加描述..."
            onChange={(event) => patch({ description: event.target.value })}
          />
        </section>

        {renderMainConfiguration()}

        <section className="dify-node-panel__section is-collapsible">
          <button type="button" onClick={() => setAdvancedOpen((value) => !value)}>
            <span>错误处理与高级设置</span>
            <ChevronDown size={15} className={advancedOpen ? 'is-open' : ''} />
          </button>
          {advancedOpen && (
            <div className="dify-node-panel__advanced">
              <div className="dify-node-panel__grid">
                <Field label="重试次数">
                  <InputNumber
                    min={0}
                    max={20}
                    value={data.retryTimes}
                    onChange={(value) => patch({ retryTimes: value || 0 })}
                  />
                </Field>
                <Field label="重试间隔（秒）">
                  <InputNumber
                    min={0}
                    max={86400}
                    value={data.retryIntervalSeconds}
                    onChange={(value) => patch({ retryIntervalSeconds: value || 0 })}
                  />
                </Field>
              </div>
              <Field label="节点超时（秒）">
                <InputNumber
                  min={0}
                  max={86400}
                  value={data.timeoutSeconds}
                  onChange={(value) => patch({ timeoutSeconds: value || 0 })}
                />
              </Field>
              <div className="dify-node-panel__switch-row">
                <div><strong>启用节点</strong><span>停用后保留配置但不参与流程</span></div>
                <Switch checked={data.enabled} onChange={(value) => patch({ enabled: value })} />
              </div>
              <div className="dify-node-panel__switch-row">
                <div><strong>幂等任务</strong><span>允许安全重复提交</span></div>
                <Switch checked={data.idempotent} onChange={(value) => patch({ idempotent: value })} />
              </div>
              <div className="dify-node-panel__switch-row">
                <div><strong>重启后重试</strong><span>服务恢复后继续尝试</span></div>
                <Switch
                  checked={data.retryOnRestart}
                  onChange={(value) => patch({ retryOnRestart: value })}
                />
              </div>
              <Field label="原始配置 JSON">
                <Input.TextArea
                  rows={10}
                  className="is-code"
                  value={jsonConfig}
                  onChange={(event) => {
                    try {
                      const next = JSON.parse(event.target.value);
                      patch({ config: { ...next, __uiType: data.nodeType } });
                    } catch { /* keep last valid state while editing */ }
                  }}
                />
              </Field>
            </div>
          )}
        </section>
      </div>

      <footer className="dify-node-panel__footer">
        <button type="button" onClick={onDelete}><Trash2 size={16} /> 删除节点</button>
        <span>节点 ID：{node.id}</span>
      </footer>
    </aside>
  );
};

export default NodePanel;
