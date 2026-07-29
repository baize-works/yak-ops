import { useCallback, useMemo, useRef, useState } from 'react';
import type { WorkflowFlowEdge, WorkflowFlowNode } from '../../types';

interface HistoryFrame {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
}

const cloneFrame = (frame: HistoryFrame): HistoryFrame => ({
  nodes: frame.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: {
      ...node.data,
      config: JSON.parse(JSON.stringify(node.data.config || {})),
    },
  })),
  edges: frame.edges.map((edge) => ({ ...edge })),
});

export const useWorkflowHistory = () => {
  const pastRef = useRef<HistoryFrame[]>([]);
  const futureRef = useRef<HistoryFrame[]>([]);
  const [, forceUpdate] = useState(0);

  const refresh = () => forceUpdate((value) => value + 1);

  const record = useCallback((nodes: WorkflowFlowNode[], edges: WorkflowFlowEdge[]) => {
    pastRef.current.push(cloneFrame({ nodes, edges }));
    if (pastRef.current.length > 80) pastRef.current.shift();
    futureRef.current = [];
    refresh();
  }, []);

  const undo = useCallback(
    (nodes: WorkflowFlowNode[], edges: WorkflowFlowEdge[]) => {
      const frame = pastRef.current.pop();
      if (!frame) return null;
      futureRef.current.push(cloneFrame({ nodes, edges }));
      refresh();
      return cloneFrame(frame);
    },
    [],
  );

  const redo = useCallback(
    (nodes: WorkflowFlowNode[], edges: WorkflowFlowEdge[]) => {
      const frame = futureRef.current.pop();
      if (!frame) return null;
      pastRef.current.push(cloneFrame({ nodes, edges }));
      refresh();
      return cloneFrame(frame);
    },
    [],
  );

  const reset = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    refresh();
  }, []);

  /*
   * Keep the history API identity stable. The designer's initial-load callback
   * depends on this object, so returning a new object whenever canUndo/canRedo
   * changes causes the workflow to be fetched again after a drag or edit. The
   * getters still expose the latest stack state on every render.
   */
  return useMemo(
    () => ({
      record,
      undo,
      redo,
      reset,
      get canUndo() {
        return pastRef.current.length > 0;
      },
      get canRedo() {
        return futureRef.current.length > 0;
      },
    }),
    [record, redo, reset, undo],
  );
};
