import * as echarts from 'echarts';
import React, {useEffect, useRef} from 'react';

interface LineChartProps {
  data: number[];
  xAxisData: string[];
  title: string;
  unit: string;
  loading: boolean;
}

const LineChart: React.FC<LineChartProps> = ({data, xAxisData, title, unit, loading}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      // title: {
      //   text: title,
      //   left: 'left',
      //   textStyle: {

      //     color: '#333',
      //     fontSize: 16,
      //     fontWeight: 'bold',
      //     fontFamily: 'Arial, sans-serif',
      //   },
      // },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
      },
      yAxis: {
        type: 'value',
        name: '',
        axisLabel: {
          formatter: '{value} ' + unit,
        },
      },
      series: [
        {
          name: title,
          type: 'line',
          data: data,
          symbol: 'none',
        },
      ],
      grid: {
        containLabel: true,
        left: '3%',
        right: '4%',
        bottom: '2%',
        top: '15%',
      },
    };

    chart.setOption(option);

    // 响应式调整
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data, xAxisData]);

  return (
    <div
      ref={chartRef}
      style={{
        width: '75vh',
        height: '330px',
      }}
    />
  );
};

export default LineChart;
