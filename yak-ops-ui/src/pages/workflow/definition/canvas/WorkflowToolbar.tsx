import type { WorkflowFailureStrategy } from '@/services/workflow';
import type { WorkflowDefinition } from '@/services/workflow/definitions';
import { history } from '@umijs/max';
import { Button, Input, InputNumber, Popconfirm, Popover, Select, Tooltip } from 'antd';
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
  workflowTimeoutSeconds: number;
  failureStrategy: WorkflowFailureStrategy;
  nodesCount: number;
  edgesCount: number;
  locked: boolean;
  saving: boolean;
  statusAction: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onWorkflowTimeoutChange: (value: number) => void;
  onFailureStrategyChange: (value: WorkflowFailureStrategy) => void;
  onClear: () => void;
  onSave: () => void;
  onOnline: () => void;
  onOffline: () => void;
}

const ConfigLabel = ({ children }: { children: ReactNode }) => (
  <div className="text-[12px] font-medium text-[#344054]">{children}</div>
);

const WorkflowToolbar = ({
  definition,
  name,
  description,
  workflowTimeoutSeconds,
  failureStrategy,
  nodesCount,
  edgesCount,
  locked,
  saving,
  statusAction,
  onNameChange,
  onDescriptionChange,
  onWorkflowTimeoutChange,
  onFailureStrategyChange,
  onClear,
  onSave,
  onOnline,
  onOffline,
}: WorkflowToolbarProps) => {
  const status = definition?.status || 'DRAFT';
  const runtimeConfig = (
    <div className="w-[360px] space-y-4 p-0.5">
      <div>
        <ConfigLabel>失败策略</ConfigLabel>
        <Select
          className="mt-1.5 w-full"
          value={failureStrategy}
          disabled={locked}
          options={WORKFLOW_FAILURE_OPTIONS}
          onChange={(value) => onFailureStrategyChange(value as WorkflowFailureStrategy)}
        />
      </div>

      <div>
        <ConfigLabel>工作流超时</ConfigLabel>
        <div className="mt-1.5 flex items-center gap-2">
          <InputNumber
            min={0}
            value={workflowTimeoutSeconds}
            onChange={(value) => onWorkflowTimeoutChange(Number(value || 0))}
            disabled={locked}
            className="w-[150px]"
          />
          <span className="text-[11px] text-[#98a2b3]">秒，0 表示不限制</span>
        </div>
      </div>

      <div className="rounded-lg bg-[#f7f8fa] px-3 py-2 text-[11px] leading-5 text-[#667085]">
        工作流输入和全局变量统一在“开始”节点中维护。
      </div>

      <div>
        <ConfigLabel>描述</ConfigLabel>
        <Input.TextArea
          rows={3}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          disabled={locked}
          className="mt-1.5 !text-[12px]"
          placeholder="添加工作流描述..."
        />
      </div>
    </div>
  );

  return (
    <header className="grid h-[52px] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-[#ebecef] bg-white px-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <Tooltip title="返回工作流定义">
          <Button
            type="text"
            size="small"
            aria-label="返回工作流定义"
            icon={<ArrowLeft size={15} />}
            onClick={() => history.push('/workflow/definitions')}
          />
        </Tooltip>

        <div className="h-4 w-px bg-[#eceef1]" />

        <Input
          value={name}
          disabled={locked}
          variant="borderless"
          onChange={(event) => onNameChange(event.target.value)}
          className="max-w-[300px] min-w-[120px] !px-2 !text-[14px] !font-semibold !text-[#161823] transition-colors hover:!bg-[#f7f8fa] focus-within:!bg-[#f7f8fa]"
        />

        <span
          className={[
            'inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[10px] font-medium',
            status === 'ONLINE'
              ? 'bg-[rgba(254,44,85,.08)] text-[#d92d50]'
              : 'bg-[#f2f4f7] text-[#667085]',
          ].join(' ')}
        >
          <span
            className={[
              'h-1.5 w-1.5 rounded-full',
              status === 'ONLINE' ? 'bg-[#fe2c55]' : 'bg-[#98a2b3]',
            ].join(' ')}
          />
          {saving ? '保存中' : STATUS_LABEL[status] || status}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Popover content={runtimeConfig} title="运行配置" trigger="click" placement="bottom">
          <Button
            size="small"
            icon={<Settings2 size={13} />}
            className="!h-8 !rounded-lg !border-[#e4e7ec] !bg-white !px-3 !text-[12px] !text-[#475467] shadow-none"
          >
            运行配置
          </Button>
        </Popover>

        <span className="whitespace-nowrap text-[11px] text-[#98a2b3]">
          {nodesCount} 节点 · {edgesCount} 连线
        </span>

        {locked ? (
          <span className="whitespace-nowrap text-[10px] text-[#98a2b3]">已上线，需下线后修改</span>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <Popconfirm
          title="清空任务节点？开始节点与全局输入会保留。"
          disabled={locked}
          onConfirm={onClear}
        >
          <Button size="small" icon={<RotateCcw size={14} />} disabled={locked}>
            清空
          </Button>
        </Popconfirm>

        {!locked ? (
          <Button size="small" icon={<Save size={14} />} loading={saving} onClick={onSave}>
            保存
          </Button>
        ) : null}

        {status === 'ONLINE' ? (
          <Button size="small" icon={<CloudOff size={14} />} loading={statusAction} onClick={onOffline}>
            下线
          </Button>
        ) : (
          <Button
            type="primary"
            size="small"
            icon={<CloudUpload size={14} />}
            loading={statusAction || saving}
            onClick={onOnline}
            className="!px-3.5"
          >
            保存并上线
          </Button>
        )}
      </div>
    </header>
  );
};

export default WorkflowToolbar;
