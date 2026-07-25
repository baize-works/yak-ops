import {Radio} from "antd";
import React from "react";

import type {ChartConfigValues, SortBy, SortOrder} from "../types";
import ChartSettingBlock from "../components/ChartSettingBlock";

interface SortConfigProps {
  value: ChartConfigValues;
  onChange: (patch: Partial<ChartConfigValues>) => void;
}

const SortConfig: React.FC<SortConfigProps> = ({value, onChange}) => {
  return (
    <>
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

      <ChartSettingBlock title="排序规则">
        <Radio.Group
          value={value.sortOrder}
          onChange={(event) =>
            onChange({
              sortOrder: event.target.value as SortOrder,
            })
          }
        >
          <Radio value="asc">正序</Radio>
          <Radio value="desc">倒序</Radio>
        </Radio.Group>
      </ChartSettingBlock>
    </>
  );
};

export default SortConfig;
