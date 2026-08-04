import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import type { ExecutionResultRendererProps } from '../types';

const PipelineExecutionResultRenderer = ({
  payload,
}: ExecutionResultRendererProps) => {
  if (payload.kind !== 'pipeline') return null;

  const metrics = [
    ['读取行数', payload.processedRows.toLocaleString()],
    ['写入行数', payload.writtenRows.toLocaleString()],
    ['脏数据', payload.rejectedRows.toLocaleString()],
    ['吞吐', `${payload.throughput.toLocaleString()} rows/s`],
  ];

  return (
    <div className="h-full min-h-0 overflow-auto bg-[#fafbfc] p-3">
      <div className="grid grid-cols-4 gap-2">
        {metrics.map(([label, value]) => (
          <div
            key={label}
            className="border border-[#e5e7ea] bg-white px-3 py-2.5"
          >
            <div className="text-[10px] text-[rgba(22,24,35,0.42)]">
              {label}
            </div>
            <div className="mt-1 text-[17px] font-semibold text-[#161823]">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 overflow-hidden border border-[#e5e7ea] bg-white">
        {payload.stages.map((stage, index) => {
          const Icon =
            stage.status === 'SUCCESS'
              ? CheckCircle2
              : stage.status === 'FAILED'
                ? XCircle
                : LoaderCircle;

          return (
            <div
              key={stage.id}
              className="grid grid-cols-[36px_minmax(0,1fr)_130px_110px] items-center border-b border-[#eceef0] px-3 py-2.5 last:border-b-0"
            >
              <span className="text-[11px] text-[rgba(22,24,35,0.34)]">
                {index + 1}
              </span>
              <span className="flex items-center gap-2 text-[12px] font-medium text-[#161823]">
                <Icon
                  size={14}
                  className={
                    stage.status === 'SUCCESS'
                      ? 'text-[#14945f]'
                      : stage.status === 'FAILED'
                        ? 'text-[#d92d20]'
                        : 'animate-spin text-[#1677ff]'
                  }
                />
                {stage.label}
              </span>
              <span className="text-[11px] text-[rgba(22,24,35,0.56)]">
                {stage.rows.toLocaleString()} 行
              </span>
              <span className="text-right text-[11px] text-[rgba(22,24,35,0.46)]">
                {stage.durationMs} ms
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineExecutionResultRenderer;
