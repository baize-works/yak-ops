import { API_SUCCESS_CODE } from '@/services/http/response';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Empty, Popover, Spin, message } from 'antd';
import { useState } from 'react';

import { linkupJobScheduleApi } from '../../../api';

interface ScheduleRecord {
  cronExpression?: string;
  scheduleStatus?: string;
  lastScheduleTime?: string;
  nextScheduleTime?: string;
}

interface ScheduleInfoProps {
  record?: ScheduleRecord;
}

interface TimeRowProps {
  label: string;
  value?: string;
}

const TimeRow = ({ label, value }: TimeRowProps) => {
  return (
    <div className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center gap-2 leading-5">
      <span className="whitespace-nowrap text-[11px] text-[#98a2b3]">
        {label}
      </span>

      <span
        title={value || '-'}
        className="truncate whitespace-nowrap text-[12px] font-medium text-[#475467] tabular-nums"
      >
        {value || '-'}
      </span>
    </div>
  );
};

const ScheduleInfo = ({ record }: ScheduleInfoProps) => {
  const intl = useIntl();

  const [executionTimes, setExecutionTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isNormal = record?.scheduleStatus === 'NORMAL';

  const loadExecutionTimes = async () => {
    if (!record?.cronExpression) {
      message.warning('当前任务暂未配置 Cron 表达式');
      return;
    }

    try {
      setLoading(true);

      const response =
        await linkupJobScheduleApi.getLast5ExecutionTimes(
          record.cronExpression,
        );

      if (response?.code === API_SUCCESS_CODE) {
        setExecutionTimes(response?.data || []);
        return;
      }

      message.error(
        response?.msg ||
          response?.message ||
          '获取执行时间失败',
      );
    } finally {
      setLoading(false);
    }
  };

  const renderExecutionTimes = () => {
    if (loading) {
      return (
        <div className="flex h-20 w-[260px] items-center justify-center">
          <Spin size="small" />
        </div>
      );
    }

    if (!executionTimes.length) {
      return (
        <div className="w-[260px] py-2">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无执行时间"
          />
        </div>
      );
    }

    return (
      <div className="w-[260px]">
        <div className="flex max-h-[220px] flex-col gap-1 overflow-y-auto">
          {executionTimes.map((time, index) => (
            <div
              key={`${time}-${index}`}
              className="flex items-center gap-2 rounded-md bg-[#f8fafc] px-2.5 py-1.5"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#315efb]" />

              <span className="truncate text-[12px] text-[#475467] tabular-nums">
                {time || '-'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-w-[220px] flex-col gap-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={[
            'inline-flex h-5 shrink-0 items-center rounded px-1.5 text-[11px] font-medium',
            isNormal
              ? 'bg-[#eef4ff] text-[#315efb]'
              : 'bg-[#f2f4f7] text-[#667085]',
          ].join(' ')}
        >
          {isNormal ? '已启用' : '已暂停'}
        </span>

        <Popover
          title={
            <div className="flex items-center gap-1.5">
              <ClockCircleOutlined className="text-[#667085]" />
              <span>最近 5 次执行时间</span>
            </div>
          }
          content={renderExecutionTimes()}
          trigger="click"
          placement="rightTop"
          onOpenChange={(open) => {
            if (open) {
              loadExecutionTimes();
            }
          }}
        >
          <button
            type="button"
            title={record?.cronExpression || '-'}
            className="min-w-0 flex-1 cursor-pointer truncate rounded bg-[#f2f4f7] px-2 py-0.5 text-left font-mono text-[11px] leading-5 text-[#475467] transition-colors hover:bg-[#e9eef8] hover:text-[#315efb]"
          >
            {record?.cronExpression || '未配置 Cron'}
          </button>
        </Popover>
      </div>

      <TimeRow
        label={intl.formatMessage({
          id: 'pages.job.schedule.lastRunTime',
          defaultMessage: '上次运行',
        })}
        value={record?.lastScheduleTime}
      />

      <TimeRow
        label={intl.formatMessage({
          id: 'pages.job.schedule.nextRunTime',
          defaultMessage: '下次运行',
        })}
        value={record?.nextScheduleTime}
      />
    </div>
  );
};

export default ScheduleInfo;