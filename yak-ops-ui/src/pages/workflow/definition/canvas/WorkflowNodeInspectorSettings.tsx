import type {
  WorkflowNodeFailurePolicy,
  WorkflowTriggerRule,
} from '@/services/workflow';
import { Input, InputNumber, Select, Switch } from 'antd';
import { Plus } from 'lucide-react';
import type { Node } from 'reactflow';
import type { WorkflowCanvasTaskOption, WorkflowNodeData } from './types';
import WorkflowNodeIcon from './node/icons/WorkflowNodeIcon';

const TRIGGER_RULE_OPTIONS = [
  { value: 'ALL_SUCCESS', label: '全部前置成功' },
  { value: 'ALL_DONE', label: '全部前置结束' },
  { value: 'NONE_FAILED', label: '无前置失败' },
  { value: 'ONE_SUCCESS', label: '至少一个成功' },
  { value: 'ALWAYS', label: '始终执行' },
];

const NODE_FAILURE_OPTIONS = [
  { value: 'FAIL_WORKFLOW', label: '标记工作流失败' },
  { value: 'BLOCK_BRANCH', label: '仅阻断当前分支' },
  { value: 'IGNORE_FAILURE', label: '忽略失败继续' },
];

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
  <div className="mb-2 text-[11px] font-semibold text-[#344054]">{children}</div>
);

const FieldLabel = ({ children }: { children: string }) => (
  <div className="mb-1.5 text-[10px] font-medium text-[rgba(22,24,35,.46)]">{children}</div>
);

const Divider = () => <div className="mx-4 border-t border-[#f0f1f3]" />;

const WorkflowNodeInspectorSettings = ({
  node,
  locked,
  nextNodes,
  appendOptions,
  onChange,
  onAppend,
}: WorkflowNodeInspectorSettingsProps) => {
  const retryEnabled = node.data.maxAttempts > 1;

  const appendSelectOptions = appendOptions.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  return (
    <div className="pb-6">
      <section className="space-y-4 px-4 py-4">
        <div>
          <SectionTitle>执行条件</SectionTitle>
          <FieldLabel>触发规则</FieldLabel>
          <Select
            disabled={locked}
            variant="filled"
            className="w-full"
            value={node.data.triggerRule}
            options={TRIGGER_RULE_OPTIONS}
            onChange={(value) => onChange({ triggerRule: value as WorkflowTriggerRule })}
          />
        </div>

        <div>
          <SectionTitle>输入映射</SectionTitle>
          <Input.TextArea
            disabled={locked}
            rows={5}
            value={node.data.inputMappingText}
            className="font-mono !text-[11px]"
            onChange={(event) => onChange({ inputMappingText: event.target.value })}
          />
          <div className="mt-1.5 text-[10px] leading-4 text-[rgba(22,24,35,.34)]">
            将工作流上下文映射为当前任务输入；任务自身配置仍在任务定义中维护。
          </div>
        </div>
      </section>

      <Divider />

      <section className="py-2">
        <div className="flex min-h-11 items-center justify-between px-4 py-2">
          <div>
            <div className="text-[11px] font-semibold text-[#344054]">失败时重试</div>
            <div className="mt-0.5 text-[10px] text-[rgba(22,24,35,.36)]">节点失败后按固定间隔重新执行</div>
          </div>
          <Switch
            size="small"
            disabled={locked}
            checked={retryEnabled}
            onChange={(checked) => onChange({ maxAttempts: checked ? Math.max(3, node.data.maxAttempts) : 1 })}
          />
        </div>

        {retryEnabled ? (
          <div className="grid grid-cols-2 gap-2 px-4 pb-3 pt-1">
            <div>
              <FieldLabel>最大 Attempt</FieldLabel>
              <InputNumber
                disabled={locked}
                min={2}
                max={10}
                value={node.data.maxAttempts}
                className="w-full"
                onChange={(value) => onChange({ maxAttempts: Number(value || 2) })}
              />
            </div>
            <div>
              <FieldLabel>重试延迟（秒）</FieldLabel>
              <InputNumber
                disabled={locked}
                min={0}
                value={node.data.retryDelaySeconds}
                className="w-full"
                onChange={(value) => onChange({ retryDelaySeconds: Number(value || 0) })}
              />
            </div>
          </div>
        ) : null}
      </section>

      <Divider />

      <section className="px-4 py-4">
        <SectionTitle>超时控制</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>派发超时（秒）</FieldLabel>
            <InputNumber
              disabled={locked}
              min={0}
              value={node.data.dispatchTimeoutSeconds}
              className="w-full"
              onChange={(value) => onChange({ dispatchTimeoutSeconds: Number(value || 0) })}
            />
          </div>
          <div>
            <FieldLabel>执行超时（秒）</FieldLabel>
            <InputNumber
              disabled={locked}
              min={0}
              value={node.data.executionTimeoutSeconds}
              className="w-full"
              onChange={(value) => onChange({ executionTimeoutSeconds: Number(value || 0) })}
            />
          </div>
        </div>
      </section>

      <Divider />

      <section className="flex min-h-[64px] items-center justify-between gap-4 px-4 py-3">
        <div>
          <div className="text-[11px] font-semibold text-[#344054]">异常处理</div>
          <div className="mt-0.5 text-[10px] text-[rgba(22,24,35,.36)]">当前节点最终失败时如何影响工作流</div>
        </div>
        <Select
          disabled={locked}
          variant="filled"
          className="w-[160px] shrink-0"
          value={node.data.failurePolicy}
          options={NODE_FAILURE_OPTIONS}
          onChange={(value) => onChange({ failurePolicy: value as WorkflowNodeFailurePolicy })}
        />
      </section>

      <Divider />

      <section className="px-4 py-4">
        <SectionTitle>下一步</SectionTitle>
        <div className="mb-3 text-[10px] leading-4 text-[rgba(22,24,35,.38)]">添加此节点执行完成后的下一个任务</div>

        <div className="space-y-1.5">
          {nextNodes.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-xl border border-[#e7e9ed] bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(22,24,35,.03)]"
            >
              <WorkflowNodeIcon taskType={item.taskType} size="sm" />
              <div className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#344054]">{item.label}</div>
            </div>
          ))}

          {!nextNodes.length ? (
            <div className="rounded-xl border border-dashed border-[#dfe3e8] bg-[#fafafa] px-3 py-3 text-center text-[10px] text-[rgba(22,24,35,.36)]">
              暂无后续节点
            </div>
          ) : null}
        </div>

        {!locked && appendSelectOptions.length ? (
          <Select
            className="mt-2 w-full"
            variant="filled"
            value={undefined}
            placeholder={
              <span className="inline-flex items-center gap-1.5 text-[rgba(22,24,35,.42)]">
                <Plus size={13} /> 添加后续任务
              </span>
            }
            options={appendSelectOptions}
            onChange={(value) => onAppend(value)}
          />
        ) : null}
      </section>
    </div>
  );
};

export default WorkflowNodeInspectorSettings;
