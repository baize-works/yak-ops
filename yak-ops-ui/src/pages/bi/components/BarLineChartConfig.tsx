import {Select} from "antd";
import React from "react";

import type {ChartConfigComponentProps} from "./chart-config.types";

import CommonChartOptions from "./CommonChartOptions";
import SortConfig from "./SortConfig";
import ChartSettingBlock from "./ChartSettingBlock";

const BarLineChartConfig: React.FC<ChartConfigComponentProps> = ({
                                                                   value,
                                                                   fieldOptions,
                                                                   onChange,
                                                                 }) => {
  return (
    <>
      <ChartSettingBlock title="横轴">
        <Select
          className="w-full"
          placeholder="请选择横轴字段"
          value={value.xField}
          options={fieldOptions}
          onChange={(xField) => onChange({xField})}
        />
      </ChartSettingBlock>

      <ChartSettingBlock title="纵轴">
        <Select
          className="w-full"
          placeholder="请选择纵轴字段"
          value={value.yField}
          options={fieldOptions}
          onChange={(yField) => onChange({yField})}
        />
      </ChartSettingBlock>

      <CommonChartOptions value={value} onChange={onChange}/>

      <SortConfig value={value} onChange={onChange}/>
    </>
  );
};

export default BarLineChartConfig;
