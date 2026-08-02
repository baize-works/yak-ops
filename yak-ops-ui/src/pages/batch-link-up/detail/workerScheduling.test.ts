import {
  buildSavePayload,
  normalizeEditDetail,
} from './model';

test('defaults historical task definitions to automatic scheduling', () => {
  const editor = normalizeEditDetail(
    {
      id: '1001',
      basic: {
        jobName: '历史任务',
        jobDesc: '',
        mode: 'GUIDE_SINGLE',
      },
      workflow: {
        nodes: [],
        edges: [],
      },
    },
    '1001',
  );

  expect(editor.worker).toEqual({
    mode: 'AUTO',
    nodeId: undefined,
    requiredLabels: [],
  });
});

test('keeps manual worker and label requirements in save payload', () => {
  const editor = normalizeEditDetail(
    {
      id: '1002',
      basic: {
        jobName: '手动节点任务',
        jobDesc: '固定到华南节点',
        mode: 'GUIDE_SINGLE',
      },
      workflow: {
        nodes: [],
        edges: [],
      },
      worker: {
        mode: 'MANUAL',
        nodeId: 'worker-south-01',
        requiredLabels: {
          region: 'south-china',
          storage: 'ssd',
        },
      },
    },
    '1002',
  );

  const payload = buildSavePayload(editor);

  expect(editor.worker.requiredLabels).toEqual([
    { key: 'region', value: 'south-china' },
    { key: 'storage', value: 'ssd' },
  ]);
  expect(payload.worker).toEqual({
    mode: 'MANUAL',
    nodeId: 'worker-south-01',
    requiredLabels: {
      region: 'south-china',
      storage: 'ssd',
    },
  });
});

test('automatic scheduling omits stale manual node id', () => {
  const editor = normalizeEditDetail(
    {
      id: '1003',
      basic: {
        jobName: '自动节点任务',
        jobDesc: '',
        mode: 'GUIDE_MULTI',
      },
      workflow: {
        nodes: [],
        edges: [],
      },
      worker: {
        mode: 'AUTO',
        nodeId: 'legacy-manual-node',
        requiredLabels: {
          region: 'east-china',
        },
      },
    },
    '1003',
  );

  expect(buildSavePayload(editor).worker).toEqual({
    mode: 'AUTO',
    nodeId: undefined,
    requiredLabels: {
      region: 'east-china',
    },
  });
});
