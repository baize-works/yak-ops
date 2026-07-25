import {Select} from "antd";
import React from "react";

import type {ChartConfigComponentProps} from "./chart-config.types";
import ChartSettingBlock from "./ChartSettingBlock";


const TableChartConfig: React.FC<ChartConfigComponentProps> = ({
                                                                 value,
                                                                 fieldOptions,
                                                                 onChange,
                                                               }) => {
  return (
    <>
      <ChartSettingBlock title="展示字段">
        <Select
          mode="multiple"
          allowClear
          className="w-full"
          placeholder="请选择表格展示字段"
          value={value.tableFields}
          options={fieldOptions}
          onChange={(tableFields) => onChange({tableFields})}
        />
      </ChartSettingBlock>
    </>
  );
};

export default TableChartConfig;
