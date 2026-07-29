import { getNodeMeta, WORKFLOW_NODE_CATALOG } from './constants';
import { mergeTaskPluginCatalog } from './taskPluginCatalog';

describe('task plugin catalog', () => {
  const originalCatalog = WORKFLOW_NODE_CATALOG.map((item) => ({
    ...item,
    defaults: { ...item.defaults },
  }));

  afterEach(() => {
    WORKFLOW_NODE_CATALOG.splice(
      0,
      WORKFLOW_NODE_CATALOG.length,
      ...originalCatalog.map((item) => ({
        ...item,
        defaults: { ...item.defaults },
      })),
    );
  });

  it('only merges defaults for the supported HTTP and Shell plugins', () => {
    mergeTaskPluginCatalog([
      {
        type: 'HTTP',
        name: 'HTTP',
        description: 'HTTP task',
        category: 'GENERAL',
        version: '1.0.0',
        cancellable: true,
        outputCapable: true,
        configurationSchema: {
          fields: {
            requestTimeoutSeconds: {
              type: 'number',
              required: false,
              defaultValue: 30,
            },
            followRedirects: {
              type: 'boolean',
              required: false,
              defaultValue: true,
            },
          },
        },
      },
      {
        type: 'PYTHON',
        name: 'Python',
        description: 'Python task',
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

    expect(WORKFLOW_NODE_CATALOG.map((item) => item.type)).toEqual([
      'START',
      'END',
      'HTTP',
      'SHELL',
    ]);
    expect(getNodeMeta('HTTP').defaults).toMatchObject({
      requestTimeoutSeconds: 60,
      followRedirects: true,
    });
    expect(getNodeMeta('PYTHON').title).toBe('不支持的节点');
  });
});
