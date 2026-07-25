import {Select} from "antd";
import React from "react";

import type {ChartConfigPanelProps} from "../types";
import ChartSettingBlock from "../components/ChartSettingBlock";
import CommonChartOptions from "./CommonChartOptions";
import SortConfig from "./SortConfig";

const PieChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
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

export default PieChartConfigPanel;
