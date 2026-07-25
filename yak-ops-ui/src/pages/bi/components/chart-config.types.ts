import {ChartType} from "./CreateChartModal";


export type SortBy = "data" | "x" | "y";

export interface FieldOption {
  label: string;
  value: string;
}

export interface ChartConfigValues {
  xField?: string;
  yField?: string;

  categoryField?: string;
  valueField?: string;

  tableFields?: string[];
  metricField?: string;

  showLegend: boolean;
  showLabel: boolean;
  showAxis: boolean;
  showGrid: boolean;

  sortBy: SortBy;
}

export interface ChartConfigComponentProps {
  chartType: ChartType;
  value: ChartConfigValues;
  fieldOptions: FieldOption[];
  onChange: (patch: Partial<ChartConfigValues>) => void;
}

export const defaultChartConfigValues: ChartConfigValues = {
  showLegend: false,
  showLabel: false,
  showAxis: true,
  showGrid: true,
  sortBy: "data",
};
