import React, {memo, useEffect, useRef} from "react";
import ReactECharts from "echarts-for-react";

interface AutoResizeChartProps {
  option: any;
}

const AutoResizeChart: React.FC<AutoResizeChartProps> = memo(({option}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!wrapperRef.current) {
      return;
    }

    const resize = () => {
      chartRef.current?.getEchartsInstance()?.resize();
    };

    resize();

    const observer = new ResizeObserver(() => {
      resize();
    });

    observer.observe(wrapperRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <ReactECharts
        ref={chartRef}
        option={option}
        notMerge
        lazyUpdate
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
});

AutoResizeChart.displayName = "AutoResizeChart";

export default AutoResizeChart;
