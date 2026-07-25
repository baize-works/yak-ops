import * as echarts from 'echarts';
import React, {useEffect, useRef} from 'react';

interface BChartProps {
  data: number[];
  xAxisData: string[];
  title: string;
  unit: string;
  loading: boolean;
}

const BarChart: React.FC<BChartProps> = ({data, xAxisData, title, unit, loading}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // 根据数据量动态调整柱子宽度
    const dataLength = data.length;
    let barWidth = '40%';

    if (dataLength === 1) {
      barWidth = '10%';
    } else if (dataLength <= 3) {
      barWidth = '20%';
    } else if (dataLength <= 5) {
      barWidth = '30%';
    }

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
        formatter: (params: any) => {
          const data = params[0];
          return `${data.name}<br/>${data.seriesName}: ${data.value} ${unit}`;
        },
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        // axisLabel: {
        //   rotate: dataLength > 6 ? 45 : 0,
        // },
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
          type: 'bar',
          data: data,
          barWidth: barWidth,
          // barMaxWidth: "5%",
          itemStyle: {
            color: 'hsl(231 48% 48%)',
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: '#40a9ff',
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
        },
      ],
      grid: {
        containLabel: true,
        left: '3%',
        right: '4%',
        bottom: dataLength > 6 ? '10%' : '2%',
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
  }, [data, xAxisData, title, unit]);

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

export default BarChart;
