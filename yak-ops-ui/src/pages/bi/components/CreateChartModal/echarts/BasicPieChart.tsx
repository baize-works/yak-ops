import React, {memo, useMemo} from "react";
import ReactECharts from "echarts-for-react";

import type {CategoryValueChartProps} from "./types";
import {
  defaultThemeColors,
  getCommonLegend,
  getCommonTitle,
  getCommonTooltip,
  getFieldText,
  sortCategoryValueData,
  toNumber,
} from "./utils";

interface BasicPieChartProps extends CategoryValueChartProps {
  variant?: "pie" | "ring" | "rose";
}

const BasicPieChart: React.FC<BasicPieChartProps> = memo(
  ({
     data,
     categoryField,
     valueField,

     showLegend = false,
     showLabel = false,

     sortBy = "data",
     sortOrder = "asc",

     themeColors = defaultThemeColors,

     title,
     seriesName = "指标值",

     height = "100%",
     loading = false,
     emptyText = "暂无图表数据",

     variant = "pie",
   }) => {
    const chartData = useMemo(() => {
      return sortCategoryValueData({
        data,
        categoryField,
        valueField,
        sortBy,
        sortOrder,
      });
    }, [categoryField, data, sortBy, sortOrder, valueField]);

    const option = useMemo(() => {
      const seriesData = chartData.map((item) => ({
        name: getFieldText(item, categoryField),
        value: toNumber(item[valueField || ""]),
      }));

      const isRing = variant === "ring";
      const isRose = variant === "rose";

      return {
        color: themeColors,
        animation: true,
        animationDuration: 420,
        animationEasing: "cubicOut",

        title: getCommonTitle(title),

        tooltip: {
          trigger: "item",
          ...getCommonTooltip(),
        },

        legend: {
          ...getCommonLegend(showLegend),
          orient: "horizontal",
          bottom: 8,
          top: undefined,
          right: undefined,
          left: "center",
        },

        series: [
          {
            name: seriesName,
            type: "pie",
            radius: isRing ? ["46%", "68%"] : "68%",
            center: ["50%", showLegend ? "45%" : "50%"],
            roseType: isRose ? "radius" : undefined,
            data: seriesData,
            label: {
              show: showLabel,
              color: "#475569",
              fontSize: 12,
              formatter: "{b}: {c}",
            },
            labelLine: {
              show: showLabel,
              length: 12,
              length2: 8,
            },
            itemStyle: {
              borderRadius: 8,
              borderColor: "#fff",
              borderWidth: 2,
            },
            emphasis: {
              scale: true,
              scaleSize: 8,
            },
          },
        ],
      };
    }, [
      categoryField,
      chartData,
      showLabel,
      showLegend,
      seriesName,
      themeColors,
      title,
      valueField,
      variant,
    ]);

    const isEmpty = !categoryField || !valueField || chartData.length === 0;

    return (
      <div
        className="relative h-full w-full rounded-2xl bg-white"
        style={{height}}
      >
        {isEmpty ? (
          <div
            className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
            <div className="text-center">
              <div className="text-sm font-medium text-slate-700">
                {emptyText}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                请选择分类字段和数值字段后预览图表
              </div>
            </div>
          </div>
        ) : (
          <ReactECharts
            option={option}
            showLoading={loading}
            loadingOption={{
              text: "加载中...",
            }}
            notMerge
            lazyUpdate
            style={{
              width: "100%",
              height: "100%",
              minHeight: 260,
            }}
          />
        )}
      </div>
    );
  }
);

export default BasicPieChart;
