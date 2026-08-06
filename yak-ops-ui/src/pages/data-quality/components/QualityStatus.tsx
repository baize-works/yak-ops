import { Tag } from 'antd';
import type { CheckResult, ExecutionStatus } from '../types';

const CHECK_META: Record<CheckResult, { label: string; color?: string }> = {
  PASSED: { label: '通过', color: 'success' },
  NOT_PASSED: { label: '未通过', color: 'error' },
  ERROR: { label: '异常', color: 'error' },
  RUNNING: { label: '运行中', color: 'processing' },
  NOT_RUN: { label: '未运行' },
};

const EXECUTION_META: Record<ExecutionStatus, { label: string; color?: string }> = {
  WAITING: { label: '等待中' },
  RUNNING: { label: '运行中', color: 'processing' },
  SUCCESS: { label: '已完成', color: 'success' },
  FAILED: { label: '执行失败', color: 'error' },
};

export const CheckResultTag = ({ value }: { value?: CheckResult }) => {
  const meta = CHECK_META[value ?? 'NOT_RUN'];
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

export const ExecutionStatusTag = ({ value }: { value: ExecutionStatus }) => {
  const meta = EXECUTION_META[value];
  return <Tag color={meta.color}>{meta.label}</Tag>;
};
