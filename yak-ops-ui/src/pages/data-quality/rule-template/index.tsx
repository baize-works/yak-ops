import { BRAND_THEME } from '@/styles/brand';
import { ConfigProvider, Input, Tooltip, message } from 'antd';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Folder,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type QualityDimension =
  | '全部'
  | '有效性'
  | '时效性'
  | '唯一性'
  | '准确性'
  | '一致性'
  | '完整性';

type TemplateScope = '表级' | '字段级';

interface QualityDimensionItem {
  label: QualityDimension;
  count: number;
}

interface RuleTemplate {
  id: number;
  name: string;
  dimension: Exclude<QualityDimension, '全部'>;
  scope: TemplateScope;
  ruleCount: number;
  description: string;
}

const DIMENSIONS: QualityDimensionItem[] = [
  { label: '全部', count: 80 },
  { label: '有效性', count: 29 },
  { label: '时效性', count: 15 },
  { label: '唯一性', count: 8 },
  { label: '准确性', count: 8 },
  { label: '一致性', count: 5 },
  { label: '完整性', count: 13 },
];

const SYSTEM_TEMPLATES: RuleTemplate[] = [
  {
    id: 1,
    name: '表行数 - 固定值',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 1,
    description: '表行数。',
  },
  {
    id: 2,
    name: '表行数 - 大于0',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 0,
    description: '表行数大于0的校验。',
  },
  {
    id: 3,
    name: '表行数 - 自定义周期差值',
    dimension: '完整性',
    scope: '表级',
    ruleCount: 0,
    description: 'SYSTEM:table:table_count_delta:fixed',
  },
  {
    id: 4,
    name: '表行数 - 1天差值',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 0,
    description:
      '基准值为昨天产生的分区的表行数，比较当天采集的表行数，对比差值。',
  },
  {
    id: 5,
    name: '表行数 - 上周期差值',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 0,
    description:
      '基准值为上一周期产生的分区的表行数，比较当天采集的表行数，对比差值。',
  },
  {
    id: 6,
    name: '表行数 - 自定义周期波动率',
    dimension: '完整性',
    scope: '表级',
    ruleCount: 0,
    description: 'SYSTEM:table:table_count:flux',
  },
  {
    id: 7,
    name: '表行数 - 1/7/30天/本月1号波动率',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 0,
    description:
      '与1天、1周、1个月前和本月1号采集的表行数进行比较，对比波动率。',
  },
  {
    id: 8,
    name: '表行数 - 1/7/30天波动率',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 0,
    description: '同1天、1周和1个月前采集的表行数进行比较，对比波动率。',
  },
  {
    id: 9,
    name: '表行数 - 1天波动率',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 0,
    description:
      '基准值为昨天产生的分区的表行数，比较当天采集的表行数，对比波动率。',
  },
  {
    id: 10,
    name: '表行数 - 30天波动率',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 0,
    description:
      '基准值为1个月前产生的分区的表行数，比较当天采集的表行数，对比波动率。',
  },
  {
    id: 11,
    name: '表行数 - 7天波动率',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 0,
    description:
      '基准值为1周前产生的分区的表行数，比较当天采集的表行数，对比波动率。',
  },
  {
    id: 12,
    name: '表行数 - 动态阈值',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 0,
    description: '表行数动态阈值。',
  },
  {
    id: 13,
    name: '表行数 - 30天平均值波动率',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 0,
    description: '基准值是最近30天的表行数的平均值。',
  },
  {
    id: 14,
    name: '表行数 - 7天平均值波动率',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 0,
    description: '基准值是最近7天的表行数的平均值。',
  },
  {
    id: 15,
    name: '表行数 - 上周期波动率',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 0,
    description:
      '基准值为上一周期产生的分区的表行数，比较当天采集的表行数，对比波动率。',
  },
  {
    id: 16,
    name: '表行数 - 自定义范围',
    dimension: '时效性',
    scope: '表级',
    ruleCount: 0,
    description: '根据给定的筛选条件，统计数据行数，自定义阈值比较方式。',
  },
  {
    id: 17,
    name: '表行数占比 - 自定义范围',
    dimension: '完整性',
    scope: '表级',
    ruleCount: 0,
    description:
      '根据给定的筛选条件，统计数据行数与总行数的占比，自定义阈值比较方式。',
  },
  {
    id: 18,
    name: '表大小 - 固定值校验',
    dimension: '完整性',
    scope: '表级',
    ruleCount: 0,
    description: '表的空间大小（字节）。',
  },
  {
    id: 19,
    name: '表大小 - 1天差值(字节)',
    dimension: '完整性',
    scope: '表级',
    ruleCount: 0,
    description:
      '基准值为昨天产生的分区的表的空间大小（字节），比较当天采集值，对比差值。',
  },
  {
    id: 20,
    name: '表大小 - 上周期差值',
    dimension: '完整性',
    scope: '表级',
    ruleCount: 0,
    description: '表大小相比上一周期的差值（字节）。',
  },
  {
    id: 21,
    name: '字段空值率 - 固定阈值',
    dimension: '完整性',
    scope: '字段级',
    ruleCount: 0,
    description: '校验字段空值率是否处于设定阈值范围。',
  },
  {
    id: 22,
    name: '字段非空值校验',
    dimension: '有效性',
    scope: '字段级',
    ruleCount: 0,
    description: '校验字段是否存在空值。',
  },
  {
    id: 23,
    name: '字段唯一值校验',
    dimension: '唯一性',
    scope: '字段级',
    ruleCount: 0,
    description: '校验字段值在数据集内是否唯一。',
  },
  {
    id: 24,
    name: '字段枚举值校验',
    dimension: '准确性',
    scope: '字段级',
    ruleCount: 0,
    description: '校验字段值是否包含在允许的枚举范围内。',
  },
  {
    id: 25,
    name: '字段正则表达式校验',
    dimension: '有效性',
    scope: '字段级',
    ruleCount: 0,
    description: '使用正则表达式校验字段值格式。',
  },
  {
    id: 26,
    name: '字段长度范围校验',
    dimension: '有效性',
    scope: '字段级',
    ruleCount: 0,
    description: '校验字符字段长度是否处于指定范围。',
  },
  {
    id: 27,
    name: '字段数值范围校验',
    dimension: '准确性',
    scope: '字段级',
    ruleCount: 0,
    description: '校验数值字段是否处于指定范围。',
  },
  {
    id: 28,
    name: '字段跨表一致性校验',
    dimension: '一致性',
    scope: '字段级',
    ruleCount: 0,
    description: '比较来源字段和参照字段的数据一致性。',
  },
];

const RuleTemplateLibraryPage = () => {
  const [selectedDimension, setSelectedDimension] =
    useState<QualityDimension>('全部');
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'system' | 'custom'>('system');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const visibleTemplates = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return SYSTEM_TEMPLATES.filter((template) => {
      const matchesDimension =
        selectedDimension === '全部' ||
        template.dimension === selectedDimension;
      const matchesKeyword =
        !normalizedKeyword ||
        template.name.toLowerCase().includes(normalizedKeyword) ||
        template.description.toLowerCase().includes(normalizedKeyword);
      return matchesDimension && matchesKeyword;
    });
  }, [keyword, selectedDimension]);

  const selectedDimensionCount =
    DIMENSIONS.find((item) => item.label === selectedDimension)?.count ?? 0;

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="flex h-[calc(100vh-64px)] min-h-[620px] flex-col overflow-hidden bg-white">
        <div className="flex h-12 shrink-0 items-center border-b border-[#e8e9ec] px-5">
          <h1 className="m-0 text-[20px] font-semibold leading-7 text-[#161823]">
            规则模板库
          </h1>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside
            className={[
              'shrink-0 overflow-hidden bg-white transition-[width] duration-200',
              leftCollapsed ? 'w-0' : 'w-[280px]',
            ].join(' ')}
          >
            <div className="h-full w-[280px] overflow-y-auto px-4 pb-4 pt-2">
              <div className="mb-1 mt-1 text-xs font-semibold leading-6 text-[#161823]">
                质量维度
              </div>

              <div className="space-y-0.5">
                {DIMENSIONS.map((item) => {
                  const selected = selectedDimension === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setSelectedDimension(item.label)}
                      className={[
                        'flex h-7 w-full items-center justify-between border-0 px-2 text-left text-[13px] transition-colors',
                        selected
                          ? 'bg-[rgba(254,44,85,0.08)] font-medium text-[#fe2c55]'
                          : 'bg-transparent text-[#30323b] hover:bg-[#f5f5f6]',
                      ].join(' ')}
                    >
                      <span>{item.label}</span>
                      <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-[#f2f3f5] px-1.5 text-xs font-semibold leading-5 text-[#5d616b]">
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex h-7 items-center justify-between">
                <div className="flex items-center gap-1 text-xs font-semibold text-[#161823]">
                  <span>自定义模版类目</span>
                  <Tooltip title="用于管理自定义规则模板的分类目录">
                    <CircleHelp className="h-3.5 w-3.5 text-[#315efb]" />
                  </Tooltip>
                </div>

                <div className="flex items-center gap-1">
                  <Tooltip title="新建类目">
                    <button
                      type="button"
                      onClick={() => message.info('自定义类目功能将在后续接口联调中开放')}
                      className="flex h-6 w-6 items-center justify-center border-0 bg-transparent text-[#6b707a] hover:text-[#161823]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip title="刷新类目">
                    <button
                      type="button"
                      onClick={handleRefresh}
                      className="flex h-6 w-6 items-center justify-center border-0 bg-transparent text-[#6b707a] hover:text-[#161823]"
                    >
                      <RefreshCw
                        className={[
                          'h-3.5 w-3.5',
                          refreshing ? 'animate-spin' : '',
                        ].join(' ')}
                      />
                    </button>
                  </Tooltip>
                </div>
              </div>

              <Input
                allowClear
                size="small"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="请输入规则名称"
                prefix={<Search className="h-3.5 w-3.5 text-[#a1a5ae]" />}
                className="mt-1"
              />

              <div className="mt-2">
                <button
                  type="button"
                  className="flex h-7 w-full items-center border-0 bg-transparent px-1 text-left text-[13px] text-[#30323b] hover:bg-[#f5f5f6]"
                >
                  <ChevronDown className="mr-1 h-3.5 w-3.5" />
                  <Folder className="mr-2 h-4 w-4 fill-[#90949d] text-[#90949d]" />
                  <span>全部</span>
                </button>
              </div>
            </div>
          </aside>

          <div className="relative w-4 shrink-0 border-x border-[#e7e8eb] bg-white">
            <button
              type="button"
              aria-label={leftCollapsed ? '展开左侧筛选' : '收起左侧筛选'}
              onClick={() => setLeftCollapsed((value) => !value)}
              className="absolute left-1/2 top-1/2 z-10 flex h-8 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border border-[#dfe1e5] bg-white text-[#7b808a] shadow-sm hover:text-[#161823]"
            >
              {leftCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <main className="min-w-0 flex-1 overflow-hidden bg-white px-4 pt-2">
            <div className="flex h-full min-w-[760px] flex-col overflow-hidden">
              <div className="flex h-8 shrink-0 items-center justify-between">
                <h2 className="m-0 text-sm font-semibold text-[#161823]">
                  {selectedDimension}
                </h2>
                <Tooltip title="刷新">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="flex h-6 w-6 items-center justify-center rounded border border-[#dfe1e5] bg-white text-[#6e737d] hover:border-[#c8cbd1] hover:text-[#161823]"
                  >
                    <RefreshCw
                      className={[
                        'h-3.5 w-3.5',
                        refreshing ? 'animate-spin' : '',
                      ].join(' ')}
                    />
                  </button>
                </Tooltip>
              </div>

              <div className="flex h-10 shrink-0 items-center gap-2">
                <span className="rounded bg-[#f5f5f6] px-2.5 py-1 text-xs text-[#4b505a]">
                  维度类型：
                  <strong className="ml-1 font-semibold text-[#161823]">
                    {selectedDimension === '全部' ? '系统维度' : selectedDimension}
                  </strong>
                </span>
                <span className="rounded bg-[#f5f5f6] px-2.5 py-1 text-xs text-[#4b505a]">
                  关联模板数：
                  <strong className="ml-1 font-semibold text-[#161823]">
                    {selectedDimensionCount}
                  </strong>
                </span>
                <span className="rounded bg-[#f5f5f6] px-2.5 py-1 text-xs text-[#4b505a]">
                  关联规则数：
                  <strong className="ml-1 font-semibold text-[#161823]">
                    {selectedDimension === '全部' ? 1 : 0}
                  </strong>
                </span>
              </div>

              <div className="flex h-10 shrink-0 items-end border-b border-[#dfe1e5]">
                <button
                  type="button"
                  onClick={() => setActiveTab('system')}
                  className={[
                    'relative h-10 border-0 bg-transparent px-4 text-[13px]',
                    activeTab === 'system'
                      ? 'font-semibold text-[#fe2c55] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#fe2c55]'
                      : 'text-[#555a64] hover:text-[#161823]',
                  ].join(' ')}
                >
                  系统模板 (80)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={[
                    'relative h-10 border-0 bg-transparent px-4 text-[13px]',
                    activeTab === 'custom'
                      ? 'font-semibold text-[#fe2c55] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#fe2c55]'
                      : 'text-[#555a64] hover:text-[#161823]',
                  ].join(' ')}
                >
                  自定义模板 (0)
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto pb-3">
                {activeTab === 'system' ? (
                  <table className="w-full table-fixed border-collapse text-left text-[13px] text-[#20232b]">
                    <colgroup>
                      <col className="w-[26%]" />
                      <col className="w-[12%]" />
                      <col className="w-[9%]" />
                      <col className="w-[12%]" />
                      <col />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-[#f3f3f4]">
                      <tr className="h-9">
                        <th className="px-3 font-semibold">模板名称</th>
                        <th className="px-3 font-semibold">质量维度</th>
                        <th className="px-3 font-semibold">关联范围</th>
                        <th className="px-3 font-semibold">关联规则数</th>
                        <th className="px-3 font-semibold">模板描述</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTemplates.map((template) => (
                        <tr
                          key={template.id}
                          className="h-9 border-b border-[#eceef0] hover:bg-[#fafafa]"
                        >
                          <td className="truncate px-3" title={template.name}>
                            {template.name}
                          </td>
                          <td className="truncate px-3">
                            {template.dimension}
                          </td>
                          <td className="truncate px-3">{template.scope}</td>
                          <td className="truncate px-3">
                            {template.ruleCount}
                          </td>
                          <td
                            className="truncate px-3"
                            title={template.description}
                          >
                            {template.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex h-full min-h-64 flex-col items-center justify-center text-[#969ba5]">
                    <Folder className="mb-3 h-10 w-10 text-[#c7cad0]" />
                    <div className="text-sm">暂无自定义模板</div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default RuleTemplateLibraryPage;
