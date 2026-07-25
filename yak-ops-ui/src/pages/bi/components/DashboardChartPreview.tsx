import React from "react";

import {previewData, themeOptions} from "../components/CreateChartModal/constants";
import ChartPreview from "../components/CreateChartModal/components/ChartPreview";
import type {CreateChartValues} from "../components/CreateChartModal/types";

interface DashboardChartPreviewProps {
  config?: CreateChartValues;
}

const DashboardChartPreview: React.FC<DashboardChartPreviewProps> = ({
                                                                       config,
                                                                     }) => {
  if (!config) {
    return null;
  }

  const selectedTheme =
    themeOptions.find((item) => item.value === config.theme) || themeOptions[0];

  return (
    <ChartPreview
      chartType={config.chartType}
      chartConfig={config}
      themeColors={selectedTheme.colors}
      previewData={previewData}
    />
  );
};

export default DashboardChartPreview;
