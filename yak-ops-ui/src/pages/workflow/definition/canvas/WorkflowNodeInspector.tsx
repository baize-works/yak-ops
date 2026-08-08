import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { Copy, Ellipsis, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Node } from 'reactflow';
import type { WorkflowCanvasTaskOption, WorkflowNodeData } from './types';
import WorkflowNodeIcon from './node/icons/WorkflowNodeIcon';
import WorkflowNodeInspectorLastRun from './WorkflowNodeInspectorLastRun';
import WorkflowNodeInspectorSettings from './WorkflowNodeInspectorSettings';
import type { WorkflowInspectorNextNode } from './WorkflowNodeInspectorSettings';

type InspectorTab = 'settings' | 'lastRun';

interface WorkflowNodeInspectorProps {
  node: Node<WorkflowNodeData>;
  locked: boolean;
  definitionId: string;
  nextNodes: WorkflowInspectorNextNode[];
  appendOptions: WorkflowCanvasTaskOption[];
  onChange: (patch: Partial<WorkflowNodeData>) => void;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAppend: (taskId: string) => void;
}

const ActionButton = ({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
}) => (
  <button
    type="button"
    aria-label={label}
    className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#667085] transition-colors hover:bg-[#f2f4f7] hover:text-[#344054]"
    onClick={onClick}
  >
    {children}
  </button>
);

const WorkflowNodeInspector = ({
  node,
  locked,
  definitionId,
  nextNodes,
  appendOptions,
  onChange,
  onClose,
  onDuplicate,
  onDelete,
  onAppend,
}: WorkflowNodeInspectorProps) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('settings');

  useEffect(() => {
    setActiveTab('settings');
  }, [node.id]);

  const menuItems = useMemo<MenuProps['items']>(() => [
    {
      key: 'duplicate',
      icon: <Copy size={14} />,
      label: '复制节点',
      disabled: locked,
      onClick: onDuplicate,
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <Trash2 size={14} />,
      label: '删除节点',
      danger: true,
      disabled: locked,
      onClick: onDelete,
    },
  ], [locked, onDelete, onDuplicate]);

  return (
    <aside className="absolute bottom-3 right-3 top-3 z-20 flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#e2e5e9] bg-white shadow-[0_12px_36px_rgba(22,24,35,.12)]">
      <header className="shrink-0 border-b border-[#eceef1] bg-white">
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <WorkflowNodeIcon taskType={node.data.taskType} size="sm" />
          <div className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#161823]">
            {node.data.label}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <ActionButton label="复制节点" onClick={locked ? undefined : onDuplicate}>
              <Copy size={15} />
            </ActionButton>
            <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
              <span>
                <ActionButton label="更多操作">
                  <Ellipsis size={16} />
                </ActionButton>
              </span>
            </Dropdown>
            <div className="mx-1 h-4 w-px bg-[#e7e9ed]" />
            <ActionButton label="关闭" onClick={onClose}>
              <X size={16} />
            </ActionButton>
          </div>
        </div>

        <div className="px-4 pb-2 text-[11px] leading-5 text-[rgba(22,24,35,.36)]">
          配置此任务节点在工作流中的编排、重试、超时和异常处理行为。
        </div>

        <nav className="flex h-10 items-end gap-5 px-4" aria-label="节点配置页签">
          <button
            type="button"
            className={[
              'relative h-10 border-0 bg-transparent px-0 text-[12px] font-semibold transition-colors',
              activeTab === 'settings' ? 'text-[#344054]' : 'text-[#667085] hover:text-[#344054]',
            ].join(' ')}
            onClick={() => setActiveTab('settings')}
          >
            设置
            {activeTab === 'settings' ? <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#fe2c55]" /> : null}
          </button>
          <button
            type="button"
            className={[
              'relative h-10 border-0 bg-transparent px-0 text-[12px] font-semibold transition-colors',
              activeTab === 'lastRun' ? 'text-[#344054]' : 'text-[#667085] hover:text-[#344054]',
            ].join(' ')}
            onClick={() => setActiveTab('lastRun')}
          >
            上次运行
            {activeTab === 'lastRun' ? <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#fe2c55]" /> : null}
          </button>
        </nav>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {activeTab === 'settings' ? (
          <WorkflowNodeInspectorSettings
            node={node}
            locked={locked}
            nextNodes={nextNodes}
            appendOptions={appendOptions}
            onChange={onChange}
            onAppend={onAppend}
          />
        ) : (
          <WorkflowNodeInspectorLastRun definitionId={definitionId} nodeId={node.id} />
        )}
      </div>
    </aside>
  );
};

export default WorkflowNodeInspector;
