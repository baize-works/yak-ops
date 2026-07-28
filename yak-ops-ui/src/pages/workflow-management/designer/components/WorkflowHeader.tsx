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
} from '../../types';

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
        className={activePanel === panel ? 'is-active' : ''}
        onClick={() => onOpenPanel(panel)}
      >
        {icon}
        <span>{label}</span>
      </button>
    </Tooltip>
  );

  return (
    <header className="dify-workflow-header">
      <div className="dify-workflow-header__left">
        <Tooltip title="返回工作流列表">
          <button type="button" className="is-icon" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
        </Tooltip>
        <div className="dify-workflow-header__title">
          {editing ? (
            <Input
              autoFocus
              value={name}
              maxLength={255}
              onChange={(event) => setName(event.target.value)}
              onPressEnter={applyName}
              onBlur={applyName}
            />
          ) : (
            <button type="button" onDoubleClick={() => setEditing(true)}>
              <strong>{workflow?.name || '工作流设计器'}</strong>
              <span>{workflow?.code || '-'}</span>
            </button>
          )}
          <i className={dirty ? 'is-dirty' : ''}>
            {dirty ? <CircleDot size={12} /> : <Check size={12} />}
            {dirty ? '有未保存修改' : '草稿已保存'}
          </i>
        </div>
      </div>

      <div className="dify-workflow-header__center">
        {panelButton('variables', '变量', <Variable size={15} />)}
        {panelButton('environment', '环境变量', <SlidersHorizontal size={15} />)}
        {panelButton('history', '历史', <History size={15} />)}
        {panelButton('workflow-settings', '设置', <Settings2 size={15} />)}
      </div>

      <div className="dify-workflow-header__right">
        <button type="button" className="is-secondary" onClick={() => onOpenPanel('run')}>
          <Play size={15} />
          运行
        </button>
        <button type="button" className="is-primary" disabled={saving} onClick={onSave}>
          {saving ? <Clock3 size={15} /> : <Save size={15} />}
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </header>
  );
};

export default WorkflowHeader;
