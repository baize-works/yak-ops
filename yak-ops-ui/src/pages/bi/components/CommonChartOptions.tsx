import {Checkbox} from "antd";
import React from "react";
import {ChartConfigComponentProps} from "./chart-config.types";
import ChartSettingBlock from "./ChartSettingBlock";


interface CommonChartOptionsProps {
  value: ChartConfigComponentProps["value"];
  onChange: ChartConfigComponentProps["onChange"];
  showAxisOption?: boolean;
  showGridOption?: boolean;
  showLegendOption?: boolean;
  showLabelOption?: boolean;
}

const CommonChartOptions: React.FC<CommonChartOptionsProps> = ({
                                                                 value,
                                                                 onChange,
                                                                 showAxisOption = true,
                                                                 showGridOption = true,
                                                                 showLegendOption = true,
                                                                 showLabelOption = true,
                                                               }) => {
  const options = [
    {
      visible: showLegendOption,
      key: "showLegend" as const,
      label: "图例",
    },
    {
      visible: showLabelOption,
      key: "showLabel" as const,
      label: "数据标签",
    },
    {
      visible: showAxisOption,
      key: "showAxis" as const,
      label: "坐标轴",
    },
    {
      visible: showGridOption,
      key: "showGrid" as const,
      label: "网格线",
    },
  ].filter((item) => item.visible);

  if (!options.length) return null;

  return (
    <ChartSettingBlock title="图表选项">
      <div className="grid grid-cols-2 gap-3 text-sm">
        {options.map((item) => (
          <Checkbox
            key={item.key}
            checked={value[item.key]}
            onChange={(event) =>
              onChange({
                [item.key]: event.target.checked,
              })
            }
          >
            {item.label}
          </Checkbox>
        ))}
      </div>
    </ChartSettingBlock>
  );
};

export default CommonChartOptions;
