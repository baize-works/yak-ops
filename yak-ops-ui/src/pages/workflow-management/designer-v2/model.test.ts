import type { WorkflowPublishedTask } from '../repository/workflow-task-library.repository';
import {
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
  inputSchema: { required: ['orderId'] },
  outputSchema: { type: 'object' },
  contentDigest: 'digest',
  publishedBy: 'admin',
  publishedAt: '2026-08-05T00:30:00',
  updatedAt: '2026-08-05T00:30:00',
  favorite: false,
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
    expect(node.deletable).toBe(true);
    expect(node.data.taskRef).toEqual({
      taskId: '1001',
      taskVersionId: '2003',
      taskVersionNumber: 3,
      taskType: 'HTTP',
    });
    expect(node.data).not.toHaveProperty('config');
    expect(node.data).not.toHaveProperty('definition');
    expect(node.data).not.toHaveProperty('compiledSpec');
  });

  it('protects control nodes while keeping task nodes deletable', () => {
    const dag = createInitialWorkflowV2Dag();
    dag.nodes.splice(1, 0, {
      key: 'task_1',
      name: '任务',
      kind: 'TASK',
      positionX: 420,
      positionY: 220,
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

    const nodes = toFlowNodes(dag);
    expect(nodes.find((node) => node.id === 'start')?.deletable).toBe(false);
    expect(nodes.find((node) => node.id === 'end')?.deletable).toBe(false);
    expect(nodes.find((node) => node.id === 'task_1')?.deletable).toBe(true);
  });

  it('preserves SUCCESS and FAILURE source ports when saving', () => {
    const initial = createInitialWorkflowV2Dag();
    const taskNode = createTaskFlowNode(task(), { x: 420, y: 220 });
    const nodes = [
      {
        id: 'start',
        type: 'workflowV2Node',
        position: { x: 140, y: 220 },
        data: {
          title: initial.nodes[0].name,
          description: initial.nodes[0].description,
          kind: initial.nodes[0].kind,
          enabled: true,
          inputBindings: [],
          outputBindings: {},
          executionPolicy: initial.nodes[0].executionPolicy,
        },
      },
      taskNode,
      {
        id: 'end',
        type: 'workflowV2Node',
        position: { x: 760, y: 220 },
        data: {
          title: initial.nodes[1].name,
          description: initial.nodes[1].description,
          kind: initial.nodes[1].kind,
          enabled: true,
          inputBindings: [],
          outputBindings: {},
          executionPolicy: initial.nodes[1].executionPolicy,
        },
      },
    ];
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

  it('rejects malformed drag payloads', () => {
    expect(decodeTaskDragPayload('')).toBeUndefined();
    expect(decodeTaskDragPayload('{"taskId":"1"}')).toBeUndefined();
    expect(decodeTaskDragPayload(encodeTaskDragPayload(task()))?.taskId).toBe(
      '1001',
    );
  });
});
