import { getWorkflowInstances } from '@/services/workflow';
import { Input, Modal, Select, Switch, message } from 'antd';
import dayjs from 'dayjs';
import { GitBranch, Plus, RefreshCw, Trash2, Variable, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import WorkflowNextStep from '../WorkflowNextStep';
import type { WorkflowCanvasTaskOption } from '../types';
import type {
  WorkflowStartConfig,
  WorkflowStartInputField,
  WorkflowStartValueType,
  WorkflowStartVariable,
} from './types';

interface WorkflowStartNextNode {
  id: string;
  label: string;
  taskType: string;
}

interface WorkflowStartInspectorProps {
  definitionId: string;
  workflowName: string;
  config: WorkflowStartConfig;
  locked: boolean;
  nextNodes: WorkflowStartNextNode[];
  appendOptions: WorkflowCanvasTaskOption[];
  onChange: (config: WorkflowStartConfig) => void;
  onClose: () => void;
  onAppend: (taskId: string) => void;
}

type TabKey = 'settings' | 'lastRun';
type EditorKind = 'input' | 'variable';

interface EditorDraft {
  id?: string;
  name: string;
  label: string;
  type: WorkflowStartValueType;
  required: boolean;
  description: string;
  value: unknown;
}

const INPUT_TYPE_OPTIONS = [
  { value: 'STRING', label: 'String' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'FILE', label: 'File' },
  { value: 'ARRAY_STRING', label: 'Array[String]' },
];

const VARIABLE_TYPE_OPTIONS = INPUT_TYPE_OPTIONS.filter((item) => item.value !== 'FILE');
const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const newDraft = (): EditorDraft => ({
  name: '',
  label: '',
  type: 'STRING',
  required: false,
  description: '',
  value: '',
});

const valuePreview = (value: unknown) => {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === undefined || value === null || value === '') return '--';
  return String(value);
};

const ValueEditor = ({
  type,
  value,
  onChange,
}: {
  type: WorkflowStartValueType;
  value: unknown;
  onChange: (value: unknown) => void;
}) => {
  if (type === 'BOOLEAN') {
    return <Switch checked={Boolean(value)} onChange={onChange} />;
  }
  if (type === 'FILE') {
    return <div className="text-[11px] leading-5 text-[#98a2b3]">File 类型由工作流运行时提供，不配置默认值。</div>;
  }

  return (
    <Input
      value={Array.isArray(value) ? value.join(', ') : String(value ?? '')}
      placeholder={type === 'ARRAY_STRING' ? '多个值用英文逗号分隔' : '默认值'}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};

const Divider = () => <div className="mx-4 border-t border-[#f0f1f3]" />;

const WorkflowStartInspector = ({
  definitionId,
  workflowName,
  config,
  locked,
  nextNodes,
  appendOptions,
  onChange,
  onClose,
  onAppend,
}: WorkflowStartInspectorProps) => {
  const [tab, setTab] = useState<TabKey>('settings');
  const [editorKind, setEditorKind] = useState<EditorKind>();
  const [draft, setDraft] = useState<EditorDraft>(newDraft());
  const [lastRunLoading, setLastRunLoading] = useState(false);
  const [lastRun, setLastRun] = useState<Awaited<ReturnType<typeof getWorkflowInstances>>[number]>();

  const loadLastRun = useCallback(async () => {
    setLastRunLoading(true);
    try {
      const instances = (await getWorkflowInstances()) || [];
      const latest = instances
        .filter((item) => item.definitionId === definitionId)
        .sort((left, right) => dayjs(right.startedAt).valueOf() - dayjs(left.startedAt).valueOf())[0];
      setLastRun(latest);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '上次运行加载失败');
    } finally {
      setLastRunLoading(false);
    }
  }, [definitionId]);

  useEffect(() => {
    if (tab === 'lastRun') void loadLastRun();
  }, [loadLastRun, tab]);

  const openInputEditor = (field?: WorkflowStartInputField) => {
    setEditorKind('input');
    setDraft(field ? {
      id: field.id,
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
      description: field.description || '',
      value: field.defaultValue,
    } : newDraft());
  };

  const openVariableEditor = (variable?: WorkflowStartVariable) => {
    setEditorKind('variable');
    setDraft(variable ? {
      id: variable.id,
      name: variable.name,
      label: variable.name,
      type: variable.type,
      required: false,
      description: '',
      value: variable.value,
    } : newDraft());
  };

  const closeEditor = () => {
    setEditorKind(undefined);
    setDraft(newDraft());
  };

  const saveEditor = () => {
    const name = draft.name.trim();
    if (!NAME_PATTERN.test(name)) {
      message.warning('变量名需以字母或下划线开头，只能包含字母、数字和下划线');
      return;
    }

    const duplicate = editorKind === 'input'
      ? config.inputs.some((item) => item.name === name && item.id !== draft.id)
      : config.variables.some((item) => item.name === name && item.id !== draft.id);
    if (duplicate) {
      message.warning(`变量 ${name} 已存在`);
      return;
    }

    if (editorKind === 'input') {
      const item: WorkflowStartInputField = {
        id: draft.id || `input-${Date.now()}`,
        name,
        label: draft.label.trim() || name,
        type: draft.type,
        required: draft.required,
        description: draft.description.trim() || undefined,
        defaultValue: draft.type === 'FILE' ? undefined : draft.value,
      };
      onChange({
        ...config,
        inputs: draft.id
          ? config.inputs.map((field) => field.id === draft.id ? item : field)
          : [...config.inputs, item],
      });
    } else if (editorKind === 'variable') {
      const item: WorkflowStartVariable = {
        id: draft.id || `var-${Date.now()}`,
        name,
        type: draft.type === 'FILE' ? 'STRING' : draft.type,
        value: draft.value,
      };
      onChange({
        ...config,
        variables: draft.id
          ? config.variables.map((variable) => variable.id === draft.id ? item : variable)
          : [...config.variables, item],
      });
    }

    closeEditor();
  };

  const removeInput = (id: string) => {
    onChange({ ...config, inputs: config.inputs.filter((item) => item.id !== id) });
  };

  const removeVariable = (id: string) => {
    onChange({ ...config, variables: config.variables.filter((item) => item.id !== id) });
  };

  const systemVariables = useMemo(() => [
    { name: 'sys.definitionId', value: definitionId },
    { name: 'sys.workflowName', value: workflowName || '--' },
  ], [definitionId, workflowName]);

  const startStepIcon = (
    <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#155eef] text-white shadow-[0_1px_2px_rgba(21,94,239,.18)]">
      <GitBranch size={14} strokeWidth={2.2} />
    </span>
  );

  return (
    <aside className="absolute bottom-3 right-3 top-3 z-20 flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#e2e5e9] bg-white shadow-[0_12px_36px_rgba(22,24,35,.12)]">
      <header className="shrink-0 border-b border-[#eceef1] bg-white">
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#eaf2ff] text-[#155eef]">
            <GitBranch size={15} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1 text-[14px] font-semibold text-[#161823]">开始</div>
          <button
            type="button"
            aria-label="关闭"
            className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7]"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-4 pb-2 text-[11px] leading-5 text-[rgba(22,24,35,.36)]">
          定义工作流输入和可供后续所有节点引用的上下文变量。
        </div>
        <nav className="flex h-10 items-end gap-5 px-4">
          {(['settings', 'lastRun'] as TabKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className={[
                'relative h-10 border-0 bg-transparent px-0 text-[12px] font-semibold',
                tab === key ? 'text-[#344054]' : 'text-[#667085] hover:text-[#344054]',
              ].join(' ')}
              onClick={() => setTab(key)}
            >
              {key === 'settings' ? '设置' : '上次运行'}
              {tab === key ? <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#fe2c55]" /> : null}
            </button>
          ))}
        </nav>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'settings' ? (
          <div className="pb-6">
            <section className="px-4 py-4">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[12px] font-semibold text-[#344054]">输入字段</div>
                {!locked ? (
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7]"
                    onClick={() => openInputEditor()}
                    aria-label="添加输入字段"
                  >
                    <Plus size={15} />
                  </button>
                ) : null}
              </div>
              <div className="mb-3 text-[10px] text-[rgba(22,24,35,.38)]">运行工作流时提供，后续节点通过 inputs.* 引用</div>

              <div className="space-y-1.5">
                {config.inputs.map((field) => (
                  <div
                    key={field.id}
                    className="group flex items-center gap-2 rounded-xl border border-[#e7e9ed] bg-white px-2.5 py-2 hover:bg-[#fafafa]"
                  >
                    <Variable size={14} className="shrink-0 text-[#155eef]" />
                    <button
                      type="button"
                      disabled={locked}
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 text-left"
                      onClick={() => openInputEditor(field)}
                    >
                      <div className="truncate text-[11px] font-medium text-[#344054]">inputs.{field.name}</div>
                      {field.description ? <div className="truncate text-[9px] text-[#98a2b3]">{field.description}</div> : null}
                    </button>
                    {field.required ? <span className="text-[9px] text-[#98a2b3]">必填</span> : null}
                    <span className="text-[10px] text-[#98a2b3]">{INPUT_TYPE_OPTIONS.find((item) => item.value === field.type)?.label}</span>
                    {!locked ? (
                      <button
                        type="button"
                        className="hidden h-6 w-6 items-center justify-center rounded-md border-0 bg-transparent text-[#98a2b3] hover:bg-[#fff1f3] hover:text-[#d92d4f] group-hover:flex"
                        onClick={() => removeInput(field.id)}
                        aria-label="删除输入字段"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : null}
                  </div>
                ))}
                {!config.inputs.length ? (
                  <div className="rounded-xl border border-dashed border-[#dfe3e8] bg-[#fafafa] px-4 py-6 text-center text-[10px] leading-5 text-[#98a2b3]">
                    暂无输入字段<br />点击右上角 + 添加
                  </div>
                ) : null}
              </div>
            </section>

            <Divider />

            <section className="px-4 py-4">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[12px] font-semibold text-[#344054]">工作流变量</div>
                {!locked ? (
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7]"
                    onClick={() => openVariableEditor()}
                    aria-label="添加工作流变量"
                  >
                    <Plus size={15} />
                  </button>
                ) : null}
              </div>
              <div className="mb-3 text-[10px] text-[rgba(22,24,35,.38)]">整个工作流共享，后续节点通过 vars.* 引用</div>
              <div className="space-y-1.5">
                {config.variables.map((variable) => (
                  <div key={variable.id} className="flex items-center gap-2 rounded-xl border border-[#e7e9ed] px-2.5 py-2">
                    <Variable size={14} className="shrink-0 text-[#7f56d9]" />
                    <button
                      type="button"
                      disabled={locked}
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 text-left"
                      onClick={() => openVariableEditor(variable)}
                    >
                      <div className="truncate text-[11px] font-medium text-[#344054]">vars.{variable.name}</div>
                      <div className="truncate text-[9px] text-[#98a2b3]">{valuePreview(variable.value)}</div>
                    </button>
                    {!locked ? (
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded-md border-0 bg-transparent text-[#98a2b3] hover:bg-[#fff1f3] hover:text-[#d92d4f]"
                        onClick={() => removeVariable(variable.id)}
                        aria-label="删除变量"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <Divider />

            <section className="px-4 py-4">
              <div className="mb-1 text-[12px] font-semibold text-[#344054]">系统变量</div>
              <div className="mb-3 text-[10px] text-[rgba(22,24,35,.38)]">Yak Ops 自动提供，只读，通过 sys.* 引用</div>
              <div className="space-y-1.5">
                {systemVariables.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 rounded-xl bg-[#f7f8fa] px-2.5 py-2">
                    <Variable size={14} className="shrink-0 text-[#667085]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium text-[#475467]">{item.name}</div>
                      <div className="truncate text-[9px] text-[#98a2b3]">{item.value}</div>
                    </div>
                    <span className="text-[9px] text-[#98a2b3]">只读</span>
                  </div>
                ))}
              </div>
            </section>

            <Divider />

            <section className="px-4 py-4">
              <div className="mb-1 text-[12px] font-semibold text-[#344054]">下一步</div>
              <div className="mb-3 text-[10px] leading-4 text-[rgba(22,24,35,.38)]">添加此工作流程中的下一个节点</div>
              <WorkflowNextStep
                currentIcon={startStepIcon}
                nextNodes={nextNodes}
                appendOptions={appendOptions}
                locked={locked}
                onAppend={onAppend}
              />
            </section>
          </div>
        ) : (
          <div className="px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[12px] font-semibold text-[#344054]">最近一次运行</div>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#98a2b3] hover:bg-[#f2f4f7]"
                onClick={() => void loadLastRun()}
                aria-label="刷新上次运行"
              >
                <RefreshCw size={14} className={lastRunLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            {lastRun ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 rounded-xl border border-[#f5c2cc] bg-[#fff6f8]">
                  <div className="px-3 py-2.5">
                    <div className="text-[9px] text-[#667085]">状态</div>
                    <div className="mt-1 text-[11px] font-semibold text-[#fe2c55]">{lastRun.status}</div>
                  </div>
                  <div className="border-l border-[#f5c2cc] px-3 py-2.5">
                    <div className="text-[9px] text-[#667085]">开始时间</div>
                    <div className="mt-1 text-[11px] font-semibold text-[#344054]">{dayjs(lastRun.startedAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[12px] font-semibold text-[#344054]">工作流输入</div>
                  <pre className="m-0 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-xl bg-[#f5f6f7] p-3 font-mono text-[11px] leading-[18px] text-[#344054]">{JSON.stringify(lastRun.input || {}, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#dfe3e8] bg-[#fafafa] px-4 py-10 text-center text-[11px] text-[#98a2b3]">
                {lastRunLoading ? '正在加载...' : '暂无运行记录'}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(editorKind)}
        centered
        title={editorKind === 'input' ? `${draft.id ? '编辑' : '添加'}输入字段` : `${draft.id ? '编辑' : '添加'}工作流变量`}
        okText="确定"
        cancelText="取消"
        onCancel={closeEditor}
        onOk={saveEditor}
        destroyOnClose
      >
        <div className="space-y-4 pt-2">
          <div>
            <div className="mb-1.5 text-[12px] font-medium text-[#344054]">变量名</div>
            <Input
              value={draft.name}
              placeholder="例如 bizDate"
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
            <div className="mt-1 text-[10px] text-[#98a2b3]">引用方式：{editorKind === 'input' ? 'inputs' : 'vars'}.{draft.name || '变量名'}</div>
          </div>

          {editorKind === 'input' ? (
            <div>
              <div className="mb-1.5 text-[12px] font-medium text-[#344054]">显示名称</div>
              <Input
                value={draft.label}
                placeholder="默认与变量名相同"
                onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
              />
            </div>
          ) : null}

          <div>
            <div className="mb-1.5 text-[12px] font-medium text-[#344054]">类型</div>
            <Select
              className="w-full"
              value={draft.type}
              options={editorKind === 'input' ? INPUT_TYPE_OPTIONS : VARIABLE_TYPE_OPTIONS}
              onChange={(value) => setDraft((current) => ({
                ...current,
                type: value,
                value: value === 'BOOLEAN' ? false : '',
              }))}
            />
          </div>

          {editorKind === 'input' ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] font-medium text-[#344054]">必填</div>
                <div className="text-[10px] text-[#98a2b3]">运行工作流时必须提供</div>
              </div>
              <Switch
                checked={draft.required}
                onChange={(checked) => setDraft((current) => ({ ...current, required: checked }))}
              />
            </div>
          ) : null}

          <div>
            <div className="mb-1.5 text-[12px] font-medium text-[#344054]">{editorKind === 'input' ? '默认值' : '变量值'}</div>
            <ValueEditor
              type={draft.type}
              value={draft.value}
              onChange={(value) => setDraft((current) => ({ ...current, value }))}
            />
          </div>

          {editorKind === 'input' ? (
            <div>
              <div className="mb-1.5 text-[12px] font-medium text-[#344054]">说明</div>
              <Input.TextArea
                rows={3}
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
          ) : null}
        </div>
      </Modal>
    </aside>
  );
};

export default WorkflowStartInspector;
