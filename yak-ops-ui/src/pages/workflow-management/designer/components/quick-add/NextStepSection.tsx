import { ChevronRight } from 'lucide-react';
import type { CSSProperties } from 'react';

import type { WorkflowFlowNode } from '../../../types';
import { getNodeMeta } from '../../constants';
import NodeIcon from '../node/NodeIcon';
import { PanelSection } from '../panel/node/shared';
import QuickAddButton from './QuickAddButton';

interface NextStepSectionProps {
  nodes: WorkflowFlowNode[];
  onAdd: () => void;
  onOpenNode: (nodeId: string) => void;
}

const NextStepSection = ({
  nodes,
  onAdd,
  onOpenNode,
}: NextStepSectionProps) => (
  <PanelSection
    title="下一步"
    description="添加此工作流中的下一个节点"
  >
    <div className="space-y-2">
      {nodes.map((node) => {
        const meta = getNodeMeta(node.data.nodeType);
        return (
          <button
            key={node.id}
            type="button"
            className={[
              'group flex min-h-[38px] w-full items-center gap-2',
              'rounded-lg border border-[#e4e7ec] bg-white px-2.5 text-left',
              'shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
              'transition-colors duration-150',
              'hover:border-[var(--yak-brand-color-border)] hover:bg-[var(--yak-brand-color-soft)]',
            ].join(' ')}
            style={{ '--node-color': meta.color } as CSSProperties}
            onClick={() => onOpenNode(node.id)}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--node-color)_10%,white)]">
              <NodeIcon type={node.data.nodeType} size={15} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#344054]">
              {node.data.title}
            </span>
            <ChevronRight
              size={14}
              className="shrink-0 text-[#98a2b3] group-hover:text-[var(--yak-brand-color)]"
            />
          </button>
        );
      })}

      <QuickAddButton
        label={nodes.length ? '添加并行节点' : '添加后续节点'}
        variant="panel"
        onClick={onAdd}
      />
    </div>
  </PanelSection>
);

export default NextStepSection;
