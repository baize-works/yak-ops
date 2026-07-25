export const Footer = ({
                         total,
                         metricCount,
                       }: {
  total: number;
  metricCount: number;
}) => {
  return (
    <div
      className="mt-3 flex items-center justify-between border-t border-slate-200/80 pt-3 text-[12px] text-slate-500">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300"/>
        总日志数
        <span className="font-semibold text-slate-700">{total}</span>
      </span>

      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-300"/>
        去重后指标数
        <span className="font-semibold text-slate-700">{metricCount}</span>
        <span>个实例</span>
      </span>
    </div>
  );
};
