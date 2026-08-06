import { Button, DatePicker, Empty, Progress, Spin, Table, message } from 'antd';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { CalendarDays, Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  ColumnReport,
  DimensionReport,
  MonitorReportView,
  TrendPoint,
} from '../../types';
import { DIMENSION_ORDER } from './model';

interface QualityReportTabProps {
  report?: MonitorReportView;
  loading: boolean;
  reportDate: string;
  onDateChange: (date: string) => void;
}

const percentText = (value: number) => `${Number(value || 0).toFixed(1)}%`;

const Sparkline = ({ values }: { values: number[] }) => {
  const normalized = values.length ? values : [0, 0];
  const width = 150;
  const height = 34;
  const points = normalized
    .map((value, index) => {
      const x = normalized.length === 1 ? width / 2 : (index / (normalized.length - 1)) * width;
      const y = height - Math.max(0, Math.min(100, value)) * (height / 100);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img">
      <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="#edf0f5" />
      <polyline
        points={points}
        fill="none"
        stroke="#6f5cff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const FocusCard = ({
  title,
  value,
  hint,
}: {
  title: string;
  value: number;
  hint: string;
}) => (
  <div className="min-h-[116px] bg-[#f7f8fa] px-4 py-3">
    <div className="flex items-center gap-1 text-xs text-[#667085]">
      {title}
      <Info size={12} className="text-[#98a2b3]" />
    </div>
    <div className="mt-4 text-[24px] font-semibold leading-none text-[#172033]">
      {value}
    </div>
    <div className="mt-4 text-xs text-[#8b95a7]">{hint}</div>
  </div>
);

const QualityReportTab = ({
  report,
  loading,
  reportDate,
  onDateChange,
}: QualityReportTabProps) => {
  const [activeDimension, setActiveDimension] = useState('全部');

  const dimensions = report?.dimensions || [];
  useEffect(() => {
    if (
      activeDimension !== '全部' &&
      !dimensions.some((item) => item.dimension === activeDimension)
    ) {
      setActiveDimension('全部');
    }
  }, [activeDimension, dimensions]);

  const dimensionNames = useMemo(() => {
    const available = dimensions.map((item) => item.dimension);
    return [
      ...DIMENSION_ORDER.filter((item) => available.includes(item)),
      ...available.filter((item) => !DIMENSION_ORDER.includes(item)),
    ];
  }, [dimensions]);

  const filteredTrend = useMemo(() => {
    if (!report) return [];
    if (activeDimension === '全部') return report.trend;
    return report.trend.filter((item) => item.dimension === activeDimension);
  }, [activeDimension, report]);

  const trendRows = useMemo(() => {
    const grouped = new Map<string, TrendPoint[]>();
    filteredTrend.forEach((item) => {
      const values = grouped.get(item.dimension) || [];
      values.push(item);
      grouped.set(item.dimension, values);
    });
    if (!grouped.size && dimensions.length) {
      dimensions.forEach((item) => {
        if (activeDimension === '全部' || activeDimension === item.dimension) {
          grouped.set(item.dimension, []);
        }
      });
    }
    return Array.from(grouped.entries()).map(([dimension, values]) => ({
      key: dimension,
      dimension,
      values: values.sort((left, right) => left.date.localeCompare(right.date)),
    }));
  }, [activeDimension, dimensions, filteredTrend]);

  const trendColumns: TableColumnsType<{
    key: string;
    dimension: string;
    values: TrendPoint[];
  }> = [
    { title: '质量维度', dataIndex: 'dimension', width: 120 },
    {
      title: '质量规则数',
      width: 120,
      render: (_, record) =>
        record.values.reduce((total, item) => total + item.total, 0) || '--',
    },
    {
      title: '异常规则数/实例数',
      width: 170,
      render: (_, record) => {
        const total = record.values.reduce((value, item) => value + item.total, 0);
        const issues = record.values.reduce((value, item) => value + item.issues, 0);
        return total ? `${issues}/${total}` : '-/-';
      },
    },
    {
      title: '通过率趋势',
      width: 210,
      render: (_, record) => (
        <Sparkline values={record.values.map((item) => item.passRate)} />
      ),
    },
    {
      title: '操作',
      width: 100,
      render: () => (
        <Button type="link" size="small" onClick={() => message.info('趋势明细已在运行记录中保留')}>
          查看详情
        </Button>
      ),
    },
  ];

  const columnColumns: TableColumnsType<ColumnReport> = [
    { title: '字段/关联范围', dataIndex: 'columnName', minWidth: 150 },
    { title: '质量维度', dataIndex: 'dimension', width: 100 },
    { title: '评估次数', dataIndex: 'total', width: 100 },
    { title: '正常', dataIndex: 'passed', width: 90 },
    { title: '异常', dataIndex: 'issues', width: 90 },
    {
      title: '通过率',
      dataIndex: 'passRate',
      width: 150,
      render: (value) => (
        <div className="flex items-center gap-2">
          <Progress percent={Number(value || 0)} showInfo={false} size="small" />
          <span className="w-12 text-right text-xs">{percentText(value)}</span>
        </div>
      ),
    },
  ];

  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const dayBefore = dayjs().subtract(2, 'day').format('YYYY-MM-DD');
  const overview = report?.overview;

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[#f5f6f8] px-4 pb-6 pt-4">
      <div className="mb-3 flex justify-end gap-2">
        <Button
          type={reportDate === yesterday ? 'primary' : 'default'}
          onClick={() => onDateChange(yesterday)}
        >
          昨日
        </Button>
        <Button
          type={reportDate === dayBefore ? 'primary' : 'default'}
          onClick={() => onDateChange(dayBefore)}
        >
          前日
        </Button>
        <DatePicker
          allowClear={false}
          value={dayjs(reportDate)}
          suffixIcon={<CalendarDays size={14} />}
          onChange={(value) => value && onDateChange(value.format('YYYY-MM-DD'))}
        />
      </div>

      <Spin spinning={loading}>
        <div className="grid grid-cols-2 gap-2 max-xl:grid-cols-1">
          <section className="min-h-[326px] border border-[#dfe3e8] bg-white p-4">
            <h2 className="m-0 text-[15px] font-semibold text-[#172033]">
              质量维度通过率
            </h2>
            <div className="mt-8 grid grid-cols-[270px_minmax(0,1fr)] items-center gap-4 max-md:grid-cols-1">
              <div className="flex justify-center">
                <Progress
                  type="circle"
                  size={192}
                  percent={overview?.passRate || 0}
                  strokeWidth={9}
                  format={(value) => (
                    <div>
                      <div className="text-[30px] font-medium text-[#172033]">
                        {Number(value || 0).toFixed(0)}%
                      </div>
                      <div className="mt-2 text-xs text-[#667085]">表质量通过率</div>
                    </div>
                  )}
                />
              </div>
              <div className="space-y-3">
                {dimensions.length ? (
                  dimensions.map((item, index) => (
                    <div key={item.dimension} className="grid grid-cols-[120px_minmax(0,1fr)_52px] items-center gap-2 text-xs">
                      <span className="truncate text-[#43506a]">
                        {index + 1}　{item.dimension}：{item.passed}/{item.total}
                      </span>
                      <Progress percent={item.passRate} showInfo={false} size="small" />
                      <span className="text-right text-[#667085]">{percentText(item.passRate)}</span>
                    </div>
                  ))
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前日期暂无质量结果" />
                )}
              </div>
            </div>
          </section>

          <section className="min-h-[326px] border border-[#dfe3e8] bg-white p-4">
            <h2 className="m-0 text-[15px] font-semibold text-[#172033]">重点关注</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 max-md:grid-cols-1">
              <FocusCard
                title="总质量规则数"
                value={overview?.totalRules || 0}
                hint={`已启用规则数：${overview?.enabledRules || 0}`}
              />
              <FocusCard
                title="问题质量规则数"
                value={overview?.issueRules || 0}
                hint={`已检测规则数：${overview?.executedRules || 0}`}
              />
              <FocusCard
                title="未通过规则数"
                value={overview?.issueRules || 0}
                hint="质量结果未达到监控阈值"
              />
              <FocusCard
                title="执行异常规则数"
                value={overview?.errorRules || 0}
                hint="SQL 或数据源执行过程中发生异常"
              />
            </div>
          </section>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-0">
          {['全部', ...dimensionNames].map((item) => (
            <button
              key={item}
              type="button"
              className={[
                'h-8 border border-[#dfe3e8] px-4 text-xs',
                activeDimension === item
                  ? 'border-[var(--yak-brand-color)] bg-[var(--yak-brand-color)] text-white'
                  : 'bg-white text-[#43506a] hover:bg-[#f8f9fb]',
              ].join(' ')}
              onClick={() => setActiveDimension(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 max-xl:grid-cols-1">
          <section className="min-h-[330px] border border-[#dfe3e8] bg-white p-4">
            <h2 className="m-0 text-[15px] font-semibold text-[#172033]">
              各维度趋势分析
            </h2>
            <Table
              rowKey="key"
              size="small"
              className="mt-3"
              pagination={false}
              dataSource={trendRows}
              columns={trendColumns}
              locale={{ emptyText: '暂无趋势数据' }}
            />
          </section>

          <section className="min-h-[330px] border border-[#dfe3e8] bg-white p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="m-0 text-[15px] font-semibold text-[#172033]">
                  字段质量维度分析
                </h2>
                <div className="mt-2 text-xs text-[#8b95a7]">
                  评估字段总数：{report?.columns.length || 0}　
                  正常：{report?.columns.filter((item) => item.issues === 0).length || 0}　
                  异常：{report?.columns.filter((item) => item.issues > 0).length || 0}
                </div>
              </div>
            </div>
            <Table<ColumnReport>
              rowKey={(record) => `${record.columnName}-${record.dimension}`}
              size="small"
              className="mt-3"
              pagination={false}
              scroll={{ x: 700 }}
              dataSource={report?.columns || []}
              columns={columnColumns}
              locale={{ emptyText: '当前日期暂无字段质量结果' }}
            />
          </section>
        </div>
      </Spin>
    </div>
  );
};

export default QualityReportTab;
