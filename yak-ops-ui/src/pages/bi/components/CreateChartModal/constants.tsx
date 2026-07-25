import type {ChartConfigValues, FieldOption, ThemeOption} from "./types";

export const defaultChartConfigValues: ChartConfigValues = {
  xField: "SETTING_NAME",
  yField: "SETTING_VALUE",

  showLegend: false,
  showLabel: false,
  showAxis: true,
  showGrid: false,

  sortBy: "x",
  sortOrder: "asc",
};

export const themeOptions: ThemeOption[] = [
  {
    label: "蓝色系",
    value: "blue",
    colors: ["#1f8ee5", "#2499ed", "#3da8f3", "#59b4f4", "#7fc5f5", "#b7ddf6"],
  },
  {
    label: "紫灰色系",
    value: "purpleGray",
    colors: ["#d7b7ea", "#e8d9f3", "#f4eef9", "#c6a5c3", "#f6c7d9", "#a9c38f"],
  },
  {
    label: "淡紫色系",
    value: "purple",
    colors: ["#feb1d9", "#d695e1", "#ad8fdb", "#8477c6", "#86ddf4", "#72bcec"],
  },
  {
    label: "淡米色系",
    value: "beige",
    colors: ["#f9f3d3", "#fad6b5", "#fcafae", "#fedfe5", "#ddf0ee", "#b6e3e8"],
  },
  {
    label: "淡棕色系",
    value: "brown",
    colors: ["#efcfaf", "#efae6b", "#e4aa72", "#dd936f", "#b9744e", "#ba6830"],
  },
  {
    label: "黄色系",
    value: "yellow",
    colors: ["#ffa001", "#ffb400", "#ffc107", "#ffca27", "#ffd550", "#fee180"],
  },
  {
    label: "绿色系",
    value: "green",
    colors: ["#679f38", "#7db343", "#8bc349", "#9ace63", "#afd582", "#c5e1a5"],
  },
  {
    label: "橙色系",
    value: "orange",
    colors: ["#f67d01", "#fb8c00", "#ff9800", "#ffa725", "#feb74d", "#ffcc80"],
  },
];

export const defaultFieldOptions: FieldOption[] = [
  {label: "SETTING_NAME", value: "SETTING_NAME"},
  {label: "SETTING_VALUE", value: "SETTING_VALUE"},
  {label: "日期", value: "date"},
  {label: "任务数", value: "taskCount"},
  {label: "成功数", value: "successCount"},
  {label: "失败数", value: "failedCount"},
  {label: "执行耗时", value: "duration"},
];

export const previewData = [
  {
    SETTING_NAME: "参数 A",
    SETTING_VALUE: 120,
    date: "周一",
    taskCount: 120,
    successCount: 108,
    failedCount: 12,
    duration: 36,
  },
  {
    SETTING_NAME: "参数 B",
    SETTING_VALUE: 200,
    date: "周二",
    taskCount: 200,
    successCount: 184,
    failedCount: 16,
    duration: 42,
  },
  {
    SETTING_NAME: "参数 C",
    SETTING_VALUE: 150,
    date: "周三",
    taskCount: 150,
    successCount: 136,
    failedCount: 14,
    duration: 28,
  },
  {
    SETTING_NAME: "参数 D",
    SETTING_VALUE: 80,
    date: "周四",
    taskCount: 80,
    successCount: 72,
    failedCount: 8,
    duration: 18,
  },
  {
    SETTING_NAME: "参数 E",
    SETTING_VALUE: 260,
    date: "周五",
    taskCount: 260,
    successCount: 241,
    failedCount: 19,
    duration: 52,
  },
];
