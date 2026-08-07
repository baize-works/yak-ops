import {
  Button,
  Dropdown,
  Empty,
  Input,
  Select,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { MoreHorizontal, Plus, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { MonitorWorkspaceView } from '../../types';
import { RUN_MODE_LABEL } from './model';

interface MonitorListTabProps {
  workspace: MonitorWorkspaceView;
  running: boolean;
  onRun: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  onRemove: () => void;
  onOpenLog: () => void;
}

interface MonitorRecord {
  id: number;
  name: string;
  description?: string;
  trigger: string;
  enabled: boolean;
  ruleCount: number;
  owner: string;
  updateTime: string;
}

const MonitorListTab = ({
  workspace,
  running,
  onRun,
  onEdit,
  onRefresh,
  onRemove,
  onOpenLog,
}: MonitorListTabProps) => {
  const { monitor, settings, stats } = workspace;
  const [keyword, setKeyword] = useState('');
  const [owner, setOwner] = useState<string>();
  const [runMode, setRunMode] = useState<string>();

  const records = useMemo<MonitorRecord[]>(() => {
    const source: MonitorRecord[] = [
      {
        id: monitor.id,
        name: monitor.name,
        description: monitor.description,
        trigger: RUN_MODE_LABEL[settings.runMode],
        enabled: monitor.enabled,
        ruleCount: stats.ruleCount,
        owner: monitor.owner,
        updateTime: monitor.updateTime,
      },
    ];
    const normalized = keyword.trim().toLowerCase();
    return source.filter((record) => {
      if (
        normalized &&
        !`${record.id} ${record.name} ${record.description || ''}`
          .toLowerCase()
          .includes(normalized)
      ) {
        return false;
      }
      if (owner && record.owner !== owner) return false;
      if (runMode && settings.runMode !== runMode) return false;
      return true;
    });
  }, [keyword, monitor, owner, runMode, settings.runMode, stats.ruleCount]);

  const columns: TableColumnsType<MonitorRecord> = [
    {
      title: 'ID/名称/描述',
      minWidth: 360,
      render: (_, record) => (
        <div className="py-1">
          <div className="text-xs text-[#8b95a7]">{record.id}</div>
          <div className="mt-0.5 text-[13px] font-medium text-[#172033]">
            {record.name}
          </div>
          {record.description ? (
            <div className="mt-0.5 line-clamp-1 text-xs text-[#8b95a7]">
              {record.description}
            </div>
          ) : null}
        </div>
      ),
    },
    { title: '触发方式', dataIndex: 'trigger', width: 180 },
    {
      title: '已启用/总规则数',
      width: 150,
      render: () => (
        <span>
          <span className="text-[#245bdb]">{stats.enabledRuleCount}</span>/{stats.ruleCount}
        </span>
      ),
    },
    { title: '责任人', dataIndex: 'owner', width: 180 },
    { title: '最近更新时间', dataIndex: 'updateTime', width: 190 },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      render: (value) => (
        <Tag className="!m-0 !border-0" color={value ? 'processing' : 'default'}>
          {value ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      fixed: 'right',
      width: 190,
      render: () => (
        <div className="flex items-center gap-3 whitespace-nowrap text-xs">
          <button
            type="button"
            className="border-0 bg-transparent p-0 text-[#245bdb]"
            onClick={onEdit}
          >
            编辑
          </button>
          <button
            type="button"
            className="border-0 bg-transparent p-0 text-[#245bdb]"
            onClick={onRun}
          >
            {running ? '提交中' : '测试'}
          </button>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'log', label: '操作日志' },
                { type: 'divider' },
                { key: 'remove', label: '删除', danger: true },
              ],
              onClick: ({ key }) => {
                if (key === 'log') onOpenLog();
                if (key === 'remove') onRemove();
              },
            }}
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-[#245bdb]"
            >
              更多 <MoreHorizontal size={13} />
            </button>
          </Dropdown>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-white px-6 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tooltip title="当前数据表只允许创建一个质量监控">
          <Button
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => message.info('当前数据表已经存在质量监控')}
          >
            新建质量监控
          </Button>
        </Tooltip>
        <Input
          allowClear
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="请输入关键词搜索"
          prefix={<Search size={14} className="text-[#98a2b3]" />}
          className="w-[220px]"
        />
        <Select
          allowClear
          value={owner}
          placeholder="责任人"
          options={[{ value: monitor.owner, label: monitor.owner }]}
          onChange={setOwner}
          className="w-[220px]"
        />
        <Select
          allowClear
          value={runMode}
          placeholder="触发方式"
          options={[
            { value: 'MANUAL', label: '手动触发' },
            { value: 'SCHEDULE', label: '生产调度触发' },
          ]}
          onChange={setRunMode}
          className="w-[180px]"
        />
        <Button
          type="text"
          icon={<RefreshCw size={13} />}
          onClick={() => {
            setKeyword('');
            setOwner(undefined);
            setRunMode(undefined);
            onRefresh();
          }}
        >
          重置
        </Button>
      </div>

      <Table<MonitorRecord>
        rowKey="id"
        size="small"
        className="mt-3"
        pagination={false}
        scroll={{ x: 1250 }}
        dataSource={records}
        columns={columns}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无质量监控"
            />
          ),
        }}
      />

      <div className="mt-4 flex justify-end text-xs text-[#8b95a7]">
        共 {records.length} 条
      </div>
    </div>
  );
};

export default MonitorListTab;
