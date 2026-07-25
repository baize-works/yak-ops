import React, {memo, useMemo} from "react";
import type {MenuProps} from "antd";
import {Dropdown} from "antd";
import {Download, Settings, Trash2} from "lucide-react";

import AutoResizeChart from "./AutoResizeChart";

import ChartPreview from "./CreateChartModal/components/ChartPreview";
import {previewData, themeOptions} from "./CreateChartModal/constants";
import type {CreateChartValues} from "./CreateChartModal/types";

interface ChartCardProps {
  option?: any;
  chartConfig?: CreateChartValues;
  title?: string;
  selected?: boolean;

  onSetting?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
}

const ChartCard: React.FC<ChartCardProps> = memo(
  ({
     option,
     chartConfig,
     title = "默认名",
     selected = false,
     onSetting,
     onExport,
     onDelete,
   }) => {
    const selectedTheme = useMemo(() => {
      return (
        themeOptions.find((item) => item.value === chartConfig?.theme) ||
        themeOptions[0]
      );
    }, [chartConfig?.theme]);

    const menuItems: MenuProps["items"] = [
      {
        key: "setting",
        icon: <Settings size={15}/>,
        label: "设置图表",
      },
      {
        key: "export",
        icon: <Download size={15}/>,
        label: "导出图片",
      },
      {
        type: "divider",
      },
      {
        key: "delete",
        danger: true,
        icon: <Trash2 size={15}/>,
        label: "删除图表",
      },
    ];

    const handleMenuClick: MenuProps["onClick"] = ({key, domEvent}) => {
      domEvent.stopPropagation();

      if (key === "setting") {
        onSetting?.();
        return;
      }

      if (key === "export") {
        onExport?.();
        return;
      }

      if (key === "delete") {
        onDelete?.();
      }
    };

    const renderChartContent = () => {
      if (chartConfig) {
        return (
          <div className="h-full w-full">
            <ChartPreview
              chartType={chartConfig.chartType}
              chartConfig={chartConfig}
              themeColors={selectedTheme.colors}
              previewData={previewData}
            />
          </div>
        );
      }

      if (option) {
        return <AutoResizeChart option={option}/>;
      }

      return (
        <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
          暂无图表配置
        </div>
      );
    };

    return (
      <div
        className={[
          "dashboard-card group relative z-10 box-border h-full overflow-hidden rounded-xl bg-white",
          "border shadow-sm transition-[border-color,box-shadow,transform] duration-200",
          "will-change-[transform,box-shadow,border-color]",
          selected
            ? [
              "border-[hsl(231_48%_48%)]",
              "shadow-[0_0_0_1px_hsl(231_48%_48%),0_10px_30px_hsl(231_48%_48%/0.14),0_0_0_4px_hsl(231_48%_48%/0.08)]",
            ].join(" ")
            : [
              "border-slate-200",
              "hover:border-[hsl(231_48%_48%/0.50)]",
              "hover:shadow-[0_0_0_1px_hsl(231_48%_48%/0.14),0_10px_28px_hsl(231_48%_48%/0.10)]",
            ].join(" "),
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className={[
            "drag-handle absolute left-1/2 top-2 z-20 grid w-4 -translate-x-1/2 cursor-move",
            "grid-cols-3 gap-0.5 opacity-70 transition duration-200",
            "group-hover:opacity-100",
          ].join(" ")}
          aria-hidden="true"
        >
          {Array.from({length: 6}).map((_, index) => (
            <span
              key={index}
              className="h-[3px] w-[3px] rounded-full bg-slate-400"
            />
          ))}
        </div>

        <div className="box-border flex h-9 items-center justify-between px-3 text-[13px] font-semibold text-slate-900">
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {title}
          </span>

          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: menuItems,
              onClick: handleMenuClick,
            }}
            overlayClassName="dashboard-card-dropdown"
          >
            <button
              type="button"
              className={[
                "dashboard-card-more flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center",
                "rounded-md border-none bg-transparent text-xl leading-none text-slate-500",
                "transition duration-200 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              ⋮
            </button>
          </Dropdown>
        </div>

        <div className="box-border h-[calc(100%-36px)] min-h-0 p-2">
          {renderChartContent()}
        </div>
      </div>
    );
  },
);

ChartCard.displayName = "ChartCard";

export default ChartCard;
