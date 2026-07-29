import type { WorkflowFlowEdge, WorkflowFlowNode } from '../types';
import { validateWorkflow } from './validation';

const node = (
  id: string,
  nodeType: string,
  config: Record<string, unknown>,
): WorkflowFlowNode =>
  ({
    id,
    type: 'workflowNode',
    position: { x: 0, y: 0 },
    data: {
      title: id,
      nodeType,
      taskType: nodeType === 'START' || nodeType === 'END' ? 'NOOP' : nodeType,
      config,
      retryTimes: 0,
      retryIntervalSeconds: 0,
      timeoutSeconds: 0,
      enabled: true,
      idempotent: false,
      retryOnRestart: false,
    },
  }) as WorkflowFlowNode;

describe('workflow validation', () => {
  it('reports HTTP, Shell and End required fields in realtime', () => {
    const nodes = [
      node('开始', 'START', {
        inputVariables: [{ name: 'input', type: 'string' }],
      }),
      node('HTTP 请求', 'HTTP', { method: 'GET', url: '' }),
      node('Shell', 'SHELL', { command: '', args: [] }),
      node('结束', 'END', { outputs: [{ name: 'result', value: '' }] }),
    ];
    const edges: WorkflowFlowEdge[] = [
      { id: '1', source: '开始', target: 'HTTP 请求' },
      { id: '2', source: 'HTTP 请求', target: 'Shell' },
      { id: '3', source: 'Shell', target: '结束' },
    ];

    expect(validateWorkflow(nodes, edges).map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'API 不能为空',
        '命令或进程参数不能为空',
        '输出变量值不能为空',
      ]),
    );
  });

  it('accepts aligned HTTP and Shell parameters', () => {
    const nodes = [
      node('开始', 'START', {
        inputVariables: [{ name: 'input', type: 'string' }],
      }),
      node('HTTP 请求', 'HTTP', {
        method: 'POST',
        url: 'https://example.com/${input}',
      }),
      node('Shell', 'SHELL', {
        command: '',
        args: ['/bin/sh', '-c', 'echo ${input}'],
      }),
      node('结束', 'END', {
        outputs: [{ name: 'result', value: '${Shell.exitCode}' }],
      }),
    ];
    const edges: WorkflowFlowEdge[] = [
      { id: '1', source: '开始', target: 'HTTP 请求' },
      { id: '2', source: 'HTTP 请求', target: 'Shell' },
      { id: '3', source: 'Shell', target: '结束' },
    ];

    expect(validateWorkflow(nodes, edges)).toEqual([]);
  });
});
