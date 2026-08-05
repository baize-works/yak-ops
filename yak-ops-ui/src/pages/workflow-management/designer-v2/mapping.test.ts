import type { WorkflowV2FlowEdge, WorkflowV2FlowNode } from './model';
import {
  collectMappingIssues,
  collectMissingRequiredInputs,
  extractInputSchemaFields,
  extractOutputSchemaFields,
  getUpstreamNodeIds,
  replaceInputBinding,
} from './mapping';

const node = (
  id: string,
  kind: 'START' | 'TASK' | 'END',
): WorkflowV2FlowNode => ({
  id,
  type: 'workflowV2Node',
  position: { x: 0, y: 0 },
  data: {
    title: id,
    kind,
    enabled: true,
    inputBindings: [],
    outputBindings: {},
    executionPolicy: {
      timeoutSeconds: 0,
      retryTimes: 0,
      retryIntervalSeconds: 0,
      failureAction: 'FAIL_WORKFLOW',
    },
  },
});

const edges: WorkflowV2FlowEdge[] = [
  { id: '1', source: 'start', target: 'a' },
  { id: '2', source: 'a', target: 'b' },
  { id: '3', source: 'b', target: 'end' },
];

describe('Workflow V2 mapping model', () => {
  it('reads JSON Schema input fields and required markers', () => {
    expect(
      extractInputSchemaFields({
        type: 'object',
        required: ['orderId'],
        properties: {
          orderId: { type: 'string', description: '订单号' },
          limit: { type: 'integer' },
        },
      }),
    ).toEqual([
      {
        path: 'orderId',
        label: 'orderId',
        type: 'string',
        description: '订单号',
        required: true,
        enumValues: undefined,
      },
      {
        path: 'limit',
        label: 'limit',
        type: 'integer',
        description: undefined,
        required: false,
        enumValues: undefined,
      },
    ]);
  });

  it('flattens nested output schema paths', () => {
    expect(
      extractOutputSchemaFields({
        properties: {
          data: {
            type: 'object',
            properties: { id: { type: 'string' } },
          },
        },
      }).map((field) => field.path),
    ).toEqual(['data', 'data.id']);
  });

  it('returns transitive upstream nodes only', () => {
    expect([...getUpstreamNodeIds('end', edges)]).toEqual(['b', 'a', 'start']);
    expect([...getUpstreamNodeIds('a', edges)]).toEqual(['start']);
  });

  it('replaces a binding by target without duplicates', () => {
    const bindings = replaceInputBinding([], 'orderId', {
      type: 'START_INPUT',
      path: 'orderId',
    });
    expect(
      replaceInputBinding(bindings, 'orderId', {
        type: 'WORKFLOW_VARIABLE',
        variableName: 'orderId',
      }),
    ).toEqual([
      {
        target: 'orderId',
        source: {
          type: 'WORKFLOW_VARIABLE',
          variableName: 'orderId',
        },
      },
    ]);
  });

  it('reports missing required task inputs before publication', () => {
    const task = node('a', 'TASK');
    task.data.taskMeta = {
      schemaStatus: 'ready',
      inputSchema: {
        required: ['orderId'],
        properties: { orderId: { type: 'string' } },
      },
    };
    expect(collectMissingRequiredInputs([task])).toEqual([
      {
        nodeId: 'a',
        nodeName: 'a',
        field: 'orderId',
        message: '必填输入尚未映射',
      },
    ]);
  });

  it('rejects node output mappings that are no longer upstream', () => {
    const start = node('start', 'START');
    const a = node('a', 'TASK');
    const b = node('b', 'TASK');
    a.data.inputBindings = [
      {
        target: 'value',
        source: { type: 'NODE_OUTPUT', nodeKey: 'b', path: 'result' },
      },
    ];
    expect(collectMappingIssues([start, a, b], edges)).toEqual([
      {
        nodeId: 'a',
        nodeName: 'a',
        field: 'value',
        message: '只能引用拓扑上游节点',
      },
    ]);
  });
});
