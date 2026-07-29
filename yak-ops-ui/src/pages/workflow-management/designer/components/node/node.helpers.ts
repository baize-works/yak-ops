import type { WorkflowNodeData } from '../../../types';

export type WorkflowNodeStatus = NonNullable<WorkflowNodeData['runningStatus']>;

export const nodeStatusBorderClass: Record<WorkflowNodeStatus, string> = {
  idle: 'border-transparent',
  running: 'border-[#155eef]',
  success: 'border-[#17b26a]',
  failed: 'border-[#f04438]',
};

export const nodeStatusTextClass: Record<WorkflowNodeStatus, string> = {
  idle: 'text-[#98a2b3]',
  running: 'text-[#155eef]',
  success: 'text-[#079455]',
  failed: 'text-[#d92d20]',
};

export const nodeStatusLabel: Record<WorkflowNodeStatus, string> = {
  idle: '',
  running: '运行中',
  success: '运行成功',
  failed: '运行失败',
};

export const getArrayLength = (value: unknown) =>
  Array.isArray(value) ? value.length : 0;

export const getText = (value: unknown, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return fallback;
};

export const getConditionBranches = (data: WorkflowNodeData) => {
  const cases = data.config.cases;
  if (!Array.isArray(cases) || !cases.length) return ['IF', 'ELSE'];
  return cases.slice(0, 3).map((item, index) => getText(item, `分支 ${index + 1}`));
};
