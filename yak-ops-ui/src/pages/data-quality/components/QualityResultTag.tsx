import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  MinusCircleFilled,
  SyncOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';
import type {
  QualityCheckResult,
  QualityExecutionStatus,
  QualityRuleResult,
} from '../types';

interface QualityResultTagProps {
  value: QualityRuleResult | QualityExecutionStatus | QualityCheckResult;
}

const META = {
  PASSED: {
    label: '通过',
    icon: <CheckCircleFilled />,
    className: '!border-[#abefc6] !bg-[#ecfdf3] !text-[#067647]',
  },
  NOT_PASSED: {
    label: '未通过',
    icon: <ExclamationCircleFilled />,
    className: '!border-[#fecdca] !bg-[#fef3f2] !text-[#b42318]',
  },
  ERROR: {
    label: '执行异常',
    icon: <CloseCircleFilled />,
    className: '!border-[#fecdca] !bg-[#fef3f2] !text-[#b42318]',
  },
  RUNNING: {
    label: '运行中',
    icon: <SyncOutlined spin />,
    className: '!border-[#b2ddff] !bg-[#eff8ff] !text-[#175cd3]',
  },
  NOT_RUN: {
    label: '未运行',
    icon: <MinusCircleFilled />,
    className: '!border-[#e4e7ec] !bg-[#f8f9fb] !text-[#667085]',
  },
  WAITING: {
    label: '等待中',
    icon: <ClockCircleFilled />,
    className: '!border-[#fedf89] !bg-[#fffaeb] !text-[#b54708]',
  },
  SUCCESS: {
    label: '执行成功',
    icon: <CheckCircleFilled />,
    className: '!border-[#d0d5dd] !bg-[#f8f9fb] !text-[#344054]',
  },
  FAILED: {
    label: '执行失败',
    icon: <CloseCircleFilled />,
    className: '!border-[#fecdca] !bg-[#fef3f2] !text-[#b42318]',
  },
  UNKNOWN: {
    label: '未知',
    icon: <MinusCircleFilled />,
    className: '!border-[#e4e7ec] !bg-[#f8f9fb] !text-[#667085]',
  },
} as const;

const QualityResultTag = ({ value }: QualityResultTagProps) => {
  const meta = META[value];
  return (
    <Tag className={`!m-0 !rounded-md !px-2 ${meta.className}`}>
      <span className="inline-flex items-center gap-1.5">
        {meta.icon}
        {meta.label}
      </span>
    </Tag>
  );
};

export default QualityResultTag;
