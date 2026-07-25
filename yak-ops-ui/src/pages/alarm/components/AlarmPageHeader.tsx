import {BellOutlined} from '@ant-design/icons';
import {useIntl} from '@umijs/max';
import React from 'react';

const AlarmPageHeader: React.FC = () => {
  const intl = useIntl();

  return (
    <div className="mb-8 flex flex-col gap-5 rounded-3xl lg:flex-row lg:items-end lg:justify-between"
         style={{marginTop: 30}}>
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[hsl(231_48%_48%/0.10)] text-[hsl(231_48%_48%)]">
            <BellOutlined style={{fontSize: 22}}/>
          </div>

          <h1 className="m-0 truncate text-[26px] font-bold leading-8 tracking-[-0.02em] text-[#101828]">
            {intl.formatMessage({
              id: 'pages.alarm.header.title',
              defaultMessage: '告警管理',
            })}
          </h1>
        </div>

        <p className="m-0 max-w-[780px] text-sm leading-6 text-[#667085]">
          {intl.formatMessage({
            id: 'pages.alarm.header.desc',
            defaultMessage:
              '统一管理告警通道、告警规则与投递记录，让任务异常第一时间被感知。',
          })}
        </p>
      </div>
    </div>
  );
};

export default AlarmPageHeader;
