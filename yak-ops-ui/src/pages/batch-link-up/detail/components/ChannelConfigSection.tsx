import { InputNumber, Select } from 'antd';

import type { SyncEditorState } from '../model';
import EditorSection from './EditorSection';

interface ChannelConfigSectionProps {
  editor: SyncEditorState;
  sinkConfig: Record<string, any>;
  onChange: (value: SyncEditorState) => void;
  onSinkChange: (patch: Record<string, any>) => void;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-[12px] font-medium text-[#475467]">
        {label}
      </div>
      {children}
    </div>
  );
}

export default function ChannelConfigSection({
  editor,
  sinkConfig,
  onChange,
  onSinkChange,
}: ChannelConfigSectionProps) {
  const channel = editor.workflow.channelConfig || {};

  const updateChannel = (patch: Record<string, any>) => {
    onChange({
      ...editor,
      workflow: {
        ...editor.workflow,
        channelConfig: {
          ...channel,
          ...patch,
        },
      },
    });
  };

  return (
    <EditorSection
      title="运行参数"
      description="控制任务并发、批次大小和传输速度，配置会随任务定义一起保存。"
    >
      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <Field label="Channel 并发数">
          <InputNumber
            min={1}
            max={128}
            variant="filled"
            className="!w-full"
            value={editor.env.parallelism}
            onChange={(parallelism) =>
              onChange({
                ...editor,
                env: {
                  ...editor.env,
                  parallelism: Number(parallelism || 1),
                },
              })
            }
          />
        </Field>

        <Field label="写入批次">
          <InputNumber
            min={1}
            max={100000}
            variant="filled"
            className="!w-full"
            value={Number(sinkConfig.batchSize || 1000)}
            onChange={(batchSize) =>
              onSinkChange({
                batchSize: Number(batchSize || 1000),
              })
            }
          />
        </Field>

        <Field label="传输限速">
          <Select
            variant="filled"
            value={
              channel.speedLimitEnabled
                ? 'limited'
                : 'unlimited'
            }
            options={[
              { label: '不限速', value: 'unlimited' },
              { label: '按记录数限速', value: 'limited' },
            ]}
            className="w-full"
            onChange={(value) =>
              updateChannel({
                speedLimitEnabled: value === 'limited',
              })
            }
          />
        </Field>

        <Field label="每秒记录数">
          <InputNumber
            min={1}
            max={10000000}
            variant="filled"
            disabled={!channel.speedLimitEnabled}
            className="!w-full"
            value={Number(channel.recordsPerSecond || 10000)}
            onChange={(recordsPerSecond) =>
              updateChannel({
                recordsPerSecond: Number(
                  recordsPerSecond || 10000,
                ),
              })
            }
          />
        </Field>
      </div>
    </EditorSection>
  );
}
