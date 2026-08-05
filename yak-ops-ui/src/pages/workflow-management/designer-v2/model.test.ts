import type {
  WorkflowPublishedTask,
  WorkflowPublishedTaskVersion,
} from '../repository/workflow-task-library.repository';
import {
  applyPublishedTaskVersion,
  createInitialWorkflowV2Dag,
  createTaskFlowNode,
  decodeTaskDragPayload,
  encodeTaskDragPayload,
  toFlowNodes,
  toWorkflowV2Dag,
} from './model';

const task = (): WorkflowPublishedTask => ({
  taskId: '1001',
  name: '查询订单',
  description: '根据订单号查询订单',
  projectId: '10',
  projectCode: 'order',
  projectName: '订单中心',
  folderId: '20',
  folderName: '接口任务',
  taskType: 'HTTP',
  engineType: 'HTTP',
  publishedVersionId: '2003',
  publishedVersionNumber: 3,
  pluginVersion: '1.0.0',
  schemaVersion: 1,
  inputSchema: {
    type: 'object',
    required: ['orderId'],
    properties: { orderId: { type: 'string' } },
  },
  outputSchema: {
    type: 'object',
    properties: { data: { type: 'object' } },
  },
  contentDigest: 'digest',
  publishedBy: 'admin',
  publishedAt: '2026-08-05T00:30:00',
  updatedAt: '2026-08-05T00:30:00',
  favorite: false,
});

const version = (): WorkflowPublishedTaskVersion => ({
  taskId: '1001',
  taskName: '查询订单',
  projectId: '10',
  projectName: '订单中心',
  taskType: 'HTTP',
  versionId: '2003',
  versionNumber: 3,
  pluginVersion: '1.0.0',
  schemaVersion: 1,
  inputSchema: task().inputSchema,
  outputSchema: task().outputSchema,
  contentDigest: 'digest',
  publishedAt: '2026-08-05T00:30:00',
  currentVersion: true,
});

describe('Workflow V2 designer model', () => {
  it('creates a valid START to END initial workflow', () => {
    const dag = createInitialWorkflowV2Dag();
    expect(dag.schemaVersion).toBe(2);
    expect(dag.nodes.map((node) => node.kind)).toEqual(['START', 'END']);
    expect(dag.edges).toEqual([
      { from: 'start', fromPort: 'SUCCESS', to: 'end' },
    ]);
  });

  it('copies only an immutable task reference into a dropped task node', () => {
    const node = createTaskFlowNode(task(), { x: 300, y: 200 });
    expect(node.data.taskRef).toEqual({
      taskId: '1001',
      taskVersionId: '2003',
      taskVersionNumber: 3,
      taskType: 'HTTP',
    });
    expect(node.data.taskMeta?.schemaStatus).toBe('ready');
    expect(node.data).not.toHaveProperty('config');
    expect(node.data).not.toHaveProperty('definition');
    expect(node.data).not.toHaveProperty('compiledSpec');
  });

  it('hydrates schemas for a restored immutable task version', () => {
    const dag = createInitialWorkflowV2Dag();
    dag.nodes.splice(1, 0, {
      key: 'task_1',
      name: '查询订单',
      kind: 'TASK',
      positionX: 400,
      positionY: 200,
      enabled: true,
      taskRef: {
        taskId: '1001',
        taskVersionId: '2003',
        taskVersionNumber: 3,
        taskType: 'HTTP',
      },
      inputBindings: [],
      outputBindings: {},
      executionPolicy: dag.nodes[0].executionPolicy,
    });
    const restored = toFlowNodes(dag).find((node) => node.id === 'task_1')!;
    expect(restored.data.taskMeta?.schemaStatus).toBe('loading');
    const hydrated = applyPublishedTaskVersion(restored, version());
    expect(hydrated.data.taskMeta?.schemaStatus).toBe('ready');
    expect(hydrated.data.taskMeta?.inputSchema).toEqual(task().inputSchema);
  });

  it('preserves input and output bindings when saving', () => {
    const initial = createInitialWorkflowV2Dag();
    const taskNode = createTaskFlowNode(task(), { x: 420, y: 220 });
    taskNode.data.inputBindings = [
      {
        target: 'orderId',
        source: { type: 'START_INPUT', path: 'orderId' },
      },
    ];
    const nodes = toFlowNodes(initial);
    nodes.splice(1, 0, taskNode);
    const end = nodes.find((node) => node.id === 'end')!;
    end.data.outputBindings = {
      order: {
        type: 'NODE_OUTPUT',
        nodeKey: taskNode.id,
        path: 'data',
      },
    };
    const dag = toWorkflowV2Dag(
      nodes,
      [
        {
          id: 'success',
          source: 'start',
          sourceHandle: 'SUCCESS',
          target: taskNode.id,
        },
        {
          id: 'end-edge',
          source: taskNode.id,
          sourceHandle: 'SUCCESS',
          target: 'end',
        },
      ],
      { x: 0, y: 0, zoom: 1 },
    );
    expect(dag.nodes.find((node) => node.key === taskNode.id)?.inputBindings)
      .toEqual(taskNode.data.inputBindings);
    expect(dag.nodes.find((node) => node.key === 'end')?.outputBindings)
      .toEqual(end.data.outputBindings);
  });

  it('preserves SUCCESS and FAILURE source ports when saving', () => {
    const initial = createInitialWorkflowV2Dag();
    const taskNode = createTaskFlowNode(task(), { x: 420, y: 220 });
    const nodes = toFlowNodes(initial);
    nodes.splice(1, 0, taskNode);
    const dag = toWorkflowV2Dag(
      nodes,
      [
        {
          id: 'success',
          source: 'start',
          sourceHandle: 'SUCCESS',
          target: taskNode.id,
        },
        {
          id: 'failure',
          source: taskNode.id,
          sourceHandle: 'FAILURE',
          target: 'end',
        },
      ],
      { x: 0, y: 0, zoom: 1 },
    );
    expect(dag.edges).toEqual([
      { from: 'start', fromPort: 'SUCCESS', to: taskNode.id },
      { from: taskNode.id, fromPort: 'FAILURE', to: 'end' },
    ]);
  });

  it('protects control nodes while task nodes remain deletable', () => {
    const controlNodes = toFlowNodes(createInitialWorkflowV2Dag());
    expect(controlNodes.find((node) => node.id === 'start')?.deletable).toBe(false);
    expect(controlNodes.find((node) => node.id === 'end')?.deletable).toBe(false);
    expect(createTaskFlowNode(task(), { x: 0, y: 0 }).deletable).toBe(true);
  });

  it('rejects malformed drag payloads', () => {
    expect(decodeTaskDragPayload('')).toBeUndefined();
    expect(decodeTaskDragPayload('{"taskId":"1"}')).toBeUndefined();
    expect(decodeTaskDragPayload(encodeTaskDragPayload(task()))?.taskId).toBe(
      '1001',
    );
  });
});
