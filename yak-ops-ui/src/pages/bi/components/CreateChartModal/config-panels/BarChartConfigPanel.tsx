import {Select} from "antd";
import React from "react";

import type {ChartConfigPanelProps} from "../types";
import ChartSettingBlock from "../components/ChartSettingBlock";
import CommonChartOptions from "./CommonChartOptions";
import SortConfig from "./SortConfig";

const BarChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
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

export default BarChartConfigPanel;
