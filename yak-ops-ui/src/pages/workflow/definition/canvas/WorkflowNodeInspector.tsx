import type {
  WorkflowNodeFailurePolicy,
  WorkflowTriggerRule,
} from '@/services/workflow';
import { Input, InputNumber, Select } from 'antd';
import type { ReactNode } from 'react';
import type { Node } from 'reactflow';
import type { WorkflowNodeData } from './types';

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

interface WorkflowNodeInspectorProps {
  node: Node<WorkflowNodeData>;
  locked: boolean;
  onChange: (patch: Partial<WorkflowNodeData>) => void;
}

const FieldLabel = ({ children }: { children: ReactNode }) => (
  <div className="text-[10px] text-[rgba(22,24,35,.48)]">{children}</div>
);

const WorkflowNodeInspector = ({ node, locked, onChange }: WorkflowNodeInspectorProps) => (
  <div className="absolute right-4 top-4 z-20 w-[340px] rounded-xl border border-[#e3e5e8] bg-white p-3 shadow-[0_10px_30px_rgba(22,24,35,.10)]">
    <div className="text-[12px] font-semibold text-[#161823]">任务节点</div>
    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-[#f7f7f8] p-2.5">
      <div>
        <FieldLabel>任务名称</FieldLabel>
        <div className="mt-1 truncate text-[12px] font-medium">{node.data.label}</div>
      </div>
      <div>
        <FieldLabel>任务类型</FieldLabel>
        <div className="mt-1 text-[12px] font-medium">{node.data.typeLabel}</div>
      </div>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div>
        <FieldLabel>触发规则</FieldLabel>
        <Select disabled={locked} className="mt-1 w-full" size="small"
          value={node.data.triggerRule} options={TRIGGER_RULE_OPTIONS}
          onChange={(value) => onChange({ triggerRule: value as WorkflowTriggerRule })} />
      </div>
      <div>
        <FieldLabel>失败策略</FieldLabel>
        <Select disabled={locked} className="mt-1 w-full" size="small"
          value={node.data.failurePolicy} options={NODE_FAILURE_OPTIONS}
          onChange={(value) => onChange({ failurePolicy: value as WorkflowNodeFailurePolicy })} />
      </div>
      <div>
        <FieldLabel>最大 Attempt</FieldLabel>
        <InputNumber disabled={locked} min={1} value={node.data.maxAttempts}
          onChange={(value) => onChange({ maxAttempts: Number(value || 1) })} className="mt-1 w-full" />
      </div>
      <div>
        <FieldLabel>重试延迟（秒）</FieldLabel>
        <InputNumber disabled={locked} min={0} value={node.data.retryDelaySeconds}
          onChange={(value) => onChange({ retryDelaySeconds: Number(value || 0) })} className="mt-1 w-full" />
      </div>
      <div>
        <FieldLabel>派发超时（秒）</FieldLabel>
        <InputNumber disabled={locked} min={0} value={node.data.dispatchTimeoutSeconds}
          onChange={(value) => onChange({ dispatchTimeoutSeconds: Number(value || 0) })} className="mt-1 w-full" />
      </div>
      <div>
        <FieldLabel>执行超时（秒）</FieldLabel>
        <InputNumber disabled={locked} min={0} value={node.data.executionTimeoutSeconds}
          onChange={(value) => onChange({ executionTimeoutSeconds: Number(value || 0) })} className="mt-1 w-full" />
      </div>
    </div>
    <div className="mt-3"><FieldLabel>Input Mapping</FieldLabel></div>
    <Input.TextArea disabled={locked} rows={4} className="mt-1 font-mono !text-[10px]"
      value={node.data.inputMappingText}
      onChange={(event) => onChange({ inputMappingText: event.target.value })} />
    <div className="mt-1.5 text-[9px] leading-4 text-[rgba(22,24,35,.38)]">
      任务自身配置不在工作流中编辑；这里只配置编排行为。
    </div>
  </div>
);

export default WorkflowNodeInspector;
