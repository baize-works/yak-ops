import type { WorkflowFailureStrategy } from '@/services/workflow';
import type { WorkflowDefinition } from '@/services/workflow/definitions';
import { history } from '@umijs/max';
import { Button, Input, InputNumber, Popconfirm, Popover, Select } from 'antd';
import { ArrowLeft, CloudOff, CloudUpload, RotateCcw, Save, Settings2 } from 'lucide-react';
import type { ReactNode } from 'react';

const WORKFLOW_FAILURE_OPTIONS = [
  { value: 'CONTINUE_INDEPENDENT_BRANCHES', label: '独立分支继续' },
  { value: 'FAIL_FAST', label: '失败快速结束' },
  { value: 'TERMINATE_ALL', label: '终止全部节点' },
];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  ONLINE: '已上线',
  OFFLINE: '已下线',
};

interface WorkflowToolbarProps {
  definition?: WorkflowDefinition;
  name: string;
  description: string;
  workflowInputText: string;
  workflowTimeoutSeconds: number;
  failureStrategy: WorkflowFailureStrategy;
  nodesCount: number;
  edgesCount: number;
  locked: boolean;
  saving: boolean;
  statusAction: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onWorkflowInputChange: (value: string) => void;
  onWorkflowTimeoutChange: (value: number) => void;
  onFailureStrategyChange: (value: WorkflowFailureStrategy) => void;
  onClear: () => void;
  onSave: () => void;
  onOnline: () => void;
  onOffline: () => void;
}

const ConfigLabel = ({ children }: { children: ReactNode }) => (
  <div className="text-[12px] font-medium text-[#161823]">{children}</div>
);

const WorkflowToolbar = ({
  definition,
  name,
  description,
  workflowInputText,
  workflowTimeoutSeconds,
  failureStrategy,
  nodesCount,
  edgesCount,
  locked,
  saving,
  statusAction,
  onNameChange,
  onDescriptionChange,
  onWorkflowInputChange,
  onWorkflowTimeoutChange,
  onFailureStrategyChange,
  onClear,
  onSave,
  onOnline,
  onOffline,
}: WorkflowToolbarProps) => {
  const runtimeConfig = (
    <div className="w-[360px] space-y-3">
      <div>
        <ConfigLabel>失败策略</ConfigLabel>
        <Select className="mt-1 w-full" value={failureStrategy} disabled={locked}
          options={WORKFLOW_FAILURE_OPTIONS}
          onChange={(value) => onFailureStrategyChange(value as WorkflowFailureStrategy)} />
      </div>
      <div>
        <ConfigLabel>工作流超时</ConfigLabel>
        <div className="mt-1 flex items-center gap-2">
          <InputNumber min={0} value={workflowTimeoutSeconds}
            onChange={(value) => onWorkflowTimeoutChange(Number(value || 0))}
            disabled={locked} className="w-[150px]" />
          <span className="text-[11px] text-[rgba(22,24,35,.44)]">秒，0 表示不限制</span>
        </div>
      </div>
      <div>
        <ConfigLabel>Workflow Input</ConfigLabel>
        <Input.TextArea rows={5} value={workflowInputText}
          onChange={(event) => onWorkflowInputChange(event.target.value)}
          disabled={locked} className="mt-1 font-mono !text-[11px]" />
      </div>
      <div>
        <ConfigLabel>描述</ConfigLabel>
        <Input.TextArea rows={3} value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          disabled={locked} className="mt-1 !text-[11px]" />
      </div>
    </div>
  );

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e8e9ec] px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <Button type="text" size="small" icon={<ArrowLeft size={14} />}
          onClick={() => history.push('/workflow/definitions')}>返回</Button>
        <div className="h-5 w-px bg-[#ececef]" />
        <Input value={name} onChange={(event) => onNameChange(event.target.value)}
          variant="filled" className="w-[240px]" disabled={locked} />
        <span className={[
          'rounded-md px-2 py-1 text-[10px] font-medium',
          definition?.status === 'ONLINE'
            ? 'bg-[#fff0f3] text-[#d92d50]'
            : 'bg-[#f2f4f7] text-[#667085]',
        ].join(' ')}>
          {STATUS_LABEL[definition?.status || 'DRAFT'] || definition?.status}
        </span>
        <Popover content={runtimeConfig} title="运行配置" trigger="click">
          <Button size="small" icon={<Settings2 size={13} />}>运行配置</Button>
        </Popover>
        <span className="text-[11px] text-[rgba(22,24,35,.38)]">{nodesCount} 节点 · {edgesCount} 连线</span>
        {locked ? <span className="text-[10px] text-[rgba(22,24,35,.38)]">已上线，需下线后修改</span> : null}
      </div>
      <div className="flex items-center gap-2">
        <Popconfirm title="清空当前画布？" disabled={locked} onConfirm={onClear}>
          <Button icon={<RotateCcw size={14} />} disabled={locked}>清空</Button>
        </Popconfirm>
        {!locked ? <Button icon={<Save size={14} />} loading={saving} onClick={onSave}>保存</Button> : null}
        {definition?.status === 'ONLINE' ? (
          <Button icon={<CloudOff size={14} />} loading={statusAction} onClick={onOffline}>下线</Button>
        ) : (
          <Button type="primary" icon={<CloudUpload size={14} />} loading={statusAction || saving}
            onClick={onOnline}>保存并上线</Button>
        )}
      </div>
    </div>
  );
};

export default WorkflowToolbar;
