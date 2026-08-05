import {
  Alert,
  AutoComplete,
  Button,
  Empty,
  Input,
  message,
  Select,
  Spin,
  Tag,
} from 'antd';
import {
  ArrowRightLeft,
  Braces,
  CircleDot,
  Plus,
  Variable,
  X,
} from 'lucide-react';
import { useMemo, type ChangeEvent } from 'react';

import type {
  WorkflowV2BindingSource,
  WorkflowV2BindingSourceType,
} from '../../workflow-v2.types';
import {
  createDefaultBindingSource,
  extractInputSchemaFields,
  extractOutputSchemaFields,
  findInputBinding,
  formatLiteralValue,
  getUpstreamTaskNodes,
  parseLiteralValue,
  renameInputBinding,
  replaceInputBinding,
  type WorkflowV2SchemaField,
} from '../mapping';
import type {
  WorkflowV2CanvasNodeData,
  WorkflowV2FlowEdge,
  WorkflowV2FlowNode,
} from '../model';

interface MappingPanelProps {
  node: WorkflowV2FlowNode;
  nodes: WorkflowV2FlowNode[];
  edges: WorkflowV2FlowEdge[];
  onChange: (data: WorkflowV2CanvasNodeData) => void;
  onClose: () => void;
}

const SOURCE_OPTIONS: Array<{
  value: WorkflowV2BindingSourceType | 'UNMAPPED';
  label: string;
}> = [
  { value: 'UNMAPPED', label: '未映射' },
  { value: 'START_INPUT', label: '开始输入' },
  { value: 'NODE_OUTPUT', label: '上游节点输出' },
  { value: 'WORKFLOW_VARIABLE', label: '工作流变量' },
  { value: 'LITERAL', label: '固定值' },
];

const SourceEditor = ({
  source,
  target,
  upstreamNodes,
  onChange,
}: {
  source: WorkflowV2BindingSource;
  target: string;
  upstreamNodes: WorkflowV2FlowNode[];
  onChange: (source: WorkflowV2BindingSource) => void;
}) => {
  if (source.type === 'START_INPUT') {
    return (
      <Input
        variant="filled"
        size="small"
        value={source.path}
        placeholder={`开始输入路径，例如 ${target || 'orderId'}`}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({ ...source, path: event.target.value })
        }
      />
    );
  }

  if (source.type === 'WORKFLOW_VARIABLE') {
    return (
      <Input
        variant="filled"
        size="small"
        value={source.variableName}
        placeholder="工作流变量名"
        prefix={<Variable size={13} />}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({ ...source, variableName: event.target.value })
        }
      />
    );
  }

  if (source.type === 'LITERAL') {
    return (
      <Input.TextArea
        variant="filled"
        size="small"
        autoSize={{ minRows: 1, maxRows: 4 }}
        value={formatLiteralValue(source.literalValue)}
        placeholder="固定值；对象或数组可填写 JSON"
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          onChange({
            ...source,
            literalValue: parseLiteralValue(event.target.value),
          })
        }
      />
    );
  }

  const selectedNode = upstreamNodes.find(
    (node) => node.id === source.nodeKey,
  );
  const outputOptions = extractOutputSchemaFields(
    selectedNode?.data.taskMeta?.outputSchema,
  ).map((field) => ({
    value: field.path,
    label: `${field.path} · ${field.type}`,
  }));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
      <Select
        variant="filled"
        size="small"
        value={source.nodeKey}
        placeholder="上游节点"
        options={upstreamNodes.map((node) => ({
          value: node.id,
          label: node.data.title,
        }))}
        onChange={(nodeKey: string) => {
          const node = upstreamNodes.find((item) => item.id === nodeKey);
          const firstPath = extractOutputSchemaFields(
            node?.data.taskMeta?.outputSchema,
          )[0]?.path;
          onChange({
            type: 'NODE_OUTPUT',
            nodeKey,
            path: firstPath || source.path || '$',
          });
        }}
      />
      <AutoComplete
        size="small"
        value={source.path}
        placeholder="输出路径"
        options={outputOptions}
        onChange={(path: string) => onChange({ ...source, path })}
      />
    </div>
  );
};

const SchemaFieldLabel = ({ field }: { field: WorkflowV2SchemaField }) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1.5">
      <strong className="truncate text-[12px] font-semibold text-[#344054]">
        {field.path}
      </strong>
      {field.required && (
        <span className="shrink-0 text-[10px] font-semibold text-[#d92d20]">
          必填
        </span>
      )}
      <Tag
        bordered={false}
        className="!m-0 !bg-[#f2f4f7] !px-1.5 !text-[9px] !text-[#667085]"
      >
        {field.type}
      </Tag>
    </div>
    {field.description && (
      <p className="mb-0 mt-0.5 line-clamp-2 text-[10px] leading-4 text-[#98a2b3]">
        {field.description}
      </p>
    )}
  </div>
);

const InputMappingRow = ({
  field,
  custom,
  node,
  upstreamNodes,
  onChange,
}: {
  field: WorkflowV2SchemaField;
  custom?: boolean;
  node: WorkflowV2FlowNode;
  upstreamNodes: WorkflowV2FlowNode[];
  onChange: (data: WorkflowV2CanvasNodeData) => void;
}) => {
  const binding = findInputBinding(node.data.inputBindings, field.path);

  const changeSourceType = (
    type: WorkflowV2BindingSourceType | 'UNMAPPED',
  ) => {
    const source =
      type === 'UNMAPPED'
        ? undefined
        : createDefaultBindingSource(type, field.path, upstreamNodes);
    if (type === 'NODE_OUTPUT' && !source) {
      message.info('当前节点还没有可引用的上游任务输出');
      return;
    }
    onChange({
      ...node.data,
      inputBindings: replaceInputBinding(
        node.data.inputBindings,
        field.path,
        source,
      ),
    });
  };

  return (
    <div className="rounded-lg border border-[#eaecf0] bg-white p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        {custom ? (
          <Input
            variant="filled"
            size="small"
            value={field.path}
            placeholder="输入目标字段"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const nextTarget = event.target.value;
              if (
                nextTarget !== field.path &&
                node.data.inputBindings.some(
                  (item) => item.target === nextTarget,
                )
              ) {
                message.warning('输入目标字段不能重复');
                return;
              }
              onChange({
                ...node.data,
                inputBindings: renameInputBinding(
                  node.data.inputBindings,
                  field.path,
                  nextTarget,
                ),
              });
            }}
          />
        ) : (
          <SchemaFieldLabel field={field} />
        )}
        <Select
          variant="filled"
          size="small"
          className="w-[124px] shrink-0"
          value={binding?.source.type ?? 'UNMAPPED'}
          options={SOURCE_OPTIONS.map((option) => ({
            ...option,
            disabled:
              option.value === 'NODE_OUTPUT' && !upstreamNodes.length,
          }))}
          onChange={changeSourceType}
        />
      </div>

      {binding && (
        <SourceEditor
          source={binding.source}
          target={field.path}
          upstreamNodes={upstreamNodes}
          onChange={(source) =>
            onChange({
              ...node.data,
              inputBindings: replaceInputBinding(
                node.data.inputBindings,
                field.path,
                source,
              ),
            })
          }
        />
      )}
    </div>
  );
};

const TaskInputMappings = ({
  node,
  nodes,
  edges,
  onChange,
}: Omit<MappingPanelProps, 'onClose'>) => {
  const schemaFields = extractInputSchemaFields(node.data.taskMeta?.inputSchema);
  const declared = new Set(schemaFields.map((field) => field.path));
  const customFields: WorkflowV2SchemaField[] = node.data.inputBindings
    .filter((binding) => !declared.has(binding.target))
    .map((binding) => ({
      path: binding.target,
      label: binding.target,
      type: 'custom',
      required: false,
    }));
  const upstreamNodes = getUpstreamTaskNodes(node.id, nodes, edges);
  const required = schemaFields.filter((field) => field.required);
  const mapped = new Set(node.data.inputBindings.map((item) => item.target));
  const missing = required.filter((field) => !mapped.has(field.path));

  const addCustom = () => {
    let index = 1;
    let target = `param_${index}`;
    while (node.data.inputBindings.some((item) => item.target === target)) {
      index += 1;
      target = `param_${index}`;
    }
    onChange({
      ...node.data,
      inputBindings: [
        ...node.data.inputBindings,
        {
          target,
          source: { type: 'START_INPUT', path: target },
        },
      ],
    });
  };

  if (node.data.taskMeta?.schemaStatus === 'loading') {
    return (
      <div className="flex min-h-[220px] items-center justify-center">
        <Spin size="small" tip="加载任务输入 Schema..." />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {node.data.taskMeta?.schemaStatus === 'error' && (
        <Alert
          type="warning"
          showIcon
          message="任务 Schema 加载失败"
          description={
            node.data.taskMeta.schemaError ||
            '仍可添加自定义映射，但发布前建议刷新任务版本信息。'
          }
        />
      )}

      <div className="flex items-center justify-between rounded-lg bg-[#f7f7f8] px-3 py-2">
        <span className="text-[11px] text-[#667085]">
          声明 {schemaFields.length} 个输入，必填 {required.length} 个
        </span>
        <span
          className={[
            'text-[10px] font-semibold',
            missing.length ? 'text-[#d92d20]' : 'text-[#027a48]',
          ].join(' ')}
        >
          {missing.length ? `缺少 ${missing.length} 个必填映射` : '必填映射完整'}
        </span>
      </div>

      {!schemaFields.length && !customFields.length ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="任务版本没有声明输入字段"
        />
      ) : (
        [...schemaFields, ...customFields].map((field) => (
          <InputMappingRow
            key={field.path}
            field={field}
            custom={field.type === 'custom'}
            node={node}
            upstreamNodes={upstreamNodes}
            onChange={onChange}
          />
        ))
      )}

      <Button
        block
        type="dashed"
        icon={<Plus size={14} />}
        onClick={addCustom}
      >
        添加自定义输入映射
      </Button>
    </div>
  );
};

const WorkflowOutputMappings = ({
  node,
  nodes,
  edges,
  onChange,
}: Omit<MappingPanelProps, 'onClose'>) => {
  const upstreamNodes = getUpstreamTaskNodes(node.id, nodes, edges);
  const entries = Object.entries(node.data.outputBindings);

  const changeOutputName = (previous: string, next: string) => {
    if (next !== previous && node.data.outputBindings[next]) {
      message.warning('工作流输出名称不能重复');
      return;
    }
    const outputBindings = Object.fromEntries(
      entries.map(([name, source]) => [name === previous ? next : name, source]),
    );
    onChange({ ...node.data, outputBindings });
  };

  const updateOutput = (name: string, source: WorkflowV2BindingSource) => {
    onChange({
      ...node.data,
      outputBindings: { ...node.data.outputBindings, [name]: source },
    });
  };

  const removeOutput = (name: string) => {
    const { [name]: ignored, ...outputBindings } = node.data.outputBindings;
    void ignored;
    onChange({ ...node.data, outputBindings });
  };

  const addOutput = () => {
    let index = 1;
    let name = 'result';
    while (node.data.outputBindings[name]) {
      index += 1;
      name = `result_${index}`;
    }
    const source =
      createDefaultBindingSource('NODE_OUTPUT', name, upstreamNodes) ??
      createDefaultBindingSource('START_INPUT', name, upstreamNodes)!;
    onChange({
      ...node.data,
      outputBindings: { ...node.data.outputBindings, [name]: source },
    });
  };

  return (
    <div className="space-y-3">
      <Alert
        type="info"
        showIcon
        message="工作流输出"
        description="为调用方暴露稳定输出名称，来源可以是上游任务输出、开始输入、变量或固定值。"
      />

      {!entries.length ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="尚未定义工作流输出"
        />
      ) : (
        entries.map(([name, source]) => (
          <div
            key={name}
            className="rounded-lg border border-[#eaecf0] bg-white p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <Input
                variant="filled"
                size="small"
                value={name}
                prefix={<CircleDot size={12} />}
                placeholder="输出名称"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  changeOutputName(name, event.target.value)
                }
              />
              <Button
                danger
                type="text"
                size="small"
                icon={<X size={13} />}
                onClick={() => removeOutput(name)}
              />
            </div>
            <div className="mb-2">
              <Select
                variant="filled"
                size="small"
                className="w-full"
                value={source.type}
                options={SOURCE_OPTIONS.filter(
                  (option) => option.value !== 'UNMAPPED',
                ).map((option) => ({
                  ...option,
                  disabled:
                    option.value === 'NODE_OUTPUT' && !upstreamNodes.length,
                }))}
                onChange={(type: WorkflowV2BindingSourceType) => {
                  const next = createDefaultBindingSource(
                    type,
                    name,
                    upstreamNodes,
                  );
                  if (next) updateOutput(name, next);
                }}
              />
            </div>
            <SourceEditor
              source={source}
              target={name}
              upstreamNodes={upstreamNodes}
              onChange={(next) => updateOutput(name, next)}
            />
          </div>
        ))
      )}

      <Button
        block
        type="dashed"
        icon={<Plus size={14} />}
        onClick={addOutput}
      >
        添加工作流输出
      </Button>
    </div>
  );
};

const MappingPanel = ({
  node,
  nodes,
  edges,
  onChange,
  onClose,
}: MappingPanelProps) => {
  const title = node.data.kind === 'TASK' ? '输入映射' : '工作流输出';
  const subtitle =
    node.data.kind === 'TASK'
      ? `${node.data.taskRef?.taskType || 'TASK'} · v${node.data.taskRef?.taskVersionNumber || '-'}`
      : 'END 节点输出契约';

  return (
    <aside className="flex w-[410px] shrink-0 flex-col border-l border-[#e4e7ec] bg-white">
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#eaecf0] px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--yak-brand-color-soft)] text-[var(--yak-brand-color)]">
            {node.data.kind === 'TASK' ? (
              <ArrowRightLeft size={15} />
            ) : (
              <Braces size={15} />
            )}
          </span>
          <div className="min-w-0">
            <strong className="block truncate text-[13px] font-semibold text-[#161823]">
              {title}
            </strong>
            <span className="block truncate text-[10px] text-[#98a2b3]">
              {node.data.title} · {subtitle}
            </span>
          </div>
        </div>
        <Button
          type="text"
          size="small"
          icon={<X size={15} />}
          onClick={onClose}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#fcfcfd] p-4">
        {node.data.kind === 'TASK' ? (
          <TaskInputMappings
            node={node}
            nodes={nodes}
            edges={edges}
            onChange={onChange}
          />
        ) : (
          <WorkflowOutputMappings
            node={node}
            nodes={nodes}
            edges={edges}
            onChange={onChange}
          />
        )}
      </div>
    </aside>
  );
};

export default MappingPanel;
