import { useCallback, useMemo, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  getBezierPath,
  type EdgeProps,
} from 'reactflow';
import type { WorkflowEdgeData } from '../types';
import WorkflowEdgeInsert from './WorkflowEdgeInsert';

const WorkflowEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
}: EdgeProps<WorkflowEdgeData>) => {
  const [hovered, setHovered] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);

  const [edgePath, labelX, labelY] = useMemo(
    () => getBezierPath({
      sourceX: sourceX - 8,
      sourceY,
      sourcePosition: Position.Right,
      targetX: targetX + 8,
      targetY,
      targetPosition: Position.Left,
      curvature: 0.16,
    }),
    [sourceX, sourceY, targetX, targetY],
  );

  const connectedNodeHovered = Boolean(data?.connectedNodeHovered);
  const highlighted = selected || connectedNodeHovered;
  const stroke = highlighted
    ? '#fe2c55'
    : hovered || insertOpen
      ? '#8a8f99'
      : '#cfd2d7';
  const insertOptions = data?.insertOptions || [];
  const canInsert = !data?.locked && insertOptions.length > 0 && Boolean(data?.onInsert);
  const insertVisible = canInsert && (hovered || selected || insertOpen);

  const handleSelect = useCallback((taskId: string) => {
    data?.onInsert?.(id, source, target, taskId);
    setInsertOpen(false);
  }, [data, id, source, target]);

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        style={{ cursor: canInsert ? 'pointer' : 'default', pointerEvents: 'stroke' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke,
          strokeWidth: highlighted ? 2.2 : 2,
          transition: 'stroke 150ms ease, stroke-width 150ms ease',
        }}
      />

      {canInsert ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: insertVisible ? 'all' : 'none',
              zIndex: 8,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => {
              if (!insertOpen) setHovered(false);
            }}
          >
            <WorkflowEdgeInsert
              open={insertOpen}
              visible={insertVisible}
              options={insertOptions}
              onOpenChange={setInsertOpen}
              onSelect={handleSelect}
            />
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
};

export default WorkflowEdge;
