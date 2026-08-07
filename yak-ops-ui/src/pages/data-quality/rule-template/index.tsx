import { API_SUCCESS_CODE } from "@/services/http/response";
import { BRAND_COLOR, BRAND_COLOR_SOFT, BRAND_THEME } from "@/styles/brand";
import {
  ConfigProvider,
  Empty,
  Input,
  Spin,
  Table,
  Tabs,
  Tag,
  message,
} from "antd";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { dataQualityTableClassName } from "../components/tableStyle";
import { qualityTemplateApi } from "../service";
import type { TemplateListView, TemplateView } from "../types";

const DEFAULT_LEFT_WIDTH = 280;
const MIN_LEFT_WIDTH = 220;
const MAX_LEFT_WIDTH = 480;

type TemplateTabKey = "SYSTEM" | "CUSTOM";

type TemplateRecordWithSource = TemplateView & {
  templateType?: string;
  templateSource?: string;
  sourceType?: string;
  source?: string;
  isSystem?: boolean;
};

const DIMENSION_DESCRIPTIONS: Record<string, string> = {
  全部: "汇总展示全部质量维度下的规则模板，可通过质量维度、模板类型和关键字快速定位所需模板。",
  完整性:
    "完整性用于衡量数据是否按照预设要求完整填充，可判断必填字段、必要记录或关联数据是否存在缺失。",
  唯一性:
    "唯一性用于衡量数据是否存在重复，可判断主键、业务编码或组合字段是否满足唯一约束。",
  有效性:
    "有效性用于衡量数据对预设定义要求的匹配程度，可判断已具备数据定义或业务定义的字段是否出现不匹配格式要求的数据。",
  一致性:
    "一致性用于衡量不同字段、不同数据表或不同系统之间的数据表达是否保持一致。",
  准确性:
    "准确性用于衡量数据是否能够正确反映实际业务对象，可识别异常值、错误值以及不符合业务事实的数据。",
  及时性:
    "及时性用于衡量数据是否在规定时间内产生、更新或同步，可判断数据处理是否存在延迟。",
  规范性:
    "规范性用于衡量数据是否符合统一的数据标准、编码规则、格式约束和业务填写规范。",
};

const unwrap = <T,>(response: {
  code: number;
  data: T;
  message?: string;
  msg?: string;
}) => {
  if (response.code !== API_SUCCESS_CODE) {
    throw new Error(response.message || response.msg || "请求失败");
  }

  return response.data;
};

const getDimensionDescription = (dimension: string) => {
  return (
    DIMENSION_DESCRIPTIONS[dimension] ||
    `${dimension}用于衡量数据是否符合对应的数据质量要求，可通过关联规则识别不满足要求的数据。`
  );
};

const isCustomTemplate = (record: TemplateView) => {
  const current = record as TemplateRecordWithSource;

  if (typeof current.isSystem === "boolean") {
    return !current.isSystem;
  }

  const source = [
    current.templateType,
    current.templateSource,
    current.sourceType,
    current.source,
  ]
    .find(Boolean)
    ?.toUpperCase();

  return ["CUSTOM", "USER", "SELF", "CUSTOMIZED"].includes(source || "");
};

const TemplateLibraryPage = () => {
  const [data, setData] = useState<TemplateListView>({
    records: [],
    summary: {
      total: 0,
      dimensions: {},
    },
  });

  const [dimension, setDimension] = useState("全部");
  const [activeTab, setActiveTab] = useState<TemplateTabKey>("SYSTEM");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);

  const dragRef = useRef<{
    x: number;
    width: number;
  } | null>(null);

  const dimensions = useMemo(
    () => [
      {
        label: "全部",
        count: data.summary.total,
      },
      ...Object.entries(data.summary.dimensions).map(([label, count]) => ({
        label,
        count,
      })),
    ],
    [data.summary]
  );

  const systemRecords = useMemo(
    () => data.records.filter((record) => !isCustomTemplate(record)),
    [data.records]
  );

  const customRecords = useMemo(
    () => data.records.filter((record) => isCustomTemplate(record)),
    [data.records]
  );

  const currentRecords = useMemo(
    () => (activeTab === "SYSTEM" ? systemRecords : customRecords),
    [activeTab, customRecords, systemRecords]
  );

  const relatedRuleCount = useMemo(
    () =>
      currentRecords.reduce((total, record) => {
        const count = Number(record.ruleCount || 0);
        return total + (Number.isNaN(count) ? 0 : count);
      }, 0),
    [currentRecords]
  );

  const tabItems = useMemo(
    () => [
      {
        key: "SYSTEM",
        label: (
          <span>
            系统模板
            <span className="ml-1">({systemRecords.length})</span>
          </span>
        ),
      },
      {
        key: "CUSTOM",
        label: (
          <span>
            自定义模板
            <span className="ml-1">({customRecords.length})</span>
          </span>
        ),
      },
    ],
    [customRecords.length, systemRecords.length]
  );

  useEffect(() => {
    setLoading(true);

    qualityTemplateApi
      .list({
        keyword,
        dimension: dimension === "全部" ? undefined : dimension,
      })
      .then((response) => {
        setData(unwrap(response));
      })
      .catch((error) => {
        message.error(error?.message || "规则模板加载失败");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dimension, keyword]);

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    const initialWidth = collapsed ? MIN_LEFT_WIDTH : leftWidth;

    if (collapsed) {
      setCollapsed(false);
    }

    dragRef.current = {
      x: event.clientX,
      width: initialWidth,
    };

    const handlePointerMove = (currentEvent: PointerEvent) => {
      const dragData = dragRef.current;

      if (!dragData) {
        return;
      }

      const nextWidth = dragData.width + currentEvent.clientX - dragData.x;

      setLeftWidth(
        Math.min(MAX_LEFT_WIDTH, Math.max(MIN_LEFT_WIDTH, nextWidth))
      );
    };

    const handlePointerUp = () => {
      dragRef.current = null;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="flex h-[calc(100vh-64px)] min-h-[620px] flex-col overflow-hidden bg-white">
        <header className="flex h-12 shrink-0 items-center border-b border-[#e8e9ec] px-5">
          <h1 className="m-0 text-[20px] font-semibold text-[#161823]">
            规则模板库
          </h1>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside
            className="shrink-0 overflow-hidden transition-[width] duration-200"
            style={{
              width: collapsed ? 0 : leftWidth,
            }}
          >
            <div
              className="h-full overflow-y-auto px-4 py-3"
              style={{
                width: leftWidth,
              }}
            >
              <div className="mb-2 text-xs font-semibold text-[#161823]">
                质量维度
              </div>

              <div className="space-y-1">
                {dimensions.map((item) => {
                  const selected = dimension === item.label;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setDimension(item.label)}
                      className={[
                        "flex h-8 w-full cursor-pointer items-center",
                        "justify-between border-0 px-2 text-left text-[13px]",
                        "transition-colors duration-150",
                        selected
                          ? "bg-[rgba(254,44,85,.08)] font-medium text-[#fe2c55]"
                          : "bg-transparent text-[#30323b] hover:bg-[#f5f5f6]",
                      ].join(" ")}
                    >
                      <span className="truncate">{item.label}</span>

                      <span
                        className={[
                          "ml-3 min-w-7 shrink-0 rounded-full px-2",
                          "text-center text-xs leading-5",
                          selected
                            ? "bg-white text-[#fe2c55]"
                            : "bg-[#f2f3f5] text-[#5d616b]",
                        ].join(" ")}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 border-t border-[#eceef0] pt-4">
                <div className="mb-2 text-xs font-semibold text-[#161823]">
                  模板范围
                </div>

                <div className="text-xs leading-6 text-[#8a8f99]">
                  系统模板由平台统一维护，可直接关联数据质量规则。自定义模板可用于承载业务侧扩展的检查要求。
                </div>
              </div>
            </div>
          </aside>

          <div
            role="separator"
            aria-label="调整左侧区域宽度"
            onPointerDown={startResize}
            className="relative w-3 shrink-0 cursor-col-resize"
          >
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#e4e7ec]" />

            <button
              type="button"
              aria-label={collapsed ? "展开左侧区域" : "收起左侧区域"}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setCollapsed((value) => !value)}
              className={[
                "absolute left-1/2 top-1/2 z-10 flex h-8 w-4",
                "-translate-x-1/2 -translate-y-1/2 items-center justify-center",
                "cursor-pointer rounded border border-[#dfe1e5] bg-white",
                "text-[#7b808a] shadow-sm transition-colors",
                "hover:border-[#c8cbd1] hover:text-[#161823]",
              ].join(" ")}
            >
              {collapsed ? (
                <ChevronRight size={13} />
              ) : (
                <ChevronLeft size={13} />
              )}
            </button>
          </div>

          <main className="min-w-0 flex-1 overflow-hidden px-5 py-4">
            <div className="flex h-full flex-col overflow-hidden">
              <section className="shrink-0">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <h2 className="m-0 text-[15px] font-semibold leading-6 text-[#161823]">
                      {dimension}
                    </h2>

                    <div className="mt-1 max-w-[900px] text-[13px] leading-6 text-[#8a8f99]">
                      {getDimensionDescription(dimension)}
                    </div>
                  </div>

                  <Input
                    allowClear
                    variant="filled"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    prefix={
                      <Search size={14} className="shrink-0 text-[#98a2b3]" />
                    }
                    placeholder="搜索模板名称或描述"
                    className="w-[340px] shrink-0"
                  />
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <div className="inline-flex h-7 items-center rounded bg-[#f5f5f6] px-2.5 text-xs text-[#60646f]">
                    <span>维度类型：</span>
                    <span className="font-semibold text-[#30323b]">
                      系统维度
                    </span>
                  </div>

                  <div className="inline-flex h-7 items-center rounded bg-[#f5f5f6] px-2.5 text-xs text-[#60646f]">
                    <span>关联模板数：</span>
                    <span className="font-semibold text-[#30323b]">
                      {currentRecords.length}
                    </span>
                  </div>

                  <div className="inline-flex h-7 items-center rounded bg-[#f5f5f6] px-2.5 text-xs text-[#60646f]">
                    <span>关联规则数：</span>
                    <span className="font-semibold text-[#30323b]">
                      {relatedRuleCount}
                    </span>
                  </div>
                </div>

                <Tabs
                  activeKey={activeTab}
                  animated={false}
                  items={tabItems}
                  tabBarGutter={16}
                  onChange={(key) => setActiveTab(key as TemplateTabKey)}
                  className={[
                    "mt-2",
                    "[&_.ant-tabs-nav]:!mb-0",
                    "[&_.ant-tabs-nav]:before:!border-[#e8e9ec]",
                    "[&_.ant-tabs-tab]:!px-3",
                    "[&_.ant-tabs-tab]:!py-2.5",
                    "[&_.ant-tabs-tab-btn]:!text-[13px]",
                  ].join(" ")}
                />
              </section>

              <section className="min-h-0 flex-1 overflow-auto pt-3">
                <Spin spinning={loading}>
                  <Table<TemplateView>
                    rowKey="id"
                    size="small"
                    bordered
                    pagination={false}
                    scroll={{
                      x: 980,
                    }}
                    className={dataQualityTableClassName()}
                    dataSource={currentRecords}
                    locale={{
                      emptyText: (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description={
                            activeTab === "CUSTOM"
                              ? "暂无自定义模板"
                              : "暂无系统模板"
                          }
                        />
                      ),
                    }}
                    columns={[
                      {
                        title: "模板名称",
                        dataIndex: "name",
                        width: 260,
                        render: (_, record) => (
                          <div className="min-w-0 py-1">
                            <div className="truncate font-medium text-[#172033]">
                              {record.name}
                            </div>
                          </div>
                        ),
                      },
                      {
                        title: "质量维度",
                        dataIndex: "dimension",
                        width: 120,
                        render: (value) => (
                          <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[#667085]">
                            {value}
                          </Tag>
                        ),
                      },
                      {
                        title: "关联范围",
                        dataIndex: "scope",
                        width: 110,
                        render: (value) => (
                          <div
                            className="!m-0 !border-0 font-medium text-[#667085]"
                            
                          >
                            {value === "TABLE" ? "表级" : "字段级"}
                          </div>
                        ),
                      },
                      {
                        title: "关联规则数",
                        dataIndex: "ruleCount",
                        width: 120,
                        render: (value) => (
                          <span className="font-medium text-[#344054]">
                            {value}
                          </span>
                        ),
                      },
                      {
                        title: "模板描述",
                        dataIndex: "description",
                        render: (value) => (
                          <div className="line-clamp-2 leading-5 text-[#667085]">
                            {value || "--"}
                          </div>
                        ),
                      },
                    ]}
                  />
                </Spin>
              </section>
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default TemplateLibraryPage;
