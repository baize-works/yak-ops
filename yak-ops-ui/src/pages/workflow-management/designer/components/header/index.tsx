import { Input, Tooltip } from 'antd';
import {
  Activity,
  Braces,
  Check,
  ChevronLeft,
  CircleDot,
  CircleHelp,
  Clock3,
  History,
  Home,
  Play,
  Save,
  Settings2,
  SlidersHorizontal,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type {
  WorkflowDefinitionRecord,
  WorkflowPanelType,
} from '../../../types';

interface WorkflowHeaderProps {
  workflow?: WorkflowDefinitionRecord;
  dirty: boolean;
  saving: boolean;
  activePanel: WorkflowPanelType;
  onBack: () => void;
  onRename: (name: string) => void;
  onSave: () => void;
  onOpenPanel: (panel: Exclude<WorkflowPanelType, 'node' | null>) => void;
}

const WorkflowHeader = ({
  workflow,
  dirty,
  saving,
  activePanel,
  onBack,
  onRename,
  onSave,
  onOpenPanel,
}: WorkflowHeaderProps) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(workflow?.name || '工作流');

  useEffect(() => setName(workflow?.name || '工作流'), [workflow?.name]);

  const applyName = () => {
    const normalized = name.trim();
    if (normalized && normalized !== workflow?.name) onRename(normalized);
    else setName(workflow?.name || '工作流');
    setEditing(false);
  };

  const topIconButton = (
    panel: Exclude<WorkflowPanelType, 'node' | null>,
    label: string,
    icon: ReactNode,
  ) => (
    <Tooltip title={label}>
      <button
        type="button"
        className={[
          'inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-lg border px-2.5',
          'text-[12px] font-medium transition-colors',
          activePanel === panel
            ? 'border-[#b2ccff] bg-[#eff4ff] text-[#155eef]'
            : 'border-[#e4e7ec] bg-white text-[#475467] hover:bg-[#f9fafb] hover:text-[#344054]',
        ].join(' ')}
        onClick={() => onOpenPanel(panel)}
      >
        {icon}
        <span className="max-xl:hidden">{label}</span>
      </button>
    </Tooltip>
  );

  const sideNavButton = (
    panel: Exclude<WorkflowPanelType, 'node' | null> | 'canvas',
    label: string,
    icon: ReactNode,
  ) => {
    const active =
      panel === 'canvas'
        ? activePanel === null || activePanel === 'node'
        : activePanel === panel;

    return (
      <button
        type="button"
        className={[
          'flex h-10 w-full items-center gap-3 rounded-lg border-0 px-3 text-left text-[13px]',
          'font-medium transition-colors',
          active
            ? 'bg-[#eaf0ff] text-[#155eef]'
            : 'bg-transparent text-[#475467] hover:bg-[#f2f4f7] hover:text-[#344054]',
        ].join(' ')}
        onClick={() => {
          if (panel === 'canvas') {
            if (activePanel && activePanel !== 'node') onOpenPanel(activePanel);
            return;
          }
          onOpenPanel(panel);
        }}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      <aside className="absolute inset-y-0 left-0 z-50 hidden w-[220px] flex-col border-r border-[#e4e7ec] bg-white lg:flex">
        <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-[#eaecf0] px-3">
          <Tooltip title="返回工作流列表">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7] hover:text-[#344054]"
              onClick={onBack}
            >
              <ChevronLeft size={17} />
            </button>
          </Tooltip>
          <Home size={15} className="text-[#98a2b3]" />
          <span className="text-[#d0d5dd]">/</span>
          <strong className="text-[13px] font-semibold text-[#344054]">工作流</strong>
        </div>

        <div className="px-3 pb-3 pt-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dbe4ff] bg-[#eef3ff] text-[#155eef]">
              <WorkflowIcon size={20} />
            </span>
            <div className="min-w-0 flex-1">
              {editing ? (
                <Input
                  autoFocus
                  value={name}
                  maxLength={255}
                  onChange={(event) => setName(event.target.value)}
                  onPressEnter={applyName}
                  onBlur={applyName}
                  className="h-8 px-2 text-[13px]"
                />
              ) : (
                <button
                  type="button"
                  className="block w-full border-0 bg-transparent p-0 text-left"
                  onDoubleClick={() => setEditing(true)}
                >
                  <strong
                    className="block overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-semibold text-[#101828]"
                    title={workflow?.name}
                  >
                    {workflow?.name || '工作流设计器'}
                  </strong>
                  <span className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[10px] uppercase tracking-[0.04em] text-[#98a2b3]">
                    {workflow?.code || 'WORKFLOW'}
                  </span>
                </button>
              )}
            </div>
            <Tooltip title="工作流设置">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-[#98a2b3] hover:bg-[#f2f4f7] hover:text-[#475467]"
                onClick={() => onOpenPanel('workflow-settings')}
              >
                <Settings2 size={15} />
              </button>
            </Tooltip>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {sideNavButton('canvas', '编排', <WorkflowIcon size={17} />)}
          {sideNavButton('variables', '变量', <Braces size={17} />)}
          {sideNavButton(
            'environment',
            '环境变量',
            <SlidersHorizontal size={17} />,
          )}
          {sideNavButton('history', '历史版本', <History size={17} />)}
          {sideNavButton('run', '调试运行', <Activity size={17} />)}
        </nav>

        <div className="mt-auto flex h-14 items-center justify-between border-t border-[#eaecf0] px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#155eef] text-[11px] font-semibold text-white">
              Y
            </span>
            <span className="text-[12px] font-medium text-[#475467]">Yak Ops</span>
          </div>
          <CircleHelp size={17} className="text-[#98a2b3]" />
        </div>
      </aside>

      <header className="absolute left-[220px] right-0 top-0 z-50 flex h-[52px] items-center justify-between border-b border-[#e4e7ec] bg-white px-3 max-lg:left-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="hidden items-center gap-2 max-lg:flex">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7]"
              onClick={onBack}
            >
              <ChevronLeft size={17} />
            </button>
            <strong className="max-w-[180px] truncate text-[13px] text-[#344054]">
              {workflow?.name || '工作流'}
            </strong>
          </div>

          <span className="hidden text-[12px] text-[#667085] lg:inline">草稿状态</span>
          <i
            className={[
              'hidden items-center gap-1 rounded-full px-2 py-1 text-[11px] not-italic lg:inline-flex',
              dirty
                ? 'bg-[#fffaeb] text-[#b54708]'
                : 'bg-[#ecfdf3] text-[#027a48]',
            ].join(' ')}
          >
            {dirty ? <CircleDot size={12} /> : <Check size={12} />}
            {dirty ? '有未保存修改' : '草稿已保存'}
          </i>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={[
              'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium',
              activePanel === 'run'
                ? 'border-[#b2ccff] bg-[#eff4ff] text-[#155eef]'
                : 'border-[#e4e7ec] bg-white text-[#475467] hover:bg-[#f9fafb]',
            ].join(' ')}
            onClick={() => onOpenPanel('run')}
          >
            <Play size={15} />
            预览
          </button>

          <div className="hidden items-center gap-2 md:flex">
            {topIconButton('variables', '变量', <Braces size={15} />)}
            {topIconButton(
              'environment',
              '环境',
              <SlidersHorizontal size={15} />,
            )}
            {topIconButton('history', '历史', <History size={15} />)}
            {topIconButton('workflow-settings', '设置', <Settings2 size={15} />)}
          </div>

          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border-0 bg-[#155eef] px-3.5 text-[12px] font-semibold text-white shadow-[0_4px_10px_rgba(21,94,239,0.22)] hover:bg-[#004eeb] disabled:cursor-not-allowed disabled:opacity-[0.55]"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? <Clock3 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </header>
    </>
  );
};

export default WorkflowHeader;
