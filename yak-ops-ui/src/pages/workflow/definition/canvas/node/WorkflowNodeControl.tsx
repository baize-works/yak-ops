import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';
import { Copy, MoreHorizontal, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface WorkflowNodeControlProps {
  nodeId: string;
  selected?: boolean;
  locked?: boolean;
  onDuplicate?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

const WorkflowNodeControl = ({
  nodeId,
  selected,
  locked,
  onDuplicate,
  onDelete,
}: WorkflowNodeControlProps) => {
  const [open, setOpen] = useState(false);

  const items = useMemo<MenuProps['items']>(() => [
    {
      key: 'duplicate',
      icon: <Copy size={13} />,
      label: '复制节点',
      disabled: !onDuplicate,
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <Trash2 size={13} />,
      label: '删除节点',
      danger: true,
      disabled: !onDelete,
    },
  ], [onDelete, onDuplicate]);

  if (locked || (!onDuplicate && !onDelete)) return null;

  return (
    <div
      className={[
        'absolute -top-7 right-0 z-30 flex h-7 pb-1 transition-opacity duration-150',
        selected || open
          ? 'visible opacity-100'
          : 'invisible opacity-0 group-hover:visible group-hover:opacity-100',
      ].join(' ')}
    >
      <div
        className="nodrag nopan flex h-6 items-center rounded-lg border border-[rgba(22,24,35,.08)] bg-[rgba(255,255,255,.96)] px-0.5 text-[#667085] shadow-[0_3px_10px_rgba(22,24,35,.12)] backdrop-blur-sm"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          open={open}
          onOpenChange={setOpen}
          menu={{
            items,
            onClick: ({ key }) => {
              if (key === 'duplicate') onDuplicate?.(nodeId);
              if (key === 'delete') onDelete?.(nodeId);
              setOpen(false);
            },
          }}
        >
          <button
            type="button"
            aria-label="节点操作"
            className="flex h-5 w-5 items-center justify-center rounded-md border-0 bg-transparent p-0 text-[#667085] hover:bg-[#f2f4f7] hover:text-[#161823]"
          >
            <MoreHorizontal size={14} strokeWidth={2} />
          </button>
        </Dropdown>
      </div>
    </div>
  );
};

export default WorkflowNodeControl;
