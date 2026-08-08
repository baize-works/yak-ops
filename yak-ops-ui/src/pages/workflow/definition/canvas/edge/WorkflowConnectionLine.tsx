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
    targetX: toX + WORKFLOW_EDGE_HANDLE_OVERLAP,
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
        strokeDasharray="5 5"
        opacity={0.78}
      />
      <circle cx={toX} cy={toY} r={3.5} fill="#fe2c55" />
    </g>
  );
};

export default WorkflowConnectionLine;
