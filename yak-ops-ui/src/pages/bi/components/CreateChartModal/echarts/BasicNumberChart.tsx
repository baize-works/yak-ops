import React, {memo, useMemo} from "react";

import type {NumberChartProps} from "./types";
import {defaultThemeColors, toNumber} from "./utils";

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
  }).format(value);
};

const BasicNumberChart: React.FC<NumberChartProps> = memo(
  ({
     data,
     metricField,

     themeColors = defaultThemeColors,

     title,
     label = "指标值",
     suffix = "",
     prefix = "",

     height = "100%",
     emptyText = "暂无指标数据",
   }) => {
    const value = useMemo(() => {
      if (!metricField || !data.length) return null;

      return data.reduce((total, item) => {
        return total + toNumber(item[metricField]);
      }, 0);
    }, [data, metricField]);

    const isEmpty = !metricField || value === null;

    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-2xl bg-white"
        style={{height}}
      >
        {isEmpty ? (
          <div
            className="flex h-full min-h-[260px] w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
            <div className="text-center">
              <div className="text-sm font-medium text-slate-700">
                {emptyText}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                请选择指标字段后预览数字卡片
              </div>
            </div>
          </div>
        ) : (
          <div
            className="w-full rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm">
            {title ? (
              <div className="mb-2 text-sm font-semibold text-slate-900">
                {title}
              </div>
            ) : null}

            <div className="text-sm text-slate-500">{label}</div>

            <div
              className="mt-3 text-5xl font-semibold tracking-tight"
              style={{
                color: themeColors[0],
              }}
            >
              {prefix}
              {formatNumber(value)}
              {suffix}
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: themeColors[0],
                }}
              />
              <span>根据当前预览数据自动汇总</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default BasicNumberChart;
