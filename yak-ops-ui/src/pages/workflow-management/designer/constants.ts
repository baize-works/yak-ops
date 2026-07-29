import type {
  WorkflowBackendTaskType,
  WorkflowNodeData,
  WorkflowNodeRecord,
  WorkflowNodeType,
  WorkflowTemplateDefinition,
} from '../types';

export type WorkflowNodeCategory = 'control' | 'action';

export interface WorkflowNodeMeta {
  type: WorkflowNodeType;
  title: string;
  description: string;
  category: WorkflowNodeCategory;
  color: string;
  backendType: WorkflowBackendTaskType;
  defaults: Record<string, unknown>;
}

export const WORKFLOW_NODE_CATALOG: WorkflowNodeMeta[] = [
  {
    type: 'START',
    title: '开始',
    description: '定义工作流运行时的输入变量',
    category: 'control',
    color: '#7c3aed',
    backendType: 'NOOP',
    defaults: {
      inputVariables: [
        {
          name: 'input',
          type: 'string',
          required: true,
          description: '',
        },
      ],
    },
  },
  {
    type: 'END',
    title: '结束',
    description: '定义工作流最终输出结果',
    category: 'control',
    color: '#12b76a',
    backendType: 'NOOP',
    defaults: {
      outputs: [
        {
          name: 'result',
          value: '',
        },
      ],
    },
  },
  {
    type: 'HTTP',
    title: 'HTTP 请求',
    description: '调用外部 HTTP 或 REST API',
    category: 'action',
    color: '#2e90fa',
    backendType: 'HTTP',
    defaults: {
      method: 'GET',
      url: '',
      headers: {},
      body: '',
      requestTimeoutSeconds: 60,
      successCodes: [],
      maxResponseBodyCharacters: 1_000_000,
      localParams: [],
    },
  },
  {
    type: 'SHELL',
    title: 'Shell',
    description: '在执行节点上运行命令或脚本',
    category: 'action',
    color: '#475467',
    backendType: 'SHELL',
    defaults: {
      command: '',
      args: [],
      workDirectory: '',
      environment: {},
      localParams: [],
    },
  },
];

export const CATEGORY_LABELS: Record<WorkflowNodeCategory, string> = {
  control: '流程节点',
  action: '执行节点',
};

const FALLBACK_NODE_META: WorkflowNodeMeta = {
  type: 'SHELL',
  title: '不支持的节点',
  description: '该节点不在当前四节点工作流范围内',
  category: 'action',
  color: '#98a2b3',
  backendType: 'NOOP',
  defaults: {},
};

export const isSupportedWorkflowNodeType = (
  type: string,
): type is 'START' | 'END' | 'HTTP' | 'SHELL' =>
  WORKFLOW_NODE_CATALOG.some((item) => item.type === type);

export const getNodeMeta = (type: WorkflowNodeType | string) =>
  WORKFLOW_NODE_CATALOG.find((item) => item.type === type) ||
  FALLBACK_NODE_META;

export const createNodeData = (
  type: WorkflowNodeType,
  index: number,
): WorkflowNodeData => {
  const meta = getNodeMeta(type);
  const nodeType = isSupportedWorkflowNodeType(String(type))
    ? type
    : meta.type;

  return {
    title: `${meta.title}${['START', 'END'].includes(String(nodeType)) ? '' : ` ${index}`}`,
    description: meta.description,
    nodeType,
    taskType: meta.backendType,
    config: { ...meta.defaults, __uiType: nodeType },
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
    description: '从开始节点构建 HTTP 与 Shell 自动化流程。',
    category: '基础',
    icon: 'START',
    nodes: [nodeRecord('start', 'START', 80, 220, '开始')],
    edges: [],
    viewport: { x: 120, y: 60, zoom: 0.9 },
  },
];

export const resolveVisualNodeType = (
  backendType: string,
  config: Record<string, unknown> | undefined,
): WorkflowNodeType => {
  const uiType = config?.__uiType;

  if (typeof uiType === 'string' && isSupportedWorkflowNodeType(uiType))
    return uiType;
  if (backendType === 'HTTP' || backendType === 'SHELL') return backendType;

  // Keep legacy node types readable without exposing them in the node selector.
  if (typeof uiType === 'string') return uiType as WorkflowNodeType;
  return backendType as WorkflowNodeType;
};
