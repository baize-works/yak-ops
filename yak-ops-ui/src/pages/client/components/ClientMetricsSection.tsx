import React, {useMemo} from "react";
import {ClockCircleOutlined, CloudServerOutlined, HddOutlined, RadarChartOutlined,} from "@ant-design/icons";
import {Progress} from "antd";
import {formatPercent, formatText, getSafeNumber} from "../utils";

interface Props {
  metricsLoading: boolean;
  metrics: any;
}

const ClientMetricsSection: React.FC<Props> = ({metricsLoading, metrics}) => {
  const quickStats = useMemo(
    () => [
      {
        key: "cpuUsage",
        label: "CPU 使用率",
        value: metrics?.cpuUsage,
        type: "progress",
        desc: "当前节点整体 CPU 使用率",
        icon: <RadarChartOutlined/>,
      },
      {
        key: "memoryUsage",
        label: "堆内存使用率",
        value: metrics?.memoryUsage,
        type: "progress",
        desc: "当前节点堆内存使用率",
        icon: <HddOutlined/>,
      },
      {
        key: "threadCount",
        label: "活跃线程数",
        value: metrics?.threadCount,
        type: "text",
        desc: "当前节点活跃线程数量",
        icon: <CloudServerOutlined/>,
      },
      {
        key: "runningOps",
        label: "运行中任务",
        value: metrics?.runningOps,
        type: "text",
        desc: "当前正在执行的操作数",
        icon: <ClockCircleOutlined/>,
      },
    ],
    [metrics]
  );

  return (
    <div className="mb-5">
      <div className="mb-4">
        <div className="text-[16px] font-semibold text-[#172033]">核心指标</div>
        <div className="mt-1 text-[13px] text-[#8A94A6]">
          当前优先展示 CPU、内存、线程数与运行中任务 4 个核心指标
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {quickStats.map((item) => {
          const progressValue = Math.max(
            0,
            Math.min(100, getSafeNumber(item.value))
          );

          return (
            <div
              key={item.key}
              className="rounded-[22px] border border-[#E9EDF3] bg-white p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-[13px] font-semibold tracking-[0.02em] text-[#667085]">
                  {item.label}
                </div>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F6FB] text-[16px] text-[#44546F]">
                  {item.icon}
                </div>
              </div>

              {item.type === "progress" ? (
                <>
                  <div className="mb-3 text-[28px] font-bold tracking-[-0.03em] text-[#172033]">
                    {metricsLoading ? "--" : formatPercent(item.value)}
                  </div>

                  <Progress
                    percent={metricsLoading ? 0 : progressValue}
                    showInfo={false}
                    strokeColor="#4F5BD5"
                    trailColor="#EEF2F7"
                    size="small"
                  />

                  <div className="mt-3 text-[12px] leading-6 text-[#8A94A6]">
                    {item.desc}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3 break-words text-[28px] font-bold tracking-[-0.03em] text-[#172033]">
                    {metricsLoading ? "--" : formatText(item.value)}
                  </div>

                  <div className="text-[12px] leading-6 text-[#8A94A6]">
                    {item.desc}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClientMetricsSection;
