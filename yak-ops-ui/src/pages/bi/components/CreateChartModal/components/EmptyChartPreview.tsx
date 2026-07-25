import React from "react";

interface EmptyChartPreviewProps {
  title?: string;
  description?: string;
}

const EmptyChartPreview: React.FC<EmptyChartPreviewProps> = ({
                                                               title = "图表预览待接入",
                                                               description = "当前图表类型暂未接入预览组件",
                                                             }) => {
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
      <div className="text-center">
        <div className="text-sm font-medium text-slate-700">{title}</div>
        <div className="mt-1 text-xs text-slate-400">{description}</div>
      </div>
    </div>
  );
};

export default EmptyChartPreview;
