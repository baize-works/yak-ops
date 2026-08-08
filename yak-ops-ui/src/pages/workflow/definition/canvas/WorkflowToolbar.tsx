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
  const statusLabel = STATUS_LABEL[status] || status;
  const statusColor = status === 'ONLINE' ? '#fe2c55' : '#98a2b3';

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
    <header className="flex h-[58px] shrink-0 items-center border-b border-[#e7e9ed] bg-white px-3.5 shadow-[0_1px_0_rgba(22,24,35,.02)]">
      <div className="flex min-w-0 items-center">
        <Tooltip title="返回工作流定义">
          <Button
            type="text"
            size="small"
            aria-label="返回工作流定义"
            icon={<ArrowLeft size={15} />}
            className="!h-8 !w-8 !rounded-lg"
            onClick={() => history.push('/workflow/definitions')}
          />
        </Tooltip>

        <div className="mx-2 h-6 w-px bg-[#eceef1]" />

        <div className="min-w-[180px] max-w-[320px]">
          <Input
            value={name}
            disabled={locked}
            variant="borderless"
            onChange={(event) => onNameChange(event.target.value)}
            className="h-7 !px-1.5 !text-[15px] !font-semibold !text-[#161823] transition-colors hover:!bg-[#f7f8fa] focus-within:!bg-[#f7f8fa]"
          />
          <div className="flex h-4 items-center gap-1.5 px-1.5 text-[10px] text-[#98a2b3]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
            <span>{statusLabel}</span>
            <span className="text-[#d0d5dd]">·</span>
            <span>{saving ? '正在保存...' : locked ? '只读模式' : '可编辑'}</span>
          </div>
        </div>

        <div className="ml-4 flex h-9 items-center gap-1 rounded-xl border border-[#e8eaee] bg-[#f8f9fb] p-1 shadow-[0_1px_2px_rgba(22,24,35,.03)]">
          <Popover content={runtimeConfig} title="运行配置" trigger="click" placement="bottom">
            <Button
              type="text"
              size="small"
              icon={<Settings2 size={13} />}
              className="!h-7 !rounded-lg !px-2.5 !text-[12px] !text-[#475467] hover:!bg-white"
            >
              运行配置
            </Button>
          </Popover>

          <div className="h-4 w-px bg-[#e4e7ec]" />

          <span className="whitespace-nowrap px-2 text-[11px] text-[#98a2b3]">
            {nodesCount} 节点 · {edgesCount} 连线
          </span>
        </div>

        {locked ? (
          <span className="ml-2 whitespace-nowrap text-[10px] text-[#98a2b3]">需下线后修改</span>
        ) : null}
      </div>

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-2">
        <Popconfirm
          title="清空任务节点？开始节点与全局输入会保留。"
          disabled={locked}
          onConfirm={onClear}
        >
          <Button
            size="small"
            icon={<RotateCcw size={14} />}
            disabled={locked}
            className="!h-8 !rounded-lg !border-[#e4e7ec] !px-3"
          >
            清空
          </Button>
        </Popconfirm>

        <div className="flex h-10 items-center gap-1 rounded-xl border border-[#e4e7ec] bg-[#f8f9fb] p-1 shadow-[0_4px_14px_rgba(22,24,35,.05),0_1px_2px_rgba(22,24,35,.03)]">
          {!locked ? (
            <Button
              type="text"
              size="small"
              icon={<Save size={14} />}
              loading={saving}
              onClick={onSave}
              className="!h-8 !rounded-lg !px-3 !text-[#475467] hover:!bg-white"
            >
              保存
            </Button>
          ) : null}

          {status === 'ONLINE' ? (
            <Button
              size="small"
              icon={<CloudOff size={14} />}
              loading={statusAction}
              onClick={onOffline}
              className="!h-8 !rounded-lg !px-3"
            >
              下线
            </Button>
          ) : (
            <Button
              type="primary"
              size="small"
              icon={<CloudUpload size={14} />}
              loading={statusAction || saving}
              onClick={onOnline}
              className="!h-8 !rounded-lg !px-3.5"
            >
              保存并上线
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default WorkflowToolbar;
