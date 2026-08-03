import { Input, Switch } from 'antd';
import type { ReactNode } from 'react';

import type { SyncEditorState } from '../model';
import EditorSection from './EditorSection';

interface ScheduleConfigSectionProps {
  editor: SyncEditorState;
  onChange: (value: SyncEditorState) => void;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 text-[12px] font-medium text-[#475467]">
        {label}
      </div>
      {children}
      {hint ? (
        <div className="mt-1.5 text-[11px] leading-5 text-[#98a2b3]">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export default function ScheduleConfigSection({
  editor,
  onChange,
}: ScheduleConfigSectionProps) {
  const updateSchedule = (
    patch: Partial<SyncEditorState['schedule']>,
  ) => {
    onChange({
      ...editor,
      schedule: {
        ...editor.schedule,
        ...patch,
      },
    });
  };

  return (
    <EditorSection title="调度配置">
      <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(180px,.6fr)_minmax(180px,.6fr)] gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <Field
          label="Cron 表达式"
          hint="采用 Quartz Cron，例如每天凌晨 2 点：0 0 2 * * ?"
        >
          <Input
            allowClear
            variant="filled"
            value={editor.schedule.cron}
            placeholder="0 0 2 * * ?"
            status={
              editor.schedule.enabled && !editor.schedule.cron.trim()
                ? 'error'
                : undefined
            }
            onChange={(event) =>
              updateSchedule({ cron: event.target.value })
            }
          />
        </Field>

        <Field
          label="启用调度"
          hint="关闭后保留 Cron，但不会触发任务"
        >
          <div className="flex h-8 items-center">
            <Switch
              checked={editor.schedule.enabled}
              onChange={(enabled) => updateSchedule({ enabled })}
            />
          </div>
        </Field>

        <Field
          label="失败重跑"
          hint="失败后由业务状态机自动重跑一次"
        >
          <div className="flex h-8 items-center">
            <Switch
              checked={editor.schedule.retryOnFailure}
              onChange={(retryOnFailure) =>
                updateSchedule({ retryOnFailure })
              }
            />
          </div>
        </Field>
      </div>
    </EditorSection>
  );
}
