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
import {
  ListFilter,
  MoreHorizontal,
  Play,
  RefreshCw,
  Search,
} from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useMemo, useState } from 'react';
import { dataQualityTableClassName } from '../../components/tableStyle';
import type { MonitorWorkspaceView, RuleView } from '../../types';
import {
  DIMENSION_ORDER,
  RUN_MODE_LABEL,
  ruleParameter,
  scopeLabel,
} from './model';

interface RuleManagementTabProps {
  workspace: MonitorWorkspaceView;
  running: boolean;
  onRun: () => void;
  onOpenLog: () => void;
  onRefresh: () => void;
  onRemoveMonitor: () => void;
}

type RuleStatusFilter = 'ALL' | 'ENABLED' | 'DISABLED';

interface RuleFilterState {
  keyword: string;
  template?: string;
  scope?: string;
  enabled?: boolean;
  dimension?: string;
}

const createEmptyFilters = (): RuleFilterState => ({
  keyword: '',
  template: undefined,
  scope: undefined,
  enabled: undefined,
  dimension: undefined,
});

const MIN_LEFT_WIDTH = 220;
const MAX_LEFT_WIDTH = 420;
const DEFAULT_LEFT_WIDTH = 286;

const RuleManagementTab = ({
  workspace,
  running,
  onRun,
  onOpenLog,
  onRefresh,
  onRemoveMonitor,
}: RuleManagementTabProps) => {
  const { monitor, settings, stats } = workspace;

  const [monitorKeyword, setMonitorKeyword] = useState('');
  const [filters, setFilters] = useState<RuleFilterState>(createEmptyFilters);
  const [draftFilters, setDraftFilters] =
    useState<RuleFilterState>(createEmptyFilters);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [resizing, setResizing] = useState(false);

  const records = useMemo(() => {
    const normalizedKeyword = filters.keyword.trim().toLowerCase();

    return monitor.rules.filter((rule) => {
      if (
        normalizedKeyword &&
        !`${rule.id} ${rule.name} ${rule.templateCode} ${rule.columnName || ''}`
          .toLowerCase()
          .includes(normalizedKeyword)
      ) {
        return false;
      }

      if (filters.template && rule.templateCode !== filters.template) return false;
      if (filters.scope && rule.scope !== filters.scope) return false;
      if (filters.enabled !== undefined && rule.enabled !== filters.enabled) {
        return false;
      }
      if (filters.dimension && rule.dimension !== filters.dimension) return false;

      return true;
    });
  }, [filters, monitor.rules]);

  const templates = useMemo(
    () =>
      Array.from(
        new Map(
          monitor.rules.map((rule) => [
            rule.templateCode,
            { value: rule.templateCode, label: rule.templateCode },
          ]),
        ).values(),
      ),
    [monitor.rules],
  );

  const statusFilter: RuleStatusFilter =
    filters.enabled === true
      ? 'ENABLED'
      : filters.enabled === false
        ? 'DISABLED'
        : 'ALL';

  const monitorVisible = useMemo(() => {
    const normalizedKeyword = monitorKeyword.trim().toLowerCase();
    if (!normalizedKeyword) return true;

    return `${monitor.id} ${monitor.name}`
      .toLowerCase()
      .includes(normalizedKeyword);
  }, [monitor.id, monitor.name, monitorKeyword]);

  const applyFilters = () => {
    setFilters({ ...draftFilters });
  };

  const reset = () => {
    const emptyFilters = createEmptyFilters();
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    setAdvancedOpen(false);
  };

  const changeStatusFilter = (value: RuleStatusFilter) => {
    const enabled =
      value === 'ENABLED' ? true : value === 'DISABLED' ? false : undefined;

    setDraftFilters((current) => ({ ...current, enabled }));
    setFilters((current) => ({ ...current, enabled }));
  };

  const onResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = leftWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    setResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = startWidth + moveEvent.clientX - startX;
      setLeftWidth(
        Math.min(MAX_LEFT_WIDTH, Math.max(MIN_LEFT_WIDTH, nextWidth)),
      );
    };

    const onPointerUp = () => {
      setResizing(false);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const columns: TableColumnsType<RuleView> = [
    {
      title: '规则名称 / ID',
      dataIndex: 'name',
      minWidth: 300,
      render: (_, rule) => (
        <div className="min-w-0 py-1">
          <div className="truncate text-[13px] font-medium text-[#172033]">
            {rule.name}
          </div>
          <div className="mt-1 text-[11px] text-[#98a2b3]">
            ID：{rule.id}
            {rule.columnName ? ` · 字段：${rule.columnName}` : ' · 表级规则'}
          </div>
        </div>
      ),
    },
    {
      title: '重要程度',
      width: 110,
      render: () => (
        <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[#667085]">
          弱规则
        </Tag>
      ),
    },
    {
      title: '关联范围',
      width: 120,
      render: (_, rule) => scopeLabel(rule),
    },
    {
      title: '规则模板',
      dataIndex: 'templateCode',
      width: 180,
      render: (value) => <span className="text-[#344054]">{value}</span>,
    },
    {
      title: '监控阈值',
      width: 190,
      render: (_, rule) => (
        <div>
          <div className="font-medium text-[#344054]">{ruleParameter(rule)}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff4d4f]" />
            <span className="text-[#ff4d4f]">异常</span>
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#12a150]" />
            <span className="text-[#12a150]">正常</span>
          </div>
        </div>
      ),
    },
    {
      title: '质量维度',
      dataIndex: 'dimension',
      width: 110,
      render: (value) => <span className="text-[#344054]">{value}</span>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      render: (value) => (
        <Tag
          className="!m-0 !border-0"
          color={value ? 'processing' : 'default'}
        >
          {value ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      fixed: 'right',
      width: 110,
      render: () => (
        <button
          type="button"
          className="border-0 bg-transparent p-0 text-xs text-[#245bdb]"
          onClick={onOpenLog}
        >
          操作日志
        </button>
      ),
    },
  ];

  const moreMenu: MenuProps = {
    items: [
      { key: 'refresh', label: '刷新数据' },
      { key: 'log', label: '操作日志' },
      { type: 'divider' },
      { key: 'remove', label: '删除质量监控', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'refresh') onRefresh();
      if (key === 'log') onOpenLog();
      if (key === 'remove') onRemoveMonitor();
    },
  };

  const advancedSearchContent = (
    <div className="w-[300px]">
      <div className="mb-3 text-[13px] font-semibold text-[#161823]">
        高级搜索
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1.5 text-xs text-[#667085]">关联范围</div>
          <Select
            allowClear
            variant="filled"
            value={draftFilters.scope}
            placeholder="全部范围"
            options={[
              { value: 'TABLE', label: '表级' },
              { value: 'COLUMN', label: '字段级' },
            ]}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, scope: value }))
            }
            className="w-full"
          />
        </div>

        <div>
          <div className="mb-1.5 text-xs text-[#667085]">质量维度</div>
          <Select
            allowClear
            variant="filled"
            value={draftFilters.dimension}
            placeholder="全部维度"
            options={DIMENSION_ORDER.map((value) => ({ value, label: value }))}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, dimension: value }))
            }
            className="w-full"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-[#f0f1f3] pt-3">
        <Button size="small" onClick={reset}>
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
    <div className="flex h-full min-h-0 flex-1 items-stretch bg-white">
      <aside
        className="shrink-0 overflow-hidden bg-[#fbfcfe] px-5 py-5"
        style={{ width: leftWidth }}
      >
        <div className="text-[14px] font-semibold text-[#172033]">规则详情</div>
        <div className="mt-4 space-y-1 text-[13px]">
          <div className="flex items-center justify-between rounded-md bg-[#f0f3f8] px-3 py-2 font-medium text-[#27344f]">
            <span>全部规则</span>
            <span className="rounded-full bg-white px-1.5 text-xs">
              {stats.ruleCount}
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-[#43506a]">
            <span>已启用规则</span>
            <span>{stats.enabledRuleCount}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-[#43506a]">
            <span>已停用规则</span>
            <span>{stats.ruleCount - stats.enabledRuleCount}</span>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between">
          <div className="text-[14px] font-semibold text-[#172033]">
            质量监控信息
          </div>
          <RefreshCw
            size={14}
            className="cursor-pointer text-[#667085]"
            onClick={onRefresh}
          />
        </div>
        <Input
          variant="filled"
          allowClear
          value={monitorKeyword}
          onChange={(event) => setMonitorKeyword(event.target.value)}
          placeholder="请输入关键字搜索"
          prefix={<Search size={14} className="text-[#98a2b3]" />}
          className="mt-3"
        />

        {monitorVisible ? (
          <div className="mt-3 rounded-md border border-[#cfdaf8] bg-[#eef3ff] px-3 py-3">
            <div className="text-xs text-[#7583a1]">ID: {monitor.id}</div>
            <div className="mt-1 line-clamp-2 text-[13px] font-semibold leading-5 text-[#172033]">
              {monitor.name}
            </div>
            <div className="mt-2 space-y-1 text-xs text-[#667085]">
              <div>数据范围：{monitor.whereClause || '全表'}</div>
              <div>触发方式：{RUN_MODE_LABEL[settings.runMode]}</div>
              <div>
                规则数：启用{stats.enabledRuleCount} / 总数{stats.ruleCount}
              </div>
              <div>配置来源：数据质量</div>
            </div>
          </div>
        ) : (
          <div className="mt-8 text-center text-xs text-[#98a2b3]">
            未找到匹配的监控配置
          </div>
        )}
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="调整左侧规则详情宽度"
        onPointerDown={onResizeStart}
        className={[
          'group relative w-2 shrink-0 cursor-col-resize touch-none select-none self-stretch',
          resizing ? 'z-10' : '',
        ].join(' ')}
      >
        <div
          className={[
            'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors',
            resizing ? 'bg-[#98a2b3]' : 'bg-[#e5e7eb] group-hover:bg-[#b8c0cc]',
          ].join(' ')}
        />
        <div className="absolute left-1/2 top-1/2 h-9 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent transition-colors group-hover:bg-[#d0d5dd]" />
      </div>

      <main className="min-w-0 flex-1 overflow-auto px-4 py-4">
        <div className="flex min-h-10 items-center justify-between gap-4 border-b border-[#edf0f3] pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-[#161823]">
              {monitor.name}
            </span>
            <span className="shrink-0 text-xs text-[#98a2b3]">
              ID: {monitor.id}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {settings.runMode === 'MANUAL' ? (
              <Tag color="orange" bordered={false} className="!m-0">
                未开启调度
              </Tag>
            ) : null}

            <Button
              type="primary"
              icon={<Play size={14} />}
              loading={running}
              onClick={onRun}
              className="!h-8 !px-3 !shadow-none"
            >
              测试运行
            </Button>

            <Dropdown menu={moreMenu} trigger={['click']}>
              <Button
                aria-label="更多操作"
                icon={<MoreHorizontal size={15} />}
                className="!h-8 !w-8 !px-0"
              />
            </Dropdown>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <Segmented<RuleStatusFilter>
            value={statusFilter}
            options={[
              { label: '全部规则', value: 'ALL' },
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
              placeholder="搜索规则名称或 ID"
              prefix={<Search size={14} className="text-[#98a2b3]" />}
              className="w-[220px]"
            />

            <Select
              allowClear
              variant="filled"
              value={draftFilters.template}
              placeholder="规则模板"
              options={templates}
              onChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  template: value,
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

        <Table<RuleView>
          rowKey="id"
          size="small"
          bordered
          pagination={false}
          scroll={{ x: 1280 }}
          className={dataQualityTableClassName()}
          dataSource={records}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无符合条件的质量规则"
              />
            ),
          }}
          columns={columns}
        />

        <div className="mt-3 flex justify-end text-xs text-[#8b95a7]">
          共 {records.length} 条规则
        </div>
      </main>
    </div>
  );
};

export default RuleManagementTab;