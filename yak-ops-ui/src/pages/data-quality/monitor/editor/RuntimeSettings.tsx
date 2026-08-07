import { Input, Radio, Select } from 'antd';
import { CalendarClock, CirclePlay } from 'lucide-react';

import type { RuntimeFormState } from './model';
import { EditorField, EditorSection } from './EditorLayout';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? '00' : '30';
  const value = `${String(hour).padStart(2, '0')}:${minute}`;

  return {
    value,
    label: value,
  };
});

const WEEKDAYS = [
  ['MON', '星期一'],
  ['TUE', '星期二'],
  ['WED', '星期三'],
  ['THU', '星期四'],
  ['FRI', '星期五'],
  ['SAT', '星期六'],
  ['SUN', '星期日'],
].map(([value, label]) => ({
  value,
  label,
}));

export const RuntimeSettings = ({
  value,
  onChange,
  nextRunTime,
}: {
  value: RuntimeFormState;
  onChange: (value: RuntimeFormState) => void;
  nextRunTime?: string;
}) => {
  const triggerOptions = [
    {
      value: 'MANUAL',
      title: '手动触发',
      text: '在监控详情中由用户主动运行',
      icon: CirclePlay,
    },
    {
      value: 'SCHEDULE',
      title: '调度触发',
      text: '按照配置周期自动发起质量检查',
      icon: CalendarClock,
    },
  ];

  return (
    <EditorSection
      id="run-settings"
      title="运行设置"
      description="选择由用户手动运行，或按照固定周期自动执行。"
      extra={
        nextRunTime ? (
          <span className="text-xs text-[#8a8f99]">
            下次运行：{nextRunTime}
          </span>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <EditorField label="触发方式" required>
          <Radio.Group
            value={value.runMode}
            onChange={(event) =>
              onChange({
                ...value,
                runMode: event.target.value,
              })
            }
            className="grid w-full grid-cols-2 gap-3 max-md:grid-cols-1"
          >
            {triggerOptions.map((item) => {
              const Icon = item.icon;
              const active = value.runMode === item.value;

              return (
                <label
                  key={item.value}
                  className={[
                    'group flex min-h-[76px] cursor-pointer items-start gap-3 rounded-lg px-4 py-3.5',
                    'transition-colors duration-150',
                    active
                      ? 'bg-[rgba(254,44,85,0.055)]'
                      : 'bg-[#f7f8fa] hover:bg-[#f2f3f5]',
                  ].join(' ')}
                >
                  <Radio
                    value={item.value}
                    className="mt-[2px] shrink-0"
                  />

                  <Icon
                    size={17}
                    strokeWidth={1.8}
                    className={[
                      'mt-[1px] shrink-0 transition-colors',
                      active
                        ? 'text-[var(--yak-brand-color)]'
                        : 'text-[#7f8794]',
                    ].join(' ')}
                  />

                  <div className="min-w-0 flex-1">
                    <div
                      className={[
                        'text-[13px] font-medium leading-5',
                        active
                          ? 'text-[#161823]'
                          : 'text-[#344054]',
                      ].join(' ')}
                    >
                      {item.title}
                    </div>

                    <div className="mt-1 text-[11px] leading-5 text-[#98a2b3]">
                      {item.text}
                    </div>
                  </div>
                </label>
              );
            })}
          </Radio.Group>
        </EditorField>

        {value.runMode === 'SCHEDULE' ? (
          <EditorField label="调度配置" required>
            <div className="rounded-lg bg-[#f7f8fa] p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 max-md:grid-cols-1">
                <div>
                  <div className="mb-1.5 text-xs font-medium text-[#667085]">
                    调度周期
                  </div>

                  <Select
                    variant="filled"
                    value={value.scheduleFrequency}
                    options={[
                      {
                        value: 'DAILY',
                        label: '每天',
                      },
                      {
                        value: 'WEEKLY',
                        label: '每周',
                      },
                      {
                        value: 'CRON',
                        label: 'Cron 表达式',
                      },
                    ]}
                    onChange={(scheduleFrequency) =>
                      onChange({
                        ...value,
                        scheduleFrequency,
                      })
                    }
                    className="w-full"
                  />
                </div>

                {value.scheduleFrequency === 'WEEKLY' ? (
                  <div>
                    <div className="mb-1.5 text-xs font-medium text-[#667085]">
                      执行日期
                    </div>

                    <Select
                      variant="filled"
                      value={value.scheduleWeekday}
                      options={WEEKDAYS}
                      onChange={(scheduleWeekday) =>
                        onChange({
                          ...value,
                          scheduleWeekday,
                        })
                      }
                      className="w-full"
                    />
                  </div>
                ) : null}

                {value.scheduleFrequency !== 'CRON' ? (
                  <div>
                    <div className="mb-1.5 text-xs font-medium text-[#667085]">
                      执行时间
                    </div>

                    <Select
                      variant="filled"
                      value={value.scheduleTime}
                      options={TIME_OPTIONS}
                      onChange={(scheduleTime) =>
                        onChange({
                          ...value,
                          scheduleTime,
                        })
                      }
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div className="col-span-2 max-md:col-span-1">
                    <div className="mb-1.5 text-xs font-medium text-[#667085]">
                      Cron 表达式
                    </div>

                    <Input
                      variant="filled"
                      value={value.cronExpression}
                      placeholder="Spring Cron，例如：0 0 9 * * *"
                      onChange={(event) =>
                        onChange({
                          ...value,
                          cronExpression: event.target.value,
                        })
                      }
                    />

                    <div className="mt-1.5 text-[11px] text-[#98a2b3]">
                      采用秒、分、时、日、月、周六段格式。
                    </div>
                  </div>
                )}
              </div>
            </div>
          </EditorField>
        ) : null}
      </div>
    </EditorSection>
  );
};