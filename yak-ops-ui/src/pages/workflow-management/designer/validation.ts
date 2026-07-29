import type { WorkflowFlowEdge, WorkflowFlowNode } from '../types';

export type WorkflowValidationSeverity = 'error' | 'warning';

export interface WorkflowValidationIssue {
  id: string;
  nodeId?: string;
  nodeTitle: string;
  severity: WorkflowValidationSeverity;
  message: string;
}

const text = (value: unknown) => String(value ?? '').trim();

const list = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

export const validateWorkflow = (
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
): WorkflowValidationIssue[] => {
  const issues: WorkflowValidationIssue[] = [];
  const incoming = new Set(edges.map((edge) => edge.target));
  const outgoing = new Set(edges.map((edge) => edge.source));

  if (!nodes.some((node) => node.data.nodeType === 'START')) {
    issues.push({
      id: 'workflow-start-required',
      nodeTitle: '工作流',
      severity: 'error',
      message: '至少需要一个开始节点',
    });
  }

  if (!nodes.some((node) => node.data.nodeType === 'END')) {
    issues.push({
      id: 'workflow-end-required',
      nodeTitle: '工作流',
      severity: 'error',
      message: '至少需要一个结束节点',
    });
  }

  nodes.forEach((node) => {
    const title = text(node.data.title) || node.id;
    const add = (
      key: string,
      message: string,
      severity: WorkflowValidationSeverity = 'error',
    ) => {
      issues.push({
        id: `${node.id}-${key}`,
        nodeId: node.id,
        nodeTitle: title,
        severity,
        message,
      });
    };

    if (!text(node.data.title)) add('title', '节点名称不能为空');

    if (!node.data.enabled) return;

    if (node.data.nodeType === 'HTTP') {
      if (!text(node.data.config.url)) add('url', 'API 不能为空');
      if (!text(node.data.config.method)) add('method', '请求方法不能为空');
    }

    if (node.data.nodeType === 'SHELL') {
      const args = list(node.data.config.args).filter((item) => text(item));
      if (!text(node.data.config.command) && args.length === 0) {
        add('command', '命令或进程参数不能为空');
      }
    }

    if (node.data.nodeType === 'START') {
      list(node.data.config.inputVariables).forEach((item, index) => {
        const variable = item as Record<string, unknown>;
        if (!text(variable.name)) add(`input-${index}-name`, '输入变量名称不能为空');
        if (!text(variable.type)) add(`input-${index}-type`, '输入变量类型不能为空');
      });
    }

    if (node.data.nodeType === 'END') {
      const outputs = list(node.data.config.outputs);
      if (outputs.length === 0) add('outputs', '输出变量不能为空');
      outputs.forEach((item, index) => {
        const output = item as Record<string, unknown>;
        if (!text(output.name)) add(`output-${index}-name`, '输出变量名称不能为空');
        if (!text(output.value)) add(`output-${index}-value`, '输出变量值不能为空');
      });
    }

    const connected = incoming.has(node.id) || outgoing.has(node.id);
    if (!connected && nodes.length > 1) {
      add('connection', '此节点尚未连接到其他节点', 'warning');
    }
  });

  return issues;
};
