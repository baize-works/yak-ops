import type { WorkflowNodeFailurePolicy } from '@/services/workflow';
import { InputNumber, Select, Slider, Switch, Tooltip } from 'antd';
import { CircleHelp } from 'lucide-react';
import type { Node } from 'reactflow';
import WorkflowNextStep from './WorkflowNextStep';
import type { WorkflowCanvasTaskOption, WorkflowNodeData } from './types';
import WorkflowNodeIcon from './node/icons/WorkflowNodeIcon';

const NODE_FAILURE_OPTIONS = [
  { value: 'FAIL_WORKFLOW', label: '无' },
  { value: 'BLOCK_BRANCH', label: '停止当前分支' },
  { value: 'IGNORE_FAILURE', label: '忽略并继续' },
];

const MAX_RETRY_TIMES = 9;
const MAX_RETRY_DELAY_SECONDS = 3600;

export interface WorkflowInspectorNextNode {
  id: string;
  label: string;
  taskType: string;
}

interface WorkflowNodeInspectorSettingsProps {
  node: Node<WorkflowNodeData>;
  locked: boolean;
  nextNodes: WorkflowInspectorNextNode[];
  appendOptions: WorkflowCanvasTaskOption[];
  onChange: (patch: Partial<WorkflowNodeData>) => void;
  onAppend: (taskId: string) => void;
}

const SectionTitle = ({ children }: { children: string }) => (
  <div className="mb-1 text-[12px] font-semibold text-[#344054]">{children}</div>
);

const Divider = () => <div className="mx-4 border-t border-[#f0f1f3]" />;

const HelpTip = ({ title }: { title: string }) => (
  <Tooltip title={title} placement="top">
    <CircleHelp size={13} className="ml-1 text-[#b0b4bc]" />
  </Tooltip>
);

const WorkflowNodeInspectorSettings = ({
  node,
  locked,
  nextNodes,
  appendOptions,
  onChange,
  onAppend,
}: WorkflowNodeInspectorSettingsProps) => {
  const retryTimes = Math.max(0, (node.data.maxAttempts || 1) - 1);
  const retryEnabled = retryTimes > 0;

  const handleRetryEnabledChange = (checked: boolean) => {
    if (!checked) {
      onChange({ maxAttempts: 1 });
      return;
    }

    // maxAttempts 包含首次执行；默认开启后为“首次执行 + 3 次重试”。
    onChange({ maxAttempts: Math.max(node.data.maxAttempts || 1, 4) });
  };

  const handleRetryTimesChange = (value: number | null) => {
    const nextRetryTimes = Math.min(MAX_RETRY_TIMES, Math.max(1, Number(value || 1)));
    onChange({ maxAttempts: nextRetryTimes + 1 });
  };

  return (
    <div className="pb-6">
      <section className="py-2">
        <div className="flex min-h-12 items-center justify-between px-4 py-2">
          <div className="flex items-center">
            <div className="text-[12px] font-semibold text-[#344054]">失败时重试</div>
            <HelpTip title="节点执行失败后自动再次尝试；开启后会在画布节点中实时显示重试次数。" />
          </div>
          <Switch
            size="small"
            disabled={locked}
            checked={retryEnabled}
            onChange={handleRetryEnabledChange}
          />
        </div>

        {retryEnabled ? (
          <div className="space-y-3 px-4 pb-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-[88px] shrink-0 text-[11px] font-medium text-[#667085]">重试次数</div>
              <Slider
                className="m-0 min-w-0 flex-1"
                min={1}
                max={MAX_RETRY_TIMES}
                tooltip={{ open: false }}
                disabled={locked}
                value={retryTimes}
                onChange={(value) => handleRetryTimesChange(value)}
              />
              <div className="flex w-[82px] shrink-0 items-center gap-1">
                <InputNumber
                  size="small"
                  controls={false}
                  disabled={locked}
                  min={1}
                  max={MAX_RETRY_TIMES}
                  value={retryTimes}
                  className="!w-[58px]"
                  onChange={handleRetryTimesChange}
                />
                <span className="text-[10px] text-[rgba(22,24,35,.42)]">次</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-[88px] shrink-0 text-[11px] font-medium text-[#667085]">重试间隔</div>
              <Slider
                className="m-0 min-w-0 flex-1"
                min={0}
                max={MAX_RETRY_DELAY_SECONDS}
                tooltip={{ open: false }}
                disabled={locked}
                value={Math.min(node.data.retryDelaySeconds || 0, MAX_RETRY_DELAY_SECONDS)}
                onChange={(value) => onChange({ retryDelaySeconds: value })}
              />
              <div className="flex w-[82px] shrink-0 items-center gap-1">
                <InputNumber
                  size="small"
                  controls={false}
                  disabled={locked}
                  min={0}
                  max={MAX_RETRY_DELAY_SECONDS}
                  value={node.data.retryDelaySeconds}
                  className="!w-[58px]"
                  onChange={(value) => onChange({ retryDelaySeconds: Number(value || 0) })}
                />
                <span className="text-[10px] text-[rgba(22,24,35,.42)]">秒</span>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <Divider />

      <section className="flex min-h-[64px] items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center">
          <div className="text-[12px] font-semibold text-[#344054]">异常处理</div>
          <HelpTip title="节点最终仍然失败时的处理方式。“无”表示按默认方式使工作流失败。" />
        </div>
        <Select
          disabled={locked}
          size="small"
          className="w-[142px] shrink-0"
          value={node.data.failurePolicy}
          options={NODE_FAILURE_OPTIONS}
          onChange={(value) => onChange({ failurePolicy: value as WorkflowNodeFailurePolicy })}
        />
      </section>

      <Divider />

      <section className="px-4 py-4">
        <SectionTitle>下一步</SectionTitle>
        <div className="mb-3 text-[10px] leading-4 text-[rgba(22,24,35,.38)]">添加此工作流程中的下一个节点</div>
        <WorkflowNextStep
          currentIcon={<WorkflowNodeIcon taskType={node.data.taskType} size="sm" />}
          nextNodes={nextNodes}
          appendOptions={appendOptions}
          locked={locked}
          onAppend={onAppend}
        />
      </section>
    </div>
  );
};

export default WorkflowNodeInspectorSettings;
