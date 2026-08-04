import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FieldTimeOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

interface ExecutionSummaryProps {
  total: number;
  passed: number;
  attention: number;
  running: number;
}

const Item = ({
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

const ExecutionSummary = ({
  total,
  passed,
  attention,
  running,
}: ExecutionSummaryProps) => (
  <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
    <Item label="执行总数" value={total} icon={<FieldTimeOutlined />} />
    <Item label="检查通过" value={passed} icon={<CheckCircleOutlined />} />
    <Item
      label="需要关注"
      value={attention}
      icon={<CloseCircleOutlined />}
      attention
    />
    <Item label="运行中" value={running} icon={<SyncOutlined spin={running > 0} />} />
  </section>
);

export default ExecutionSummary;
