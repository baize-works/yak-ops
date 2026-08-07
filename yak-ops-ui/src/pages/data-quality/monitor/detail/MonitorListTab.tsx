import {
  Button,
  Dropdown,
  Empty,
  Input,
  Popover,
  Segmented,
  Select,
  Table,
  Tag,
} from 'antd';
import type { MenuProps, TableColumnsType } from 'antd';
import { ListFilter, MoreHorizontal, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { dataQualityTableClassName } from '../../components/tableStyle';
import type { MonitorWorkspaceView } from '../../types';
import { RUN_MODE_LABEL } from './model';

interface MonitorListTabProps {
  workspace: MonitorWorkspaceView;
  running: boolean;
  onRun: () => void;
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

type MonitorStatusFilter = 'ALL' | 'ENABLED' | 'DISABLED';

interface MonitorFilterState {
  keyword: string;
  owner?: string;
  runMode?: string;
  enabled?: boolean;
}

const createEmptyFilters = (): MonitorFilterState => ({
  keyword: '',
  owner: undefined,
  runMode: undefined,
  enabled: undefined,
});

const MonitorListTab = ({
  workspace,
  running,
  onRun,
  onRefresh,
  onRemove,
  onOpenLog,
}: MonitorListTabProps) => {
  const { monitor, settings, stats } = workspace;

  const [filters, setFilters] = useState<MonitorFilterState>(createEmptyFilters);
  const [draftFilters, setDraftFilters] =
    useState<MonitorFilterState>(createEmptyFilters);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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

    const normalized = filters.keyword.trim().toLowerCase();

    return source.filter((record) => {
      if (
        normalized &&
        !`${record.id} ${record.name} ${record.description || ''}`
          .toLowerCase()
          .includes(normalized)
      ) {
        return false;
      }

      if (filters.owner && record.owner !== filters.owner) return false;
      if (filters.runMode && settings.runMode !== filters.runMode) return false;
      if (filters.enabled !== undefined && record.enabled !== filters.enabled) {
        return false;
      }

      return true;
    });
  }, [
    filters,
    monitor,
    settings.runMode,
    stats.ruleCount,
  ]);

  const statusFilter: MonitorStatusFilter =
    filters.enabled === true
      ? 'ENABLED'
      : filters.enabled === false
        ? 'DISABLED'
        : 'ALL';

  const applyFilters = () => {
    setFilters({ ...draftFilters });
  };

  const resetFilters = () => {
    const emptyFilters = createEmptyFilters();
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    setAdvancedOpen(false);
    onRefresh();
  };

  const changeStatusFilter = (value: MonitorStatusFilter) => {
    const enabled =
      value === 'ENABLED' ? true : value === 'DISABLED' ? false : undefined;

    setDraftFilters((current) => ({
      ...current,
      enabled,
    }));

    setFilters((current) => ({
      ...current,
      enabled,
    }));
  };

  const moreMenu: MenuProps = {
    items: [
      { key: 'log', label: '操作日志' },
      { type: 'divider' },
      { key: 'remove', label: '删除', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'log') onOpenLog();
      if (key === 'remove') onRemove();
    },
  };

  const columns: TableColumnsType<MonitorRecord> = [
    {
      title: '名称 / ID / 描述',
      minWidth: 360,
      render: (_, record) => (
        <div className="min-w-0 py-1">
          <div className="truncate text-[13px] font-medium text-[#172033]">
            {record.name}
          </div>

          <div className="mt-1 text-[11px] text-[#98a2b3]">
            ID：{record.id}
          </div>

          {record.description ? (
            <div className="mt-1 line-clamp-1 text-[12px] text-[#667085]">
              {record.description}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: '触发方式',
      width: 190,
      render: (_, record) => (
        <div>
          <div className="text-[13px] text-[#344054]">{record.trigger}</div>
          <div className="mt-1 text-[11px] text-[#98a2b3]">
            {settings.nextRunTime
              ? `下次：${settings.nextRunTime}`
              : '未配置下次运行'}
          </div>
        </div>
      ),
    },
    {
      title: '已启用 / 总规则数',
      width: 160,
      render: () => (
        <div className="flex items-baseline gap-1">
          <span className="font-medium text-[#344054]">
            {stats.enabledRuleCount}
          </span>
          <span className="text-[#98a2b3]">/</span>
          <span className="text-[#667085]">{stats.ruleCount}</span>
        </div>
      ),
    },
    {
      title: '责任人',
      dataIndex: 'owner',
      width: 180,
      render: (value) => <span className="text-[#344054]">{value}</span>,
    },
    {
      title: '最近更新时间',
      dataIndex: 'updateTime',
      width: 190,
      render: (value) => <span className="text-[#667085]">{value}</span>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      render: (value) => (
        <Tag
          className="!m-0 !border-0"
        >
          {value ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      fixed: 'right',
      width: 170,
      render: () => (
        <div className="flex items-center gap-3">
          <Button
            type="link"
            size="small"
            loading={running}
            onClick={onRun}
            className="!h-auto !p-0"
          >
            {running ? '提交中' : '测试运行'}
          </Button>

          <Dropdown trigger={['click']} menu={moreMenu}>
            <Button
              type="text"
              size="small"
              aria-label="更多操作"
              icon={<MoreHorizontal size={15} />}
              className="!h-7 !w-7 !px-0"
            />
          </Dropdown>
        </div>
      ),
    },
  ];

  const advancedSearchContent = (
    <div className="w-[300px]">
      <div className="mb-3 text-[13px] font-semibold text-[#161823]">
        高级搜索
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1.5 text-xs text-[#667085]">责任人</div>
          <Select
            allowClear
            variant="filled"
            value={draftFilters.owner}
            placeholder="全部责任人"
            options={[
              {
                value: monitor.owner,
                label: monitor.owner,
              },
            ]}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                owner: value,
              }))
            }
            className="w-full"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-[#f0f1f3] pt-3">
        <Button size="small" onClick={resetFilters}>
          重置
        </Button>

        <Button
          size="small"
          type="primary"
          onClick={() => {
            applyFilters();
            setAdvancedOpen(false);
          }}
        >
          应用
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-w-0 flex-1 bg-white" style={{padding: 16}}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f3] pb-3 ">
        <Segmented<MonitorStatusFilter>
          value={statusFilter}
          options={[
            { label: '全部监控', value: 'ALL' },
            { label: '已启用', value: 'ENABLED' },
            { label: '已停用', value: 'DISABLED' },
          ]}
          onChange={changeStatusFilter}
        />

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <Input
            allowClear
            variant="filled"
            value={draftFilters.keyword}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                keyword: event.target.value,
              }))
            }
            onPressEnter={applyFilters}
            placeholder="搜索监控名称或 ID"
            prefix={<Search size={14} className="text-[#98a2b3]" />}
            className="w-[220px]"
          />

          <Select
            allowClear
            variant="filled"
            value={draftFilters.runMode}
            placeholder="触发方式"
            options={[
              { value: 'MANUAL', label: '手动触发' },
              { value: 'SCHEDULE', label: '生产调度触发' },
            ]}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                runMode: value,
              }))
            }
            className="w-[160px]"
          />

          <Button onClick={applyFilters}>查询</Button>

          <Popover
            trigger="click"
            placement="bottomRight"
            open={advancedOpen}
            onOpenChange={setAdvancedOpen}
            content={advancedSearchContent}
          >
            <Button icon={<ListFilter size={14} />}>高级搜索</Button>
          </Popover>
        </div>
      </div>

      <Table<MonitorRecord>
        rowKey="id"
        size="small"
        bordered
        pagination={false}
        scroll={{ x: 1280 }}
        className={dataQualityTableClassName('mt-3')}
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