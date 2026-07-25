import {useIntl} from "@umijs/max";
import {CalendarClock, CalendarDays, Clock3, Code2, RadioTower,} from "lucide-react";
import React from "react";

interface ScheduleTabProps {
  instanceItem: any;
}

interface ScheduleInfoItemProps {
  label: string;
  value?: React.ReactNode;
  icon: React.ReactNode;
}

const ScheduleInfoItem: React.FC<ScheduleInfoItemProps> = ({
                                                             label,
                                                             value,
                                                             icon,
                                                           }) => {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-slate-400">{label}</div>
          <div className="mt-1.5 truncate text-sm font-medium text-slate-900">
            {value || "-"}
          </div>
        </div>
      </div>
    </div>
  );
};

const ScheduleTab: React.FC<ScheduleTabProps> = ({instanceItem}) => {
  const intl = useIntl();

  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({id, defaultMessage});

  return (
    <div className="mt-2 space-y-4">
      <div className="rounded-2xl border border-slate-200  p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mb-4 flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
            <CalendarClock size={16} strokeWidth={1.9}/>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">
              {t("pages.job.detail.schedule.title", "调度概览")}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {t(
                "pages.job.detail.schedule.desc",
                "查看当前任务的调度状态与触发时间信息"
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <ScheduleInfoItem
            icon={<RadioTower size={16} strokeWidth={1.9}/>}
            label={t("pages.job.detail.schedule.status", "调度状态")}
            value={instanceItem?.scheduleStatus}
          />

          <ScheduleInfoItem
            icon={<Clock3 size={16} strokeWidth={1.9}/>}
            label={t("pages.job.detail.schedule.nextTime", "下次调度时间")}
            value={instanceItem?.nextScheduleTime}
          />

          <ScheduleInfoItem
            icon={<CalendarDays size={16} strokeWidth={1.9}/>}
            label={t("pages.job.detail.schedule.lastTime", "最近调度时间")}
            value={instanceItem?.lastScheduleTime}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
            <Code2 size={16} strokeWidth={1.9}/>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">
              {t("pages.job.detail.schedule.cron", "Cron 表达式")}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {t(
                "pages.job.detail.schedule.cronDesc",
                "用于触发当前任务的调度规则"
              )}
            </div>
          </div>
        </div>

        <div
          className="rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 text-slate-100">
          {instanceItem?.cronExpression || "-"}
        </div>
      </div>
    </div>
  );
};

export default ScheduleTab;
