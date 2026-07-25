import {Radio} from "antd";
import React from "react";

import type {ChartConfigComponentProps, SortBy} from "./chart-config.types";
import ChartSettingBlock from "./ChartSettingBlock";


const SortConfig: React.FC<Pick<ChartConfigComponentProps, "value" | "onChange">> = ({
                                                                                       value,
                                                                                       onChange,
                                                                                     }) => {
  return (
    <ChartSettingBlock title="排序依据">
      <Radio.Group
        value={value.sortBy}
        onChange={(event) =>
          onChange({
            sortBy: event.target.value as SortBy,
          })
        }
      >
        <Radio value="data">数据顺序</Radio>
        <Radio value="x">横轴值</Radio>
        <Radio value="y">纵轴值</Radio>
      </Radio.Group>
    </ChartSettingBlock>
  );
};

export default SortConfig;
