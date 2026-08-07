import type { TableColumnsType, TreeDataNode, TreeProps } from "antd";
import {
  Button,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Switch,
  Table,
  Tag,
  Tree,
  message,
} from "antd";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { Key } from "react";
import { useMemo, useState } from "react";

import { dataQualityTableClassName } from "../../components/tableStyle";
import type {
  CatalogColumn,
  ComparisonOperator,
  TemplateView,
} from "../../types";
import { EditorSection } from "./EditorLayout";
import { OPERATORS, ruleDefaults, type EditorRule } from "./model";

type TemplateTabKey = "SYSTEM" | "CUSTOM";

interface TemplateGroup {
  key: string;
  label: string;
  templates: TemplateView[];
}

const isSystemTemplate = (template: TemplateView) =>
  template.builtin || template.source === "SYSTEM";

const normalizeText = (value?: string) => (value || "").trim().toLowerCase();

export const validateRules = (rules: EditorRule[]) => {
  if (!rules.length) throw new Error("至少添加一条质量规则");

  rules.forEach((rule) => {
    if (!rule.name.trim()) {
      throw new Error("规则名称不能为空");
    }

    if (rule.scope === "COLUMN" && !rule.columnName) {
      throw new Error(`${rule.name} 需要选择字段`);
    }

    if (
      rule.ruleType === "COLUMN_RANGE" &&
      (rule.threshold === undefined || rule.thresholdEnd === undefined)
    ) {
      throw new Error(`${rule.name} 需要填写最小值和最大值`);
    }

    if (rule.ruleType === "COLUMN_ENUM" && !rule.enumValues?.length) {
      throw new Error(`${rule.name} 至少填写一个枚举值`);
    }

    if (rule.ruleType === "CUSTOM_SQL" && !rule.customSql?.trim()) {
      throw new Error(`${rule.name} 需要填写 SQL`);
    }
  });
};

export const QualityRuleEditor = ({
  rules,
  onChange,
  columns,
  templates,
}: {
  rules: EditorRule[];
  onChange: (rules: EditorRule[]) => void;
  columns: CatalogColumn[];
  templates: TemplateView[];
}) => {
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateTab, setTemplateTab] = useState<TemplateTabKey>("SYSTEM");
  const [templateKeyword, setTemplateKeyword] = useState("");
  const [draftRules, setDraftRules] = useState<EditorRule[]>([]);
  const [expandedTemplateKeys, setExpandedTemplateKeys] = useState<Key[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const editingRule = useMemo(
    () => rules.find((rule) => rule.key === editingKey),
    [editingKey, rules]
  );

  const templateMap = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates]
  );

  const systemTemplateCount = useMemo(
    () => templates.filter(isSystemTemplate).length,
    [templates]
  );

  const customTemplateCount = templates.length - systemTemplateCount;

  const templateGroups = useMemo<TemplateGroup[]>(() => {
    const keyword = normalizeText(templateKeyword);
    const filtered = templates.filter((template) => {
      const matchesTab =
        templateTab === "SYSTEM"
          ? isSystemTemplate(template)
          : !isSystemTemplate(template);
      if (!matchesTab) return false;
      if (!keyword) return true;
      return [
        template.name,
        template.code,
        template.description,
        template.dimension,
        template.folderName,
      ].some((value) => normalizeText(value).includes(keyword));
    });

    const grouped = new Map<string, TemplateView[]>();
    filtered.forEach((template) => {
      const groupName =
        templateTab === "SYSTEM"
          ? template.dimension || "其他"
          : template.folderName || template.dimension || "未分类";
      const items = grouped.get(groupName) || [];
      items.push(template);
      grouped.set(groupName, items);
    });

    return Array.from(grouped.entries())
      .map(([label, values]) => ({
        key: `${templateTab}:${label}`,
        label,
        templates: values.sort(
          (left, right) =>
            left.sortOrder - right.sortOrder ||
            left.name.localeCompare(right.name)
        ),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [templateKeyword, templateTab, templates]);

  const selectedTemplateCounts = useMemo(() => {
    const counts = new Map<number, number>();
    draftRules.forEach((rule) => {
      counts.set(rule.templateId, (counts.get(rule.templateId) || 0) + 1);
    });
    return counts;
  }, [draftRules]);

  const templateTreeData = useMemo<TreeDataNode[]>(
    () =>
      templateGroups.map((group) => ({
        key: `group:${group.key}`,
        selectable: false,
        title: (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Folder
              size={14}
              strokeWidth={1.6}
              className="shrink-0 fill-[#dce8ff] text-[#b8cef8]"
            />
            <span className="min-w-0 truncate text-[12px] text-[#30323b]">
              {group.label}
            </span>
            <span className="shrink-0 text-[11px] text-[#8a8f99]">
              ({group.templates.length})
            </span>
          </div>
        ),
        children: group.templates.map((template) => {
          const selectedCount = selectedTemplateCounts.get(template.id) || 0;

          return {
            key: `template:${template.id}`,
            isLeaf: true,
            title: (
              <div className="group flex min-w-0 flex-1 items-center gap-2">
                <FileText
                  size={13}
                  strokeWidth={1.7}
                  className="shrink-0 text-[#aeb4be] transition-colors group-hover:text-[var(--yak-brand-color)]"
                />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] leading-5 text-[#30323b]">
                    {template.name}
                  </span>
                  {template.code ? (
                    <span className="block truncate text-[10px] leading-4 text-[#a1a5ad]">
                      {template.code}
                    </span>
                  ) : null}
                </span>

                {selectedCount ? (
                  <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(254,44,85,.08)] px-1.5 text-[10px] font-medium text-[var(--yak-brand-color)]">
                    {selectedCount}
                  </span>
                ) : (
                  <Plus
                    size={12}
                    className="shrink-0 text-[#b0b4bb] opacity-0 transition-opacity group-hover:opacity-100"
                  />
                )}
              </div>
            ),
          };
        }),
      })),
    [selectedTemplateCounts, templateGroups]
  );

  const visibleExpandedTemplateKeys = useMemo<Key[]>(() => {
    if (!templateKeyword.trim()) return expandedTemplateKeys;
    return templateGroups.map((group) => `group:${group.key}`);
  }, [expandedTemplateKeys, templateGroups, templateKeyword]);

  const handleTemplateTreeSelect: TreeProps["onSelect"] = (_, info) => {
    const nodeKey = String(info.node.key);
    if (!nodeKey.startsWith("template:")) return;

    const templateId = Number(nodeKey.slice("template:".length));
    const template = templateMap.get(templateId);
    if (template) addTemplate(template);
  };

  const updateRule = (key: string, values: Partial<EditorRule>) => {
    onChange(
      rules.map((rule) =>
        rule.key === key
          ? {
              ...rule,
              ...values,
            }
          : rule
      )
    );
  };

  const updateDraftRule = (key: string, values: Partial<EditorRule>) => {
    setDraftRules((current) =>
      current.map((rule) =>
        rule.key === key
          ? {
              ...rule,
              ...values,
            }
          : rule
      )
    );
  };

  const removeRule = (key: string) => {
    onChange(rules.filter((rule) => rule.key !== key));

    setSelectedRowKeys((keys) =>
      keys.filter((selectedKey) => selectedKey !== key)
    );
  };

  const handleEdit = (rule: EditorRule) => {
    setEditingKey(rule.key);
    setEditOpen(true);
  };

  const openTemplateDrawer = () => {
    setDraftRules([]);
    setTemplateKeyword("");
    setTemplateTab("SYSTEM");
    setTemplateOpen(true);
  };

  const closeTemplateDrawer = () => {
    setTemplateOpen(false);
    setDraftRules([]);
    setTemplateKeyword("");
  };

  const addTemplate = (template: TemplateView) => {
    setDraftRules((current) => [...current, ruleDefaults(template)]);
  };

  const confirmDraftRules = () => {
    try {
      validateRules(draftRules);
      onChange([...rules, ...draftRules]);
      closeTemplateDrawer();
    } catch (error: any) {
      message.warning(error?.message || "请完善规则配置");
    }
  };

  const operatorLabel = (operator?: ComparisonOperator) => {
    if (!operator) return "--";

    return (
      OPERATORS.find((item) => item.value === operator)?.label ??
      String(operator)
    );
  };

  const renderRuleTemplate = (rule: EditorRule) => {
    switch (rule.ruleType) {
      case "TABLE_ROW_COUNT":
        return "表行数";
      case "COLUMN_NOT_NULL":
        return "字段非空";
      case "COLUMN_UNIQUE":
        return "字段唯一";
      case "COLUMN_RANGE":
        return "字段范围";
      case "COLUMN_ENUM":
        return "字段枚举";
      case "CUSTOM_SQL":
        return "自定义 SQL";
      default:
        return rule.ruleType || "--";
    }
  };

  const renderThreshold = (rule: EditorRule) => {
    if (rule.ruleType === "COLUMN_RANGE") {
      return (
        <div className="leading-5">
          <div className="text-[#344054]">字段值范围</div>
          <div className="mt-0.5 text-xs text-[#667085]">
            {rule.threshold ?? "--"} 至 {rule.thresholdEnd ?? "--"}
          </div>
        </div>
      );
    }

    if (rule.ruleType === "COLUMN_ENUM") {
      return (
        <div className="leading-5">
          <div className="text-[#344054]">允许枚举值</div>
          <div className="mt-0.5 max-w-[280px] truncate text-xs text-[#667085]">
            {rule.enumValues?.length ? rule.enumValues.join("、") : "--"}
          </div>
        </div>
      );
    }

    return (
      <div className="leading-5">
        <div className="text-[#344054]">监控阈值</div>

        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#667085]">
          <span className="inline-block h-2 w-2 rounded-full bg-[#d92d20]" />

          <span>
            {operatorLabel(rule.operator)}
            {rule.threshold !== undefined ? ` ${rule.threshold}` : ""}
          </span>

          {rule.operator === "BETWEEN" && rule.thresholdEnd !== undefined ? (
            <>
              <span className="text-[#98a2b3]">~</span>
              <span>{rule.thresholdEnd}</span>
            </>
          ) : null}
        </div>
      </div>
    );
  };

  const tableColumns: TableColumnsType<EditorRule> = [
    {
      title: "ID / 规则名称",
      dataIndex: "name",
      width: 260,
      render: (_, rule) => (
        <div className="min-w-0 py-0.5">
          <div className="truncate font-medium text-[#172033]">
            {rule.name || "未命名规则"}
          </div>

          <div className="mt-1 truncate text-[11px] text-[#98a2b3]">
            {rule.key}
          </div>
        </div>
      ),
    },
    {
      title: "关联范围",
      dataIndex: "scope",
      width: 110,
      render: (value) => (
        <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[#667085]">
          {value === "TABLE" ? "表级" : "字段级"}
        </Tag>
      ),
    },
    {
      title: "检查字段",
      dataIndex: "columnName",
      width: 160,
      render: (value, rule) => {
        if (rule.scope === "TABLE" && !value) {
          return <span className="text-[#98a2b3]">整表</span>;
        }

        return value || <span className="text-[#98a2b3]">--</span>;
      },
    },
    {
      title: "规则模板",
      dataIndex: "ruleType",
      width: 150,
      render: (_, rule) => (
        <span className="text-[#344054]">{renderRuleTemplate(rule)}</span>
      ),
    },
    {
      title: "监控阈值",
      width: 260,
      render: (_, rule) => renderThreshold(rule),
    },
    {
      title: "维度",
      dataIndex: "dimension",
      width: 120,
      render: (value) => (
        <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[#475467]">
          {value || "--"}
        </Tag>
      ),
    },
    {
      title: "启用状态",
      dataIndex: "enabled",
      width: 110,
      render: (_, rule) => (
        <div className="flex items-center gap-2">
          <Switch
            size="small"
            checked={rule.enabled}
            onChange={(enabled) =>
              updateRule(rule.key, {
                enabled,
              })
            }
          />

          <span className={rule.enabled ? "text-[#344054]" : "text-[#98a2b3]"}>
            {rule.enabled ? "启用" : "停用"}
          </span>
        </div>
      ),
    },
    {
      title: "操作项",
      fixed: "right",
      width: 120,
      render: (_, rule) => (
        <div className="flex items-center gap-1">
          <Button
            type="link"
            size="small"
            className="!px-1"
            onClick={() => handleEdit(rule)}
          >
            修改
          </Button>

          <Button
            type="link"
            size="small"
            danger
            className="!px-1"
            onClick={() => removeRule(rule.key)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <EditorSection id="quality-rules" title="选择质量规则">
        <div>
          <div className="mb-2 flex min-h-8 flex-wrap items-center gap-2">
            <Button
              size="small"
              color={"primary"}
              variant="filled"
              className={["!h-7 !rounded-md !px-2.5 !text-xs"].join(" ")}
              onClick={openTemplateDrawer}
            >
              添加规则
            </Button>

            <Button
              size="small"
              color="default"
              variant="filled"
              className="!h-7 !rounded-md !px-2.5 !text-xs"
              onClick={openTemplateDrawer}
            >
              添加已有规则
            </Button>

            <span className="ml-2 text-xs font-medium text-[#344054]">
              已选择
              <span className="mx-0.5">{selectedRowKeys.length}</span>条
            </span>
          </div>

          <Table<EditorRule>
            rowKey="key"
            size="small"
            pagination={false}
            dataSource={rules}
            columns={tableColumns}
            className={dataQualityTableClassName()}
            scroll={{
              x: 1350,
            }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              columnWidth: 46,
            }}
            locale={{
              emptyText: (
                <div className="py-10">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无质量规则"
                  >
                    <Button
                      type="primary"
                      size="small"
                      icon={<Plus size={14} />}
                      onClick={openTemplateDrawer}
                    >
                      添加规则
                    </Button>
                  </Empty>
                </div>
              ),
            }}
          />
        </div>
      </EditorSection>

      <Modal
        width={680}
        title="修改质量规则"
        open={editOpen}
        destroyOnClose
        okText="确定"
        cancelText="取消"
        onCancel={() => {
          setEditOpen(false);
          setEditingKey(undefined);
        }}
        onOk={() => {
          setEditOpen(false);
          setEditingKey(undefined);
        }}
      >
        {editingRule ? (
          <div className="pt-2">
            <RuleFields
              rule={editingRule}
              template={templateMap.get(editingRule.templateId)}
              columns={columns}
              updateRule={updateRule}
            />
          </div>
        ) : null}
      </Modal>

      <Drawer
        title="从规则模板添加"
        placement="right"
        width="min(1120px, calc(100vw - 80px))"
        open={templateOpen}
        destroyOnClose
        onClose={closeTemplateDrawer}
        styles={{
          header: {
            minHeight: 52,
            padding: "0 20px",
            borderBottom: "1px solid #e8e9ec",
          },
          body: { padding: 0 },
          footer: { padding: "12px 20px" },
        }}
        footer={
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-[#8a8f99]">
              已选择 {draftRules.length} 条规则
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={closeTemplateDrawer}>取消</Button>
              <Button
                type="primary"
                disabled={!draftRules.length}
                onClick={confirmDraftRules}
              >
                确定添加{draftRules.length ? ` (${draftRules.length})` : ""}
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex h-full min-h-0 bg-white">
          <aside className="flex w-[300px] shrink-0 flex-col border-r border-[#e8e9ec] bg-white">
            <div className="shrink-0 border-b border-[#f0f1f3] px-3 pb-3 pt-3">
              <Segmented
                block
                size="small"
                value={templateTab}
                onChange={(value) => {
                  setTemplateTab(value as TemplateTabKey);
                  setExpandedTemplateKeys([]);
                }}
                options={[
                  {
                    value: "SYSTEM",
                    label: `系统模板 (${systemTemplateCount})`,
                  },
                  {
                    value: "CUSTOM",
                    label: `自定义模板 (${customTemplateCount})`,
                  },
                ]}
                className="!bg-[#f5f5f6] !p-[2px] [&_.ant-segmented-item]:!rounded-[3px] [&_.ant-segmented-item-label]:!min-h-[26px] [&_.ant-segmented-item-label]:!px-2 [&_.ant-segmented-item-label]:!text-[12px] [&_.ant-segmented-item-label]:!leading-[26px] [&_.ant-segmented-item-selected]:!shadow-none [&_.ant-segmented-item-selected]:!text-[var(--yak-brand-color)]"
              />

              <Input
                allowClear
                size="small"
                variant="filled"
                value={templateKeyword}
                prefix={<Search size={13} className="text-[#98a2b3]" />}
                placeholder="搜索模板名称、编码或描述"
                onChange={(event) => setTemplateKeyword(event.target.value)}
                className="mt-2.5"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-2">
              {templateTreeData.length ? (
                <Tree
                  blockNode
                  treeData={templateTreeData}
                  selectedKeys={[]}
                  expandedKeys={visibleExpandedTemplateKeys}
                  onExpand={(keys) => setExpandedTemplateKeys(keys as Key[])}
                  onSelect={handleTemplateTreeSelect}
                  switcherIcon={({ expanded }) =>
                    expanded ? (
                      <ChevronDown size={13} className="text-[#98a2b3]" />
                    ) : (
                      <ChevronRight size={13} className="text-[#98a2b3]" />
                    )
                  }
                  className="
                    !bg-transparent
                    [&_.ant-tree-list-holder-inner]:!gap-0
                    [&_.ant-tree-treenode]:!w-full
                    [&_.ant-tree-treenode]:!items-start
                    [&_.ant-tree-treenode]:!py-[1px]
                    [&_.ant-tree-switcher]:!flex
                    [&_.ant-tree-switcher]:!h-[30px]
                    [&_.ant-tree-switcher]:!w-[20px]
                    [&_.ant-tree-switcher]:!shrink-0
                    [&_.ant-tree-switcher]:!items-center
                    [&_.ant-tree-switcher]:!justify-center
                    [&_.ant-tree-switcher-noop]:!opacity-0
                    [&_.ant-tree-node-content-wrapper]:!flex
                    [&_.ant-tree-node-content-wrapper]:!min-h-[30px]
                    [&_.ant-tree-node-content-wrapper]:!min-w-0
                    [&_.ant-tree-node-content-wrapper]:!flex-1
                    [&_.ant-tree-node-content-wrapper]:!items-center
                    [&_.ant-tree-node-content-wrapper]:!rounded-[4px]
                    [&_.ant-tree-node-content-wrapper]:!px-1.5
                    [&_.ant-tree-node-content-wrapper]:!py-0
                    [&_.ant-tree-node-content-wrapper:hover]:!bg-[#f3f4f6]
                    [&_.ant-tree-node-content-wrapper.ant-tree-node-selected]:!bg-transparent
                    [&_.ant-tree-title]:!min-w-0
                    [&_.ant-tree-title]:!flex-1
                  "
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="没有匹配的规则模板"
                  className="mt-16"
                />
              )}
            </div>
          </aside>

          <main className="min-w-0 flex-1 overflow-y-auto bg-white">
            <div className="sticky top-0 z-10 flex h-[52px] items-center justify-between border-b border-[#eef0f2] bg-white px-5">
              <div>
                <span className="text-[13px] font-semibold text-[#161823]">
                  已选择规则
                </span>
                <span className="ml-2 text-xs text-[#98a2b3]">
                  点击左侧模板可连续添加，多次点击同一模板可配置不同字段
                </span>
              </div>
              <span className="text-xs text-[#667085]">
                共 {draftRules.length} 条
              </span>
            </div>

            {draftRules.length ? (
              <div className="space-y-3 p-4">
                {draftRules.map((rule, index) => {
                  const template = templateMap.get(rule.templateId);
                  return (
                    <section
                      key={rule.key}
                      className="overflow-hidden rounded-lg border border-[#e4e7ec] bg-white"
                    >
                      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-[#eef0f2] bg-[#fafafa] px-4 py-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#161823]">
                              规则 {index + 1}
                            </span>
                            <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[#667085]">
                              {rule.dimension || "--"}
                            </Tag>
                            <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[#667085]">
                              {rule.scope === "TABLE" ? "表级" : "字段级"}
                            </Tag>
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-[#98a2b3]">
                            {template?.name || renderRuleTemplate(rule)} ·{" "}
                            {template?.code || rule.templateCode}
                          </div>
                        </div>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<Trash2 size={14} />}
                          onClick={() =>
                            setDraftRules((current) =>
                              current.filter((item) => item.key !== rule.key)
                            )
                          }
                        >
                          删除
                        </Button>
                      </header>

                      <div className="p-4">
                        <RuleFields
                          rule={rule}
                          template={template}
                          columns={columns}
                          updateRule={updateDraftRule}
                        />
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[460px] items-center justify-center px-8">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div className="text-center">
                      <div className="text-[13px] text-[#667085]">
                        从左侧规则模板库选择规则
                      </div>
                      <div className="mt-1 text-xs text-[#98a2b3]">
                        选择后可在这里配置字段、阈值和启用状态
                      </div>
                    </div>
                  }
                />
              </div>
            )}
          </main>
        </div>
      </Drawer>
    </>
  );
};

const RuleFields = ({
  rule,
  template,
  columns,
  updateRule,
}: {
  rule: EditorRule;
  template?: TemplateView;
  columns: CatalogColumn[];
  updateRule: (key: string, values: Partial<EditorRule>) => void;
}) => (
  <div className="grid grid-cols-1 gap-x-5 gap-y-4 lg:grid-cols-2">
    <div>
      <div className="mb-1.5 text-xs font-medium text-[#475467]">
        <span className="mr-1 text-[var(--yak-brand-color)]">*</span>
        规则名称
      </div>
      <Input
        variant="filled"
        value={rule.name}
        maxLength={100}
        onChange={(event) =>
          updateRule(rule.key, {
            name: event.target.value,
          })
        }
      />
    </div>

    <div>
      <div className="mb-1.5 text-xs font-medium text-[#475467]">规则模板</div>
      <Input
        variant="filled"
        bordered={false}
        disabled
        value={template?.name || rule.templateCode || rule.ruleType}
      />
    </div>

    <div>
      <div className="mb-1.5 text-xs font-medium text-[#475467]">
        {rule.scope === "COLUMN" ? (
          <span className="mr-1 text-[var(--yak-brand-color)]">*</span>
        ) : null}
        检查字段
      </div>
      <Select
        allowClear
        variant="filled"
        disabled={rule.scope === "TABLE" && rule.ruleType !== "CUSTOM_SQL"}
        value={rule.columnName}
        placeholder={
          rule.scope === "COLUMN" ? "请选择字段" : "表级规则无需字段"
        }
        showSearch
        optionFilterProp="label"
        options={columns.map((column) => ({
          value: column.name,
          label: `${column.name}${
            column.typeName ? ` · ${column.typeName}` : ""
          }`,
        }))}
        onChange={(columnName) =>
          updateRule(rule.key, {
            columnName,
          })
        }
        className="w-full"
      />
    </div>

    <div>
      <div className="mb-1.5 text-xs font-medium text-[#475467]">启用状态</div>
      <div className="flex h-8 items-center gap-2">
        <Switch
          size="small"
          checked={rule.enabled}
          onChange={(enabled) =>
            updateRule(rule.key, {
              enabled,
            })
          }
        />
        <span className="text-xs text-[#667085]">
          {rule.enabled ? "启用" : "停用"}
        </span>
      </div>
    </div>

    <div className="lg:col-span-2">
      <div className="mb-1.5 text-xs font-medium text-[#475467]">规则参数</div>
      <RuleConfig rule={rule} updateRule={updateRule} />
    </div>

    <div className="lg:col-span-2">
      <div className="mb-1.5 text-xs font-medium text-[#475467]">模板说明</div>
      <div className="min-h-10 rounded-md bg-[#f7f8fa] px-3 py-2 text-xs leading-5 text-[#667085]">
        {template?.description || "暂无说明"}
      </div>
    </div>
  </div>
);

const RuleConfig = ({
  rule,
  updateRule,
}: {
  rule: EditorRule;
  updateRule: (key: string, values: Partial<EditorRule>) => void;
}) => {
  if (rule.ruleType === "COLUMN_RANGE") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <InputNumber
          variant="filled"
          value={rule.threshold}
          placeholder="最小值"
          onChange={(threshold) =>
            updateRule(rule.key, {
              threshold: threshold ?? undefined,
            })
          }
        />

        <span className="text-xs text-[#8a8f99]">至</span>

        <InputNumber
          variant="filled"
          value={rule.thresholdEnd}
          placeholder="最大值"
          onChange={(thresholdEnd) =>
            updateRule(rule.key, {
              thresholdEnd: thresholdEnd ?? undefined,
            })
          }
        />
      </div>
    );
  }

  if (rule.ruleType === "COLUMN_ENUM") {
    return (
      <Select
        mode="tags"
        variant="filled"
        value={rule.enumValues}
        placeholder="输入允许值，回车确认"
        onChange={(enumValues) =>
          updateRule(rule.key, {
            enumValues,
          })
        }
        className="w-full"
      />
    );
  }

  if (rule.ruleType === "CUSTOM_SQL") {
    return (
      <div className="space-y-2">
        <Input.TextArea
          variant="filled"
          rows={4}
          value={rule.customSql}
          placeholder="返回首行首列数值，可使用 ${table}、${column}、${where}"
          onChange={(event) =>
            updateRule(rule.key, {
              customSql: event.target.value,
            })
          }
        />

        <RuleThreshold rule={rule} updateRule={updateRule} />
      </div>
    );
  }

  return <RuleThreshold rule={rule} updateRule={updateRule} />;
};

const RuleThreshold = ({
  rule,
  updateRule,
}: {
  rule: EditorRule;
  updateRule: (key: string, values: Partial<EditorRule>) => void;
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <Select<ComparisonOperator>
      variant="filled"
      value={rule.operator}
      options={OPERATORS}
      onChange={(operator) =>
        updateRule(rule.key, {
          operator,
        })
      }
      className="w-28"
    />

    <InputNumber
      variant="filled"
      value={rule.threshold}
      onChange={(threshold) =>
        updateRule(rule.key, {
          threshold: threshold ?? undefined,
        })
      }
    />

    {rule.operator === "BETWEEN" ? (
      <InputNumber
        variant="filled"
        value={rule.thresholdEnd}
        onChange={(thresholdEnd) =>
          updateRule(rule.key, {
            thresholdEnd: thresholdEnd ?? undefined,
          })
        }
      />
    ) : null}
  </div>
);
