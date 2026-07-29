import {
  WORKFLOW_QUICK_ADD_EVENT,
  openWorkflowQuickAdd,
  type WorkflowQuickAddContext,
} from './events';

describe('workflow quick-add events', () => {
  it('dispatches append context for shared add triggers', () => {
    const listener = jest.fn();
    window.addEventListener(WORKFLOW_QUICK_ADD_EVENT, listener);

    const context: WorkflowQuickAddContext = {
      mode: 'append',
      sourceNodeId: 'http_1',
    };
    openWorkflowQuickAdd(context);

    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual(context);

    window.removeEventListener(WORKFLOW_QUICK_ADD_EVENT, listener);
  });

  it('keeps edge insertion metadata intact', () => {
    const listener = jest.fn();
    window.addEventListener(WORKFLOW_QUICK_ADD_EVENT, listener);

    const context: WorkflowQuickAddContext = {
      mode: 'insert',
      sourceNodeId: 'http_1',
      targetNodeId: 'shell_1',
      edgeId: 'edge_http_shell',
      position: { x: 320, y: 180 },
    };
    openWorkflowQuickAdd(context);

    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual(context);

    window.removeEventListener(WORKFLOW_QUICK_ADD_EVENT, listener);
  });
});
