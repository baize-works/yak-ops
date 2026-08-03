import { InputNumber, Select } from 'antd';
import type { ReactNode } from 'react';

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
  children: ReactNode;
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
  const updateChannel = (patch: Partial<SyncEditorState['channel']>) => {
    onChange({
      ...editor,
      channel: {
        ...editor.channel,
        ...patch,
      },
    });
  };

  return (
    <EditorSection title="运行参数">
      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <Field label="Channel 并发数">
          <InputNumber
            min={1}
            max={128}
            variant="filled"
            className="!w-full"
            value={editor.channel.parallelism}
            onChange={(parallelism) =>
              updateChannel({ parallelism: Number(parallelism || 1) })
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
              editor.channel.speedLimitEnabled
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
            disabled={!editor.channel.speedLimitEnabled}
            className="!w-full"
            value={Number(editor.channel.recordsPerSecond || 10000)}
            onChange={(recordsPerSecond) =>
              updateChannel({
                recordsPerSecond: Number(recordsPerSecond || 10000),
              })
            }
          />
        </Field>

        <Field label="脏数据策略">
          <Select
            variant="filled"
            value={editor.channel.dirtyDataPolicy}
            options={[
              { label: '遇错停止', value: 'stop' },
              { label: '跳过并继续', value: 'skip' },
            ]}
            className="w-full"
            onChange={(dirtyDataPolicy) =>
              updateChannel({ dirtyDataPolicy })
            }
          />
        </Field>

        <Field label="脏数据上限">
          <InputNumber
            min={0}
            max={10000000}
            variant="filled"
            disabled={editor.channel.dirtyDataPolicy !== 'skip'}
            className="!w-full"
            value={Number(editor.channel.dirtyDataLimit || 0)}
            onChange={(dirtyDataLimit) =>
              updateChannel({
                dirtyDataLimit: Math.max(0, Number(dirtyDataLimit || 0)),
              })
            }
          />
        </Field>
      </div>
    </EditorSection>
  );
}
