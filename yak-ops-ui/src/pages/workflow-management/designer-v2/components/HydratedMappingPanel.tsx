import { useEffect, useMemo, useState } from 'react';

import { getUpstreamTaskNodes } from '../mapping';
import type {
  WorkflowV2CanvasNodeData,
  WorkflowV2CanvasTaskMeta,
  WorkflowV2FlowEdge,
  WorkflowV2FlowNode,
} from '../model';
import {
  loadPublishedTaskVersion,
  publishedVersionToTaskMeta,
  taskSchemaErrorMeta,
} from '../task-schema';
import MappingPanel from './MappingPanel';

interface HydratedMappingPanelProps {
  node: WorkflowV2FlowNode;
  nodes: WorkflowV2FlowNode[];
  edges: WorkflowV2FlowEdge[];
  onChange: (data: WorkflowV2CanvasNodeData) => void;
  onClose: () => void;
}

const HydratedMappingPanel = ({
  node,
  nodes,
  edges,
  onChange,
  onClose,
}: HydratedMappingPanelProps) => {
  const relevantNodes = useMemo(() => {
    const upstream = getUpstreamTaskNodes(node.id, nodes, edges);
    return node.data.kind === 'TASK' ? [node, ...upstream] : upstream;
  }, [edges, node, nodes]);
  const [metaByNode, setMetaByNode] = useState<
    Record<string, WorkflowV2CanvasTaskMeta>
  >({});

  useEffect(() => {
    let active = true;
    relevantNodes.forEach((current) => {
      const ref = current.data.taskRef;
      if (!ref || current.data.taskMeta?.schemaStatus === 'ready') return;
      setMetaByNode((state) => ({
        ...state,
        [current.id]: {
          ...current.data.taskMeta,
          schemaStatus: 'loading',
        },
      }));
      loadPublishedTaskVersion(ref)
        .then((version) => {
          if (!active) return;
          setMetaByNode((state) => ({
            ...state,
            [current.id]: publishedVersionToTaskMeta(
              version,
              state[current.id] ?? current.data.taskMeta,
            ),
          }));
        })
        .catch((error: unknown) => {
          if (!active) return;
          setMetaByNode((state) => ({
            ...state,
            [current.id]: taskSchemaErrorMeta(
              error,
              state[current.id] ?? current.data.taskMeta,
            ),
          }));
        });
    });
    return () => {
      active = false;
    };
  }, [relevantNodes]);

  const hydratedNodes = nodes.map((current) => {
    const taskMeta =
      metaByNode[current.id] ??
      (current.data.taskMeta?.schemaStatus === 'ready'
        ? current.data.taskMeta
        : undefined);
    return taskMeta
      ? { ...current, data: { ...current.data, taskMeta } }
      : current;
  });
  const hydratedNode =
    hydratedNodes.find((current) => current.id === node.id) ?? node;

  return (
    <MappingPanel
      node={hydratedNode}
      nodes={hydratedNodes}
      edges={edges}
      onChange={onChange}
      onClose={onClose}
    />
  );
};

export default HydratedMappingPanel;
