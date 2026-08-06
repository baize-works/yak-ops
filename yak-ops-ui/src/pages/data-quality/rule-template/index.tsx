import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';
import { ConfigProvider, Empty, Input, Spin, Table, Tag, message } from 'antd';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { qualityTemplateApi } from '../service';
import type { TemplateListView, TemplateView } from '../types';

const DEFAULT_LEFT_WIDTH = 280;
const MIN_LEFT_WIDTH = 220;
const MAX_LEFT_WIDTH = 480;

const unwrap = <T,>(response: { code: number; data: T; message?: string; msg?: string }) => {
  if (response.code !== API_SUCCESS_CODE) throw new Error(response.message || response.msg || '请求失败');
  return response.data;
};

const TemplateLibraryPage = () => {
  const [data, setData] = useState<TemplateListView>({ records: [], summary: { total: 0, dimensions: {} } });
  const [dimension, setDimension] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const dragRef = useRef<{ x: number; width: number }>();

  const dimensions = useMemo(
    () => [
      { label: '全部', count: data.summary.total },
      ...Object.entries(data.summary.dimensions).map(([label, count]) => ({ label, count })),
    ],
    [data.summary],
  );

  useEffect(() => {
    setLoading(true);
    qualityTemplateApi
      .list({ keyword, dimension: dimension === '全部' ? undefined : dimension })
      .then((response) => setData(unwrap(response)))
      .catch((error) => message.error(error?.message || '规则模板加载失败'))
      .finally(() => setLoading(false));
  }, [dimension, keyword]);

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const initial = collapsed ? MIN_LEFT_WIDTH : leftWidth;
    if (collapsed) setCollapsed(false);
    dragRef.current = { x: event.clientX, width: initial };
    const move = (current: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      setLeftWidth(Math.min(MAX_LEFT_WIDTH, Math.max(MIN_LEFT_WIDTH, drag.width + current.clientX - drag.x)));
    };
    const end = () => {
      dragRef.current = undefined;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="flex h-[calc(100vh-64px)] min-h-[620px] flex-col overflow-hidden bg-white">
        <div className="flex h-12 shrink-0 items-center border-b border-[#e8e9ec] px-5">
          <h1 className="m-0 text-[20px] font-semibold text-[#161823]">规则模板库</h1>
        </div>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="shrink-0 overflow-hidden" style={{ width: collapsed ? 0 : leftWidth }}>
            <div className="h-full overflow-y-auto px-4 py-3" style={{ width: leftWidth }}>
              <div className="mb-2 text-xs font-semibold text-[#161823]">质量维度</div>
              <div className="space-y-1">
                {dimensions.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setDimension(item.label)}
                    className={`flex h-8 w-full items-center justify-between border-0 px-2 text-left text-[13px] ${
                      dimension === item.label
                        ? 'bg-[rgba(254,44,85,.08)] font-medium text-[#fe2c55]'
                        : 'bg-transparent text-[#30323b] hover:bg-[#f5f5f6]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="rounded-full bg-[#f2f3f5] px-2 text-xs text-[#5d616b]">{item.count}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5 border-t border-[#eceef0] pt-4">
                <div className="mb-2 text-xs font-semibold text-[#161823]">模板范围</div>
                <div className="text-xs leading-6 text-[#8a8f99]">
                  第一阶段只提供 6 个系统模板。自定义模板分类、发布版本和参数 Schema 编辑将在后续阶段补充。
                </div>
              </div>
            </div>
          </aside>

          <div role="separator" onPointerDown={startResize} className="relative w-3 shrink-0 cursor-col-resize">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#e4e7ec]" />
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setCollapsed((value) => !value)}
              className="absolute left-1/2 top-1/2 z-10 flex h-8 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded border border-[#dfe1e5] bg-white text-[#7b808a]"
            >
              {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
          </div>

          <main className="min-w-0 flex-1 overflow-hidden px-4 py-3">
            <div className="flex h-full flex-col overflow-hidden">
              <div className="mb-3 flex shrink-0 items-center justify-between">
                <div>
                  <h2 className="m-0 text-sm font-semibold text-[#161823]">{dimension}</h2>
                  <div className="mt-1 text-xs text-[#8a8f99]">共 {data.records.length} 个可用模板</div>
                </div>
                <Input
                  allowClear
                  variant="filled"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  prefix={<Search size={14} className="text-[#98a2b3]" />}
                  placeholder="搜索模板名称或描述"
                  className="w-[360px]"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <Spin spinning={loading}>
                  <Table<TemplateView>
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={data.records}
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无规则模板" /> }}
                    columns={[
                      { title: '模板名称', dataIndex: 'name', width: 210 },
                      { title: '质量维度', dataIndex: 'dimension', width: 120 },
                      { title: '关联范围', dataIndex: 'scope', width: 110, render: (value) => <Tag>{value === 'TABLE' ? '表级' : '字段级'}</Tag> },
                      { title: '关联规则数', dataIndex: 'ruleCount', width: 120 },
                      { title: '模板描述', dataIndex: 'description' },
                    ]}
                    expandable={{
                      expandedRowRender: (record) => (
                        <pre className="m-0 whitespace-pre-wrap rounded bg-[#f7f7f8] p-3 text-xs text-[#555a64]">
                          {record.parameterSchema}
                        </pre>
                      ),
                    }}
                  />
                </Spin>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default TemplateLibraryPage;
