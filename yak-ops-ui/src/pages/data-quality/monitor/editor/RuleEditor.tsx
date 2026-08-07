import {
  Button,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Table,
  Tag,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { dataQualityTableClassName } from '../../components/tableStyle';
import type {
  CatalogColumn,
  ComparisonOperator,
  TemplateView,
} from '../../types';
import { EditorSection } from './EditorLayout';
import { OPERATORS, ruleDefaults, type EditorRule } from './model';

export const validateRules = (rules: EditorRule[]) => {
  if (!rules.length) throw new Error('至少添加一条质量规则');

  rules.forEach((rule) => {
    if (!rule.name.trim()) {
      throw new Error('规则名称不能为空');
    }

    if (rule.scope === 'COLUMN' && !rule.columnName) {
      throw new Error(`${rule.name} 需要选择字段`);
    }

    if (
      rule.ruleType === 'COLUMN_RANGE' &&
      (rule.threshold === undefined || rule.thresholdEnd === undefined)
    ) {
      throw new Error(`${rule.name} 需要填写最小值和最大值`);
    }

    if (rule.ruleType === 'COLUMN_ENUM' && !rule.enumValues?.length) {
      throw new Error(`${rule.name} 至少填写一个枚举值`);
    }

    if (rule.ruleType === 'CUSTOM_SQL' && !rule.customSql?.trim()) {
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
  const [editOpen, setEditOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const editingRule = useMemo(
    () => rules.find((rule) => rule.key === editingKey),
    [editingKey, rules],
  );

  const updateRule = (key: string, values: Partial<EditorRule>) => {
    onChange(
      rules.map((rule) =>
        rule.key === key
          ? {
              ...rule,
              ...values,
            }
          : rule,
      ),
    );
  };

  const removeRule = (key: string) => {
    onChange(rules.filter((rule) => rule.key !== key));

    setSelectedRowKeys((keys) =>
      keys.filter((selectedKey) => selectedKey !== key),
    );
  };

  const handleEdit = (rule: EditorRule) => {
    setEditingKey(rule.key);
    setEditOpen(true);
  };

  const operatorLabel = (operator?: ComparisonOperator) => {
    if (!operator) return '--';

    return (
      OPERATORS.find((item) => item.value === operator)?.label ??
      String(operator)
    );
  };

  const renderRuleTemplate = (rule: EditorRule) => {
    switch (rule.ruleType) {
      case 'COLUMN_RANGE':
        return '字段范围';
      case 'COLUMN_ENUM':
        return '字段枚举';
      case 'CUSTOM_SQL':
        return '自定义 SQL';
      default:
        return rule.ruleType || '--';
    }
  };

  const renderThreshold = (rule: EditorRule) => {
    if (rule.ruleType === 'COLUMN_RANGE') {
      return (
        <div className="leading-5">
          <div className="text-[#344054]">字段值范围</div>
          <div className="mt-0.5 text-xs text-[#667085]">
            {rule.threshold ?? '--'} 至 {rule.thresholdEnd ?? '--'}
          </div>
        </div>
      );
    }

    if (rule.ruleType === 'COLUMN_ENUM') {
      return (
        <div className="leading-5">
          <div className="text-[#344054]">允许枚举值</div>
          <div className="mt-0.5 max-w-[280px] truncate text-xs text-[#667085]">
            {rule.enumValues?.length ? rule.enumValues.join('、') : '--'}
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
            {rule.threshold !== undefined ? ` ${rule.threshold}` : ''}
          </span>

          {rule.operator === 'BETWEEN' &&
          rule.thresholdEnd !== undefined ? (
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
      title: 'ID / 规则名称',
      dataIndex: 'name',
      width: 260,
      render: (_, rule) => (
        <div className="min-w-0 py-0.5">
          <div className="truncate font-medium text-[#172033]">
            {rule.name || '未命名规则'}
          </div>

          <div className="mt-1 truncate text-[11px] text-[#98a2b3]">
            {rule.key}
          </div>
        </div>
      ),
    },
    {
      title: '关联范围',
      dataIndex: 'scope',
      width: 110,
      render: (value) => (
        <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[#667085]">
          {value === 'TABLE' ? '表级' : '字段级'}
        </Tag>
      ),
    },
    {
      title: '检查字段',
      dataIndex: 'columnName',
      width: 160,
      render: (value, rule) => {
        if (rule.scope === 'TABLE' && !value) {
          return <span className="text-[#98a2b3]">整表</span>;
        }

        return value || <span className="text-[#98a2b3]">--</span>;
      },
    },
    {
      title: '规则模板',
      dataIndex: 'ruleType',
      width: 150,
      render: (_, rule) => (
        <span className="text-[#344054]">{renderRuleTemplate(rule)}</span>
      ),
    },
    {
      title: '监控阈值',
      width: 260,
      render: (_, rule) => renderThreshold(rule),
    },
    {
      title: '维度',
      dataIndex: 'dimension',
      width: 120,
      render: (value) => (
        <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[#475467]">
          {value || '--'}
        </Tag>
      ),
    },
    {
      title: '启用状态',
      dataIndex: 'enabled',
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

          <span
            className={
              rule.enabled
                ? 'text-[#344054]'
                : 'text-[#98a2b3]'
            }
          >
            {rule.enabled ? '启用' : '停用'}
          </span>
        </div>
      ),
    },
    {
      title: '操作项',
      fixed: 'right',
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
      <EditorSection
        id="quality-rules"
        title="选择质量规则"
      >
        <div>
          {/* 顶部操作区域 */}
          <div className="mb-2 flex min-h-8 flex-wrap items-center gap-2">
            <Button
              type="primary"
              size="small"
              icon={<Plus size={14} />}
              onClick={() => setTemplateOpen(true)}
            >
              添加规则
            </Button>

            <Button
              size="small"
              onClick={() => setTemplateOpen(true)}
            >
              添加已有规则
            </Button>

            <span className="ml-2 text-xs font-medium text-[#344054]">
              已选择
              <span className="mx-0.5">
                {selectedRowKeys.length}
              </span>
              条
            </span>
          </div>

          {/* 规则 Table */}
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
                      onClick={() => setTemplateOpen(true)}
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

      {/* 修改规则 */}
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
          <div className="space-y-5 pt-2">
            <div>
              <div className="mb-1.5 text-xs font-medium text-[#475467]">
                规则名称
              </div>

              <Input
                variant="filled"
                value={editingRule.name}
                maxLength={100}
                onChange={(event) =>
                  updateRule(editingRule.key, {
                    name: event.target.value,
                  })
                }
              />
            </div>

            <div>
              <div className="mb-1.5 text-xs font-medium text-[#475467]">
                检查字段
              </div>

              <Select
                allowClear
                variant="filled"
                disabled={
                  editingRule.scope === 'TABLE' &&
                  editingRule.ruleType !== 'CUSTOM_SQL'
                }
                value={editingRule.columnName}
                placeholder={
                  editingRule.scope === 'COLUMN'
                    ? '请选择字段'
                    : '表级规则无需字段'
                }
                showSearch
                optionFilterProp="label"
                options={columns.map((column) => ({
                  value: column.name,
                  label: `${column.name}${
                    column.typeName
                      ? ` · ${column.typeName}`
                      : ''
                  }`,
                }))}
                onChange={(columnName) =>
                  updateRule(editingRule.key, {
                    columnName,
                  })
                }
                className="w-full"
              />
            </div>

            <div>
              <div className="mb-1.5 text-xs font-medium text-[#475467]">
                规则参数
              </div>

              <RuleConfig
                rule={editingRule}
                updateRule={updateRule}
              />
            </div>
          </div>
        ) : null}
      </Modal>

      {/* 选择已有模板 */}
      <Modal
        width={820}
        title="选择规则模板"
        open={templateOpen}
        footer={null}
        onCancel={() => setTemplateOpen(false)}
        destroyOnClose
      >
        <Table<TemplateView>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={templates}
          scroll={{
            y: 440,
          }}
          className={dataQualityTableClassName()}
          columns={[
            {
              title: '模板名称 / 编码',
              dataIndex: 'name',
              width: 220,
              render: (_, template) => (
                <div className="min-w-0 py-0.5">
                  <div className="truncate font-medium text-[#172033]">
                    {template.name}
                  </div>

                  <div className="mt-1 truncate text-[11px] text-[#98a2b3]">
                    {template.code}
                  </div>
                </div>
              ),
            },
            {
              title: '质量维度',
              dataIndex: 'dimension',
              width: 110,
              render: (value) => (
                <Tag className="!m-0 !border-0 !bg-[#f2f4f7] !text-[#667085]">
                  {value}
                </Tag>
              ),
            },
            {
              title: '关联范围',
              dataIndex: 'scope',
              width: 100,
              render: (value) =>
                value === 'TABLE' ? '表级' : '字段级',
            },
            {
              title: '模板说明',
              dataIndex: 'description',
              render: (value) => (
                <div className="line-clamp-2 leading-5 text-[#667085]">
                  {value || '--'}
                </div>
              ),
            },
            {
              title: '操作',
              fixed: 'right',
              width: 80,
              render: (_, template) => (
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    onChange([
                      ...rules,
                      ruleDefaults(template),
                    ]);

                    setTemplateOpen(false);
                  }}
                >
                  添加
                </Button>
              ),
            },
          ]}
        />
      </Modal>
    </>
  );
};

const RuleConfig = ({
  rule,
  updateRule,
}: {
  rule: EditorRule;
  updateRule: (
    key: string,
    values: Partial<EditorRule>,
  ) => void;
}) => {
  if (rule.ruleType === 'COLUMN_RANGE') {
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

        <span className="text-xs text-[#8a8f99]">
          至
        </span>

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

  if (rule.ruleType === 'COLUMN_ENUM') {
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

  if (rule.ruleType === 'CUSTOM_SQL') {
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

        <RuleThreshold
          rule={rule}
          updateRule={updateRule}
        />
      </div>
    );
  }

  return (
    <RuleThreshold
      rule={rule}
      updateRule={updateRule}
    />
  );
};

const RuleThreshold = ({
  rule,
  updateRule,
}: {
  rule: EditorRule;
  updateRule: (
    key: string,
    values: Partial<EditorRule>,
  ) => void;
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

    {rule.operator === 'BETWEEN' ? (
      <InputNumber
        variant="filled"
        value={rule.thresholdEnd}
        onChange={(thresholdEnd) =>
          updateRule(rule.key, {
            thresholdEnd:
              thresholdEnd ?? undefined,
          })
        }
      />
    ) : null}
  </div>
);