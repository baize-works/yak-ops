import type {Layout} from "react-grid-layout";

export const COLS = 12;
export const ROW_HEIGHT = 45;
export const MARGIN: [number, number] = [8, 8];

export const MIN_ROW_COUNT = 32;
export const STORAGE_KEY = "dashboard-layout-v2";

export const DEFAULT_LAYOUT: Layout[] = [
  {i: "chart-1", x: 0, y: 0, w: 6, h: 10},
  {i: "chart-2", x: 6, y: 0, w: 6, h: 10},
  {i: "chart-3", x: 0, y: 10, w: 9, h: 8},
];

export const chartTitleMap: Record<string, string> = {
  "chart-1": "参数分布",
  "chart-2": "执行统计",
  "chart-3": "任务趋势",
};
