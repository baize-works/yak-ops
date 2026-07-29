import { Input, Tooltip } from 'antd';
import {
  ArrowLeft,
  Check,
  CircleDot,
  Clock3,
  History,
  Play,
  Save,
  Settings2,
  SlidersHorizontal,
  Variable,
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

  const panelButton = (
    panel: Exclude<WorkflowPanelType, 'node' | null>,
    label: string,
    icon: ReactNode,
  ) => (
    <Tooltip title={label}>
      <button
        type="button"
        className={[
          'pointer-events-auto inline-flex h-[30px] items-center gap-1.5 rounded-md border-0 px-2.5',
          'text-[11px] transition-colors',
          activePanel === panel
            ? 'bg-[#f1f0ff] text-[#4f46e5]'
            : 'bg-transparent text-[#667085] hover:bg-[#f1f0ff] hover:text-[#4f46e5]',
        ].join(' ')}
        onClick={() => onOpenPanel(panel)}
      >
        {icon}
        <span>{label}</span>
      </button>
    </Tooltip>
  );

  return (
    <header
      className={[
        'pointer-events-none absolute left-3.5 right-3.5 top-3.5 z-30 grid items-center',
        'grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)] max-lg:grid-cols-[1fr_auto]',
      ].join(' ')}
    >
      <div className="justify-self-start flex min-w-0 items-center gap-2.5">
        <Tooltip title="返回工作流列表">
          <button
            type="button"
            className={[
              'pointer-events-auto flex h-[38px] w-[38px] items-center justify-center rounded-[10px]',
              'border border-[#d0d5dd]/80 bg-white/90 text-[#475467]',
              'shadow-[0_7px_20px_rgba(16,24,40,0.07)] backdrop-blur-[10px]',
              'hover:bg-white',
            ].join(' ')}
            onClick={onBack}
          >
            <ArrowLeft size={18} />
          </button>
        </Tooltip>

        <div
          className={[
            'pointer-events-auto flex h-[42px] min-w-0 items-center gap-2.5 rounded-[10px]',
            'border border-[#d0d5dd]/80 bg-white/90 px-2.5',
            'shadow-[0_7px_20px_rgba(16,24,40,0.07)] backdrop-blur-[10px]',
          ].join(' ')}
        >
          {editing ? (
            <Input
              autoFocus
              value={name}
              maxLength={255}
              onChange={(event) => setName(event.target.value)}
              onPressEnter={applyName}
              onBlur={applyName}
              className="h-[30px] w-[210px] px-1.5 text-xs"
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => setEditing(true)}
              className="min-w-0 border-0 bg-transparent p-0 text-left"
            >
              <strong className="block max-w-[230px] overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-4 text-[#1d2939]">
                {workflow?.name || '工作流设计器'}
              </strong>
              <span className="block font-mono text-[9px] leading-[13px] text-[#98a2b3]">
                {workflow?.code || '-'}
              </span>
            </button>
          )}
          <i
            className={[
              'inline-flex items-center gap-1 whitespace-nowrap rounded-[10px] px-1.5 py-[3px]',
              'text-[9px] not-italic',
              dirty
                ? 'bg-[#fffaeb] text-[#b54708]'
                : 'bg-[#ecfdf3] text-[#027a48]',
            ].join(' ')}
          >
            {dirty ? <CircleDot size={12} /> : <Check size={12} />}
            {dirty ? '有未保存修改' : '草稿已保存'}
          </i>
        </div>
      </div>

      <div
        className={[
          'justify-self-center flex h-[38px] items-center gap-0.5 rounded-[10px] p-[3px]',
          'border border-[#d0d5dd]/80 bg-white/90 shadow-[0_8px_24px_rgba(16,24,40,0.08)]',
          'backdrop-blur-[12px] max-lg:hidden',
        ].join(' ')}
      >
        {panelButton('variables', '变量', <Variable size={15} />)}
        {panelButton('environment', '环境变量', <SlidersHorizontal size={15} />)}
        {panelButton('history', '历史', <History size={15} />)}
        {panelButton('workflow-settings', '设置', <Settings2 size={15} />)}
      </div>

      <div className="justify-self-end flex items-center gap-2">
        <button
          type="button"
          className={[
            'pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5',
            'border border-[#d0d5dd] bg-white/95 text-xs font-semibold text-[#344054]',
            'shadow-[0_4px_12px_rgba(16,24,40,0.06)] max-sm:hidden',
          ].join(' ')}
          onClick={() => onOpenPanel('run')}
        >
          <Play size={15} />
          运行
        </button>
        <button
          type="button"
          className={[
            'pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5',
            'border-0 bg-[#5d5fef] text-xs font-semibold text-white',
            'shadow-[0_7px_16px_rgba(93,95,239,0.24)] disabled:cursor-not-allowed disabled:opacity-[0.55]',
          ].join(' ')}
          disabled={saving}
          onClick={onSave}
        >
          {saving ? <Clock3 size={15} /> : <Save size={15} />}
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </header>
  );
};

export default WorkflowHeader;
