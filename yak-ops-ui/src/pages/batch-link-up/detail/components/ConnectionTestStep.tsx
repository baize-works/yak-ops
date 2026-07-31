import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
  LinkOutlined,
  LoadingOutlined,
  SwapRightOutlined,
} from '@ant-design/icons';
import { Button, Empty, Select, Spin, Tag } from 'antd';
import type { ReactNode } from 'react';

import type { DataSourceRecord } from '@/pages/data-source/types';

export type ConnectionTestState =
  | 'idle'
  | 'testing'
  | 'success'
  | 'error';

interface ConnectionTestStepProps {
  dataSources: DataSourceRecord[];
  loading: boolean;
  sourceId: string;
  targetId: string;
  sourceState: ConnectionTestState;
  targetState: ConnectionTestState;
  onSourceChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onTestSource: () => void;
  onTestTarget: () => void;
}

interface DataSourceOption {
  label: ReactNode;
  value: string;
  searchText: string;
}

interface StatusConfig {
  text: string;
  icon: ReactNode;
  className: string;
}

const statusMap: Record<ConnectionTestState, StatusConfig> = {
  idle: {
    text: '未测试',
    icon: <span className="h-1.5 w-1.5 rounded-full bg-[#98a2b3]" />,
    className:
      'border-[#e4e7ec] bg-[#f9fafb] text-[#667085]',
  },
  testing: {
    text: '测试中',
    icon: <LoadingOutlined spin />,
    className:
      'border-[#c7d7fe] bg-[#eff4ff] text-[#315efb]',
  },
  success: {
    text: '已通过',
    icon: <CheckCircleOutlined />,
    className:
      'border-[#a9e7cf] bg-[#ecfdf3] text-[#067647]',
  },
  error: {
    text: '连接失败',
    icon: <CloseCircleOutlined />,
    className:
      'border-[#fecdca] bg-[#fef3f2] text-[#b42318]',
  },
};

const buildOptions = (
  records: DataSourceRecord[],
): DataSourceOption[] =>
  records
    .filter((record) => record.id)
    .map((record) => ({
      value: String(record.id),
      searchText: [
        record.name,
        record.dbType,
        record.environmentName,
      ]
        .filter(Boolean)
        .join(' '),
      label: (
        <div className="flex min-w-0 items-center justify-between gap-4 py-1">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f2f4f7] text-[#667085]">
              <DatabaseOutlined />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[#101828]">
                {record.name || record.id}
              </div>

              <div className="mt-0.5 truncate text-xs text-[#667085]">
                {record.dbType || '未知类型'}
                {record.environmentName
                  ? ` · ${record.environmentName}`
                  : ''}
              </div>
            </div>
          </div>

          <Tag className="!m-0 shrink-0 !rounded-md !border-[#e4e7ec] !bg-[#f9fafb] !px-2 !text-[11px] !font-medium !text-[#475467]">
            {record.dbType || 'UNKNOWN'}
          </Tag>
        </div>
      ),
    }));

const getSelectedRecord = (
  records: DataSourceRecord[],
  id: string,
): DataSourceRecord | undefined =>
  records.find(
    (record) => String(record.id) === String(id),
  );

interface StatusBadgeProps {
  state: ConnectionTestState;
}

function StatusBadge({ state }: StatusBadgeProps) {
  const status = statusMap[state];

  return (
    <span
      className={[
        'inline-flex h-7 shrink-0 items-center gap-1.5',
        'rounded-full border px-2.5 text-xs font-medium',
        status.className,
      ].join(' ')}
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center text-[12px]">
        {status.icon}
      </span>

      {status.text}
    </span>
  );
}

interface EndpointSummaryProps {
  side: 'source' | 'target';
  record?: DataSourceRecord;
  state: ConnectionTestState;
}

function EndpointSummary({
  side,
  record,
  state,
}: EndpointSummaryProps) {
  const isSource = side === 'source';

  return (
    <div
      className={[
        'flex min-w-0 items-center gap-3',
        isSource ? '' : 'flex-row-reverse text-right',
      ].join(' ')}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e4e7ec] bg-white text-[#475467] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <DatabaseOutlined />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#98a2b3]">
          {isSource ? '来源端 Source' : '目标端 Sink'}
        </div>

        <div className="truncate text-sm font-semibold text-[#101828]">
          {record?.name ||
            (isSource
              ? '请选择来源数据源'
              : '请选择目标数据源')}
        </div>

        <div className="mt-0.5 truncate text-xs text-[#667085]">
          {record
            ? [
                record.dbType || '未知类型',
                record.environmentName,
              ]
                .filter(Boolean)
                .join(' · ')
            : '暂未配置'}
        </div>
      </div>

      <StatusBadge state={state} />
    </div>
  );
}

interface ConnectionOverviewProps {
  source?: DataSourceRecord;
  target?: DataSourceRecord;
  sourceState: ConnectionTestState;
  targetState: ConnectionTestState;
}

function ConnectionOverview({
  source,
  target,
  sourceState,
  targetState,
}: ConnectionOverviewProps) {
  const connectionReady =
    sourceState === 'success' && targetState === 'success';

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[820px] grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] items-center gap-6 rounded-xl border border-[#e4e7ec] bg-[#f9fafb] px-5 py-4">
        <EndpointSummary
          side="source"
          record={source}
          state={sourceState}
        />

        <div className="flex items-center justify-center gap-3">
          <div className="h-px flex-1 bg-[#d0d5dd]" />

          <div className="flex min-w-[116px] items-center justify-center gap-2 rounded-lg border border-[#e4e7ec] bg-white px-3 py-2 text-xs font-medium text-[#475467] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <SwapRightOutlined className="text-[#667085]" />

            <span>
              {connectionReady ? '链路已就绪' : '数据传输链路'}
            </span>
          </div>

          <div className="h-px flex-1 bg-[#d0d5dd]" />
        </div>

        <EndpointSummary
          side="target"
          record={target}
          state={targetState}
        />
      </div>
    </div>
  );
}

interface EndpointCardProps {
  side: 'source' | 'target';
  value: string;
  state: ConnectionTestState;
  options: DataSourceOption[];
  onChange: (value: string) => void;
  onTest: () => void;
}

function EndpointCard({
  side,
  value,
  state,
  options,
  onChange,
  onTest,
}: EndpointCardProps) {
  const isSource = side === 'source';
  const testing = state === 'testing';
  const tested = state === 'success' || state === 'error';

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#e4e7ec] bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-[#f2f4f7] px-5 py-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#101828]">
            {isSource ? '来源端 Source' : '目标端 Sink'}
          </div>

          <div className="mt-1 text-xs leading-5 text-[#667085]">
            {isSource
              ? '选择任务需要读取数据的来源数据源'
              : '选择任务需要写入数据的目标数据源'}
          </div>
        </div>

        <StatusBadge state={state} />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex-1">
          <div className="mb-2 text-sm font-medium text-[#344054]">
            数据源名称
            <span className="ml-1 text-[#f04438]">*</span>
          </div>

          <Select
            showSearch
            size="middle"
            value={value || undefined}
            options={options}
            optionFilterProp="searchText"
            placeholder={
              isSource
                ? '请选择来源数据源'
                : '请选择目标数据源'
            }
            className="w-full"
            onChange={onChange}
          />

          <div style={{height: "100px"}}>
            
          </div>
        </div>
      </div>

      <div className="border-t border-[#f2f4f7] bg-[#fcfcfd] p-4">
        <Button
          block
          size="middle"
          icon={<LinkOutlined />}
          disabled={!value}
          loading={testing}
          className={[
            '!h-7 !rounded-lg !border-[#d0d5dd]',
            '!bg-white !font-medium !text-[#344054]',
            'hover:!border-[#98a2b3]',
            'hover:!bg-[#f9fafb]',
            'hover:!text-[#101828]',
          ].join(' ')}
          onClick={onTest}
        >
          {tested ? '重新测试连接' : '测试连接'}
        </Button>
      </div>
    </section>
  );
}

export default function ConnectionTestStep({
  dataSources,
  loading,
  sourceId,
  targetId,
  sourceState,
  targetState,
  onSourceChange,
  onTargetChange,
  onTestSource,
  onTestTarget,
}: ConnectionTestStepProps) {
  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (!dataSources.length) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-[#d0d5dd] bg-[#f9fafb]">
        <Empty description="暂无可用数据源，请先到资源管理中创建数据源" />
      </div>
    );
  }

  const options = buildOptions(dataSources);
  const source = getSelectedRecord(dataSources, sourceId);
  const target = getSelectedRecord(dataSources, targetId);

  return (
    <div className="space-y-5">
      <ConnectionOverview
        source={source}
        target={target}
        sourceState={sourceState}
        targetState={targetState}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EndpointCard
          side="source"
          value={sourceId}
          state={sourceState}
          options={options}
          onChange={onSourceChange}
          onTest={onTestSource}
        />

        <EndpointCard
          side="target"
          value={targetId}
          state={targetState}
          options={options}
          onChange={onTargetChange}
          onTest={onTestTarget}
        />
      </div>
    </div>
  );
}