import { useIntl } from "@umijs/max";
import type { ReactNode } from "react";

interface ExecutionRecord {
  runMode?: string;
  duration?: string | number;
  readRowCount?: number;
  qps?: number;
  syncSize?: string;
}

interface ExecutionStatusProps {
  record?: ExecutionRecord;
}

interface MetricItemProps {
  label: ReactNode;
  value: ReactNode;
}

const MetricItem = ({ label, value }: MetricItemProps) => {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 whitespace-nowrap text-[11px] leading-4 text-[#98a2b3]">
        {label}
      </div>

      <div className="truncate whitespace-nowrap text-[13px] font-medium leading-5 text-[#344054] tabular-nums">
        {value}
      </div>
    </div>
  );
};

const ExecutionStatus = ({ record }: ExecutionStatusProps) => {
  const intl = useIntl();

  const isManual = record?.runMode === "MANUAL";

  const durationUnit = intl.formatMessage({
    id: "pages.job.execution.unit.seconds",
    defaultMessage: "秒",
  });

  const rowsUnit = intl.formatMessage({
    id: "pages.job.execution.unit.rows",
    defaultMessage: "行",
  });

  const rowsPerSecondUnit = intl.formatMessage({
    id: "pages.job.execution.unit.rowsPerSecond",
    defaultMessage: "行/秒",
  });

  return (
    <div className="min-w-[190px]">
      <div className="mb-2 flex items-center gap-2">
        {/* <span className="text-[11px] text-[#98a2b3]">运行模式</span> */}

        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[#344054]">
       

          <span className="rounded bg-[#f2f4f7] px-1.5 py-0.5 text-[11px] font-medium leading-5 text-[#667085]">
            {isManual ? "手动运行" : "定时调度"}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-2">
        <MetricItem
          label={intl.formatMessage({
            id: "pages.job.execution.time",
            defaultMessage: "耗时",
          })}
          value={
            record?.duration !== undefined && record?.duration !== null
              ? `${record.duration} ${durationUnit}`
              : "-"
          }
        />

        <MetricItem
          label={intl.formatMessage({
            id: "pages.job.execution.amount",
            defaultMessage: "数据量",
          })}
          value={`${record?.readRowCount ?? 0} ${rowsUnit}`}
        />

        <MetricItem
          label={intl.formatMessage({
            id: "pages.job.execution.qps",
            defaultMessage: "QPS",
          })}
          value={`${record?.qps ?? 0} ${rowsPerSecondUnit}`}
        />

        <MetricItem
          label={intl.formatMessage({
            id: "pages.job.execution.size",
            defaultMessage: "同步大小",
          })}
          value={record?.syncSize || "-"}
        />
      </div>
    </div>
  );
};

export default ExecutionStatus;
