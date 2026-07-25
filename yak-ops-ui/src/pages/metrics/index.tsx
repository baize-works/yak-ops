import {Select, Spin} from "antd";
import {motion} from "framer-motion";
import {BarChart3, Clock3, Database, Target,} from "lucide-react";
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {fetchChartData, fetchSummaryData} from "./api";
import BarChart from "./BarChart";
import "./index.less";
import LineChart from "./LineChart";
import {ChartData, SummaryData, TaskType, TimeRange} from "./types";
import {transformChartData} from "./utils";

const fadeUp = {
  hidden: {opacity: 0, y: 18},
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const sectionStagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

const cardStagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const App: React.FC = () => {
  const [chartData, setChartData] = useState<ChartData>({
    recordsTrend: {data: [], xAxis: []},
    bytesTrend: {data: [], xAxis: []},
    recordsSpeedTrend: {data: [], xAxis: []},
    bytesSpeedTrend: {data: [], xAxis: []},
  });

  const [loading, setLoading] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalRecords: 0,
    totalBytes: 0,
    totalTasks: 0,
    successTasks: 0,
    totalBytesUnit: "-",
    totalRecordsUnit: "-",
  });

  const [taskType, setTaskType] = useState<TaskType>("BATCH");
  const [timeRange, setTimeRange] = useState<TimeRange>("H24");

  const refreshSummaryData = useCallback(async () => {
    const data = await fetchSummaryData(timeRange, taskType);
    setSummaryData(data);
  }, [timeRange, taskType]);

  const refreshChartData = useCallback(async () => {
    const apiData = await fetchChartData(timeRange, taskType);
    const processedData: ChartData = {
      recordsTrend: transformChartData(apiData.recordsTrend as any, timeRange),
      bytesTrend: transformChartData(apiData.bytesTrend as any, timeRange),
      recordsSpeedTrend: transformChartData(
        apiData.recordsSpeedTrend as any,
        timeRange
      ),
      bytesSpeedTrend: transformChartData(
        apiData.bytesSpeedTrend as any,
        timeRange
      ),
    };
    setChartData(processedData);
  }, [timeRange, taskType]);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setPageReady(false);
      await Promise.all([refreshSummaryData(), refreshChartData()]);
      setPageReady(true);
    } catch (error: any) {

    } finally {
      setLoading(false);
    }
  }, [refreshSummaryData, refreshChartData]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const successRate = useMemo(() => {
    if (!summaryData.totalTasks) return 0;
    return Math.round(
      (summaryData.successTasks / summaryData.totalTasks) * 100
    );
  }, [summaryData.totalTasks, summaryData.successTasks]);

  const statCards = [
    {
      title: "同步总量",
      value: summaryData.totalRecords || 0,
      subText: `单位：${summaryData.totalRecordsUnit || "-"}`,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      icon: <BarChart3 size={18} strokeWidth={2}/>,
    },
    {
      title: "同步数据量",
      value: summaryData.totalBytes || 0,
      subText: `单位：${summaryData.totalBytesUnit || "-"}`,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      icon: <Database size={18} strokeWidth={2}/>,
    },
    {
      title: "执行任务数",
      value: summaryData.totalTasks || 0,
      subText: "单位：次",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      icon: <Clock3 size={18} strokeWidth={2}/>,
    },
    {
      title: "成功率",
      value: `${successRate}%`,
      subText: `成功任务 ${summaryData.successTasks || 0} 个`,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-500",
      icon: <Target size={18} strokeWidth={2}/>,
    },
  ];

  const summaryList = [
    {
      title: "整体概览",
      content: `所选时间范围内，共执行 ${summaryData.totalTasks || 0} 个任务。`,
    },
    {
      title: "数据规模",
      content: `累计处理 ${summaryData.totalBytes || 0} ${
        summaryData.totalBytesUnit || "-"
      } 数据。`,
    },
    {
      title: "执行稳定性",
      content: `当前任务成功率为 ${successRate}%，成功任务 ${
        summaryData.successTasks || 0
      } 个。`,
    },
  ];

  return (
    <div
      style={{
        height: "calc(100vh - 56px)",
        backgroundColor: "white",
        overflow: "hidden",
      }}
    >
      <main className="h-full overflow-auto p-4 md:p-6">
        <div className="min-h-full rounded-3xl bg-slate-50/60 p-6 md:p-8">
          <div className="mx-auto max-w-[1600px]">
            <motion.div
              initial="hidden"
              animate={pageReady ? "visible" : "hidden"}
              variants={sectionStagger}
            >
              <motion.div
                variants={fadeUp}
                className="mb-8 flex gap-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-7 w-7"
                      style={{color: "hsl(231 48% 48%)"}}
                    >
                      <path d="M3 3v16a2 2 0 0 0 2 2h16"/>
                      <path d="M18 17V9"/>
                      <path d="M13 17V5"/>
                      <path d="M8 17v-3"/>
                    </svg>
                    任务洞察
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    关注同步规模、执行表现与趋势变化
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={timeRange}
                    onChange={(value) => setTimeRange(value)}
                    style={{width: 140}}
                    options={[
                      {label: "近 1 小时", value: "H1"},
                      {label: "近 6 小时", value: "H6"},
                      {label: "近 12 小时", value: "H12"},
                      {label: "近 24 小时", value: "H24"},
                      {label: "近 7 天", value: "D7"},
                      {label: "近 30 天", value: "D30"},
                    ]}
                  />
                </div>
              </motion.div>

              <Spin spinning={loading}>
                <motion.section variants={fadeUp} className="mb-8">
                  <motion.div
                    variants={cardStagger}
                    initial="hidden"
                    animate={pageReady ? "visible" : "hidden"}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
                  >
                    {statCards.map((item) => (
                      <motion.div
                        key={item.title}
                        variants={fadeUp}
                        whileHover={{y: -4, transition: {duration: 0.18}}}
                        className="rounded-3xl border border-border/50 bg-white shadow-sm"
                      >
                        <div className="p-4 pt-6 md:p-6 md:pt-6">
                          <div className="mb-3 flex items-center justify-between">
                            <div className={`rounded-xl p-2 ${item.iconBg}`}>
                              <div className={item.iconColor}>{item.icon}</div>
                            </div>
                          </div>
                          <p className="text-2xl font-bold">{item.value}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {item.subText}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.section>

                <motion.section variants={fadeUp} className="mb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">
                      同步概览
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <motion.div variants={fadeUp}>
                      <ChartCard title="同步记录量趋势">
                        <BarChart
                          data={chartData.recordsTrend.data}
                          xAxisData={chartData.recordsTrend.xAxis}
                          title="同步记录量趋势"
                          unit={String(summaryData.totalRecordsUnit || "")}
                          loading={loading}
                        />
                      </ChartCard>
                    </motion.div>

                    <motion.div variants={fadeUp}>
                      <ChartCard title="同步数据量趋势">
                        <BarChart
                          data={chartData.bytesTrend.data}
                          xAxisData={chartData.bytesTrend.xAxis}
                          title="同步数据量趋势"
                          unit={String(summaryData.totalBytesUnit || "")}
                          loading={loading}
                        />
                      </ChartCard>
                    </motion.div>
                  </div>
                </motion.section>

                <motion.section variants={fadeUp} className="mb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">
                      性能趋势
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <motion.div variants={fadeUp}>
                      <ChartCard title="记录处理速率">
                        <LineChart
                          data={chartData.recordsSpeedTrend.data}
                          xAxisData={chartData.recordsSpeedTrend.xAxis}
                          title="记录处理速率"
                          unit="records/s"
                          loading={loading}
                        />
                      </ChartCard>
                    </motion.div>

                    <motion.div variants={fadeUp}>
                      <ChartCard title="数据处理速率">
                        <LineChart
                          data={chartData.bytesSpeedTrend.data}
                          xAxisData={chartData.bytesSpeedTrend.xAxis}
                          title="数据处理速率"
                          unit="MB/s"
                          loading={loading}
                        />
                      </ChartCard>
                    </motion.div>
                  </div>
                </motion.section>

                <motion.section variants={fadeUp}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">
                      摘要分析
                    </h2>
                  </div>

                  <motion.div
                    variants={cardStagger}
                    initial="hidden"
                    animate={pageReady ? "visible" : "hidden"}
                    className="grid grid-cols-1 gap-6 xl:grid-cols-3"
                  >
                    {summaryList.map((item) => (
                      <motion.div
                        key={item.title}
                        variants={fadeUp}
                        className="rounded-3xl border border-border/50 bg-white shadow-sm"
                      >
                        <div className="p-6">
                          <h3 className="text-base font-semibold text-slate-900">
                            {item.title}
                          </h3>
                          <p className="mt-3 text-sm leading-6 text-slate-500">
                            {item.content}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.section>
              </Spin>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

const ChartCard: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({title, children}) => {
  return (
    <motion.div
      whileHover={{y: -2, transition: {duration: 0.18}}}
      className="rounded-3xl border border-border/50 bg-white shadow-sm"
    >
      <div className="flex flex-col space-y-1.5 p-4 md:p-6">
        <h3 className="text-base font-semibold tracking-tight md:text-xl">
          {title}
        </h3>
      </div>
      <div className="p-4 pt-0 md:p-6 md:pt-0">{children}</div>
    </motion.div>
  );
};

export default App;
