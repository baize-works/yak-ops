import {Select} from "antd";
import React from "react";

import type {ChartConfigComponentProps} from "./chart-config.types";

import CommonChartOptions from "./CommonChartOptions";
import SortConfig from "./SortConfig";
import ChartSettingBlock from "./ChartSettingBlock";

const PieChartConfig: React.FC<ChartConfigComponentProps> = ({
                                                               value,
                                                               fieldOptions,
                                                               onChange,
                                                             }) => {
  return (
    <>
      <ChartSettingBlock title="分类字段">
        <Select
          className="w-full"
          placeholder="请选择分类字段"
          value={value.categoryField}
          options={fieldOptions}
          onChange={(categoryField) => onChange({categoryField})}
        />
      </ChartSettingBlock>

      <ChartSettingBlock title="数值字段">
        <Select
          className="w-full"
          placeholder="请选择数值字段"
          value={value.valueField}
          options={fieldOptions}
          onChange={(valueField) => onChange({valueField})}
        />
      </ChartSettingBlock>

      <CommonChartOptions
        value={value}
        onChange={onChange}
        showAxisOption={false}
        showGridOption={false}
      />

      <SortConfig value={value} onChange={onChange}/>
    </>
  );
};

export default PieChartConfig;
