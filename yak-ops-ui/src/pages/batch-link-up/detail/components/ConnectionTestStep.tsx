import {
  CheckCircleFilled,
  CloseCircleFilled,
  LinkOutlined,
  LoadingOutlined,
  SwapRightOutlined,
} from '@ant-design/icons';
import { Alert, Button, Empty, Select, Spin, Tag } from 'antd';
import type { DataSourceRecord } from '@/pages/data-source/types';
import type { ReactNode } from 'react';

export type ConnectionTestState = 'idle' | 'testing' | 'success' | 'error';

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

const statusView: Record<
  ConnectionTestState,
  { text: string; icon: ReactNode; className: string }
> = {
  idle: {
    text: '待测试',
    icon: <LinkOutlined />,
    className: 'border-[#e4e7ec] bg-[#f8fafc] text-[#667085]',
  },
  testing: {
    text: '测试中',
    icon: <LoadingOutlined spin />,
    className: 'border-[#c7d7fe] bg-[#eff4ff] text-[#315efb]',
  },
  success: {
    text: '连接成功',
    icon: <CheckCircleFilled />,
    className: 'border-[#abefc6] bg-[#ecfdf3] text-[#067647]',
  },
  error: {
    text: '连接失败',
    icon: <CloseCircleFilled />,
    className: 'border-[#fecdca] bg-[#fef3f2] text-[#b42318]',
  },
};

const buildOptions = (records: DataSourceRecord[]) =>
  records
    .filter((record) => record.id)
    .map((record) => ({
      label: (
        <div className="flex min-w-0 items-center justify-between gap-3 py-1">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-[#182230]">
              {record.name || record.id}
            </div>
            <div className="truncate text-xs text-[#667085]">
              {record.dbType || '未知类型'}
              {record.environmentName ? ` · ${record.environmentName}` : ''}
            </div>
          </div>
          <Tag className="!m-0 shrink-0 !border-[#d0d5dd] !bg-white !text-[#475467]">
            {record.dbType || 'UNKNOWN'}
          </Tag>
        </div>
      ),
      value: String(record.id),
      searchText: `${record.name || ''} ${record.dbType || ''} ${record.environmentName || ''}`,
    }));

interface EndpointCardProps {
  title: string;
  description: string;
  value: string;
  state: ConnectionTestState;
  options: ReturnType<typeof buildOptions>;
  onChange: (value: string) => void;
  onTest: () => void;
}

function EndpointCard({
  title,
  description,
  value,
  state,
  options,
  onChange,
  onTest,
}: EndpointCardProps) {
  const status = statusView[state];

  return (
    <div className="min-w-0 flex-1 rounded-xl border border-[#e4e7ec] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-[#101828]">{title}</div>
          <div className="mt-1 text-xs leading-5 text-[#667085]">
            {description}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${status.className}`}
        >
          {status.icon}
          {status.text}
        </span>
      </div>

      <div className="mt-6 text-sm font-medium text-[#344054]">数据源</div>
      <Select
        showSearch
        value={value || undefined}
        options={options}
        placeholder="请选择已创建的数据源"
        className="mt-2 w-full"
        size="large"
        optionFilterProp="searchText"
        onChange={onChange}
      />

      <Button
        block
        className="mt-4"
        size="large"
        disabled={!value}
        loading={state === 'testing'}
        icon={<LinkOutlined />}
        onClick={onTest}
      >
        测试连接
      </Button>
    </div>
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
      <div className="rounded-xl border border-[#e4e7ec] bg-white py-16">
        <Empty description="暂无可用数据源，请先到资源管理中创建数据源" />
      </div>
    );
  }

  const options = buildOptions(dataSources);

  return (
    <div>
      <Alert
        showIcon
        type="info"
        message="先确认来源端和目标端均可连接"
        description="连接测试只验证当前已保存的数据源配置，不会读取或写入业务数据。"
        className="mb-5 !border-[#c7d7fe] !bg-[#f5f7ff]"
      />

      <div className="flex items-stretch gap-5">
        <EndpointCard
          title="来源端 Source"
          description="选择需要读取数据的来源数据源"
          value={sourceId}
          state={sourceState}
          options={options}
          onChange={onSourceChange}
          onTest={onTestSource}
        />

        <div className="flex w-12 shrink-0 items-center justify-center text-[28px] text-[#98a2b3]">
          <SwapRightOutlined />
        </div>

        <EndpointCard
          title="目标端 Sink"
          description="选择需要写入数据的目标数据源"
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
