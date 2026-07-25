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

const BasicFunnelChart: React.FC<CategoryValueChartProps> = memo(
  ({
     data,
     categoryField,
     valueField,

     showLegend = false,
     showLabel = true,

     sortBy = "data",
     sortOrder = "desc",

     themeColors = defaultThemeColors,

     title,
     seriesName = "指标值",

     height = "100%",
     loading = false,
     emptyText = "暂无图表数据",
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
            type: "funnel",
            left: "12%",
            top: showLegend || title ? 56 : 28,
            bottom: showLegend ? 48 : 20,
            width: "76%",
            minSize: "12%",
            maxSize: "100%",
            sort: "descending",
            gap: 4,
            data: seriesData,
            label: {
              show: showLabel,
              position: "inside",
              color: "#fff",
              fontSize: 12,
              formatter: "{b}",
            },
            labelLine: {
              show: false,
            },
            itemStyle: {
              borderColor: "#fff",
              borderWidth: 2,
            },
            emphasis: {
              label: {
                fontSize: 13,
                fontWeight: 600,
              },
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
                请选择阶段字段和数值字段后预览图表
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

export default BasicFunnelChart;
