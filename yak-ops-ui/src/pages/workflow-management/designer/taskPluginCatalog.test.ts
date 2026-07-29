import { getNodeMeta, WORKFLOW_NODE_CATALOG } from './constants';
import { mergeTaskPluginCatalog } from './taskPluginCatalog';

describe('task plugin catalog', () => {
  const originalLength = WORKFLOW_NODE_CATALOG.length;

  afterEach(() => {
    WORKFLOW_NODE_CATALOG.splice(originalLength);
  });

  it('adds an unknown backend plugin as a generic integration node', () => {
    mergeTaskPluginCatalog([
      {
        type: 'PYTHON',
        name: 'Python',
        description: '运行 Python 脚本',
        category: 'SYSTEM',
        version: '1.0.0',
        cancellable: true,
        outputCapable: true,
        configurationSchema: {
          fields: {
            script: {
              type: 'string',
              required: true,
              defaultValue: 'print("hello")',
            },
          },
        },
      },
    ]);

    expect(getNodeMeta('PYTHON')).toMatchObject({
      type: 'PYTHON',
      backendType: 'PYTHON',
      title: 'Python',
      category: 'integration',
      defaults: { script: 'print("hello")' },
    });
  });
});
