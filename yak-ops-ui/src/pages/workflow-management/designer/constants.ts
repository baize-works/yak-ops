import type {
  WorkflowBackendTaskType,
  WorkflowNodeData,
  WorkflowNodeRecord,
  WorkflowNodeType,
  WorkflowTemplateDefinition,
} from '../types';

export interface WorkflowNodeMeta {
  type: WorkflowNodeType;
  title: string;
  description: string;
  category: 'trigger' | 'logic' | 'transform' | 'integration' | 'ai' | 'annotation';
  color: string;
  backendType: WorkflowBackendTaskType;
  defaults: Record<string, unknown>;
}

export const WORKFLOW_NODE_CATALOG: WorkflowNodeMeta[] = [
  {
    type: 'START',
    title: '开始',
    description: '定义工作流输入变量',
    category: 'trigger',
    color: '#7c3aed',
    backendType: 'NOOP',
    defaults: { inputVariables: [{ name: 'query', type: 'string', required: true }] },
  },
  {
    type: 'LLM',
    title: 'LLM',
    description: '调用大语言模型生成内容',
    category: 'ai',
    color: '#7c3aed',
    backendType: 'NOOP',
    defaults: {
      provider: 'OpenAI',
      model: 'gpt-4o-mini',
      systemPrompt: '你是一个专业、可靠的助手。',
      prompt: '{{start.query}}',
      temperature: 0.7,
    },
  },
  {
    type: 'KNOWLEDGE',
    title: '知识检索',
    description: '从知识库中检索相关内容',
    category: 'ai',
    color: '#2563eb',
    backendType: 'NOOP',
    defaults: { dataset: '', query: '{{start.query}}', topK: 3, scoreThreshold: 0.5 },
  },
  {
    type: 'QUESTION_CLASSIFIER',
    title: '问题分类器',
    description: '通过模型将输入路由到不同分支',
    category: 'ai',
    color: '#2563eb',
    backendType: 'NOOP',
    defaults: { input: '{{start.query}}', classes: ['类型一', '类型二'] },
  },
  {
    type: 'HTTP',
    title: 'HTTP 请求',
    description: '调用外部 REST API',
    category: 'integration',
    color: '#0ea5e9',
    backendType: 'HTTP',
    defaults: { method: 'GET', url: '', headers: {}, body: '', requestTimeoutSeconds: 60 },
  },
  {
    type: 'SHELL',
    title: 'Shell',
    description: '运行本地命令或脚本',
    category: 'integration',
    color: '#475569',
    backendType: 'SHELL',
    defaults: { command: '', workDirectory: '', environment: {} },
  },
  {
    type: 'CODE',
    title: '代码执行',
    description: '使用代码转换输入数据',
    category: 'transform',
    color: '#f59e0b',
    backendType: 'NOOP',
    defaults: {
      language: 'javascript',
      code: 'function main(inputs) {\n  return { result: inputs };\n}',
    },
  },
  {
    type: 'TEMPLATE',
    title: '模板转换',
    description: '使用模板拼装文本内容',
    category: 'transform',
    color: '#f97316',
    backendType: 'NOOP',
    defaults: { template: '处理结果：{{llm.text}}' },
  },
  {
    type: 'VARIABLE',
    title: '变量赋值',
    description: '设置或聚合工作流变量',
    category: 'transform',
    color: '#14b8a6',
    backendType: 'NOOP',
    defaults: { assignments: [{ name: 'result', value: '{{llm.text}}' }] },
  },
  {
    type: 'CONDITION',
    title: '条件分支',
    description: '根据表达式进入不同流程分支',
    category: 'logic',
    color: '#f59e0b',
    backendType: 'NOOP',
    defaults: { expression: '{{http.statusCode}} == 200', cases: ['TRUE', 'FALSE'] },
  },
  {
    type: 'ITERATION',
    title: '迭代',
    description: '遍历数组并执行内部步骤',
    category: 'logic',
    color: '#06b6d4',
    backendType: 'NOOP',
    defaults: { source: '{{start.items}}', parallel: 1, output: 'results' },
  },
  {
    type: 'END',
    title: '结束',
    description: '定义工作流输出结果',
    category: 'logic',
    color: '#10b981',
    backendType: 'NOOP',
    defaults: { outputs: [{ name: 'result', value: '{{llm.text}}' }] },
  },
  {
    type: 'NOOP',
    title: '基础节点',
    description: '通用占位或人工步骤',
    category: 'logic',
    color: '#64748b',
    backendType: 'NOOP',
    defaults: {},
  },
  {
    type: 'NOTE',
    title: '注释',
    description: '在画布上补充说明',
    category: 'annotation',
    color: '#eab308',
    backendType: 'NOOP',
    defaults: { content: '双击或在右侧面板编辑注释内容。' },
  },
];

export const CATEGORY_LABELS: Record<WorkflowNodeMeta['category'], string> = {
  trigger: '触发器',
  ai: 'AI',
  integration: '集成',
  transform: '数据转换',
  logic: '逻辑',
  annotation: '辅助',
};

export const getNodeMeta = (type: WorkflowNodeType | string) =>
  WORKFLOW_NODE_CATALOG.find((item) => item.type === type) ||
  WORKFLOW_NODE_CATALOG.find((item) => item.type === 'NOOP')!;

export const createNodeData = (
  type: WorkflowNodeType,
  index: number,
): WorkflowNodeData => {
  const meta = getNodeMeta(type);
  return {
    title: `${meta.title}${['START', 'END', 'NOTE'].includes(type) ? '' : ` ${index}`}`,
    description: meta.description,
    nodeType: type,
    taskType: meta.backendType,
    config: { ...meta.defaults, __uiType: type },
    retryTimes: 0,
    retryIntervalSeconds: 0,
    timeoutSeconds: 0,
    enabled: true,
    idempotent: meta.backendType === 'NOOP',
    retryOnRestart: meta.backendType === 'NOOP',
    runningStatus: 'idle',
  };
};

const nodeRecord = (
  key: string,
  type: WorkflowNodeType,
  x: number,
  y: number,
  title?: string,
): WorkflowNodeRecord => {
  const data = createNodeData(type, 1);
  return {
    key,
    name: title || data.title,
    type: data.taskType,
    description: data.description,
    positionX: x,
    positionY: y,
    config: data.config,
    retryTimes: 0,
    retryIntervalSeconds: 0,
    timeoutSeconds: 0,
    enabled: true,
    idempotent: data.idempotent,
    retryOnRestart: data.retryOnRestart,
  };
};

export const WORKFLOW_TEMPLATES: WorkflowTemplateDefinition[] = [
  {
    id: 'blank',
    name: '空白工作流',
    description: '从开始节点构建新的工作流。',
    category: '基础',
    icon: 'START',
    nodes: [nodeRecord('start', 'START', 80, 220, '开始')],
    edges: [],
    viewport: { x: 120, y: 60, zoom: 0.9 },
  },
  {
    id: 'ai-answer',
    name: 'AI 问答',
    description: '输入问题，调用模型并返回生成结果。',
    category: 'AI',
    icon: 'LLM',
    nodes: [
      nodeRecord('start', 'START', 40, 220, '开始'),
      nodeRecord('llm', 'LLM', 360, 220, '生成回答'),
      nodeRecord('end', 'END', 680, 220, '结束'),
    ],
    edges: [
      { from: 'start', to: 'llm' },
      { from: 'llm', to: 'end' },
    ],
    viewport: { x: 80, y: 100, zoom: 0.9 },
  },
  {
    id: 'knowledge-answer',
    name: '知识库问答',
    description: '检索知识库，将召回内容交给模型生成答案。',
    category: 'AI',
    icon: 'KNOWLEDGE',
    nodes: [
      nodeRecord('start', 'START', 20, 220, '开始'),
      nodeRecord('knowledge', 'KNOWLEDGE', 300, 120, '知识检索'),
      nodeRecord('llm', 'LLM', 580, 220, '生成答案'),
      nodeRecord('end', 'END', 860, 220, '结束'),
    ],
    edges: [
      { from: 'start', to: 'knowledge' },
      { from: 'knowledge', to: 'llm' },
      { from: 'llm', to: 'end' },
    ],
    viewport: { x: 30, y: 110, zoom: 0.82 },
  },
  {
    id: 'api-orchestration',
    name: 'API 编排',
    description: '请求外部接口，根据结果执行条件分支。',
    category: '集成',
    icon: 'HTTP',
    nodes: [
      nodeRecord('start', 'START', 20, 220, '开始'),
      nodeRecord('http', 'HTTP', 300, 220, '请求接口'),
      nodeRecord('condition', 'CONDITION', 580, 220, '判断结果'),
      nodeRecord('end', 'END', 860, 220, '结束'),
    ],
    edges: [
      { from: 'start', to: 'http' },
      { from: 'http', to: 'condition' },
      { from: 'condition', to: 'end' },
    ],
    viewport: { x: 30, y: 100, zoom: 0.82 },
  },
];

export const resolveVisualNodeType = (
  backendType: string,
  config: Record<string, unknown> | undefined,
): WorkflowNodeType => {
  const uiType = config?.__uiType;
  if (typeof uiType === 'string' && WORKFLOW_NODE_CATALOG.some((item) => item.type === uiType))
    return uiType as WorkflowNodeType;
  if (backendType === 'HTTP' || backendType === 'SHELL' || backendType === 'NOOP')
    return backendType;
  return 'NOOP';
};
