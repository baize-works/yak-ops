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
import type { WorkflowFlowNode, WorkflowNodeData } from '../../../types';
import { getNodeMeta } from '../../constants';
import NodeIcon from '../node/NodeIcon';
import {
  panelContentClass,
  panelFooterClass,
  panelHeaderClass,
  panelIconButtonClass,
  panelShellClass,
} from './shared';

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

const sectionClass = 'border-b border-[#f0f1f4] p-[15px]';
const titleClass = 'mb-3 text-[11px] font-semibold text-[#344054]';
const hintClass = '-mt-1.5 mb-3 text-[9px] leading-[15px] text-[#98a2b3]';

const Field = ({ label, hint, children }: FieldProps) => (
  <label
    className={[
      'mb-3 block',
      '[&_.ant-input]:w-full [&_.ant-input]:text-[11px]',
      '[&_.ant-input-number]:w-full [&_.ant-input-number]:text-[11px]',
      '[&_.ant-select]:w-full [&_.ant-select]:text-[11px]',
      '[&_.ant-input-affix-wrapper]:w-full [&_.ant-input-affix-wrapper]:text-[11px]',
    ].join(' ')}
  >
    <span className="mb-1.5 flex items-center gap-1 text-[9px] font-semibold text-[#667085]">
      {label}
      {hint && (
        <small title={hint} className="inline-flex text-[#98a2b3]">
          <Info size={12} />
        </small>
      )}
    </span>
    {children}
  </label>
);

const JsonEditor = ({
  value,
  onChange,
  rows = 8,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  rows?: number;
}) => (
  <Input.TextArea
    rows={rows}
    value={JSON.stringify(value, null, 2)}
    className="font-mono text-[10px] leading-[17px]"
    onChange={(event) => {
      try {
        onChange(JSON.parse(event.target.value));
      } catch {
        // Keep the last valid value while users are editing JSON.
      }
    }}
  />
);

const SwitchRow = ({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-2.5 border-t border-[#f2f4f7] py-2.5">
    <div>
      <strong className="block text-[10px] text-[#475467]">{title}</strong>
      <span className="mt-0.5 block text-[8px] text-[#98a2b3]">
        {description}
      </span>
    </div>
    <Switch checked={checked} onChange={onChange} />
  </div>
);

const NodePanel = ({
  node,
  onChange,
  onDelete,
  onDuplicate,
  onClose,
}: NodePanelProps) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const data = node.data;
  const meta = getNodeMeta(data.nodeType);

  const patch = (values: Partial<WorkflowNodeData>) => {
    onChange({ ...data, ...values });
  };

  const patchConfig = (key: string, value: unknown) => {
    patch({
      config: { ...data.config, [key]: value, __uiType: data.nodeType },
    });
  };

  const jsonConfig = useMemo(
    () =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(data.config).filter(([key]) => !key.startsWith('__')),
        ),
        null,
        2,
      ),
    [data.config],
  );

  const renderMainConfiguration = () => {
    switch (data.nodeType) {
      case 'START':
        return (
          <section className={sectionClass}>
            <h3 className={titleClass}>输入字段</h3>
            <p className={hintClass}>定义运行工作流时需要填写的变量。</p>
            <Field label="变量定义（JSON）">
              <JsonEditor
                value={data.config.inputVariables || []}
                onChange={(value) => patchConfig('inputVariables', value)}
              />
            </Field>
          </section>
        );
      case 'END':
        return (
          <section className={sectionClass}>
            <h3 className={titleClass}>输出变量</h3>
            <Field label="输出定义（JSON）">
              <JsonEditor
                value={data.config.outputs || []}
                onChange={(value) => patchConfig('outputs', value)}
              />
            </Field>
          </section>
        );
      case 'LLM':
        return (
          <>
            <section className={sectionClass}>
              <h3 className={titleClass}>模型</h3>
              <div className="mb-3 grid grid-cols-[34px_minmax(0,1fr)_18px] items-center gap-2 rounded-lg border border-[#e4e7ec] bg-[#fcfcfd] p-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1f0ff]">
                  <NodeIcon type="LLM" size={19} />
                </span>
                <div>
                  <strong className="block text-[10px] text-[#344054]">
                    {String(data.config.model || 'gpt-4o-mini')}
                  </strong>
                  <span className="block text-[9px] text-[#98a2b3]">
                    {String(data.config.provider || 'OpenAI')}
                  </span>
                </div>
                <ChevronDown size={15} className="text-[#98a2b3]" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="供应商">
                  <Select
                    value={String(data.config.provider || 'OpenAI')}
                    onChange={(value) => patchConfig('provider', value)}
                    options={[
                      'OpenAI',
                      'Azure OpenAI',
                      'Anthropic',
                      'DeepSeek',
                      'Ollama',
                    ].map((value) => ({ label: value, value }))}
                  />
                </Field>
                <Field label="模型">
                  <Select
                    value={String(data.config.model || 'gpt-4o-mini')}
                    onChange={(value) => patchConfig('model', value)}
                    options={[
                      'gpt-4o-mini',
                      'gpt-4o',
                      'claude-3-5-sonnet',
                      'deepseek-chat',
                    ].map((value) => ({ label: value, value }))}
                  />
                </Field>
              </div>
            </section>
            <section className={sectionClass}>
              <h3 className={titleClass}>提示词</h3>
              <Field label="系统提示词">
                <Input.TextArea
                  rows={5}
                  value={String(data.config.systemPrompt || '')}
                  onChange={(event) =>
                    patchConfig('systemPrompt', event.target.value)
                  }
                />
              </Field>
              <Field label="用户提示词">
                <Input.TextArea
                  rows={7}
                  value={String(data.config.prompt || '')}
                  onChange={(event) => patchConfig('prompt', event.target.value)}
                />
              </Field>
              <Field
                label={`温度 ${Number(data.config.temperature ?? 0.7).toFixed(1)}`}
              >
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
          <section className={sectionClass}>
            <h3 className={titleClass}>HTTP 请求</h3>
            <div className="mb-3 grid grid-cols-[92px_minmax(0,1fr)] gap-2">
              <Select
                value={String(data.config.method || 'GET')}
                onChange={(value) => patchConfig('method', value)}
                options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(
                  (value) => ({ label: value, value }),
                )}
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
                      onChange={(event) =>
                        patchConfig('body', event.target.value)
                      }
                    />
                  ),
                },
                {
                  key: 'headers',
                  label: 'Headers',
                  children: (
                    <JsonEditor
                      rows={7}
                      value={data.config.headers || {}}
                      onChange={(value) => patchConfig('headers', value)}
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
                onChange={(value) =>
                  patchConfig('requestTimeoutSeconds', value || 60)
                }
              />
            </Field>
          </section>
        );
      case 'SHELL':
        return (
          <section className={sectionClass}>
            <h3 className={titleClass}>Shell 配置</h3>
            <Field label="执行命令">
              <Input.TextArea
                rows={9}
                className="font-mono text-[10px] leading-[17px] !bg-[#101828] !text-[#e4e7ec]"
                value={String(data.config.command || '')}
                placeholder="echo 'hello yak ops'"
                onChange={(event) => patchConfig('command', event.target.value)}
              />
            </Field>
            <Field label="工作目录">
              <Input
                value={String(data.config.workDirectory || '')}
                placeholder="/opt/yak/jobs"
                onChange={(event) =>
                  patchConfig('workDirectory', event.target.value)
                }
              />
            </Field>
          </section>
        );
      case 'CODE':
        return (
          <section className={sectionClass}>
            <h3 className={titleClass}>代码</h3>
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
                className="font-mono text-[10px] leading-[17px] !bg-[#101828] !text-[#e4e7ec]"
                value={String(data.config.code || '')}
                onChange={(event) => patchConfig('code', event.target.value)}
              />
            </Field>
          </section>
        );
      case 'CONDITION':
        return (
          <section className={sectionClass}>
            <h3 className={titleClass}>条件</h3>
            <div className="mb-2.5 flex items-center gap-1.5 text-[10px] text-[#667085]">
              <Tag color="blue">IF</Tag>
              满足以下表达式
            </div>
            <Field label="表达式">
              <Input.TextArea
                rows={4}
                value={String(data.config.expression || '')}
                placeholder="{{http.statusCode}} == 200"
                onChange={(event) =>
                  patchConfig('expression', event.target.value)
                }
              />
            </Field>
            <Field label="分支名称（每行一个）">
              <Input.TextArea
                rows={4}
                value={
                  Array.isArray(data.config.cases)
                    ? data.config.cases.join('\n')
                    : ''
                }
                onChange={(event) =>
                  patchConfig(
                    'cases',
                    event.target.value.split('\n').filter(Boolean),
                  )
                }
              />
            </Field>
          </section>
        );
      case 'TEMPLATE':
        return (
          <section className={sectionClass}>
            <h3 className={titleClass}>模板</h3>
            <Field label="Jinja2 风格模板">
              <Input.TextArea
                rows={14}
                className="font-mono text-[10px] leading-[17px]"
                value={String(data.config.template || '')}
                onChange={(event) =>
                  patchConfig('template', event.target.value)
                }
              />
            </Field>
          </section>
        );
      case 'VARIABLE':
        return (
          <section className={sectionClass}>
            <h3 className={titleClass}>变量赋值</h3>
            <Field label="赋值配置（JSON）">
              <JsonEditor
                rows={12}
                value={data.config.assignments || []}
                onChange={(value) => patchConfig('assignments', value)}
              />
            </Field>
          </section>
        );
      case 'ITERATION':
        return (
          <section className={sectionClass}>
            <h3 className={titleClass}>迭代设置</h3>
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
          <section className={sectionClass}>
            <h3 className={titleClass}>知识检索</h3>
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
            <div className="grid grid-cols-2 gap-2.5">
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
                  onChange={(value) =>
                    patchConfig('scoreThreshold', value || 0)
                  }
                />
              </Field>
            </div>
          </section>
        );
      case 'QUESTION_CLASSIFIER':
        return (
          <section className={sectionClass}>
            <h3 className={titleClass}>问题分类</h3>
            <Field label="输入变量">
              <Input
                value={String(data.config.input || '')}
                onChange={(event) => patchConfig('input', event.target.value)}
              />
            </Field>
            <Field label="分类（每行一个）">
              <Input.TextArea
                rows={8}
                value={
                  Array.isArray(data.config.classes)
                    ? data.config.classes.join('\n')
                    : ''
                }
                onChange={(event) =>
                  patchConfig(
                    'classes',
                    event.target.value.split('\n').filter(Boolean),
                  )
                }
              />
            </Field>
          </section>
        );
      case 'NOTE':
        return (
          <section className={sectionClass}>
            <h3 className={titleClass}>注释</h3>
            <Field label="内容">
              <Input.TextArea
                rows={12}
                value={String(data.config.content || '')}
                onChange={(event) =>
                  patchConfig('content', event.target.value)
                }
              />
            </Field>
          </section>
        );
      default:
        return (
          <section className={sectionClass}>
            <h3 className={titleClass}>节点配置</h3>
            <p className={hintClass}>
              当前节点没有专属表单，可在高级配置中编辑 JSON。
            </p>
          </section>
        );
    }
  };

  return (
    <aside className={panelShellClass}>
      <header className={panelHeaderClass}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--node-color)_10%,white)]">
            <NodeIcon type={data.nodeType} size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <input
              value={data.title}
              maxLength={255}
              onChange={(event) => patch({ title: event.target.value })}
              className="w-full border-0 bg-transparent p-0 text-[13px] font-semibold text-[#344054] outline-none"
            />
            <span className="block text-[9px] text-[#98a2b3]">
              {meta.title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-px">
          <button
            type="button"
            className={panelIconButtonClass}
            aria-label="复制节点"
            onClick={onDuplicate}
          >
            <Copy size={16} />
          </button>
          <button
            type="button"
            className={panelIconButtonClass}
            aria-label="更多操作"
          >
            <MoreHorizontal size={16} />
          </button>
          <button
            type="button"
            className={panelIconButtonClass}
            aria-label="关闭"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>
      </header>

      <div className={panelContentClass}>
        <section className="border-b border-[#f0f1f4] px-[15px] py-2.5">
          <Input.TextArea
            value={data.description}
            rows={2}
            maxLength={500}
            placeholder="添加描述..."
            className="resize-none !border-0 !bg-[#f8f9fb] !shadow-none"
            onChange={(event) => patch({ description: event.target.value })}
          />
        </section>

        {renderMainConfiguration()}

        <section className={sectionClass}>
          <button
            type="button"
            className="flex w-full items-center justify-between border-0 bg-transparent p-0 text-[11px] font-semibold text-[#475467]"
            onClick={() => setAdvancedOpen((value) => !value)}
          >
            <span>错误处理与高级设置</span>
            <ChevronDown
              size={15}
              className={[
                'transition-transform duration-200',
                advancedOpen ? 'rotate-180' : '',
              ].join(' ')}
            />
          </button>
          {advancedOpen && (
            <div className="mt-3.5">
              <div className="grid grid-cols-2 gap-2.5">
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
                    onChange={(value) =>
                      patch({ retryIntervalSeconds: value || 0 })
                    }
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
              <SwitchRow
                title="启用节点"
                description="停用后保留配置但不参与流程"
                checked={data.enabled}
                onChange={(value) => patch({ enabled: value })}
              />
              <SwitchRow
                title="幂等任务"
                description="允许安全重复提交"
                checked={data.idempotent}
                onChange={(value) => patch({ idempotent: value })}
              />
              <SwitchRow
                title="重启后重试"
                description="服务恢复后继续尝试"
                checked={data.retryOnRestart}
                onChange={(value) => patch({ retryOnRestart: value })}
              />
              <Field label="原始配置 JSON">
                <Input.TextArea
                  rows={10}
                  className="font-mono text-[10px] leading-[17px] !bg-[#101828] !text-[#e4e7ec]"
                  value={jsonConfig}
                  onChange={(event) => {
                    try {
                      const next = JSON.parse(event.target.value);
                      patch({
                        config: { ...next, __uiType: data.nodeType },
                      });
                    } catch {
                      // Keep the last valid state while editing.
                    }
                  }}
                />
              </Field>
            </div>
          )}
        </section>
      </div>

      <footer className={panelFooterClass}>
        <button
          type="button"
          className="inline-flex h-[29px] items-center gap-1.5 rounded-md border border-[#fecdca] bg-[#fff5f4] px-2.5 text-[9px] text-[#b42318]"
          onClick={onDelete}
        >
          <Trash2 size={16} /> 删除节点
        </button>
        <span className="text-[8px] text-[#98a2b3]">节点 ID：{node.id}</span>
      </footer>
    </aside>
  );
};

export default NodePanel;
