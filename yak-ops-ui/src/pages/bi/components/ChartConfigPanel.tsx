import React from "react";

import type {ChartType} from "./CreateChartModal";
import type {ChartConfigComponentProps} from "./chart-config.types";

import BarLineChartConfig from "./BarLineChartConfig";
import NumberChartConfig from "./NumberChartConfig";
import PieChartConfig from "./PieChartConfig";
import ScatterChartConfig from "./ScatterChartConfig";
import TableChartConfig from "./TableChartConfig";

const ChartConfigPanel: React.FC<ChartConfigComponentProps> = (props) => {
  const {chartType} = props;

  const barLineTypes: ChartType[] = ["bar", "line", "zline", "areaLine", "combo"];
  const pieTypes: ChartType[] = ["pie", "ringPie", "rosePie"];

  if (barLineTypes.includes(chartType)) {
    return <BarLineChartConfig {...props} />;
  }

  if (pieTypes.includes(chartType)) {
    return <PieChartConfig {...props} />;
  }

  if (chartType === "scatter") {
    return <ScatterChartConfig {...props} />;
  }

  if (chartType === "table") {
    return <TableChartConfig {...props} />;
  }

  if (chartType === "number") {
    return <NumberChartConfig {...props} />;
  }

  return <BarLineChartConfig {...props} />;
};

export default ChartConfigPanel;
