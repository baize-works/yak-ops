import {
  Position,
  getBezierPath,
  type ConnectionLineComponentProps,
} from 'reactflow';
import { WORKFLOW_EDGE_HANDLE_OVERLAP } from '../constants';

const WorkflowConnectionLine = ({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition = Position.Right,
  toPosition = Position.Left,
}: ConnectionLineComponentProps) => {
  const [path] = getBezierPath({
    sourceX: fromX - WORKFLOW_EDGE_HANDLE_OVERLAP,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    curvature: 0.16,
  });

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="#fe2c55"
        strokeWidth={2}
      />
    </g>
  );
};

export default WorkflowConnectionLine;
