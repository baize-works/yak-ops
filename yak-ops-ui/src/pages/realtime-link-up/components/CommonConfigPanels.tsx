import { Database, Gauge, Settings2 } from 'lucide-react';
import { Input, InputNumber, Select, Switch } from 'antd';
import type { ReactNode } from 'react';
import { sinkDataSourceOptions, sourceDataSourceOptions } from '../data';
import type { PipelineConfig, SinkConfig, SourceConfig } from '../types';

const { TextArea } = Input;

const Card = ({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) => (
  <section className="overflow-hidden rounded-[10px] border border-black/[0.07] bg-white">
    <div className="flex items-start gap-3 border-b border-black/[0.055] px-5 py-4">
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#f1f3f6] text-[#424754]">
        {icon}
      </span>
      <div>
        <div className="text-[13px] font-semibold text-[#161823]">{title}</div>
        <div className="mt-1 text-[11px] text-[rgba(22,24,35,0.46)]">{description}</div>
      </div>
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const Field = ({
  label,
  required,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: ReactNode;
}) => (
  <label className="block">
    <span className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-[#343741]">
      {label}
      {required && <span className="text-[#d92d20]">*</span>}
    </span>
    {children}
    {help && <span className="mt-1.5 block text-[10px] leading-4 text-[rgba(22,24,35,0.42)]">{help}</span>}
  </label>
);

interface PipelineBasicPanelProps {
  value: PipelineConfig;
  onChange: (value: PipelineConfig) => void;
}

export const PipelineBasicPanel = ({ value, onChange }: PipelineBasicPanelProps) => (
  <Card
    title="任务基本信息"
    description="定义实时同步任务名称、描述以及运行时版本。"
    icon={<Settings2 size={17} strokeWidth={1.8} />}
  >
    <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
      <Field label="任务名称" required>
        <Input
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder="请输入任务名称"
          className="!h-10 !rounded-[7px] !border-black/[0.075] !text-[12px]"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Flink 版本" required>
          <Select
            value={value.flinkVersion}
            options={[
              { label: 'Flink 2.2.1（推荐）', value: '2.2.1' },
              { label: 'Flink 2.2.0', value: '2.2.0' },
              { label: 'Flink 1.20.2', value: '1.20.2' },
            ]}
            onChange={(flinkVersion) => onChange({ ...value, flinkVersion })}
            className="w-full [&_.ant-select-selector]:!h-10 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075] [&_.ant-select-selection-item]:!text-[11px] [&_.ant-select-selection-item]:!leading-[38px]"
          />
        </Field>
        <Field label="Flink CDC 版本" required>
          <Select
            value={value.cdcVersion}
            options={[
              { label: 'CDC 3.6.0（推荐）', value: '3.6.0' },
              { label: 'CDC 3.5.0', value: '3.5.0' },
            ]}
            onChange={(cdcVersion) => onChange({ ...value, cdcVersion })}
            className="w-full [&_.ant-select-selector]:!h-10 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075] [&_.ant-select-selection-item]:!text-[11px] [&_.ant-select-selection-item]:!leading-[38px]"
          />
        </Field>
      </div>
      <div className="col-span-2 max-lg:col-span-1">
        <Field label="任务描述">
          <TextArea
            value={value.description}
            onChange={(event) => onChange({ ...value, description: event.target.value })}
            placeholder="说明同步范围、业务用途与维护信息"
            autoSize={{ minRows: 3, maxRows: 5 }}
            className="!rounded-[7px] !border-black/[0.075] !text-[12px]"
          />
        </Field>
      </div>
    </div>
  </Card>
);

interface SourceSinkPanelProps {
  source: SourceConfig;
  sink: SinkConfig;
  multi?: boolean;
  onSourceChange: (value: SourceConfig) => void;
  onSinkChange: (value: SinkConfig) => void;
}

export const SourceSinkPanel = ({
  source,
  sink,
  multi,
  onSourceChange,
  onSinkChange,
}: SourceSinkPanelProps) => (
  <div className="grid grid-cols-2 gap-5 max-xl:grid-cols-1">
    <Card
      title="来源端"
      description="选择已维护的数据源，并配置 Flink CDC Source 的采集范围。"
      icon={<Database size={17} strokeWidth={1.8} />}
    >
      <div className="space-y-4">
        <Field label="来源数据源" required>
          <Select
            showSearch
            value={source.dataSourceId}
            options={sourceDataSourceOptions}
            onChange={(dataSourceId, option: any) =>
              onSourceChange({ ...source, dataSourceId, type: option.type })
            }
            className="w-full [&_.ant-select-selector]:!h-10 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075] [&_.ant-select-selection-item]:!text-[11px] [&_.ant-select-selection-item]:!leading-[38px]"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="数据库" required>
            <Input
              value={source.database}
              onChange={(event) => onSourceChange({ ...source, database: event.target.value })}
              placeholder="trade_db"
              className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
            />
          </Field>
          <Field label="Schema" help="MySQL 可留空">
            <Input
              value={source.schema}
              onChange={(event) => onSourceChange({ ...source, schema: event.target.value })}
              placeholder="public"
              className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
            />
          </Field>
        </div>

        {multi ? (
          <Field
            label="表匹配规则"
            required
            help="支持 Flink CDC source-table 正则，例如 trade_db.order_.*"
          >
            <Input
              value={source.tablePattern}
              onChange={(event) => onSourceChange({ ...source, tablePattern: event.target.value })}
              placeholder="trade_db.order_.*"
              className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
            />
          </Field>
        ) : (
          <Field label="来源表" required>
            <Input
              value={source.table}
              onChange={(event) => onSourceChange({ ...source, table: event.target.value })}
              placeholder="order_main"
              className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="启动模式" required>
            <Select
              value={source.startupMode}
              options={[
                { label: '全量 + 增量（initial）', value: 'initial' },
                { label: '仅最新增量', value: 'latest-offset' },
                { label: '指定 Offset', value: 'specific-offset' },
                { label: '指定时间戳', value: 'timestamp' },
              ]}
              onChange={(startupMode) => onSourceChange({ ...source, startupMode })}
              className="w-full [&_.ant-select-selector]:!h-9 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075] [&_.ant-select-selection-item]:!text-[10px] [&_.ant-select-selection-item]:!leading-[34px]"
            />
          </Field>
          <Field label="Server ID" required={source.type === 'mysql'}>
            <Input
              value={source.serverId}
              disabled={source.type !== 'mysql'}
              onChange={(event) => onSourceChange({ ...source, serverId: event.target.value })}
              placeholder="5400-5404"
              className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
            />
          </Field>
        </div>
      </div>
    </Card>

    <Card
      title="目标端"
      description="选择下游存储并配置目标库表与 Schema Evolution 策略。"
      icon={<Database size={17} strokeWidth={1.8} />}
    >
      <div className="space-y-4">
        <Field label="目标数据源" required>
          <Select
            showSearch
            value={sink.dataSourceId}
            options={sinkDataSourceOptions}
            onChange={(dataSourceId, option: any) =>
              onSinkChange({ ...sink, dataSourceId, type: option.type })
            }
            className="w-full [&_.ant-select-selector]:!h-10 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075] [&_.ant-select-selection-item]:!text-[11px] [&_.ant-select-selection-item]:!leading-[38px]"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="目标数据库" required>
            <Input
              value={sink.database}
              onChange={(event) => onSinkChange({ ...sink, database: event.target.value })}
              placeholder="ods_db"
              className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
            />
          </Field>
          <Field label="目标 Schema">
            <Input
              value={sink.schema}
              onChange={(event) => onSinkChange({ ...sink, schema: event.target.value })}
              placeholder="ods"
              className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
            />
          </Field>
        </div>

        {multi ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="目标表前缀">
              <Input
                value={sink.tablePrefix}
                onChange={(event) => onSinkChange({ ...sink, tablePrefix: event.target.value })}
                placeholder="ods_"
                className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
              />
            </Field>
            <Field label="目标表后缀">
              <Input
                value={sink.tableSuffix}
                onChange={(event) => onSinkChange({ ...sink, tableSuffix: event.target.value })}
                placeholder="_rt"
                className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
              />
            </Field>
          </div>
        ) : (
          <Field label="目标表" required>
            <Input
              value={sink.table}
              onChange={(event) => onSinkChange({ ...sink, table: event.target.value })}
              placeholder="ods_order_main"
              className="!h-9 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
            />
          </Field>
        )}

        <Field label="Schema 变更策略" required>
          <Select
            value={sink.schemaChangeBehavior}
            options={[
              { label: 'evolve - 自动应用结构变更', value: 'evolve' },
              { label: 'try_evolve - 尝试应用', value: 'try_evolve' },
              { label: 'lenient - 宽松模式', value: 'lenient' },
              { label: 'ignore - 忽略变更', value: 'ignore' },
              { label: 'exception - 发生变更即失败', value: 'exception' },
            ]}
            onChange={(schemaChangeBehavior) =>
              onSinkChange({ ...sink, schemaChangeBehavior })
            }
            className="w-full [&_.ant-select-selector]:!h-9 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075] [&_.ant-select-selection-item]:!text-[10px] [&_.ant-select-selection-item]:!leading-[34px]"
          />
        </Field>

        <div className="flex items-center justify-between rounded-[8px] border border-black/[0.06] bg-[#fafafa] px-4 py-3">
          <div>
            <div className="text-[11px] font-semibold text-[#343741]">自动创建下游表</div>
            <div className="mt-0.5 text-[10px] text-[rgba(22,24,35,0.42)]">
              目标表不存在时，根据上游 Schema 自动建表。
            </div>
          </div>
          <Switch
            size="small"
            checked={sink.createTable}
            onChange={(createTable) => onSinkChange({ ...sink, createTable })}
          />
        </div>
      </div>
    </Card>
  </div>
);

interface PipelineRuntimePanelProps {
  value: PipelineConfig;
  onChange: (value: PipelineConfig) => void;
}

export const PipelineRuntimePanel = ({ value, onChange }: PipelineRuntimePanelProps) => (
  <Card
    title="运行参数"
    description="配置并行度、Checkpoint、本地时区和故障重启策略。"
    icon={<Gauge size={17} strokeWidth={1.8} />}
  >
    <div className="grid grid-cols-3 gap-5 max-xl:grid-cols-2 max-lg:grid-cols-1">
      <Field label="并行度" required>
        <InputNumber
          min={1}
          max={512}
          value={value.parallelism}
          onChange={(parallelism) => onChange({ ...value, parallelism: Number(parallelism || 1) })}
          className="!h-10 !w-full !rounded-[7px] !border-black/[0.075] [&_.ant-input-number-input]:!h-9 [&_.ant-input-number-input]:!text-[11px]"
        />
      </Field>
      <Field label="Checkpoint 间隔（秒）" required>
        <InputNumber
          min={10}
          value={value.checkpointInterval}
          onChange={(checkpointInterval) =>
            onChange({ ...value, checkpointInterval: Number(checkpointInterval || 60) })
          }
          className="!h-10 !w-full !rounded-[7px] !border-black/[0.075] [&_.ant-input-number-input]:!h-9 [&_.ant-input-number-input]:!text-[11px]"
        />
      </Field>
      <Field label="故障重启策略" required>
        <Select
          value={value.restartStrategy}
          options={[
            { label: '固定延迟重启', value: 'fixed-delay' },
            { label: '失败率重启', value: 'failure-rate' },
            { label: '不自动重启', value: 'none' },
          ]}
          onChange={(restartStrategy) => onChange({ ...value, restartStrategy })}
          className="w-full [&_.ant-select-selector]:!h-10 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075] [&_.ant-select-selection-item]:!text-[11px] [&_.ant-select-selection-item]:!leading-[38px]"
        />
      </Field>
      <Field label="本地时区" required>
        <Select
          showSearch
          value={value.localTimezone}
          options={[
            { label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
            { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
            { label: 'UTC', value: 'UTC' },
          ]}
          onChange={(localTimezone) => onChange({ ...value, localTimezone })}
          className="w-full [&_.ant-select-selector]:!h-10 [&_.ant-select-selector]:!rounded-[7px] [&_.ant-select-selector]:!border-black/[0.075] [&_.ant-select-selection-item]:!text-[11px] [&_.ant-select-selection-item]:!leading-[38px]"
        />
      </Field>
      <Field label="Schema Operator UID" required>
        <Input
          value={value.schemaOperatorUid}
          onChange={(event) => onChange({ ...value, schemaOperatorUid: event.target.value })}
          className="!h-10 !rounded-[7px] !border-black/[0.075] !font-mono !text-[11px]"
        />
      </Field>
    </div>
  </Card>
);
