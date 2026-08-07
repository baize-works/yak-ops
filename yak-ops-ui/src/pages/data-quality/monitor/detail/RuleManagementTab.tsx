import { Button, Dropdown, Empty, Input, Select, Table, Tag } from 'antd';
import type { MenuProps, TableColumnsType } from 'antd';
import { MoreHorizontal, Play, RefreshCw, Search } from 'lucide-react';
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

const RuleManagementTab = ({
  workspace,
  running,
  onRun,
  onOpenLog,
  onRefresh,
  onRemoveMonitor,
}: RuleManagementTabProps) => {
  const { monitor, settings, stats } = workspace;
  const [keyword, setKeyword] = useState('');
  const [template, setTemplate] = useState<string>();
  const [scope, setScope] = useState<string>();
  const [enabled, setEnabled] = useState<boolean>();
  const [dimension, setDimension] = useState<string>();

  const records = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return monitor.rules.filter((rule) => {
      if (
        normalizedKeyword &&
        !`${rule.id} ${rule.name} ${rule.templateCode} ${rule.columnName || ''}`
          .toLowerCase()
          .includes(normalizedKeyword)
      ) {
        return false;
      }
      if (template && rule.templateCode !== template) return false;
      if (scope && rule.scope !== scope) return false;
      if (enabled !== undefined && rule.enabled !== enabled) return false;
      if (dimension && rule.dimension !== dimension) return false;
      return true;
    });
  }, [dimension, enabled, keyword, monitor.rules, scope, template]);

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

  const reset = () => {
    setKeyword('');
    setTemplate(undefined);
    setScope(undefined);
    setEnabled(undefined);
    setDimension(undefined);
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

  return (
    <div className="flex min-h-0 flex-1 bg-white">
      <aside className="w-[286px] shrink-0 border-r border-[#e5e7eb] bg-[#fbfcfe] px-5 py-5">
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
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="请输入关键字搜索"
          prefix={<Search size={14} className="text-[#98a2b3]" />}
          className="mt-3"
        />

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
      </aside>

      <main className="min-w-0 flex-1 overflow-auto px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f3] pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[14px] font-medium text-[#172033]">
              {monitor.name}
            </span>
            <Button
              size="small"
              icon={<Play size={13} />}
              loading={running}
              onClick={onRun}
            >
              测试运行
            </Button>
            <Dropdown menu={moreMenu} trigger={['click']}>
              <Button size="small" icon={<MoreHorizontal size={14} />} />
            </Dropdown>
            {settings.runMode === 'MANUAL' ? (
              <Tag color="orange" className="!m-0">
                未开启调度
              </Tag>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 py-3">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="名称  输入名称或ID搜索"
            prefix={<Search size={14} className="text-[#98a2b3]" />}
            className="w-[220px]"
          />
          <Select
            allowClear
            value={template}
            placeholder="规则模板"
            options={templates}
            onChange={setTemplate}
            className="w-[170px]"
          />
          <Select
            allowClear
            value={scope}
            placeholder="关联范围"
            options={[
              { value: 'TABLE', label: '表级' },
              { value: 'COLUMN', label: '字段级' },
            ]}
            onChange={setScope}
            className="w-[140px]"
          />
          <Select
            allowClear
            value={enabled}
            placeholder="启用状态"
            options={[
              { value: true, label: '启用' },
              { value: false, label: '停用' },
            ]}
            onChange={setEnabled}
            className="w-[130px]"
          />
          <Select
            allowClear
            value={dimension}
            placeholder="质量维度"
            options={DIMENSION_ORDER.map((value) => ({ value, label: value }))}
            onChange={setDimension}
            className="w-[130px]"
          />
          <Button type="text" icon={<RefreshCw size={13} />} onClick={reset}>
            重置
          </Button>
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
