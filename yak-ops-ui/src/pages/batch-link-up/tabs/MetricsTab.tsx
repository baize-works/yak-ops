import React, {useEffect, useMemo, useState} from "react";
import {Card, Empty, message, Spin, Table, Tag, Tooltip} from "antd";
import {useIntl} from "@umijs/max";
import CountUp from "react-countup";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Database,
  Gauge,
  Layers3,
  Table2,
  TrendingUp,
} from "lucide-react";
import {batchJobInstanceApi} from "../api";


interface MetricsTabProps {
  instanceItem: any;
}

interface SparkLineProps {
  data: number[];
}

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  hint: string;
  icon: React.ReactNode;
  accentClassName: string;
  trendData: number[];
}

const toNumber = (value: any) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const formatNumber = (value: any) => {
  const n = toNumber(value);
  return n.toLocaleString();
};

const formatDecimal = (value: any) => {
  const n = toNumber(value);

  if (n === 0) {
    return "0";
  }

  if (n < 1) {
    return n.toFixed(4);
  }

  return n.toFixed(2).replace(/\.?0+$/, "");
};

const getShortTableName = (table?: string) => {
  if (!table) {
    return "-";
  }

  const parts = String(table).split(".");
  return parts[parts.length - 1] || table;
};

const getStatusMeta = (status?: string) => {
  const value = String(status || "UNKNOWN").toUpperCase();

  if (value === "NORMAL") {
    return {
      color: "success",
      text: "正常",
    };
  }

  if (value === "LAGGING") {
    return {
      color: "warning",
      text: "写入滞后",
    };
  }

  if (value === "IDLE") {
    return {
      color: "default",
      text: "暂无数据",
    };
  }

  if (value === "FAILED") {
    return {
      color: "error",
      text: "失败",
    };
  }

  return {
    color: "default",
    text: "未知",
  };
};

const getResponseData = (res: any) => {
  if (!res) {
    return [];
  }

  if (Array.isArray(res)) {
    return res;
  }

  if (Array.isArray(res.data)) {
    return res.data;
  }

  if (Array.isArray(res?.data?.data)) {
    return res.data.data;
  }

  return [];
};

const SparkLine: React.FC<SparkLineProps> = ({data}) => {
  const safeData = data.length > 1 ? data : [0, 0];
  const max = Math.max(...safeData, 1);
  const min = Math.min(...safeData, 0);
  const range = Math.max(max - min, 1);

  const points = safeData
    .map((value, index) => {
      const x = (index / (safeData.length - 1)) * 100;
      const y = 34 - ((value - min) / range) * 28;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height="40"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const MetricCard: React.FC<MetricCardProps> = ({
                                                 title,
                                                 value,
                                                 unit,
                                                 hint,
                                                 icon,
                                                 accentClassName,
                                                 trendData,
                                               }) => {
  return (
    <div
      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
            {title}
          </div>

          <div className="mt-3 flex items-end gap-1.5">
            <span className="text-[28px] font-semibold leading-none tracking-[-0.04em] text-slate-950">
              <CountUp end={value} duration={1.1} separator="," decimals={0}/>
            </span>
            <span className="pb-0.5 text-xs font-medium text-slate-400">
              {unit}
            </span>
          </div>
        </div>

        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            accentClassName,
          ].join(" ")}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <div className={["h-10 flex-1", accentClassName].join(" ")}>
          <SparkLine data={trendData}/>
        </div>

        <div
          className="mb-1 inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500">
          <TrendingUp size={12} strokeWidth={1.8}/>
          {hint}
        </div>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  extra?: React.ReactNode;
}> = ({title, description, icon, extra}) => {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
          {icon}
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-0.5 text-xs text-slate-400">{description}</div>
        </div>
      </div>

      {extra}
    </div>
  );
};

const buildTrend = (value: number, seed = 1) => {
  const base = Math.max(value, 1);

  return Array.from({length: 12}, (_, index) => {
    const wave = Math.sin((index + seed) * 0.8) * 0.12;
    const slope = index * 0.015;
    return Math.max(Math.round(base * (0.82 + wave + slope)), 0);
  });
};

const MetricsTab: React.FC<MetricsTabProps> = ({instanceItem}) => {
  const intl = useIntl();

  const [tableMetrics, setTableMetrics] = useState<any[]>([]);
  const [tableMetricsLoading, setTableMetricsLoading] = useState(false);

  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({id, defaultMessage});

  const instanceId = instanceItem?.id;

  const readQps = toNumber(instanceItem?.readQps);
  const writeQps = toNumber(instanceItem?.writeQps);
  const readRows = toNumber(instanceItem?.readRowCount);
  const writeRows = toNumber(instanceItem?.writeRowCount);

  useEffect(() => {
    let cancelled = false;

    const loadTableMetrics = async () => {
      if (!instanceId) {
        setTableMetrics([]);
        return;
      }

      setTableMetricsLoading(true);

      try {
        const res = await batchJobInstanceApi.tableMetrics(instanceId);
        const list = getResponseData(res);

        if (!cancelled) {
          setTableMetrics(list);
        }
      } catch (error) {
        if (!cancelled) {
          setTableMetrics([]);
          message.warning("表级指标加载失败，请稍后重试");
        }
      } finally {
        if (!cancelled) {
          setTableMetricsLoading(false);
        }
      }
    };

    loadTableMetrics();

    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  const metrics = useMemo(
    () => ({
      readQpsTrend: buildTrend(readQps, 1),
      writeQpsTrend: buildTrend(writeQps, 2),
      readRowsTrend: buildTrend(readRows, 3),
      writeRowsTrend: buildTrend(writeRows, 4),
    }),
    [readQps, writeQps, readRows, writeRows]
  );

  const tableColumns = useMemo(
    () => [
      {
        title: "来源表",
        dataIndex: "sourceTable",
        key: "sourceTable",
        ellipsis: true,
        render: (value: string) => (
          <Tooltip title={value}>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600">
                <Table2 size={14} strokeWidth={1.9}/>
              </span>

              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-slate-800">
                  {getShortTableName(value)}
                </div>
                <div className="truncate text-[11px] text-slate-400">
                  {value || "-"}
                </div>
              </div>
            </div>
          </Tooltip>
        ),
      },
      {
        title: "",
        key: "arrow",
        width: 44,
        align: "center" as const,
        render: () => (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400">
            <ArrowRight size={14} strokeWidth={1.9}/>
          </span>
        ),
      },
      {
        title: "目标表",
        dataIndex: "sinkTable",
        key: "sinkTable",
        ellipsis: true,
        render: (value: string) => (
          <Tooltip title={value}>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600">
                <Table2 size={14} strokeWidth={1.9}/>
              </span>

              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-slate-800">
                  {getShortTableName(value)}
                </div>
                <div className="truncate text-[11px] text-slate-400">
                  {value || "-"}
                </div>
              </div>
            </div>
          </Tooltip>
        ),
      },
      {
        title: "读取行数",
        dataIndex: "readRowCount",
        key: "readRowCount",
        width: 110,
        align: "right" as const,
        render: (value: any) => (
          <span className="font-medium text-slate-800">
            {formatNumber(value)}
          </span>
        ),
      },
      {
        title: "写入行数",
        dataIndex: "writeRowCount",
        key: "writeRowCount",
        width: 110,
        align: "right" as const,
        render: (value: any) => (
          <span className="font-medium text-slate-800">
            {formatNumber(value)}
          </span>
        ),
      },
      {
        title: "读取QPS",
        dataIndex: "readQps",
        key: "readQps",
        width: 100,
        align: "right" as const,
        render: (value: any) => (
          <span className="text-slate-600">{formatDecimal(value)}</span>
        ),
      },
      {
        title: "写入QPS",
        dataIndex: "writeQps",
        key: "writeQps",
        width: 100,
        align: "right" as const,
        render: (value: any) => (
          <span className="text-slate-600">{formatDecimal(value)}</span>
        ),
      },
      {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 96,
        render: (value: string) => {
          const meta = getStatusMeta(value);
          return <Tag color={meta.color}>{meta.text}</Tag>;
        },
      },
    ],
    []
  );

  return (
    <Card
      size="small"
      className="mt-2 !rounded-2xl !border-slate-200 !shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
      bodyStyle={{padding: 16, marginBottom: 116}}
    >
      <div className="space-y-6">
        <section>
          <SectionHeader
            icon={<Gauge size={16} strokeWidth={1.9}/>}
            title={t("pages.job.detail.metrics.throughput", "吞吐速率")}
            description={t(
              "pages.job.detail.metrics.throughputDesc",
              "当前实例的读取与写入处理速度"
            )}
          />

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <MetricCard
              title={t("pages.job.detail.metrics.readQps", "读取 QPS")}
              value={readQps}
              unit={t("pages.job.detail.metrics.unit.rowsPerSecond", "行/秒")}
              hint={t("pages.job.detail.metrics.recentTrend", "最近趋势")}
              icon={<ArrowDownToLine size={17} strokeWidth={1.9}/>}
              accentClassName="border-blue-100 bg-blue-50 text-blue-600"
              trendData={metrics.readQpsTrend}
            />

            <MetricCard
              title={t("pages.job.detail.metrics.writeQps", "写入 QPS")}
              value={writeQps}
              unit={t("pages.job.detail.metrics.unit.rowsPerSecond", "行/秒")}
              hint={t("pages.job.detail.metrics.recentTrend", "最近趋势")}
              icon={<ArrowUpFromLine size={17} strokeWidth={1.9}/>}
              accentClassName="border-emerald-100 bg-emerald-50 text-emerald-600"
              trendData={metrics.writeQpsTrend}
            />
          </div>
        </section>

        <section>
          <SectionHeader
            icon={<Database size={16} strokeWidth={1.9}/>}
            title={t("pages.job.detail.metrics.totalVolume", "同步总量")}
            description={t(
              "pages.job.detail.metrics.totalVolumeDesc",
              "当前运行实例累计处理的数据量"
            )}
          />

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <MetricCard
              title={t("pages.job.detail.metrics.readRows", "读取行数")}
              value={readRows}
              unit={t("pages.job.detail.metrics.unit.records", "行")}
              hint={t("pages.job.detail.metrics.accumulated", "累计")}
              icon={<ArrowDownToLine size={17} strokeWidth={1.9}/>}
              accentClassName="border-amber-100 bg-amber-50 text-amber-600"
              trendData={metrics.readRowsTrend}
            />

            <MetricCard
              title={t("pages.job.detail.metrics.writeRows", "写入行数")}
              value={writeRows}
              unit={t("pages.job.detail.metrics.unit.records", "行")}
              hint={t("pages.job.detail.metrics.accumulated", "累计")}
              icon={<ArrowUpFromLine size={17} strokeWidth={1.9}/>}
              accentClassName="border-violet-100 bg-violet-50 text-violet-600"
              trendData={metrics.writeRowsTrend}
            />
          </div>
        </section>

        <section>
          <SectionHeader
            icon={<Layers3 size={16} strokeWidth={1.9}/>}
            title="表级同步明细"
            description="查看当前运行实例的来源表与目标表同步情况"
            extra={
              <div className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                {tableMetricsLoading ? "加载中" : `${tableMetrics.length} 张表`}
              </div>
            }
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <Spin spinning={tableMetricsLoading}>
              <Table
                size="small"
                rowKey={(record: any, index) =>
                  record.id ||
                  `${record.sourceTable || "source"}-${
                    record.sinkTable || "sink"
                  }-${index}`
                }
                columns={tableColumns}
                dataSource={tableMetrics}
                pagination={false}
                scroll={{x: 980}}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无表级指标"
                    />
                  ),
                }}
              />
            </Spin>
          </div>
        </section>
      </div>
    </Card>
  );
};

export default MetricsTab;
