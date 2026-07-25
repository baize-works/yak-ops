import {Select} from "antd";
import React from "react";

import type {ChartConfigPanelProps} from "../types";
import ChartSettingBlock from "../components/ChartSettingBlock";
import CommonChartOptions from "./CommonChartOptions";

const WordCloudChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
                                                                      value,
                                                                      fieldOptions,
                                                                      onChange,
                                                                    }) => {
  return (
    <>
      <ChartSettingBlock title="文本字段">
        <Select
          className="w-full"
          placeholder="请选择文本字段"
          value={value.categoryField}
          options={fieldOptions}
          onChange={(categoryField) => onChange({categoryField})}
        />
      </ChartSettingBlock>

      <ChartSettingBlock title="权重字段">
        <Select
          className="w-full"
          placeholder="请选择权重字段"
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
        showLegendOption={false}
      />
    </>
  );
};

export default WordCloudChartConfigPanel;
