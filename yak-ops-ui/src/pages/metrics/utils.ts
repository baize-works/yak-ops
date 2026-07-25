import {ChartDataItem, TimeRange} from './types';


export const transformChartData = (trendData: ChartDataItem[], timeRange: TimeRange) => {
  return {
    data: trendData.map((item) => item.value),
    xAxis: trendData.map((item) => item.date),
  };
};

export const timeRangeMap = {
  '最近12小时': 'H12' as TimeRange,
  '最近一周': 'D7' as TimeRange,
  '最近24小时': 'H24' as TimeRange,
};

export const taskTypeOptions = [
  {
    label: 'BATCH',
    value: 'BATCH',
  },
];
