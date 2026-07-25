import {Select} from "antd";
import React from "react";

import type {ChartConfigPanelProps} from "../types";
import ChartSettingBlock from "../components/ChartSettingBlock";
import CommonChartOptions from "./CommonChartOptions";

const ScatterChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
                                                                    value,
                                                                    fieldOptions,
                                                                    onChange,
                                                                  }) => {
  return (
    <>
      <ChartSettingBlock title="X 轴字段">
        <Select
          className="w-full"
          placeholder="请选择 X 轴字段"
          value={value.xField}
          options={fieldOptions}
          onChange={(xField) => onChange({xField})}
        />
      </ChartSettingBlock>

      <ChartSettingBlock title="Y 轴字段">
        <Select
          className="w-full"
          placeholder="请选择 Y 轴字段"
          value={value.yField}
          options={fieldOptions}
          onChange={(yField) => onChange({yField})}
        />
      </ChartSettingBlock>

      <CommonChartOptions value={value} onChange={onChange}/>
    </>
  );
};

export default ScatterChartConfigPanel;
