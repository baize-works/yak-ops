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

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return useMemo(() => ({
    record,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  }), [canRedo, canUndo, record, redo, reset, undo]);
};
