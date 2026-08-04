import { EyeOutlined } from '@ant-design/icons';
import { Button, Empty, Space, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import QualityResultTag from '../../components/QualityResultTag';
import { QUALITY_RULE_TYPE_META } from '../../mock';
import type { QualityExecutionRecord } from '../../types';

interface ExecutionTableProps {
  records: QualityExecutionRecord[];
  loading?: boolean;
  onView: (record: QualityExecutionRecord) => void;
}

const formatDuration = (duration?: number) => {
  if (duration === undefined) return '--';
  if (duration < 1000) return `${duration} ms`;
  return `${(duration / 1000).toFixed(2)} s`;
};

const ExecutionTable = ({ records, loading, onView }: ExecutionTableProps) => {
  const columns: TableColumnsType<QualityExecutionRecord> = [
    {
      title: '执行编号 / 规则',
      key: 'identity',
      width: 300,
      render: (_, record) => (
        <div className="py-1">
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-left text-[14px] font-semibold text-[#161823] hover:text-[#fe2c55]"
            onClick={() => onView(record)}
          >
            {record.ruleName}
          </button>
          <div className="mt-1 font-mono text-[12px] text-[#98a2b3]">
            {record.id}
          </div>
        </div>
      ),
    },
    {
      title: '检查对象',
      key: 'objectName',
      width: 280,
      render: (_, record) => (
        <div className="py-1">
          <div className="text-[13px] font-medium text-[#344054]">
            {record.objectName}
          </div>
          <div className="mt-1 text-[12px] text-[#98a2b3]">
            {record.dataSourceName} · {QUALITY_RULE_TYPE_META[record.ruleType].label}
          </div>
        </div>
      ),
    },
    {
      title: '执行状态',
      dataIndex: 'executionStatus',
      width: 130,
      render: (value: QualityExecutionRecord['executionStatus']) => (
        <QualityResultTag value={value} />
      ),
    },
    {
      title: '检查结果',
      dataIndex: 'checkResult',
      width: 130,
      render: (value: QualityExecutionRecord['checkResult']) => (
        <QualityResultTag value={value} />
      ),
    },
    {
      title: '实际值 / 期望值',
      key: 'metric',
      width: 180,
      render: (_, record) => (
        <div className="py-1">
          <div className="text-[13px] font-medium text-[#344054]">
            {record.metricValue || '--'}
          </div>
          <div className="mt-1 font-mono text-[12px] text-[#98a2b3]">
            {record.expectedValue}
          </div>
        </div>
      ),
    },
    {
      title: '触发方式',
      key: 'trigger',
      width: 140,
      render: (_, record) => (
        <div className="py-1">
          <div className="text-[13px] text-[#344054]">
            {record.triggerType === 'SCHEDULE' ? '定时调度' : '手动触发'}
          </div>
          <div className="mt-1 text-[12px] text-[#98a2b3]">
            {record.operator}
          </div>
        </div>
      ),
    },
    {
      title: '开始时间',
      key: 'startedAt',
      width: 180,
      render: (_, record) => (
        <div className="py-1">
          <div className="text-[13px] text-[#344054]">{record.startedAt}</div>
          <div className="mt-1 text-[12px] text-[#98a2b3]">
            {formatDuration(record.duration)}
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onView(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <section className="mt-3 overflow-hidden rounded-lg border border-[#eceef2] bg-white">
      <Table<QualityExecutionRecord>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={records}
        pagination={false}
        scroll={{ x: 1440 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="没有匹配的运行记录"
            />
          ),
        }}
        rowClassName="align-top"
      />
    </section>
  );
};

export default ExecutionTable;
