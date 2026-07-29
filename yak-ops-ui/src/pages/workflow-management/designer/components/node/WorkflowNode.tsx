import type { NodeProps } from 'reactflow';
import type { WorkflowNodeData } from '../../../types';
import { getNodeMeta } from '../../constants';
import BaseNode from './BaseNode';
import NodeContent from './components/NodeContent';
import NoteNode from './components/NoteNode';

const WorkflowNode = ({ id, data, selected }: NodeProps<WorkflowNodeData>) => {
  if (data.nodeType === 'NOTE') return <NoteNode data={data} selected={selected} />;

  const meta = getNodeMeta(data.nodeType);

  return (
    <BaseNode id={id} data={data} meta={meta} selected={selected}>
      <NodeContent data={data} />
    </BaseNode>
  );
};

export default WorkflowNode;
