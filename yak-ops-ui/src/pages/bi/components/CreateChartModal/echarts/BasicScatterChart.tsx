import React, {memo, useMemo} from "react";
import ReactECharts from "echarts-for-react";

import type {AxisChartProps} from "./types";
import {
  defaultThemeColors,
  getCommonLegend,
  getCommonTitle,
  getCommonTooltip,
  sortAxisChartData,
  toNumber,
} from "./utils";

const BasicScatterChart: React.FC<AxisChartProps> = memo(
  ({
     data,
     xField,
     yField,

     showLegend = false,
     showLabel = false,
     showAxis = true,
     showGrid = true,

     sortBy = "data",
     sortOrder = "asc",

     themeColors = defaultThemeColors,

     title,
     seriesName = "指标值",

     height = "100%",
     loading = false,
     emptyText = "暂无图表数据",
   }) => {
    const chartData = useMemo(() => {
      return sortAxisChartData({
        data,
        xField,
        yField,
        sortBy,
        sortOrder,
      });
    }, [data, sortBy, sortOrder, xField, yField]);

    const option = useMemo(() => {
      const seriesData = chartData.map((item) => [
        toNumber(item[xField || ""]),
        toNumber(item[yField || ""]),
      ]);

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

        legend: getCommonLegend(showLegend),

        grid: {
          top: showLegend || title ? 56 : 28,
          right: 28,
          bottom: showAxis ? 34 : 18,
          left: showAxis ? 44 : 18,
          containLabel: true,
        },

        xAxis: {
          type: "value",
          show: showAxis,
          axisLine: {
            show: showAxis,
            lineStyle: {
              color: "#e2e8f0",
            },
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            color: "#64748b",
            fontSize: 12,
          },
          splitLine: {
            show: showGrid,
            lineStyle: {
              color: "#eef2f7",
              type: "dashed",
            },
          },
        },

        yAxis: {
          type: "value",
          show: showAxis,
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            color: "#64748b",
            fontSize: 12,
          },
          splitLine: {
            show: showGrid,
            lineStyle: {
              color: "#eef2f7",
              type: "dashed",
            },
          },
        },

        series: [
          {
            name: seriesName,
            type: "scatter",
            data: seriesData,
            symbolSize: 12,
            label: {
              show: showLabel,
              position: "top",
              color: "#475569",
              fontSize: 12,
            },
            emphasis: {
              focus: "series",
              itemStyle: {
                shadowBlur: 10,
                shadowColor: "rgba(15, 23, 42, 0.18)",
              },
            },
          },
        ],
      };
    }, [
      chartData,
      showAxis,
      showGrid,
      showLabel,
      showLegend,
      seriesName,
      themeColors,
      title,
      xField,
      yField,
    ]);

    const isEmpty = !xField || !yField || chartData.length === 0;

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
                请选择 X 轴和 Y 轴字段后预览图表
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

export default BasicScatterChart;
