import {Select} from "antd";
import React from "react";

import type {ChartConfigPanelProps} from "../types";
import ChartSettingBlock from "../components/ChartSettingBlock";

const NumberChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
                                                                   value,
                                                                   fieldOptions,
                                                                   onChange,
                                                                 }) => {
  return (
    <ChartSettingBlock title="指标字段">
      <Select
        className="w-full"
        placeholder="请选择指标字段"
        value={value.metricField}
        options={fieldOptions}
        onChange={(metricField) => onChange({metricField})}
      />
    </ChartSettingBlock>
  );
};

export default NumberChartConfigPanel;
