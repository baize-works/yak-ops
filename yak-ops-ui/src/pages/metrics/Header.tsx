import React from 'react';
import {Segmented, Select} from 'antd';
import {useIntl} from '@umijs/max';
import {TaskType, TimeRange} from './types';
import {taskTypeOptions, timeRangeMap} from './utils';

interface HeaderProps {
  timeRange: TimeRange;
  taskType: TaskType;
  onTimeRangeChange: (range: TimeRange) => void;
  onTaskTypeChange: (type: TaskType) => void;
}

const Header: React.FC<HeaderProps> = ({
                                         timeRange,
                                         taskType,
                                         onTimeRangeChange,
                                         onTaskTypeChange,
                                       }) => {
  const intl = useIntl();

  const getDefaultSegmentedValue = () => {
    const entries = Object.entries(timeRangeMap);
    const found = entries.find(([_, value]) => value === timeRange);
    return found ? found[0] : intl.formatMessage({
      id: 'pages.job.overview.timerange.24h',
      defaultMessage: 'Last 24 Hours',
    });
  };

  return (
    <div
      style={{
        padding: '12px 24px 6px',
        background: 'white',
        boxShadow: '0 2px 8px #0000000d, inset 0 -1px 0 0 rgba(227,228,230,1)',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 16,
          height: 24,
          lineHeight: '24px',
          color: '#1E202D',
          display: 'flex',
          alignItems: 'center',
          marginRight: 120,
          fontWeight: 500,
        }}
      >
        📊 {intl.formatMessage({
        id: 'pages.job.overview.title',
        defaultMessage: 'Job Overview',
      })}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Job Mode */}
        <div style={{margin: '6px 0'}}>
          <span style={{fontWeight: 400, fontSize: 12}}>
            ✨{' '}
            {intl.formatMessage({
              id: 'pages.job.overview.mode',
              defaultMessage: 'Job Mode',
            })}
            ：
          </span>

          <Select
            size="small"
            style={{width: '30vh'}}
            value={taskType}
            onChange={onTaskTypeChange}
            options={taskTypeOptions}
          />
        </div>

        {/* Time Range */}
        <div style={{width: '330px'}}>
          <Segmented
            options={Object.keys(timeRangeMap)}
            size="small"
            block
            value={getDefaultSegmentedValue()}
            onChange={(value) => {
              onTimeRangeChange(
                timeRangeMap[value as keyof typeof timeRangeMap],
              );
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Header;
