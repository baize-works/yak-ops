import { history } from '@umijs/max';
import { Select, Tooltip } from 'antd';
import type { ECharts, EChartsOption } from 'echarts';
import {
  Activity,
  AlarmClock,
  Bell,
  Boxes,
  Cable,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Database,
  ExternalLink,
  FileCheck2,
  Gauge,
  GitBranch,
  Monitor,
  Plus,
  Server,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Workflow,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type ActionTone = 'sync' | 'realtime' | 'workflow' | 'resource';
type TrendTone = 'blue' | 'purple' | 'orange' | 'red' | 'gray';

interface QuickAction {
  title: string;
  description: string;
  tone: ActionTone;
  icon: LucideIcon;
  path: string;
}

interface ScheduleItem {
  title: string;
  category: string;
  time: string;
  path: string;
}

interface TrendItem {
  rank: number;
  title: string;
  valueLabel: string;
  value: string;
  icon: LucideIcon;
  tone: TrendTone;
  path: string;
}

interface TrendColumn {
  key: string;
  title: string;
  secondaryTitle: string;
  icon: LucideIcon;
  items: TrendItem[];
}

const HOME_CARD_CLASS =
  'rounded-[10px] border border-[rgba(22,24,35,0.025)] bg-white shadow-[0_2px_12px_rgba(31,35,41,0.025)]';

const MORE_BUTTON_CLASS =
  'inline-flex cursor-pointer items-center border-0 bg-transparent p-0 text-xs text-[rgba(22,24,35,0.55)] transition-colors hover:text-[#161823]';

const actionToneClasses: Record<ActionTone, string> = {
  sync: 'bg-[#fff1f3] text-[#fe2c55]',
  realtime: 'bg-[#eef7ff] text-[#1677ff]',
  workflow: 'bg-[#f3f0ff] text-[#7652ff]',
  resource: 'bg-[#fff7e8] text-[#f59e0b]',
};

const trendToneClasses: Record<TrendTone, string> = {
  blue: 'bg-[#eef6ff] text-[#1677ff]',
  purple: 'bg-[#f3f0ff] text-[#7652ff]',
  orange: 'bg-[#fff6e8] text-[#f59e0b]',
  red: 'bg-[#fff0f2] text-[#fe2c55]',
  gray: 'bg-[#f4f5f6] text-[#667085]',
};

const quickActions: QuickAction[] = [
  {
    title: '新建离线同步',
    description: '配置来源、目标与字段映射',
    tone: 'sync',
    icon: Database,
    path: '/sync/batch-link-up/create',
  },
  {
    title: '新建实时同步',
    description: '创建持续运行的实时数据链路',
    tone: 'realtime',
    icon: Activity,
    path: '/sync/realtime-link-up/create',
  },
  {
    title: '新建工作流',
    description: '编排任务依赖、节点与执行顺序',
    tone: 'workflow',
    icon: Workflow,
    path: '/workflow-management/create',
  },
  {
    title: '接入数据源',
    description: '统一管理数据库与外部系统连接',
    tone: 'resource',
    icon: Cable,
    path: '/data-source/create',
  },
];

const scheduleItems: ScheduleItem[] = [
  {
    title: '订单明细增量同步',
    category: '离线同步',
    time: '08:00',
    path: '/sync/batch-link-up',
  },
  {
    title: '客户主数据处理流程',
    category: '工作流',
    time: '10:30',
    path: '/workflow-management',
  },
  {
    title: '核心表完整性检查',
    category: '质量检查',
    time: '14:00',
    path: '/data-quality',
  },
];

const trendColumns: TrendColumn[] = [
  {
    key: 'batch',
    title: '离线同步',
    secondaryTitle: '最近运行',
    icon: Database,
    items: [
      {
        rank: 1,
        title: '订单明细增量同步',
        valueLabel: '处理行数',
        value: '286.4 万',
        icon: Database,
        tone: 'blue',
        path: '/sync/batch-link-up',
      },
      {
        rank: 2,
        title: '客户主数据全量同步',
        valueLabel: '处理行数',
        value: '82.7 万',
        icon: Database,
        tone: 'purple',
        path: '/sync/batch-link-up',
      },
      {
        rank: 3,
        title: '商品库存每日归档',
        valueLabel: '处理行数',
        value: '41.3 万',
        icon: Database,
        tone: 'orange',
        path: '/sync/batch-link-up',
      },
      {
        rank: 4,
        title: '历史日志分区迁移',
        valueLabel: '处理行数',
        value: '18.6 万',
        icon: Database,
        tone: 'gray',
        path: '/sync/batch-link-up',
      },
    ],
  },
  {
    key: 'workflow',
    title: '工作流',
    secondaryTitle: '执行耗时',
    icon: GitBranch,
    items: [
      {
        rank: 1,
        title: '客户数据清洗与汇总',
        valueLabel: '执行耗时',
        value: '12m 36s',
        icon: GitBranch,
        tone: 'purple',
        path: '/workflow-management',
      },
      {
        rank: 2,
        title: '经营日报数据加工',
        valueLabel: '执行耗时',
        value: '8m 12s',
        icon: Workflow,
        tone: 'blue',
        path: '/workflow-management',
      },
      {
        rank: 3,
        title: '数据仓库维表刷新',
        valueLabel: '执行耗时',
        value: '5m 48s',
        icon: GitBranch,
        tone: 'orange',
        path: '/workflow-management',
      },
      {
        rank: 4,
        title: '业务指标小时聚合',
        valueLabel: '执行耗时',
        value: '3m 09s',
        icon: Workflow,
        tone: 'gray',
        path: '/workflow-management',
      },
    ],
  },
  {
    key: 'quality',
    title: '数据质量',
    secondaryTitle: '异常规则',
    icon: ShieldCheck,
    items: [
      {
        rank: 1,
        title: '订单主键唯一性检查',
        valueLabel: '通过率',
        value: '99.98%',
        icon: ShieldCheck,
        tone: 'blue',
        path: '/data-quality',
      },
      {
        rank: 2,
        title: '客户手机号完整性检查',
        valueLabel: '通过率',
        value: '99.72%',
        icon: FileCheck2,
        tone: 'purple',
        path: '/data-quality',
      },
      {
        rank: 3,
        title: '库存数量合理性检查',
        valueLabel: '通过率',
        value: '98.65%',
        icon: TriangleAlert,
        tone: 'orange',
        path: '/data-quality/report',
      },
      {
        rank: 4,
        title: '交易时间及时性检查',
        valueLabel: '通过率',
        value: '97.80%',
        icon: AlarmClock,
        tone: 'red',
        path: '/data-quality/report',
      },
    ],
  },
];

type OverviewTab = '任务概览' | '运行趋势' | '失败分析';
type OverviewRange = '今日' | '近7日' | '近30日';
type OverviewCompareTone = 'default' | 'positive' | 'danger';

interface OverviewMetric {
  label: string;
  value: string;
  compareValue?: string;
  compareTone?: OverviewCompareTone;
  detail?: string;
  emphasis?: boolean;
}

interface OverviewSeriesConfig {
  seriesName: string;
  color: string;
  areaColor: string;
  values: Record<OverviewRange, number[]>;
}

const overviewTabs: OverviewTab[] = ['任务概览', '运行趋势', '失败分析'];
const overviewRangeOptions: Array<{
  label: string;
  value: OverviewRange;
}> = [
  { label: '今日', value: '今日' },
  { label: '近7日', value: '近7日' },
  { label: '近30日', value: '近30日' },
];

const overviewMetrics: Record<OverviewTab, OverviewMetric[]> = {
  任务概览: [
    {
      label: '任务执行数',
      value: '126',
      compareValue: '+8',
      compareTone: 'positive',
    },
    {
      label: '成功任务',
      value: '118',
      compareValue: '+6',
      compareTone: 'positive',
    },
    {
      label: '失败任务',
      value: '3',
      compareValue: '-2',
      compareTone: 'positive',
      emphasis: true,
    },
    {
      label: '处理数据量',
      value: '286.4 万',
      compareValue: '+12.6%',
      compareTone: 'positive',
    },
    {
      label: '运行中任务',
      value: '5',
      detail: '离线 3 / 工作流 2',
    },
    {
      label: '待处理告警',
      value: '2',
      compareValue: '+1',
      compareTone: 'danger',
      emphasis: true,
    },
  ],
  运行趋势: [
    {
      label: '总运行次数',
      value: '126',
      compareValue: '+8',
      compareTone: 'positive',
    },
    {
      label: '峰值并发',
      value: '8',
      compareValue: '+2',
      compareTone: 'default',
    },
    {
      label: '平均吞吐',
      value: '7.6 万行/s',
      compareValue: '+9.8%',
      compareTone: 'positive',
    },
    {
      label: '最大吞吐',
      value: '12.4 万行/s',
      compareValue: '+6.2%',
      compareTone: 'positive',
    },
    {
      label: '平均耗时',
      value: '6m 18s',
      compareValue: '-42s',
      compareTone: 'positive',
    },
    {
      label: 'SLA 达成率',
      value: '98.4%',
      compareValue: '+0.6%',
      compareTone: 'positive',
    },
  ],
  失败分析: [
    {
      label: '失败任务',
      value: '3',
      compareValue: '-2',
      compareTone: 'positive',
      emphasis: true,
    },
    {
      label: '已自动恢复',
      value: '1',
      detail: '恢复率 33.3%',
    },
    {
      label: '待人工处理',
      value: '2',
      compareValue: '+1',
      compareTone: 'danger',
      emphasis: true,
    },
    {
      label: '数据源异常',
      value: '1',
      detail: 'MySQL 连接超时',
    },
    {
      label: '节点执行异常',
      value: '1',
      detail: 'Shell 返回非零状态',
    },
    {
      label: '网络异常',
      value: '1',
      detail: '客户端连接中断',
    },
  ],
};

const overviewSeriesConfigs: Record<OverviewTab, OverviewSeriesConfig> = {
  任务概览: {
    seriesName: '任务执行数',
    color: '#4f72ff',
    areaColor: 'rgba(79,114,255,0.18)',
    values: {
      今日: [8, 12, 26, 48, 34, 29, 18],
      近7日: [86, 92, 148, 105, 126, 118, 136],
      近30日: [460, 528, 486, 620, 716, 845, 912],
    },
  },
  运行趋势: {
    seriesName: '处理数据量（万行）',
    color: '#4f72ff',
    areaColor: 'rgba(79,114,255,0.18)',
    values: {
      今日: [32, 48, 106, 238, 186, 142, 86],
      近7日: [168, 186, 286, 218, 264, 246, 286],
      近30日: [986, 1120, 1086, 1358, 1686, 2084, 2268],
    },
  },
  失败分析: {
    seriesName: '失败任务数',
    color: '#fe2c55',
    areaColor: 'rgba(254,44,85,0.16)',
    values: {
      今日: [0, 1, 0, 2, 1, 0, 1],
      近7日: [2, 1, 5, 2, 3, 1, 3],
      近30日: [12, 9, 14, 8, 11, 7, 6],
    },
  },
};
const boardTabs = ['运行中', '最近完成', '执行失败'];

const rankClasses: Record<number, string> = {
  1: 'bg-[#fe2c55]',
  2: 'bg-[#ff8c1a]',
  3: 'bg-[#e7b500]',
};

function formatDate(date: Date, includeYear = false) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (!includeYear) {
    return `${month}-${day}`;
  }

  return `${date.getFullYear()}.${month}.${day}`;
}

function addDays(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function getOverviewRangeMeta(range: OverviewRange, today: Date) {
  if (range === '今日') {
    return {
      periodText: formatDate(today, true),
      compareLabel: '较昨日',
      axis: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    };
  }

  if (range === '近7日') {
    const start = addDays(today, -6);

    return {
      periodText: `${formatDate(start, true)}-${formatDate(today, true)}`,
      compareLabel: '较前7日',
      axis: Array.from({ length: 7 }, (_, index) =>
        formatDate(addDays(start, index)),
      ),
    };
  }

  const start = addDays(today, -29);
  const offsets = [0, 5, 10, 15, 20, 25, 29];

  return {
    periodText: `${formatDate(start, true)}-${formatDate(today, true)}`,
    compareLabel: '较前30日',
    axis: offsets.map((offset) => formatDate(addDays(start, offset))),
  };
}

function getCompareColorClass(tone: OverviewCompareTone = 'default') {
  if (tone === 'positive') {
    return 'text-[#1677ff]';
  }

  if (tone === 'danger') {
    return 'text-[#fe2c55]';
  }

  return 'text-[rgba(22,24,35,0.58)]';
}

const navigate = (path: string) => {
  history.push(path);
};

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  return [
    ...Array.from({ length: firstDay }, () => ''),
    ...Array.from({ length: daysInMonth }, (_, index) =>
      String(index + 1).padStart(2, '0'),
    ),
  ];
}

function SectionHeader({ title, extra }: { title: string; extra?: ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-[18px]">
      <h2 className="m-0 text-lg font-[650] tracking-[-0.2px] text-[#161823]">
        {title}
      </h2>
      {extra}
    </div>
  );
}

function EmptyState({
  title,
  description,
  compact = false,
}: {
  title: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center rounded-[7px] bg-[#fafafa] text-[rgba(22,24,35,0.42)] ${
        compact ? 'min-h-60' : 'min-h-[190px]'
      }`}
    >
      <div className="relative mb-2 h-[67px] w-20">
        <span className="absolute left-5 top-0 z-[2] flex h-[29px] w-[29px] items-center justify-center rounded-full bg-[#ffe7ec] text-xl font-bold text-[#fe2c55]">
          !
        </span>
        <span className="absolute bottom-[7px] right-[9px] h-[25px] w-[30px] rounded-[3px] border-2 border-[rgba(22,24,35,0.34)]" />
        <span className="absolute bottom-6 left-[15px] h-0.5 w-[38px] origin-left rotate-[20deg] rounded bg-[rgba(22,24,35,0.3)]" />
        <span className="absolute bottom-[13px] left-[15px] h-0.5 w-[30px] origin-left -rotate-[14deg] rounded bg-[rgba(22,24,35,0.3)]" />
      </div>
      <div className="text-xs text-[rgba(22,24,35,0.52)]">{title}</div>
      {description && <div className="mt-0.5 text-xs">{description}</div>}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`relative h-full cursor-pointer border-0 bg-transparent p-0 text-[13px] transition-colors ${
        active
          ? 'font-[650] text-[#161823]'
          : 'text-[rgba(22,24,35,0.5)] hover:text-[#161823]'
      }`}
      onClick={onClick}
    >
      {children}
      {active && (
        <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-sm bg-[#fe2c55]" />
      )}
    </button>
  );
}

function TrendList({
  column,
  bordered,
  last,
}: {
  column: TrendColumn;
  bordered: boolean;
  last: boolean;
}) {
  const [activeTab, setActiveTab] = useState(column.title);
  const ColumnIcon = column.icon;

  return (
    <div
      className={`min-w-0 pr-3.5 xl:pr-[22px] ${
        bordered
          ? 'border-l border-[rgba(22,24,35,0.07)] pl-3.5 xl:pl-[22px]'
          : ''
      } ${last ? '!pr-0' : ''}`}
    >
      <div className="flex h-7 items-start gap-[18px] border-b border-[rgba(22,24,35,0.07)]">
        <button
          type="button"
          className={`relative inline-flex h-7 cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-xs transition-colors ${
            activeTab === column.title
              ? 'font-[650] text-[#161823]'
              : 'text-[rgba(22,24,35,0.45)] hover:text-[#161823]'
          }`}
          onClick={() => setActiveTab(column.title)}
        >
          <ColumnIcon size={15} strokeWidth={2} />
          {column.title}
          {activeTab === column.title && (
            <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-sm bg-[#fe2c55]" />
          )}
        </button>

        <button
          type="button"
          className={`relative h-7 cursor-pointer border-0 bg-transparent p-0 text-xs transition-colors ${
            activeTab === column.secondaryTitle
              ? 'font-[650] text-[#161823]'
              : 'text-[rgba(22,24,35,0.45)] hover:text-[#161823]'
          }`}
          onClick={() => setActiveTab(column.secondaryTitle)}
        >
          {column.secondaryTitle}
          {activeTab === column.secondaryTitle && (
            <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-sm bg-[#fe2c55]" />
          )}
        </button>
      </div>

      <div className="mt-2.5">
        {column.items.map((item) => {
          const ItemIcon = item.icon;

          return (
            <button
              type="button"
              className="mb-[11px] flex w-full min-w-0 cursor-pointer gap-2.5 border-0 bg-transparent p-0 text-left"
              key={`${column.key}-${item.rank}`}
              onClick={() => navigate(item.path)}
            >
              <span
                className={`relative flex h-[58px] w-[49px] shrink-0 items-center justify-center overflow-hidden rounded ${trendToneClasses[item.tone]}`}
              >
                <ItemIcon size={23} strokeWidth={1.8} />
                <span
                  className={`absolute left-0 top-0 flex h-[17px] w-[17px] items-center justify-center rounded-br text-[10px] font-bold text-white ${
                    rankClasses[item.rank] ?? 'bg-[#999]'
                  }`}
                >
                  {item.rank}
                </span>
              </span>

              <span className="flex min-w-0 flex-1 flex-col justify-between py-[3px]">
                <span className="overflow-hidden text-xs leading-[18px] text-[rgba(22,24,35,0.9)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {item.title}
                </span>
                <span className="text-[10px] text-[rgba(22,24,35,0.42)]">
                  {item.valueLabel}
                  <strong className="ml-1 font-[650] text-[rgba(22,24,35,0.7)]">
                    {item.value}
                  </strong>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface EChartsLineChartProps {
  option: EChartsOption;
  className?: string;
}

/**
 * 使用原生 ECharts 渲染趋势图。
 * 动态导入可以避免 Umi 开启 SSR 时在服务端访问 window。
 */
function EChartsLineChart({
  option,
  className = '',
}: EChartsLineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);
  const optionRef = useRef(option);

  useEffect(() => {
    optionRef.current = option;
    chartRef.current?.setOption(option, true);
  }, [option]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const initialize = async () => {
      const echarts = await import('echarts');

      if (cancelled || !containerRef.current) {
        return;
      }

      const chart =
        echarts.getInstanceByDom(containerRef.current) ??
        echarts.init(containerRef.current, undefined, {
          renderer: 'canvas',
        });

      chartRef.current = chart;
      chart.setOption(optionRef.current, true);

      resizeObserver = new ResizeObserver(() => {
        chart.resize();
      });
      resizeObserver.observe(containerRef.current);
    };

    void initialize();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}

function RunOverviewSection() {
  const today = useMemo(() => new Date(), []);
  const [overviewTab, setOverviewTab] =
    useState<OverviewTab>('任务概览');
  const [overviewRange, setOverviewRange] =
    useState<OverviewRange>('近7日');

  const rangeMeta = useMemo(
    () => getOverviewRangeMeta(overviewRange, today),
    [overviewRange, today],
  );

  const chartOption = useMemo<EChartsOption>(() => {
    const config = overviewSeriesConfigs[overviewTab];

    return {
      animationDuration: 500,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(22,24,35,0.92)',
        borderWidth: 0,
        padding: [8, 10],
        textStyle: {
          color: '#fff',
          fontSize: 11,
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: 'rgba(79,114,255,0.22)',
          },
        },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 8,
        itemHeight: 8,
        icon: 'circle',
        data: [config.seriesName],
        textStyle: {
          color: '#8a8f99',
          fontSize: 11,
        },
      },
      grid: {
        top: 30,
        right: 0,
        bottom: 24,
        left: 0,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: rangeMeta.axis,
        axisTick: {
          show: false,
        },
        axisLine: {
          lineStyle: {
            color: '#e8e9ec',
          },
        },
        axisLabel: {
          color: '#8a8f99',
          fontSize: 11,
          margin: 9,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        show: false,
      },
      series: [
        {
          name: config.seriesName,
          type: 'line',
          data: config.values[overviewRange],
          smooth: 0.45,
          showSymbol: false,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: config.color,
          },
          itemStyle: {
            color: config.color,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: config.areaColor,
                },
                {
                  offset: 1,
                  color: 'rgba(255,255,255,0)',
                },
              ],
            },
          },
          emphasis: {
            focus: 'series',
            scale: true,
          },
        },
      ],
    };
  }, [overviewRange, overviewTab, rangeMeta.axis]);

  return (
    <section className={`${HOME_CARD_CLASS} min-h-[385px] p-[22px]`}>
      <div className="flex min-h-7 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="m-0 shrink-0 text-lg font-[650] tracking-[-0.2px] text-[#161823]">
            运行概览
          </h2>

          <Tooltip title="统计离线同步、实时同步和工作流任务的运行情况">
            <button
              type="button"
              className="flex cursor-help items-center border-0 bg-transparent p-0 text-[rgba(22,24,35,0.35)]"
              aria-label="运行概览说明"
            >
              <CircleHelp size={14} />
            </button>
          </Tooltip>

          <span className="truncate text-xs text-[rgba(22,24,35,0.46)]">
            统计周期：{rangeMeta.periodText}（每 5 分钟更新）
          </span>
        </div>

        <button
          type="button"
          className={MORE_BUTTON_CLASS}
          onClick={() => navigate('/metrics')}
        >
          查看更多
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="mt-[18px] grid grid-cols-1 gap-6 min-[1041px]:grid-cols-[194px_minmax(0,1fr)]">
        <aside className="min-w-0 min-[1041px]:border-r min-[1041px]:border-[rgba(22,24,35,0.07)] min-[1041px]:pr-[22px]">
          <h3 className="mb-2 mt-0 text-[13px] font-[650] text-[#161823]">
            最近运行
          </h3>

          <div className="relative flex h-[262px] overflow-hidden rounded-[9px] bg-[linear-gradient(145deg,#747983_0%,#252832_100%)] p-4 text-white shadow-[0_8px_24px_rgba(22,24,35,0.12)]">
            <span className="absolute -right-10 -top-12 h-32 w-32 rounded-full border border-white/10" />
            <span className="absolute -right-4 top-2 h-20 w-20 rounded-full border border-white/10" />
            <span className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5 blur-xl" />

            <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/65">
                  最近一次运行
                </span>

                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8df0b5]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5ee28f]" />
                  成功
                </span>
              </div>

              <div className="mt-3 line-clamp-2 text-[13px] font-[650] leading-5">
                订单明细增量同步
              </div>

              <div className="mt-1 truncate text-[10px] text-white/50">
                RUN-20260801-0126
              </div>

              <div className="mt-auto space-y-2.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">处理行数</span>
                  <strong className="font-[650] text-white">286.4 万</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/60">同步速率</span>
                  <strong className="font-[650] text-white">7.6 万行/s</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/60">执行耗时</span>
                  <strong className="font-[650] text-white">6m 18s</strong>
                </div>

                <button
                  type="button"
                  className="mt-1 inline-flex cursor-pointer items-center border-0 bg-transparent p-0 text-[11px] text-white/80 transition-colors hover:text-white"
                  onClick={() => navigate('/sync/batch-link-up')}
                >
                  查看运行详情
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex h-8 items-start justify-between border-b border-[rgba(22,24,35,0.07)]">
            <div className="flex h-full items-start gap-6">
              {overviewTabs.map((tab) => (
                <TabButton
                  active={overviewTab === tab}
                  onClick={() => setOverviewTab(tab)}
                  key={tab}
                >
                  {tab}
                </TabButton>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[rgba(22,24,35,0.48)]">
                时间
              </span>

              <Select<OverviewRange>
                variant="filled"
                size="small"
                value={overviewRange}
                options={overviewRangeOptions}
                popupMatchSelectWidth={false}
                className="w-[82px] [&_.ant-select-selector]:!rounded-[7px]"
                onChange={setOverviewRange}
              />
            </div>
          </div>

          <div className="h-[146px] min-w-0 pt-2">
            <EChartsLineChart
              option={chartOption}
              className="h-[138px] w-full"
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-4 xl:grid-cols-3">
            {overviewMetrics[overviewTab].map((metric) => (
              <div className="min-w-0" key={metric.label}>
                <div
                  className={`text-[11px] font-medium ${
                    metric.emphasis
                      ? 'text-[#fe2c55]'
                      : 'text-[rgba(22,24,35,0.82)]'
                  }`}
                >
                  {metric.emphasis && (
                    <span className="mr-1 inline-block h-3 w-0.5 translate-y-0.5 rounded bg-[#fe2c55]" />
                  )}
                  {metric.label}
                </div>

                <div className="mt-1 flex min-w-0 items-baseline gap-1.5">
                  <strong className="shrink-0 text-[21px] font-[650] leading-7 text-[#161823]">
                    {metric.value}
                  </strong>

                  <span className="truncate text-[10px] text-[rgba(22,24,35,0.42)]">
                    {metric.detail ?? rangeMeta.compareLabel}

                    {!metric.detail && metric.compareValue && (
                      <span
                        className={`ml-0.5 font-medium ${getCompareColorClass(
                          metric.compareTone,
                        )}`}
                      >
                        {metric.compareValue}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const HomePage = () => {
  const now = useMemo(() => new Date(), []);
  const [boardTab, setBoardTab] = useState(boardTabs[0]);
  const [calendarDate, setCalendarDate] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth() + 1;
  const calendarDays = useMemo(
    () => buildCalendarDays(year, month),
    [year, month],
  );

  const monthText = `${year}年${String(month).padStart(2, '0')}月`;

  const changeMonth = (offset: number) => {
    setCalendarDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const isToday = (day: string) =>
    Boolean(day) &&
    year === now.getFullYear() &&
    month === now.getMonth() + 1 &&
    Number(day) === now.getDate();

  return (
    <div className="relative min-h-full overflow-hidden bg-[#f7f8fa] p-4 font-sans text-[#161823] min-[1041px]:p-5">
      <section className="relative flex min-h-[118px] items-center overflow-hidden rounded-[10px] bg-[linear-gradient(100deg,rgba(255,255,255,0.94)_0%,rgba(247,247,255,0.84)_40%),linear-gradient(115deg,#f9fbff_0%,#e7e7ff_62%,#d8dbff_100%)] px-[30px] py-6">
        <div className="absolute -top-[180px] right-[45px] h-[470px] w-[470px] rounded-full border border-[rgba(126,133,255,0.15)] shadow-[inset_0_0_0_28px_rgba(255,255,255,0.08),inset_0_0_0_76px_rgba(255,255,255,0.07)]" />
        <div className="absolute -top-[116px] right-[230px] h-[280px] w-[280px] rounded-full border border-[rgba(126,133,255,0.15)]" />

        <div className="relative z-[1] flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full border-2 border-[rgba(255,255,255,0.92)] bg-[#161823] text-white shadow-[0_5px_20px_rgba(53,63,110,0.12)]">
          <Sparkles size={27} strokeWidth={1.8} />
        </div>

        <div className="relative z-[1] ml-[18px] min-w-0">
          <div className="flex items-center whitespace-nowrap text-[13px] text-[rgba(22,24,35,0.55)]">
            <strong className="text-[16px] font-[650] text-[#161823]">
              Yak Ops 一体化平台
            </strong>
            <span className="mx-3 h-[13px] w-px bg-[rgba(22,24,35,0.14)]" />
            <span>默认项目</span>
            <span className="mx-3 h-[13px] w-px bg-[rgba(22,24,35,0.14)]" />
            <span>生产环境</span>
          </div>

          <div className="mt-3.5 flex gap-[22px] text-[13px] text-[rgba(22,24,35,0.52)]">
            <span>
              数据源
              <strong className="ml-1 text-sm font-[650] text-[#161823]">
                12
              </strong>
            </span>
            <span>
              在线客户端
              <strong className="ml-1 text-sm font-[650] text-[#161823]">
                8
              </strong>
            </span>
            <span>
              今日运行
              <strong className="ml-1 text-sm font-[650] text-[#161823]">
                126
              </strong>
            </span>
          </div>
        </div>

        <div className="relative z-[1] ml-auto flex gap-3">
          {[
            { label: '告警', icon: Bell, path: '/alarm' },
            { label: '监控', icon: Gauge, path: '/metrics' },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                className="flex min-w-[45px] cursor-pointer flex-col items-center gap-1 border-0 bg-transparent text-[11px] text-[rgba(22,24,35,0.58)] transition-colors hover:text-[#161823]"
                key={item.label}
                onClick={() => navigate(item.path)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`${HOME_CARD_CLASS} mt-4 px-[22px] pb-[22px] pt-5`}>
        <SectionHeader
          title="快速创建"
          extra={
            <div className="flex items-center gap-1.5 text-xs text-[rgba(22,24,35,0.48)]">
              从数据接入到任务运行，统一完成配置与管理
              <button
                type="button"
                className="inline-flex cursor-pointer items-center border-0 bg-transparent p-0 text-[#3488e5]"
                onClick={() => navigate('/sync/batch-link-up')}
              >
                查看任务
                <ChevronRight size={14} />
              </button>
            </div>
          }
        />

        <div className="mt-[13px] grid grid-cols-2 gap-3 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                type="button"
                className={`relative flex h-[62px] min-w-0 cursor-pointer items-center overflow-hidden rounded-[9px] border-0 px-4 text-left transition duration-150 hover:-translate-y-px hover:shadow-[0_7px_20px_rgba(22,24,35,0.08)] ${actionToneClasses[action.tone]}`}
                key={action.title}
                onClick={() => navigate(action.path)}
              >
                <span className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-current text-white shadow-[0_4px_10px_rgba(22,24,35,0.09)]">
                  <Icon className="text-white" size={21} strokeWidth={2.1} />
                </span>
                <span className="relative z-[1] ml-2.5 flex min-w-0 flex-col">
                  <strong className="truncate text-sm font-[650] text-[#161823]">
                    {action.title}
                  </strong>
                  <span className="mt-[3px] truncate text-[11px] text-[rgba(22,24,35,0.5)]">
                    {action.description}
                  </span>
                </span>
                <span className="absolute -right-2 -top-6 h-[92px] w-[68px] -rotate-[28deg] rounded-[22px] border-[12px] border-current opacity-[0.08]" />
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 min-[1041px]:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,3fr)_minmax(310px,1fr)]">
        <RunOverviewSection />

        <aside
          className={`${HOME_CARD_CLASS} min-h-[530px] p-[22px] min-[1041px]:row-span-2`}
        >
          <SectionHeader
            title="调度日历"
            extra={
              <button
                type="button"
                className={MORE_BUTTON_CLASS}
                onClick={() => navigate('/sync/batch-link-up')}
              >
                查看任务
                <ChevronRight size={14} />
              </button>
            }
          />

          <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[11px] text-[rgba(22,24,35,0.45)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#fe2c55]" />
            今日有 3 项计划
          </div>

          <div className="mt-[13px] flex items-center justify-center gap-[7px]">
            <button
              type="button"
              className="flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[rgba(22,24,35,0.45)] transition-colors hover:bg-[#f5f5f6] hover:text-[#161823]"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft size={15} />
            </button>
            <strong className="min-w-24 text-center text-sm">{monthText}</strong>
            <button
              type="button"
              className="flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[rgba(22,24,35,0.45)] transition-colors hover:bg-[#f5f5f6] hover:text-[#161823]"
              onClick={() => changeMonth(1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="mt-[7px] grid grid-cols-7 text-center text-[11px] text-[rgba(22,24,35,0.48)]">
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const hasSchedule =
                Boolean(day) && [1, 5, 10, 15, 20, 25, 30].includes(Number(day));

              return (
                <div
                  className="relative flex h-[42px] items-center justify-center border-b border-[rgba(254,44,85,0.12)] text-[11px] text-[rgba(22,24,35,0.78)]"
                  key={`${day}-${index}`}
                >
                  {hasSchedule && !isToday(day) && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[rgba(254,44,85,0.55)]" />
                  )}
                  {isToday(day) ? (
                    <span className="relative z-[1] flex h-[25px] w-[25px] items-center justify-center rounded-full bg-[#fe2c55] font-[650] text-white">
                      {day}
                    </span>
                  ) : (
                    day
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-[23px]">
            <div className="flex items-center justify-between">
              <strong className="text-sm">今日调度计划</strong>
              <span className="text-[11px] text-[rgba(22,24,35,0.45)]">
                共 3 项
              </span>
            </div>

            <div className="mt-2.5">
              {scheduleItems.map((item) => (
                <button
                  type="button"
                  className="grid min-h-[31px] w-full cursor-pointer grid-cols-[7px_minmax(0,1fr)_auto_auto] items-center gap-1.5 border-0 bg-transparent p-0 text-left text-[11px]"
                  key={item.title}
                  onClick={() => navigate(item.path)}
                >
                  <span className="h-[5px] w-[5px] rounded-full bg-[#fe2c55]" />
                  <span className="truncate text-[rgba(22,24,35,0.85)]">
                    {item.title}
                  </span>
                  <span className="whitespace-nowrap rounded-[3px] border border-[rgba(22,24,35,0.09)] px-1 py-px text-[rgba(22,24,35,0.5)]">
                    {item.category}
                  </span>
                  <time className="whitespace-nowrap text-[rgba(22,24,35,0.42)]">
                    {item.time}
                  </time>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className={`${HOME_CARD_CLASS} min-h-36 p-[22px]`}>
          <SectionHeader title="告警与待办" />

          <div className="mt-2.5 grid grid-cols-2">
            <div className="relative min-h-[74px] min-w-0 pr-[25px]">
              <div className="flex items-center gap-1.5 text-xs text-[rgba(22,24,35,0.58)]">
                <TriangleAlert size={15} />
                <strong className="text-[13px] font-bold text-[rgba(22,24,35,0.88)]">
                  告警事件
                </strong>
                <span className="rounded-[7px] bg-[#ffe7ec] px-[5px] py-px text-[9px] font-[650] text-[#fe2c55]">
                  2
                </span>
              </div>
              <p className="mt-[7px] text-xs text-[rgba(22,24,35,0.68)]">
                发现 2 个任务运行异常，请及时处理
              </p>
              <button
                type="button"
                className="absolute bottom-0 right-5 flex cursor-pointer items-center border-0 bg-transparent p-0 text-[11px] text-[rgba(22,24,35,0.5)]"
                onClick={() => navigate('/alarm')}
              >
                告警管理
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="relative min-h-[74px] min-w-0 border-l border-[rgba(22,24,35,0.07)] pl-[30px]">
              <div className="flex items-center gap-1.5 text-xs text-[rgba(22,24,35,0.58)]">
                <Wrench size={15} />
                <strong className="text-[13px] font-bold text-[rgba(22,24,35,0.88)]">
                  待处理任务
                </strong>
                <span className="rounded-[7px] bg-[#fff3e8] px-[5px] py-px text-[9px] font-[650] text-[#f97316]">
                  3
                </span>
                <time className="ml-auto text-[11px] text-[rgba(22,24,35,0.42)]">
                  刚刚更新
                </time>
              </div>
              <p className="mt-[7px] text-xs text-[rgba(22,24,35,0.68)]">
                失败重试、连接异常与质量规则待确认
              </p>
              <button
                type="button"
                className="absolute bottom-0 right-0 flex cursor-pointer items-center border-0 bg-transparent p-0 text-[11px] text-[rgba(22,24,35,0.5)]"
                onClick={() => navigate('/metrics')}
              >
                运行监控
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 min-[1041px]:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,3fr)_minmax(310px,1fr)]">
        <section className={`${HOME_CARD_CLASS} min-h-[150px] p-[22px]`}>
          <SectionHeader
            title="资源概览"
            extra={
              <button
                type="button"
                className={MORE_BUTTON_CLASS}
                onClick={() => navigate('/data-source')}
              >
                资源管理
                <ChevronRight size={14} />
              </button>
            }
          />

          <div className="mt-[13px] grid grid-cols-2 gap-3.5 min-[1041px]:grid-cols-[0.8fr_1fr_1fr] xl:grid-cols-[0.95fr_1fr_1fr]">
            <div className="col-span-2 px-1 py-[9px] min-[1041px]:col-span-1">
              <div className="flex items-center gap-[5px] text-[11px]">
                <strong className="text-[13px]">资源健康度</strong>
                <span className="text-[rgba(22,24,35,0.48)]">实时统计</span>
                <ChevronRight size={13} />
              </div>
              <div className="mt-2.5 text-sm font-[650]">96.8%</div>
            </div>

            {[
              {
                title: '数据源 12 个',
                description: '11 个正常，1 个连接异常',
                icon: Database,
                path: '/data-source',
              },
              {
                title: '客户端 8 个',
                description: '7 个在线，1 个离线',
                icon: Server,
                path: '/client',
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  type="button"
                  className="flex h-[76px] min-w-0 cursor-pointer items-center rounded-lg border-0 bg-[#fff5f6] bg-[radial-gradient(circle_at_88%_80%,rgba(254,44,85,0.08),transparent_36%)] px-3.5 text-left text-[#161823]"
                  key={item.title}
                  onClick={() => navigate(item.path)}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(145deg,#ff8d8d,#ff516e)] text-white">
                    <Icon size={17} />
                  </span>
                  <span className="ml-[9px] flex min-w-0 flex-1 flex-col">
                    <strong className="truncate text-[13px] font-[650]">
                      {item.title}
                    </strong>
                    <span className="mt-1 truncate text-[11px] text-[rgba(22,24,35,0.45)]">
                      {item.description}
                    </span>
                  </span>
                  <span className="hidden rounded-[5px] bg-[#fe2c55] px-2.5 py-[5px] text-[11px] font-[650] text-white xl:inline-block">
                    查看
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className={`${HOME_CARD_CLASS} min-h-[150px] p-[22px]`}>
          <SectionHeader title="快捷导航" />

          <div className="mt-4 grid grid-cols-4 gap-3">
            {[
              {
                label: '数据源',
                icon: Database,
                color: 'text-[#161823]',
                path: '/data-source',
              },
              {
                label: '客户端',
                icon: Server,
                color: 'text-[#ef3f73]',
                path: '/client',
              },
              {
                label: '连接器',
                icon: Boxes,
                color: 'text-[#4a78ef]',
                path: '/connector',
              },
              {
                label: '运行监控',
                icon: Monitor,
                color: 'text-[#12aee8]',
                path: '/metrics',
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  type="button"
                  className="group flex min-w-0 cursor-pointer flex-col items-center gap-[7px] whitespace-nowrap border-0 bg-transparent p-0 text-[11px] text-[rgba(22,24,35,0.82)]"
                  key={item.label}
                  onClick={() => navigate(item.path)}
                >
                  <span
                    className={`flex h-[42px] w-[42px] items-center justify-center rounded-[10px] border border-[rgba(22,24,35,0.06)] bg-white shadow-[0_3px_10px_rgba(22,24,35,0.04)] transition duration-150 group-hover:-translate-y-0.5 group-hover:shadow-[0_7px_16px_rgba(22,24,35,0.08)] ${item.color}`}
                  >
                    <Icon size={22} strokeWidth={2} />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section className={`${HOME_CARD_CLASS} min-h-[455px] p-[22px]`}>
          <SectionHeader
            title="运行看板"
            extra={
              <button
                type="button"
                className={MORE_BUTTON_CLASS}
                onClick={() => navigate('/metrics')}
              >
                查看全部
                <ChevronRight size={14} />
              </button>
            }
          />

          <div className="mt-1.5 flex h-[31px] items-start gap-6 border-b border-[rgba(22,24,35,0.07)]">
            {boardTabs.map((tab) => (
              <TabButton
                active={boardTab === tab}
                onClick={() => setBoardTab(tab)}
                key={tab}
              >
                {tab}
              </TabButton>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3">
            {trendColumns.map((column, index) => (
              <TrendList
                column={column}
                bordered={index > 0}
                last={index === trendColumns.length - 1}
                key={column.key}
              />
            ))}
          </div>
        </section>

        <aside className={`${HOME_CARD_CLASS} min-h-[455px] p-[22px]`}>
          <SectionHeader
            title="重点监控"
            extra={
              <button
                type="button"
                className={MORE_BUTTON_CLASS}
                onClick={() => navigate('/metrics')}
              >
                查看更多
                <ChevronRight size={14} />
              </button>
            }
          />

          <div className="mt-[11px] flex h-[370px] flex-col items-center justify-center rounded-md bg-[#fafafa]">
            <div className="relative flex h-[78px] w-[90px] items-end justify-center text-[rgba(22,24,35,0.48)]">
              <Monitor size={48} strokeWidth={1.4} />
              <span className="absolute left-[13px] top-0 rounded-full bg-[#ffe7ec] text-[#fe2c55]">
                <Plus size={22} strokeWidth={2.3} />
              </span>
            </div>
            <p className="mb-[13px] mt-5 max-w-60 text-center text-[11px] leading-[18px] text-[rgba(22,24,35,0.42)]">
              将核心同步任务、工作流或质量规则加入重点监控，快速关注运行状态
            </p>
            <button
              type="button"
              className="flex h-[34px] cursor-pointer items-center gap-[5px] rounded-[7px] border-0 bg-[#fe2c55] px-3.5 text-xs font-[650] text-white"
              onClick={() => navigate('/metrics')}
            >
              <Plus size={15} />
              添加监控
            </button>
          </div>
        </aside>
      </div>

      <button
        type="button"
        className="fixed bottom-6 right-6 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-[rgba(22,24,35,0.48)] shadow-[0_4px_16px_rgba(22,24,35,0.12)] transition-colors hover:text-[#fe2c55]"
        aria-label="帮助"
      >
        <CircleHelp size={21} />
      </button>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[rgba(22,24,35,0.35)]">
        <Activity size={14} />
        当前为静态演示数据，可替换为 Yak Ops 实际接口数据
        <ExternalLink size={13} />
      </div>
    </div>
  );
};

export default HomePage;