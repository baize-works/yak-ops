import { history } from '@umijs/max';
import {
  Activity,
  AlarmClock,
  ArrowRight,
  Bell,
  Braces,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleDot,
  Clock3,
  CloudCog,
  Code2,
  DatabaseZap,
  FileCheck2,
  FolderTree,
  Gauge,
  GitBranch,
  HardDrive,
  Layers3,
  Play,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  Workflow,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

type OverviewTab = 'TASK' | 'ROWS' | 'QUALITY';
type OverviewRange = 7 | 30;
type PlanStatus = 'DONE' | 'RUNNING' | 'PLANNED';

interface QuickAction {
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
  iconClassName: string;
  accentClassName: string;
}

interface ModuleItem {
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
  status: string;
  meta: string;
}

interface CalendarCell {
  date: Date;
  currentMonth: boolean;
}

interface DailyPlan {
  time: string;
  title: string;
  description: string;
  status: PlanStatus;
}

interface OverviewDefinition {
  label: string;
  description: string;
  unit: string;
  total: Record<OverviewRange, string>;
  helper: Record<OverviewRange, string>;
  values: Record<OverviewRange, number[]>;
}

const quickActions: QuickAction[] = [
  {
    title: '新建离线同步',
    description: '批量迁移与周期性数据同步',
    path: '/sync/batch-link-up',
    icon: DatabaseZap,
    iconClassName: 'bg-[rgba(254,44,85,0.08)] text-[#fe2c55]',
    accentClassName: 'group-hover:border-[rgba(254,44,85,0.28)]',
  },
  {
    title: '新建实时同步',
    description: '持续采集数据库变更数据',
    path: '/sync/realtime-link-up',
    icon: RefreshCw,
    iconClassName: 'bg-[#f2f3f5] text-[rgba(22,24,35,0.68)]',
    accentClassName: 'group-hover:border-[#d8d9dd]',
  },
  {
    title: '新建开发任务',
    description: '编写 SQL 与 Python 处理脚本',
    path: '/data-development',
    icon: Braces,
    iconClassName: 'bg-[#fff5e8] text-[#b65d00]',
    accentClassName: 'group-hover:border-[#f0cf9e]',
  },
  {
    title: '新建工作流',
    description: '编排任务依赖与自动化流程',
    path: '/workflow-management',
    icon: Workflow,
    iconClassName: 'bg-[#f6f1ff] text-[#7252aa]',
    accentClassName: 'group-hover:border-[#d9cbed]',
  },
];

const moduleItems: ModuleItem[] = [
  {
    title: '数据集成',
    description: '离线与实时同步任务',
    path: '/sync/batch-link-up',
    icon: DatabaseZap,
    status: '运行正常',
    meta: '12 个任务运行中',
  },
  {
    title: '数据开发',
    description: 'SQL 与 Python 开发任务',
    path: '/data-development',
    icon: Code2,
    status: '4 种引擎',
    meta: '8 个草稿待完善',
  },
  {
    title: '流程编排',
    description: '工作流定义与实例管理',
    path: '/workflow-management',
    icon: GitBranch,
    status: '6 个流程',
    meta: '今日执行 42 次',
  },
  {
    title: '资源管理',
    description: '数据源、文件与客户端',
    path: '/resource-management',
    icon: FolderTree,
    status: '资源可用',
    meta: '18 个数据源',
  },
  {
    title: '数据质量',
    description: '质量规则与检测报告',
    path: '/data-quality',
    icon: ShieldCheck,
    status: '通过率 98.6%',
    meta: '3 条规则待处理',
  },
  {
    title: '运维中心',
    description: '运行监控与告警处置',
    path: '/metrics',
    icon: Gauge,
    status: '集群稳定',
    meta: '2 条告警待确认',
  },
];

const overviewDefinitions: Record<OverviewTab, OverviewDefinition> = {
  TASK: {
    label: '任务执行趋势',
    description: '离线同步、实时同步和工作流执行次数',
    unit: '次',
    total: { 7: '186', 30: '768' },
    helper: { 7: '较上周增加 12.6%', 30: '日均执行 25.6 次' },
    values: {
      7: [42, 58, 48, 76, 64, 88, 72],
      30: [48, 62, 55, 76, 68, 82, 74, 90, 84, 72, 88, 94],
    },
  },
  ROWS: {
    label: '数据处理规模',
    description: '任务成功写入目标端的数据量',
    unit: '万行',
    total: { 7: '2,486', 30: '10,832' },
    helper: { 7: '峰值出现在周五', 30: '累计处理约 1.08 亿行' },
    values: {
      7: [38, 56, 72, 62, 92, 78, 66],
      30: [52, 44, 64, 78, 70, 86, 62, 74, 96, 82, 70, 88],
    },
  },
  QUALITY: {
    label: '质量检测通过率',
    description: '质量规则检测结果的日均通过率',
    unit: '%',
    total: { 7: '98.6', 30: '97.9' },
    helper: { 7: '存在 3 条异常规则', 30: '较上月提升 1.4%' },
    values: {
      7: [82, 88, 86, 94, 90, 98, 96],
      30: [84, 86, 90, 88, 92, 94, 91, 96, 93, 98, 95, 97],
    },
  },
};

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
const shortWeekdayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const pad = (value: number) => String(value).padStart(2, '0');

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const buildCalendarCells = (year: number, month: number): CalendarCell[] => {
  const firstDay = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      date,
      currentMonth: date.getMonth() === month,
    };
  });
};

const getDailyTaskCount = (date: Date) => {
  const day = date.getDate();
  const base = ((day * 7 + date.getMonth() * 3) % 13) + 5;
  return date.getDay() === 0 ? Math.max(2, base - 5) : base;
};

const getDailyPlans = (date: Date): DailyPlan[] => {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const baseStatus: PlanStatus = target < today ? 'DONE' : target > today ? 'PLANNED' : 'RUNNING';
  const day = date.getDate();

  const plans: DailyPlan[] = [
    {
      time: '02:00',
      title: '核心业务库离线同步',
      description: 'MySQL → 数据仓库，预计处理 320 万行',
      status: baseStatus,
    },
    {
      time: '08:30',
      title: '数据质量日检',
      description: '执行完整性、唯一性和及时性规则',
      status: target === today ? 'RUNNING' : baseStatus,
    },
  ];

  if (day % 2 === 0) {
    plans.push({
      time: '14:00',
      title: '实时链路巡检',
      description: '检查延迟、吞吐量和客户端在线状态',
      status: baseStatus,
    });
  }

  if (day % 5 === 0) {
    plans.push({
      time: '18:00',
      title: '文件资源归档',
      description: '整理历史脚本、配置和运行产物',
      status: baseStatus,
    });
  }

  return plans;
};

const statusMeta: Record<PlanStatus, { label: string; className: string }> = {
  DONE: {
    label: '已完成',
    className: 'bg-[#f2f3f5] text-[rgba(22,24,35,0.58)]',
  },
  RUNNING: {
    label: '运行中',
    className: 'bg-[rgba(254,44,85,0.08)] text-[#fe2c55]',
  },
  PLANNED: {
    label: '计划中',
    className: 'bg-[#fff5e8] text-[#a85800]',
  },
};

function SectionHeader({
  title,
  description,
  extra,
}: {
  title: string;
  description?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 border-b border-[#f0f0f2] px-5 py-3 max-sm:items-start max-sm:flex-col">
      <div className="min-w-0">
        <h2 className="m-0 text-[15px] font-semibold leading-6 text-[#161823]">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 mb-0 text-xs leading-5 text-[rgba(22,24,35,0.42)]">
            {description}
          </p>
        )}
      </div>
      {extra}
    </div>
  );
}

function LinkButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex shrink-0 items-center gap-1 border-0 bg-transparent p-0 text-xs text-[rgba(22,24,35,0.48)] transition-colors hover:text-[#fe2c55]"
      onClick={onClick}
    >
      {children}
      <ChevronRight size={14} />
    </button>
  );
}

const HomePage = () => {
  const today = useMemo(() => new Date(), []);
  const [overviewTab, setOverviewTab] = useState<OverviewTab>('TASK');
  const [overviewRange, setOverviewRange] = useState<OverviewRange>(7);
  const [calendarCursor, setCalendarCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today);

  const calendarCells = useMemo(
    () => buildCalendarCells(calendarCursor.getFullYear(), calendarCursor.getMonth()),
    [calendarCursor],
  );
  const selectedPlans = useMemo(() => getDailyPlans(selectedDate), [selectedDate]);
  const overview = overviewDefinitions[overviewTab];
  const overviewValues = overview.values[overviewRange];
  const maxOverviewValue = Math.max(...overviewValues);
  const hour = today.getHours();
  const greeting = hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好';

  const changeMonth = (offset: number) => {
    setCalendarCursor((current) =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const selectCalendarDate = (date: Date) => {
    setSelectedDate(date);
    if (
      date.getFullYear() !== calendarCursor.getFullYear() ||
      date.getMonth() !== calendarCursor.getMonth()
    ) {
      setCalendarCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#f6f6f7] px-5 py-5 text-[#161823] max-md:px-3 max-md:py-3">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-3">
        <section className="relative overflow-hidden bg-[linear-gradient(120deg,#161823_0%,#26262c_58%,#43242d_100%)] px-6 py-5 text-white shadow-[0_8px_24px_rgba(22,24,35,0.10)] max-md:px-4">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-[rgba(254,44,85,0.18)] blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-100px] left-[34%] h-52 w-52 rounded-full bg-white/5 blur-3xl" />

          <div className="relative flex min-h-[116px] items-center justify-between gap-6 max-lg:items-start max-lg:flex-col">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-inner">
                <DatabaseZap size={27} className="text-[#ff5d7c]" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="m-0 text-[22px] font-semibold tracking-[-0.02em]">
                    {greeting}，欢迎回到 Yak Ops
                  </h1>
                  <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                    数据一体化平台
                  </span>
                </div>
                <p className="mt-2 mb-0 max-w-2xl text-[13px] leading-6 text-white/55">
                  统一管理数据集成、开发、流程编排、质量检测与运行运维，让数据链路清晰、稳定、可追踪。
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/55">
                  <span className="inline-flex items-center gap-1.5">
                    <CircleDot size={13} className="text-[#ff5d7c]" />
                    运行中任务 <strong className="text-sm font-semibold text-white">12</strong>
                  </span>
                  <span>
                    今日成功 <strong className="ml-1 text-sm font-semibold text-white">186</strong>
                  </span>
                  <span>
                    待处理告警 <strong className="ml-1 text-sm font-semibold text-[#ff8ca2]">2</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 text-xs text-white/80 transition hover:bg-white/15 hover:text-white"
                onClick={() => history.push('/system/messages')}
              >
                <Bell size={15} />
                消息中心
                <span className="rounded-full bg-[#fe2c55] px-1.5 text-[10px] leading-4 text-white">
                  3
                </span>
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#fe2c55] px-3 text-xs font-medium text-white transition hover:bg-[#e9274d]"
                onClick={() => history.push('/metrics')}
              >
                <Activity size={15} />
                运行监控
              </button>
            </div>
          </div>
        </section>

        <section className="border border-[#e9e9ec] bg-white">
          <SectionHeader
            title="快速开始"
            description="从常用任务入口快速进入数据处理流程"
            extra={
              <LinkButton onClick={() => history.push('/workflow-project')}>
                查看工作流项目
              </LinkButton>
            }
          />
          <div className="grid grid-cols-4 gap-3 p-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  type="button"
                  key={action.title}
                  className={`group flex min-h-[82px] items-center gap-3 border border-[#ededf0] bg-[#fafafb] px-4 py-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_20px_rgba(22,24,35,0.06)] ${action.accentClassName}`}
                  onClick={() => history.push(action.path)}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${action.iconClassName}`}
                  >
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-[13px] font-semibold text-[#161823]">
                      {action.title}
                    </strong>
                    <span className="mt-1 block truncate text-[11px] text-[rgba(22,24,35,0.42)]">
                      {action.description}
                    </span>
                  </span>
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-[rgba(22,24,35,0.22)] transition group-hover:translate-x-0.5 group-hover:text-[#fe2c55]"
                  />
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(340px,0.8fr)] gap-3 max-[1180px]:grid-cols-1">
          <section className="min-w-0 border border-[#e9e9ec] bg-white">
            <SectionHeader
              title="运行概览"
              description="当前为界面演示数据，后续可对接任务、实例和质量统计接口"
              extra={
                <LinkButton onClick={() => history.push('/metrics')}>
                  查看运行详情
                </LinkButton>
              }
            />

            <div className="flex min-h-[390px] max-lg:flex-col">
              <aside className="w-[230px] shrink-0 border-r border-[#f0f0f2] p-4 max-lg:w-full max-lg:border-r-0 max-lg:border-b">
                <div className="text-xs font-medium text-[rgba(22,24,35,0.48)]">
                  今日运行摘要
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    {
                      label: '成功任务',
                      value: '186',
                      icon: CheckCircle2,
                      className: 'text-[rgba(22,24,35,0.68)] bg-[#f2f3f5]',
                    },
                    {
                      label: '运行中',
                      value: '12',
                      icon: Play,
                      className: 'text-[#fe2c55] bg-[rgba(254,44,85,0.07)]',
                    },
                    {
                      label: '失败任务',
                      value: '3',
                      icon: XCircle,
                      className: 'text-[#b65d00] bg-[#fff5e8]',
                    },
                    {
                      label: '平均耗时',
                      value: '08:24',
                      icon: Clock3,
                      className: 'text-[#7252aa] bg-[#f6f1ff]',
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 border border-[#f0f0f2] px-3 py-2.5"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-xs text-[rgba(22,24,35,0.56)]">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${item.className}`}
                          >
                            <Icon size={14} />
                          </span>
                          {item.label}
                        </span>
                        <strong className="text-[13px] font-semibold text-[#161823]">
                          {item.value}
                        </strong>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-between border-0 bg-[#f7f7f8] px-3 py-2.5 text-left text-xs text-[rgba(22,24,35,0.58)] transition hover:bg-[#f1f1f3] hover:text-[#161823]"
                  onClick={() => history.push('/alarm')}
                >
                  <span className="inline-flex items-center gap-2">
                    <CircleAlert size={15} className="text-[#fe2c55]" />
                    2 条告警待确认
                  </span>
                  <ChevronRight size={14} />
                </button>
              </aside>

              <div className="min-w-0 flex-1 p-5 max-sm:p-4">
                <div className="flex items-center justify-between gap-4 max-md:items-start max-md:flex-col">
                  <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#f5f5f6] p-1">
                    {(
                      [
                        ['TASK', '任务趋势'],
                        ['ROWS', '处理数据量'],
                        ['QUALITY', '质量通过率'],
                      ] as Array<[OverviewTab, string]>
                    ).map(([key, label]) => (
                      <button
                        type="button"
                        key={key}
                        className={`h-7 rounded-md px-3 text-xs transition ${
                          overviewTab === key
                            ? 'bg-white font-medium text-[#161823] shadow-sm'
                            : 'text-[rgba(22,24,35,0.45)] hover:text-[#161823]'
                        }`}
                        onClick={() => setOverviewTab(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    {([7, 30] as OverviewRange[]).map((range) => (
                      <button
                        type="button"
                        key={range}
                        className={`h-7 border px-2.5 transition ${
                          overviewRange === range
                            ? 'border-[rgba(254,44,85,0.28)] bg-[rgba(254,44,85,0.06)] text-[#fe2c55]'
                            : 'border-[#e8e8eb] bg-white text-[rgba(22,24,35,0.45)] hover:border-[#d4d4d8]'
                        }`}
                        onClick={() => setOverviewRange(range)}
                      >
                        近{range}日
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-xs text-[rgba(22,24,35,0.42)]">
                      {overview.label}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <strong className="text-[28px] font-semibold tracking-[-0.03em] text-[#161823]">
                        {overview.total[overviewRange]}
                      </strong>
                      <span className="text-xs text-[rgba(22,24,35,0.42)]">
                        {overview.unit}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-[11px] leading-5 text-[rgba(22,24,35,0.42)]">
                    <div>{overview.description}</div>
                    <div className="text-[#fe2c55]">{overview.helper[overviewRange]}</div>
                  </div>
                </div>

                <div className="mt-5 flex h-[168px] items-end gap-2 border-b border-[#ececef] px-1 pt-4">
                  {overviewValues.map((value, index) => (
                    <div
                      key={`${overviewTab}-${overviewRange}-${index}`}
                      className="group flex h-full min-w-0 flex-1 items-end"
                      title={`${value}${overview.unit}`}
                    >
                      <div
                        className="relative w-full min-w-[8px] bg-[#ececef] transition-all group-hover:bg-[rgba(254,44,85,0.26)]"
                        style={{
                          height: `${Math.max(12, (value / maxOverviewValue) * 100)}%`,
                        }}
                      >
                        {index === overviewValues.length - 1 && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#161823] px-1.5 py-0.5 text-[10px] text-white">
                            {value}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex justify-between text-[10px] text-[rgba(22,24,35,0.34)]">
                  <span>{overviewRange === 7 ? '7 天前' : '30 天前'}</span>
                  <span>今天</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="min-w-0 border border-[#e9e9ec] bg-white">
            <SectionHeader
              title="任务日历"
              description="按日期查看任务量和运行计划"
              extra={
                <button
                  type="button"
                  className="text-xs text-[rgba(22,24,35,0.46)] transition hover:text-[#fe2c55]"
                  onClick={() => {
                    setCalendarCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                    setSelectedDate(today);
                  }}
                >
                  回到今天
                </button>
              }
            />

            <div className="p-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[#ececef] text-[rgba(22,24,35,0.46)] transition hover:border-[#d6d6da] hover:text-[#161823]"
                  onClick={() => changeMonth(-1)}
                  aria-label="上个月"
                >
                  <ChevronLeft size={15} />
                </button>
                <strong className="text-[13px] font-semibold">
                  {calendarCursor.getFullYear()}年{pad(calendarCursor.getMonth() + 1)}月
                </strong>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[#ececef] text-[rgba(22,24,35,0.46)] transition hover:border-[#d6d6da] hover:text-[#161823]"
                  onClick={() => changeMonth(1)}
                  aria-label="下个月"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-7 text-center text-[10px] text-[rgba(22,24,35,0.34)]">
                {weekdayLabels.map((label) => (
                  <span key={label} className="py-1.5">
                    {label}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell) => {
                  const selected = isSameDay(cell.date, selectedDate);
                  const current = isSameDay(cell.date, today);
                  const count = getDailyTaskCount(cell.date);

                  return (
                    <button
                      type="button"
                      key={toDateKey(cell.date)}
                      className={`group relative flex min-h-[42px] flex-col items-center justify-center rounded-md border text-[11px] transition ${
                        selected
                          ? 'border-[#fe2c55] bg-[rgba(254,44,85,0.06)] text-[#fe2c55]'
                          : 'border-transparent hover:border-[#e5e5e8] hover:bg-[#fafafb]'
                      } ${cell.currentMonth ? '' : 'opacity-30'}`}
                      onClick={() => selectCalendarDate(cell.date)}
                    >
                      <span className={current ? 'font-semibold text-[#fe2c55]' : ''}>
                        {cell.date.getDate()}
                      </span>
                      <span
                        className={`mt-0.5 text-[9px] ${
                          selected
                            ? 'text-[#fe2c55]'
                            : 'text-[rgba(22,24,35,0.34)] group-hover:text-[rgba(22,24,35,0.54)]'
                        }`}
                      >
                        {count}项
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-[#f0f0f2] pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-[13px] font-semibold">
                      {pad(selectedDate.getMonth() + 1)}月{pad(selectedDate.getDate())}日
                    </strong>
                    <span className="ml-2 text-[11px] text-[rgba(22,24,35,0.4)]">
                      {shortWeekdayLabels[selectedDate.getDay()]}
                    </span>
                  </div>
                  <span className="text-[11px] text-[rgba(22,24,35,0.4)]">
                    {selectedPlans.length} 项计划
                  </span>
                </div>

                <div className="mt-3 max-h-[178px] space-y-2 overflow-y-auto pr-1">
                  {selectedPlans.map((plan) => (
                    <div
                      key={`${toDateKey(selectedDate)}-${plan.time}-${plan.title}`}
                      className="flex gap-3 border border-[#f0f0f2] px-3 py-2.5"
                    >
                      <time className="w-9 shrink-0 pt-0.5 text-[10px] text-[rgba(22,24,35,0.36)]">
                        {plan.time}
                      </time>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="truncate text-[11px] font-medium text-[#161823]">
                            {plan.title}
                          </strong>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] ${statusMeta[plan.status].className}`}
                          >
                            {statusMeta[plan.status].label}
                          </span>
                        </div>
                        <p className="mt-1 mb-0 truncate text-[10px] text-[rgba(22,24,35,0.38)]">
                          {plan.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="grid grid-cols-[minmax(330px,0.72fr)_minmax(0,1.55fr)] gap-3 max-[1080px]:grid-cols-1">
          <section className="border border-[#e9e9ec] bg-white">
            <SectionHeader
              title="待处理事项"
              description="优先关注失败任务、告警和离线资源"
              extra={
                <LinkButton onClick={() => history.push('/alarm')}>
                  全部事项
                </LinkButton>
              }
            />
            <div className="space-y-2 p-4">
              {[
                {
                  title: '订单实时同步延迟升高',
                  description: '当前延迟 86 秒，超过告警阈值 60 秒',
                  meta: '5 分钟前',
                  icon: AlarmClock,
                  path: '/alarm',
                  badge: '告警',
                  badgeClassName: 'bg-[rgba(254,44,85,0.08)] text-[#fe2c55]',
                },
                {
                  title: '客户主数据同步执行失败',
                  description: '目标端字段映射校验未通过',
                  meta: '28 分钟前',
                  icon: XCircle,
                  path: '/metrics',
                  badge: '失败',
                  badgeClassName: 'bg-[#fff5e8] text-[#a85800]',
                },
                {
                  title: '采集客户端 node-03 离线',
                  description: '最后心跳时间 14:26:08',
                  meta: '52 分钟前',
                  icon: Server,
                  path: '/client',
                  badge: '资源',
                  badgeClassName: 'bg-[#f2f3f5] text-[rgba(22,24,35,0.58)]',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.title}
                    className="group flex w-full items-start gap-3 border border-[#f0f0f2] bg-white px-3 py-3 text-left transition hover:border-[#dedee2] hover:bg-[#fafafb]"
                    onClick={() => history.push(item.path)}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f6] text-[rgba(22,24,35,0.58)]">
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <strong className="truncate text-[12px] font-medium text-[#161823]">
                          {item.title}
                        </strong>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] ${item.badgeClassName}`}
                        >
                          {item.badge}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-[rgba(22,24,35,0.38)]">
                        {item.description}
                      </span>
                      <span className="mt-1.5 block text-[9px] text-[rgba(22,24,35,0.28)]">
                        {item.meta}
                      </span>
                    </span>
                    <ChevronRight
                      size={14}
                      className="mt-2 shrink-0 text-[rgba(22,24,35,0.2)] transition group-hover:text-[#fe2c55]"
                    />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="min-w-0 border border-[#e9e9ec] bg-white">
            <SectionHeader
              title="平台能力"
              description="覆盖数据流转全生命周期的核心模块"
              extra={
                <span className="text-[11px] text-[rgba(22,24,35,0.38)]">
                  6 个核心模块
                </span>
              }
            />
            <div className="grid grid-cols-3 gap-px bg-[#ededf0] max-lg:grid-cols-2 max-sm:grid-cols-1">
              {moduleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.title}
                    className="group min-h-[126px] bg-white p-4 text-left transition hover:bg-[#fafafb]"
                    onClick={() => history.push(item.path)}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f3f3f5] text-[rgba(22,24,35,0.68)] transition group-hover:bg-[rgba(254,44,85,0.07)] group-hover:text-[#fe2c55]">
                        <Icon size={18} />
                      </span>
                      <ArrowRight
                        size={14}
                        className="text-[rgba(22,24,35,0.18)] transition group-hover:translate-x-0.5 group-hover:text-[#fe2c55]"
                      />
                    </span>
                    <strong className="mt-3 block text-[12px] font-semibold text-[#161823]">
                      {item.title}
                    </strong>
                    <span className="mt-0.5 block text-[10px] text-[rgba(22,24,35,0.38)]">
                      {item.description}
                    </span>
                    <span className="mt-2 flex items-center justify-between gap-2 text-[9px]">
                      <span className="text-[#fe2c55]">{item.status}</span>
                      <span className="truncate text-[rgba(22,24,35,0.32)]">
                        {item.meta}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <section className="border border-[#e9e9ec] bg-white">
          <SectionHeader
            title="近期建设计划"
            description="用于承载平台未来能力规划，后续可接入项目计划或版本管理接口"
            extra={
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f3f5] px-2.5 py-1 text-[10px] text-[rgba(22,24,35,0.48)]">
                <Rocket size={12} />
                UI 规划视图
              </span>
            }
          />
          <div className="grid grid-cols-4 gap-px bg-[#ededf0] max-xl:grid-cols-2 max-sm:grid-cols-1">
            {[
              {
                phase: '当前阶段',
                title: '核心链路统一',
                description: '完善离线、实时、开发和工作流之间的任务关联。',
                progress: 78,
                icon: Layers3,
              },
              {
                phase: '下一阶段',
                title: '任务运行中心',
                description: '聚合实例、日志、指标、告警与重跑操作。',
                progress: 46,
                icon: ChartNoAxesCombined,
              },
              {
                phase: '规划中',
                title: '数据质量闭环',
                description: '支持规则配置、异常定位、责任人和整改跟踪。',
                progress: 28,
                icon: FileCheck2,
              },
              {
                phase: '未来计划',
                title: '资源成本治理',
                description: '统计计算、存储和传输成本，辅助容量规划。',
                progress: 12,
                icon: HardDrive,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="min-h-[154px] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3f3f5] text-[rgba(22,24,35,0.62)]">
                      <Icon size={16} />
                    </span>
                    <span className="text-[10px] text-[rgba(22,24,35,0.34)]">
                      {item.phase}
                    </span>
                  </div>
                  <h3 className="mt-3 mb-0 text-[12px] font-semibold text-[#161823]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 mb-0 min-h-10 text-[10px] leading-5 text-[rgba(22,24,35,0.38)]">
                    {item.description}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ededf0]">
                      <div
                        className="h-full rounded-full bg-[#fe2c55]"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-[9px] text-[rgba(22,24,35,0.38)]">
                      {item.progress}%
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="flex items-center justify-between gap-3 px-1 py-2 text-[10px] text-[rgba(22,24,35,0.32)] max-sm:items-start max-sm:flex-col">
          <span className="inline-flex items-center gap-1.5">
            <CloudCog size={13} />
            当前首页以 UI 与交互结构为主，统计数据为演示数据
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} />
            日历可扩展配置每日任务量、运行计划和版本里程碑
          </span>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
