import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Empty, Space, Switch, Table, Tag, Tooltip } from 'antd';
import type { MenuProps, TableColumnsType } from 'antd';
import { QUALITY_RULE_TYPE_META } from '../mock';
import type { QualityRule } from '../types';
import QualityResultTag from './QualityResultTag';

interface QualityRuleTableProps {
  records: QualityRule[];
  loading?: boolean;
  onRun: (record: QualityRule) => void;
  onEdit: (record: QualityRule) => void;
  onCopy: (record: QualityRule) => void;
  onDelete: (record: QualityRule) => void;
  onToggle: (record: QualityRule, enabled: boolean) => void;
}

const formatDuration = (duration?: number) => {
  if (duration === undefined) return '--';
  if (duration < 1000) return `${duration} ms`;
  return `${(duration / 1000).toFixed(2)} s`;
};

const QualityRuleTable = ({
  records,
  loading,
  onRun,
  onEdit,
  onCopy,
  onDelete,
  onToggle,
}: QualityRuleTableProps) => {
  const columns: TableColumnsType<QualityRule> = [
    {
      title: '规则名称',
      dataIndex: 'name',
      width: 280,
      render: (_, record) => (
        <div className="min-w-0 py-1">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="min-w-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[14px] font-semibold text-[#161823] hover:text-[#fe2c55]"
              title={record.name}
              onClick={() => onEdit(record)}
            >
              {record.name}
            </button>
            {record.importance === 'IMPORTANT' ? (
              <Tag className="!m-0 !rounded-md !border-[rgba(254,44,85,0.2)] !bg-[rgba(254,44,85,0.06)] !text-[#fe2c55]">
                重要
              </Tag>
            ) : null}
          </div>
          <div className="mt-1 truncate text-[12px] text-[#98a2b3]">
            {record.description || record.id}
          </div>
        </div>
      ),
    },
    {
      title: '检查对象',
      key: 'object',
      width: 260,
      render: (_, record) => (
        <div className="py-1">
          <div className="text-[13px] font-medium text-[#344054]">
            {[record.databaseName, record.tableName, record.columnName]
              .filter(Boolean)
              .join('.')}
          </div>
          <div className="mt-1 text-[12px] text-[#98a2b3]">
            {record.dataSourceName}
          </div>
        </div>
      ),
    },
    {
      title: '规则类型',
      dataIndex: 'ruleType',
      width: 170,
      render: (value: QualityRule['ruleType'], record) => (
        <div className="py-1">
          <div className="text-[13px] text-[#344054]">
            {QUALITY_RULE_TYPE_META[value].label}
          </div>
          <div className="mt-1 text-[12px] text-[#98a2b3]">
            {record.dimension} · {record.scope === 'TABLE' ? '表级' : '字段级'}
          </div>
        </div>
      ),
    },
    {
      title: '判断条件',
      key: 'condition',
      width: 150,
      render: (_, record) => (
        <span className="font-mono text-[13px] text-[#344054]">
          {record.operator} {record.threshold}
          {record.thresholdEnd !== undefined
            ? ` ~ ${record.thresholdEnd}`
            : ''}
          {record.unit || ''}
        </span>
      ),
    },
    {
      title: '最近结果',
      key: 'lastResult',
      width: 150,
      render: (_, record) => (
        <div className="py-1">
          <QualityResultTag value={record.lastResult} />
          <div className="mt-1.5 text-[12px] text-[#98a2b3]">
            {record.lastMetric || '--'}
          </div>
        </div>
      ),
    },
    {
      title: '执行方式',
      key: 'schedule',
      width: 150,
      render: (_, record) => (
        <div className="py-1">
          <div className="text-[13px] text-[#344054]">
            {record.scheduleLabel}
          </div>
          <div className="mt-1 text-[12px] text-[#98a2b3]">
            {record.scheduleMode === 'SCHEDULE' ? '定时调度' : '手动触发'}
          </div>
        </div>
      ),
    },
    {
      title: '最近运行',
      key: 'lastRunTime',
      width: 180,
      render: (_, record) => (
        <div className="py-1">
          <div className="text-[13px] text-[#344054]">
            {record.lastRunTime || '--'}
          </div>
          <div className="mt-1 text-[12px] text-[#98a2b3]">
            {formatDuration(record.duration)}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 88,
      fixed: 'right',
      render: (enabled: boolean, record) => (
        <Tooltip title={enabled ? '停用规则' : '启用规则'}>
          <Switch
            size="small"
            checked={enabled}
            onChange={(checked: boolean) => onToggle(record, checked)}
          />
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => {
        const items: MenuProps['items'] = [
          { key: 'edit', icon: <EditOutlined />, label: '编辑规则' },
          { key: 'copy', icon: <CopyOutlined />, label: '复制规则' },
          { type: 'divider' },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: '删除规则',
            danger: true,
          },
        ];
        return (
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<PlayCircleOutlined />}
              disabled={!record.enabled || record.lastResult === 'RUNNING'}
              onClick={() => onRun(record)}
            >
              运行
            </Button>
            <Dropdown
              trigger={['click']}
              menu={{
                items,
                onClick: ({ key }: { key: string }) => {
                  if (key === 'edit') onEdit(record);
                  if (key === 'copy') onCopy(record);
                  if (key === 'delete') onDelete(record);
                },
              }}
            >
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  return (
    <section className="mt-3 overflow-hidden rounded-lg border border-[#eceef2] bg-white">
      <Table<QualityRule>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={records}
        pagination={false}
        scroll={{ x: 1588 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="没有匹配的质量规则"
            />
          ),
        }}
        rowClassName="align-top"
      />
    </section>
  );
};

export default QualityRuleTable;
