import {
  CheckCircleOutlined,
  FieldTimeOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

interface QualitySummaryProps {
  total: number;
  enabled: number;
  todayRuns: number;
  attention: number;
}

const SummaryItem = ({
  label,
  value,
  icon,
  attention,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  attention?: boolean;
}) => (
  <div className="flex items-center gap-3 rounded-lg border border-[#eceef2] bg-white p-4">
    <span
      className={[
        'flex h-9 w-9 items-center justify-center rounded-lg text-[17px]',
        attention
          ? 'bg-[rgba(254,44,85,0.06)] text-[#fe2c55]'
          : 'bg-[#f3f3f4] text-[#667085]',
      ].join(' ')}
    >
      {icon}
    </span>
    <div>
      <div className="text-[12px] text-[#98a2b3]">{label}</div>
      <strong className="mt-1 block text-[20px] leading-6 text-[#101828]">
        {value}
      </strong>
    </div>
  </div>
);

const QualitySummary = ({
  total,
  enabled,
  todayRuns,
  attention,
}: QualitySummaryProps) => (
  <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
    <SummaryItem
      label="质量规则"
      value={total}
      icon={<SafetyCertificateOutlined />}
    />
    <SummaryItem
      label="已启用"
      value={enabled}
      icon={<CheckCircleOutlined />}
    />
    <SummaryItem
      label="今日执行"
      value={todayRuns}
      icon={<FieldTimeOutlined />}
    />
    <SummaryItem
      label="需要关注"
      value={attention}
      icon={<WarningOutlined />}
      attention
    />
  </section>
);

export default QualitySummary;
