import type {
  WorkflowV2BindingSource,
  WorkflowV2BindingSourceType,
  WorkflowV2InputBinding,
} from '../workflow-v2.types';
import type {
  WorkflowV2FlowEdge,
  WorkflowV2FlowNode,
} from './model';

export interface WorkflowV2SchemaField {
  path: string;
  label: string;
  type: string;
  description?: string;
  required: boolean;
  enumValues?: unknown[];
}

export interface WorkflowV2MappingIssue {
  nodeId: string;
  nodeName: string;
  field?: string;
  message: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const schemaType = (schema: Record<string, unknown>): string => {
  const value = schema.type;
  if (Array.isArray(value)) return value.map(String).join(' | ');
  if (typeof value === 'string') return value;
  if (isRecord(schema.properties)) return 'object';
  return 'unknown';
};

const schemaDescription = (schema: Record<string, unknown>) =>
  typeof schema.description === 'string' ? schema.description : undefined;

const schemaLabel = (name: string, schema: Record<string, unknown>) =>
  typeof schema.title === 'string' && schema.title.trim()
    ? schema.title.trim()
    : name;

const schemaEnum = (schema: Record<string, unknown>) =>
  Array.isArray(schema.enum) ? schema.enum : undefined;

export const extractInputSchemaFields = (
  schema?: Record<string, unknown>,
): WorkflowV2SchemaField[] => {
  if (!schema || !isRecord(schema.properties)) return [];
  const required = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((item): item is string => typeof item === 'string')
      : [],
  );
  return Object.entries(schema.properties).map(([name, raw]) => {
    const property = isRecord(raw) ? raw : {};
    return {
      path: name,
      label: schemaLabel(name, property),
      type: schemaType(property),
      description: schemaDescription(property),
      required: required.has(name),
      enumValues: schemaEnum(property),
    };
  });
};

const collectOutputFields = (
  properties: Record<string, unknown>,
  prefix: string,
  result: WorkflowV2SchemaField[],
) => {
  Object.entries(properties).forEach(([name, raw]) => {
    const property = isRecord(raw) ? raw : {};
    const path = prefix ? `${prefix}.${name}` : name;
    const nested = isRecord(property.properties) ? property.properties : undefined;
    result.push({
      path,
      label: schemaLabel(name, property),
      type: schemaType(property),
      description: schemaDescription(property),
      required: false,
      enumValues: schemaEnum(property),
    });
    if (nested) collectOutputFields(nested, path, result);
  });
};

export const extractOutputSchemaFields = (
  schema?: Record<string, unknown>,
): WorkflowV2SchemaField[] => {
  if (!schema || !isRecord(schema.properties)) return [];
  const result: WorkflowV2SchemaField[] = [];
  collectOutputFields(schema.properties, '', result);
  return result;
};

export const getUpstreamNodeIds = (
  ownerId: string,
  edges: WorkflowV2FlowEdge[],
): Set<string> => {
  const predecessors = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    const values = predecessors.get(edge.target) ?? new Set<string>();
    values.add(edge.source);
    predecessors.set(edge.target, values);
  });

  const result = new Set<string>();
  const queue = [...(predecessors.get(ownerId) ?? [])];
  while (queue.length) {
    const current = queue.shift()!;
    if (result.has(current)) continue;
    result.add(current);
    queue.push(...(predecessors.get(current) ?? []));
  }
  return result;
};

export const getUpstreamTaskNodes = (
  ownerId: string,
  nodes: WorkflowV2FlowNode[],
  edges: WorkflowV2FlowEdge[],
) => {
  const upstream = getUpstreamNodeIds(ownerId, edges);
  return nodes.filter(
    (node) => upstream.has(node.id) && node.data.kind === 'TASK',
  );
};

export const findInputBinding = (
  bindings: WorkflowV2InputBinding[],
  target: string,
) => bindings.find((binding) => binding.target === target);

export const replaceInputBinding = (
  bindings: WorkflowV2InputBinding[],
  target: string,
  source?: WorkflowV2BindingSource,
): WorkflowV2InputBinding[] => {
  const next = bindings.filter((binding) => binding.target !== target);
  return source ? [...next, { target, source }] : next;
};

export const renameInputBinding = (
  bindings: WorkflowV2InputBinding[],
  previousTarget: string,
  nextTarget: string,
): WorkflowV2InputBinding[] =>
  bindings.map((binding) =>
    binding.target === previousTarget
      ? { ...binding, target: nextTarget }
      : binding,
  );

export const createDefaultBindingSource = (
  type: WorkflowV2BindingSourceType,
  target: string,
  upstreamNodes: WorkflowV2FlowNode[],
): WorkflowV2BindingSource | undefined => {
  if (type === 'START_INPUT') return { type, path: target || 'input' };
  if (type === 'WORKFLOW_VARIABLE') {
    return { type, variableName: target || 'variable' };
  }
  if (type === 'LITERAL') return { type, literalValue: '' };

  const firstNode = upstreamNodes[0];
  if (!firstNode) return undefined;
  const firstPath = extractOutputSchemaFields(
    firstNode.data.taskMeta?.outputSchema,
  )[0]?.path;
  return {
    type: 'NODE_OUTPUT',
    nodeKey: firstNode.id,
    path: firstPath || '$',
  };
};

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && Boolean(value.trim());

export const validateBindingSource = (
  source: WorkflowV2BindingSource,
  owner: WorkflowV2FlowNode,
  nodes: WorkflowV2FlowNode[],
  edges: WorkflowV2FlowEdge[],
): string | undefined => {
  if (source.type === 'START_INPUT' && !hasText(source.path)) {
    return '开始输入路径不能为空';
  }
  if (source.type === 'WORKFLOW_VARIABLE' && !hasText(source.variableName)) {
    return '工作流变量名不能为空';
  }
  if (source.type === 'NODE_OUTPUT') {
    if (!hasText(source.nodeKey)) return '请选择上游节点';
    if (!hasText(source.path)) return '请选择或填写输出路径';
    const upstream = getUpstreamNodeIds(owner.id, edges);
    if (!upstream.has(source.nodeKey)) return '只能引用拓扑上游节点';
    if (!nodes.some((node) => node.id === source.nodeKey)) {
      return '引用的上游节点不存在';
    }
  }
  return undefined;
};

export const collectMappingIssues = (
  nodes: WorkflowV2FlowNode[],
  edges: WorkflowV2FlowEdge[],
): WorkflowV2MappingIssue[] => {
  const issues: WorkflowV2MappingIssue[] = [];
  nodes.forEach((node) => {
    const targets = new Set<string>();
    node.data.inputBindings.forEach((binding) => {
      if (!binding.target.trim()) {
        issues.push({
          nodeId: node.id,
          nodeName: node.data.title,
          message: '存在目标字段为空的输入映射',
        });
        return;
      }
      if (targets.has(binding.target)) {
        issues.push({
          nodeId: node.id,
          nodeName: node.data.title,
          field: binding.target,
          message: '输入目标字段重复',
        });
      }
      targets.add(binding.target);
      const message = validateBindingSource(binding.source, node, nodes, edges);
      if (message) {
        issues.push({
          nodeId: node.id,
          nodeName: node.data.title,
          field: binding.target,
          message,
        });
      }
    });

    Object.entries(node.data.outputBindings).forEach(([name, source]) => {
      if (!name.trim()) {
        issues.push({
          nodeId: node.id,
          nodeName: node.data.title,
          message: '工作流输出名称不能为空',
        });
      }
      const message = validateBindingSource(source, node, nodes, edges);
      if (message) {
        issues.push({
          nodeId: node.id,
          nodeName: node.data.title,
          field: name,
          message,
        });
      }
    });
  });
  return issues;
};

export const collectMissingRequiredInputs = (
  nodes: WorkflowV2FlowNode[],
): WorkflowV2MappingIssue[] => {
  const issues: WorkflowV2MappingIssue[] = [];
  nodes
    .filter((node) => node.data.kind === 'TASK' && node.data.enabled)
    .forEach((node) => {
      const bound = new Set(node.data.inputBindings.map((binding) => binding.target));
      extractInputSchemaFields(node.data.taskMeta?.inputSchema)
        .filter((field) => field.required && !bound.has(field.path))
        .forEach((field) => {
          issues.push({
            nodeId: node.id,
            nodeName: node.data.title,
            field: field.path,
            message: '必填输入尚未映射',
          });
        });
    });
  return issues;
};

export const inputMappingProgress = (
  node: Pick<WorkflowV2FlowNode, 'data'>,
) => {
  const fields = extractInputSchemaFields(node.data.taskMeta?.inputSchema);
  const required = fields.filter((field) => field.required);
  const bound = new Set(node.data.inputBindings.map((binding) => binding.target));
  return {
    declared: fields.length,
    required: required.length,
    mapped: fields.filter((field) => bound.has(field.path)).length,
    requiredMapped: required.filter((field) => bound.has(field.path)).length,
  };
};

export const parseLiteralValue = (value: string): unknown => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

export const formatLiteralValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === undefined) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};
