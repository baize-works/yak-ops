import React from "react";

import {chartRegistryMap} from "../chartRegistry";
import type {ChartPreviewProps} from "../types";
import EmptyChartPreview from "./EmptyChartPreview";

const ChartPreview: React.FC<ChartPreviewProps> = (props) => {
  const chartItem = chartRegistryMap[props.chartType];

  if (!chartItem) {
    return <EmptyChartPreview/>;
  }

  const PreviewComponent = chartItem.Preview;

  return <PreviewComponent {...props} />;
};

export default ChartPreview;
