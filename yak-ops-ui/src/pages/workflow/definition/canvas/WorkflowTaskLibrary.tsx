import type { WorkflowTaskDefinition } from '@/services/workflow';
import {
  getWorkflowDefinition,
  type WorkflowDefinition,
} from '@/services/workflow/definitions';
import { history, useParams } from '@umijs/max';
import { Tooltip } from 'antd';
import {
  Activity,
  ChevronLeft,
  CircleHelp,
  GitBranch,
  History as HistoryIcon,
  Home,
  ScrollText,
  Workflow,
} from 'lucide-react';
import type { DragEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';

interface WorkflowTaskLibraryProps {
  tasks: WorkflowTaskDefinition[];
  loading: boolean;
  locked: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>, task: WorkflowTaskDefinition) => void;
}

interface WorkspaceNavItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  ONLINE: '已上线',
  OFFLINE: '已下线',
};

const WorkspaceNavItem = ({
  icon,
  label,
  active = false,
  disabled = false,
  onClick,
}: WorkspaceNavItemProps) => {
  const button = (
    <button
      type="button"
      disabled={disabled}
      className={[
        'flex h-9 w-full items-center gap-2.5 rounded-lg border-0 px-3 text-left text-[13px] font-medium transition-colors',
        active
          ? 'bg-[rgba(254,44,85,.07)] text-[#fe2c55]'
          : disabled
            ? 'cursor-not-allowed bg-transparent text-[#c0c4cc]'
            : 'bg-transparent text-[#475467] hover:bg-[#f5f6f7] hover:text-[#161823]',
      ].join(' ')}
      onClick={onClick}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );

  return disabled ? (
    <Tooltip title="即将支持" placement="right">
      <span className="block">{button}</span>
    </Tooltip>
  ) : button;
};

/**
 * The old permanent task library has been replaced by a workflow-scoped
 * workspace sidebar. Tasks are added on demand through WorkflowTaskPicker,
 * while this rail owns workflow-level navigation and identity.
 *
 * Keep the legacy props temporarily so WorkflowDefinitionEditor does not need
 * a high-risk orchestration rewrite just for the shell migration.
 */
const WorkflowTaskLibrary = (_props: WorkflowTaskLibraryProps) => {
  const { id = '' } = useParams<{ id: string }>();
  const [definition, setDefinition] = useState<WorkflowDefinition>();

  useEffect(() => {
    let active = true;
    if (!id) return undefined;

    void getWorkflowDefinition(id)
      .then((value) => {
        if (active) setDefinition(value);
      })
      .catch(() => {
        // The editor already owns the primary loading/error state. This
        // secondary identity request should never block the workspace shell.
      });

    return () => {
      active = false;
    };
  }, [id]);

  const workflowName = definition?.name || '工作流';
  const statusLabel = STATUS_LABEL[definition?.status || 'DRAFT'] || definition?.status || '草稿';

  return (
    <aside className="flex w-[216px] shrink-0 flex-col border-r border-[#e8e9ec] bg-white">
      <div className="flex h-[52px] shrink-0 items-center gap-1.5 border-b border-[#f0f1f3] px-3">
        <Tooltip title="返回工作流定义">
          <button
            type="button"
            aria-label="返回工作流定义"
            className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f5f6f7] hover:text-[#161823]"
            onClick={() => history.push('/workflow/definitions')}
          >
            <ChevronLeft size={15} />
          </button>
        </Tooltip>
        <Home size={13} className="text-[#98a2b3]" />
        <span className="text-[11px] text-[#c0c4cc]">/</span>
        <span className="truncate text-[12px] font-semibold text-[#344054]">工作流</span>
      </div>

      <div className="px-3 pb-3 pt-4">
        <div className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(254,44,85,.08)] text-[#fe2c55]">
            <GitBranch size={19} strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-[#161823]">{workflowName}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#98a2b3]">
              <span>工作流</span>
              <span className="text-[#d0d5dd]">·</span>
              <span>{statusLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3" aria-label="工作流工作区导航">
        <div className="space-y-1">
          <WorkspaceNavItem
            active
            label="编排"
            icon={<Workflow size={16} strokeWidth={1.9} />}
          />
          <WorkspaceNavItem
            label="运行记录"
            icon={<HistoryIcon size={16} strokeWidth={1.9} />}
            onClick={() => history.push('/workflow/instances')}
          />
          <WorkspaceNavItem
            disabled
            label="日志"
            icon={<ScrollText size={16} strokeWidth={1.9} />}
          />
          <WorkspaceNavItem
            disabled
            label="监控"
            icon={<Activity size={16} strokeWidth={1.9} />}
          />
        </div>
      </nav>

      <div className="border-t border-[#f0f1f3] p-3">
        <Tooltip title="帮助中心即将支持" placement="right">
          <button
            type="button"
            className="flex h-9 w-full cursor-default items-center gap-2.5 rounded-lg border-0 bg-transparent px-3 text-left text-[12px] text-[#98a2b3]"
          >
            <CircleHelp size={15} strokeWidth={1.9} />
            <span>帮助中心</span>
          </button>
        </Tooltip>
      </div>
    </aside>
  );
};

export default WorkflowTaskLibrary;
