import {Select} from "antd";
import React from "react";

import type {ChartConfigPanelProps} from "../types";
import ChartSettingBlock from "../components/ChartSettingBlock";

const TableChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
                                                                  value,
                                                                  fieldOptions,
                                                                  onChange,
                                                                }) => {
  return (
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
  );
};

export default TableChartConfigPanel;
