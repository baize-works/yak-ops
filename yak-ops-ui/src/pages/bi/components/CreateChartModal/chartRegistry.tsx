import {AreaChart, BarChart3, Hash, LineChart, PieChart, ScatterChart, Table2,} from "lucide-react";
import React from "react";

import {
  BasicBarChart,
  BasicFunnelChart,
  BasicLineChart,
  BasicNumberChart,
  BasicPieChart,
  BasicScatterChart,
} from "./echarts";

import BarChartConfigPanel from "./config-panels/BarChartConfigPanel";
import PieChartConfigPanel from "./config-panels/PieChartConfigPanel";
import ScatterChartConfigPanel from "./config-panels/ScatterChartConfigPanel";
import TableChartConfigPanel from "./config-panels/TableChartConfigPanel";
import NumberChartConfigPanel from "./config-panels/NumberChartConfigPanel";
import FunnelChartConfigPanel from "./config-panels/FunnelChartConfigPanel";
import WordCloudChartConfigPanel from "./config-panels/WordCloudChartConfigPanel";

import EmptyChartPreview from "./components/EmptyChartPreview";
import type {ChartPreviewProps, ChartRegistryItem, ChartType} from "./types";

const BarPreview: React.FC<ChartPreviewProps> = ({
                                                   chartConfig,
                                                   themeColors,
                                                   previewData,
                                                 }) => {
  return (
    <BasicBarChart
      data={previewData}
      xField={chartConfig.xField}
      yField={chartConfig.yField}
      showLegend={chartConfig.showLegend}
      showLabel={chartConfig.showLabel}
      showAxis={chartConfig.showAxis}
      showGrid={chartConfig.showGrid}
      sortBy={chartConfig.sortBy}
      sortOrder={chartConfig.sortOrder}
      themeColors={themeColors}
      seriesName={chartConfig.yField || "指标值"}
      emptyText="请选择字段生成柱状图"
    />
  );
};

const LinePreview: React.FC<ChartPreviewProps> = ({
                                                    chartConfig,
                                                    themeColors,
                                                    previewData,
                                                  }) => {
  return (
    <BasicLineChart
      data={previewData}
      xField={chartConfig.xField}
      yField={chartConfig.yField}
      showLegend={chartConfig.showLegend}
      showLabel={chartConfig.showLabel}
      showAxis={chartConfig.showAxis}
      showGrid={chartConfig.showGrid}
      sortBy={chartConfig.sortBy}
      sortOrder={chartConfig.sortOrder}
      themeColors={themeColors}
      seriesName={chartConfig.yField || "指标值"}
      emptyText="请选择字段生成折线图"
    />
  );
};

const AreaLinePreview: React.FC<ChartPreviewProps> = ({
                                                        chartConfig,
                                                        themeColors,
                                                        previewData,
                                                      }) => {
  return (
    <BasicLineChart
      data={previewData}
      xField={chartConfig.xField}
      yField={chartConfig.yField}
      showLegend={chartConfig.showLegend}
      showLabel={chartConfig.showLabel}
      showAxis={chartConfig.showAxis}
      showGrid={chartConfig.showGrid}
      sortBy={chartConfig.sortBy}
      sortOrder={chartConfig.sortOrder}
      themeColors={themeColors}
      seriesName={chartConfig.yField || "指标值"}
      emptyText="请选择字段生成面积折线图"
      area
    />
  );
};

const PiePreview: React.FC<ChartPreviewProps> = ({
                                                   chartConfig,
                                                   themeColors,
                                                   previewData,
                                                 }) => {
  return (
    <BasicPieChart
      data={previewData}
      categoryField={chartConfig.categoryField}
      valueField={chartConfig.valueField}
      showLegend={chartConfig.showLegend}
      showLabel={chartConfig.showLabel}
      sortBy={chartConfig.sortBy}
      sortOrder={chartConfig.sortOrder}
      themeColors={themeColors}
      seriesName={chartConfig.valueField || "指标值"}
      emptyText="请选择字段生成饼图"
      variant="pie"
    />
  );
};

const RingPiePreview: React.FC<ChartPreviewProps> = ({
                                                       chartConfig,
                                                       themeColors,
                                                       previewData,
                                                     }) => {
  return (
    <BasicPieChart
      data={previewData}
      categoryField={chartConfig.categoryField}
      valueField={chartConfig.valueField}
      showLegend={chartConfig.showLegend}
      showLabel={chartConfig.showLabel}
      sortBy={chartConfig.sortBy}
      sortOrder={chartConfig.sortOrder}
      themeColors={themeColors}
      seriesName={chartConfig.valueField || "指标值"}
      emptyText="请选择字段生成环形饼图"
      variant="ring"
    />
  );
};

const RosePiePreview: React.FC<ChartPreviewProps> = ({
                                                       chartConfig,
                                                       themeColors,
                                                       previewData,
                                                     }) => {
  return (
    <BasicPieChart
      data={previewData}
      categoryField={chartConfig.categoryField}
      valueField={chartConfig.valueField}
      showLegend={chartConfig.showLegend}
      showLabel={chartConfig.showLabel}
      sortBy={chartConfig.sortBy}
      sortOrder={chartConfig.sortOrder}
      themeColors={themeColors}
      seriesName={chartConfig.valueField || "指标值"}
      emptyText="请选择字段生成玫瑰饼图"
      variant="rose"
    />
  );
};

const ScatterPreview: React.FC<ChartPreviewProps> = ({
                                                       chartConfig,
                                                       themeColors,
                                                       previewData,
                                                     }) => {
  return (
    <BasicScatterChart
      data={previewData}
      xField={chartConfig.xField}
      yField={chartConfig.yField}
      showLegend={chartConfig.showLegend}
      showLabel={chartConfig.showLabel}
      showAxis={chartConfig.showAxis}
      showGrid={chartConfig.showGrid}
      sortBy={chartConfig.sortBy}
      sortOrder={chartConfig.sortOrder}
      themeColors={themeColors}
      seriesName={chartConfig.yField || "指标值"}
      emptyText="请选择字段生成散点图"
    />
  );
};

const FunnelPreview: React.FC<ChartPreviewProps> = ({
                                                      chartConfig,
                                                      themeColors,
                                                      previewData,
                                                    }) => {
  return (
    <BasicFunnelChart
      data={previewData}
      categoryField={chartConfig.categoryField}
      valueField={chartConfig.valueField}
      showLegend={chartConfig.showLegend}
      showLabel={chartConfig.showLabel}
      sortBy={chartConfig.sortBy}
      sortOrder={chartConfig.sortOrder}
      themeColors={themeColors}
      seriesName={chartConfig.valueField || "指标值"}
      emptyText="请选择字段生成漏斗图"
    />
  );
};

const NumberPreview: React.FC<ChartPreviewProps> = ({
                                                      chartConfig,
                                                      themeColors,
                                                      previewData,
                                                    }) => {
  return (
    <BasicNumberChart
      data={previewData}
      metricField={chartConfig.metricField}
      themeColors={themeColors}
      label={chartConfig.metricField || "指标值"}
      emptyText="请选择指标字段生成数字卡片"
    />
  );
};

const PlaceholderPreview: React.FC<ChartPreviewProps> = ({chartType}) => {
  return (
    <EmptyChartPreview
      title={`${chartType} 预览待接入`}
      description="后面只需要在 chartRegistry 中替换 Preview 即可"
    />
  );
};

export const chartRegistryList: ChartRegistryItem[] = [
  {
    label: "柱状图",
    value: "bar",
    group: "条形图",
    icon: <BarChart3 size={16}/>,
    ConfigPanel: BarChartConfigPanel,
    Preview: BarPreview,
  },
  {
    label: "条形图",
    value: "line",
    group: "条形图",
    icon: <BarChart3 size={16}/>,
    ConfigPanel: BarChartConfigPanel,
    Preview: BarPreview,
  },
  {
    label: "折线图",
    value: "zline",
    group: "折线图",
    icon: <LineChart size={16}/>,
    ConfigPanel: BarChartConfigPanel,
    Preview: LinePreview,
  },
  {
    label: "面积折线图",
    value: "areaLine",
    group: "折线图",
    icon: <AreaChart size={16}/>,
    ConfigPanel: BarChartConfigPanel,
    Preview: AreaLinePreview,
  },
  {
    label: "组合图",
    value: "combo",
    group: "组合图",
    icon: <BarChart3 size={16}/>,
    ConfigPanel: BarChartConfigPanel,
    Preview: PlaceholderPreview,
  },
  {
    label: "饼图",
    value: "pie",
    group: "饼图",
    icon: <PieChart size={16}/>,
    ConfigPanel: PieChartConfigPanel,
    Preview: PiePreview,
  },
  {
    label: "环形饼图",
    value: "ringPie",
    group: "饼图",
    icon: <PieChart size={16}/>,
    ConfigPanel: PieChartConfigPanel,
    Preview: RingPiePreview,
  },
  {
    label: "玫瑰饼图",
    value: "rosePie",
    group: "饼图",
    icon: <PieChart size={16}/>,
    ConfigPanel: PieChartConfigPanel,
    Preview: RosePiePreview,
  },
  {
    label: "散点图",
    value: "scatter",
    group: "散点图",
    icon: <ScatterChart size={16}/>,
    ConfigPanel: ScatterChartConfigPanel,
    Preview: ScatterPreview,
  },
  {
    label: "表格",
    value: "table",
    group: "其他",
    icon: <Table2 size={16}/>,
    ConfigPanel: TableChartConfigPanel,
    Preview: PlaceholderPreview,
  },
  {
    label: "漏斗图",
    value: "funnel",
    group: "其他",
    icon: <BarChart3 size={16}/>,
    ConfigPanel: FunnelChartConfigPanel,
    Preview: FunnelPreview,
  },
  {
    label: "词云",
    value: "wordCloud",
    group: "其他",
    icon: <Hash size={16}/>,
    ConfigPanel: WordCloudChartConfigPanel,
    Preview: PlaceholderPreview,
  },
  {
    label: "统计数字",
    value: "number",
    group: "其他",
    icon: <Hash size={16}/>,
    ConfigPanel: NumberChartConfigPanel,
    Preview: NumberPreview,
  },
];

export const chartRegistryMap = chartRegistryList.reduce(
  (map, item) => {
    map[item.value] = item;
    return map;
  },
  {} as Record<ChartType, ChartRegistryItem>
);
