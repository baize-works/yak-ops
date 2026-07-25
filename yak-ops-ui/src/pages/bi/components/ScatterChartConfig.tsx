import {Select} from "antd";
import React from "react";

import type {ChartConfigComponentProps} from "./chart-config.types";

import CommonChartOptions from "./CommonChartOptions";
import ChartSettingBlock from "./ChartSettingBlock";

const ScatterChartConfig: React.FC<ChartConfigComponentProps> = ({
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

export default ScatterChartConfig;
