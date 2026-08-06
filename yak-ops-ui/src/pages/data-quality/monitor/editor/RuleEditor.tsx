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
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { CatalogColumn, ComparisonOperator, TemplateView } from '../../types';
import { EditorSection } from './EditorLayout';
import {
  OPERATORS,
  ruleDefaults,
  type EditorRule,
} from './model';

export const validateRules = (rules: EditorRule[]) => {
  if (!rules.length) throw new Error('至少添加一条质量规则');
  rules.forEach((rule) => {
    if (!rule.name.trim()) throw new Error('规则名称不能为空');
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
  const updateRule = (key: string, values: Partial<EditorRule>) => {
    onChange(
      rules.map((rule) => (rule.key === key ? { ...rule, ...values } : rule)),
    );
  };

  return (
    <>
      <EditorSection
        id="quality-rules"
        title="选择质量规则"
        description="从规则模板添加检查项，一次运行会执行当前监控下的全部启用规则。"
        extra={
          <Button
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => setTemplateOpen(true)}
          >
            从模板添加
          </Button>
        }
      >
        {!rules.length ? (
          <div className="rounded-lg border border-dashed border-[#dfe1e5] py-14">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="尚未添加质量规则"
            >
              <Button
                type="primary"
                icon={<Plus size={14} />}
                onClick={() => setTemplateOpen(true)}
              >
                添加第一条规则
              </Button>
            </Empty>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div
                key={rule.key}
                className="rounded-lg border border-[#ebecef] bg-[#fcfcfd] p-4"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#f2f3f5] text-xs font-medium text-[#667085]">
                      {index + 1}
                    </span>
                    <Input
                      variant="filled"
                      value={rule.name}
                      maxLength={100}
                      onChange={(event) =>
                        updateRule(rule.key, { name: event.target.value })
                      }
                      className="max-w-[320px]"
                    />
                    <Tag className="!m-0 !border-[#ffd1da] !bg-[#fff4f6] !text-[var(--yak-brand-color)]">
                      {rule.dimension}
                    </Tag>
                    <Tag className="!m-0 !border-0 !bg-[#f2f3f5] !text-[#667085]">
                      {rule.scope === 'TABLE' ? '表级' : '字段级'}
                    </Tag>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      size="small"
                      checked={rule.enabled}
                      onChange={(enabled) => updateRule(rule.key, { enabled })}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<Trash2 size={14} />}
                      onClick={() =>
                        onChange(rules.filter((item) => item.key !== rule.key))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                  <div>
                    <div className="mb-1.5 text-xs font-medium text-[#667085]">
                      检查字段
                    </div>
                    <Select
                      allowClear
                      variant="filled"
                      disabled={
                        rule.scope === 'TABLE' && rule.ruleType !== 'CUSTOM_SQL'
                      }
                      value={rule.columnName}
                      placeholder={
                        rule.scope === 'COLUMN' ? '请选择字段' : '表级规则无需字段'
                      }
                      showSearch
                      optionFilterProp="label"
                      options={columns.map((column) => ({
                        value: column.name,
                        label: `${column.name}${
                          column.typeName ? ` · ${column.typeName}` : ''
                        }`,
                      }))}
                      onChange={(columnName) => updateRule(rule.key, { columnName })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 text-xs font-medium text-[#667085]">
                      规则参数
                    </div>
                    <RuleConfig rule={rule} updateRule={updateRule} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </EditorSection>

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
          scroll={{ y: 440 }}
          columns={[
            { title: '模板名称', dataIndex: 'name', width: 180 },
            { title: '质量维度', dataIndex: 'dimension', width: 100 },
            {
              title: '范围',
              dataIndex: 'scope',
              width: 90,
              render: (value) => (value === 'TABLE' ? '表级' : '字段级'),
            },
            { title: '说明', dataIndex: 'description' },
            {
              title: '操作',
              width: 80,
              render: (_, template) => (
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    onChange([...rules, ruleDefaults(template)]);
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
  updateRule: (key: string, values: Partial<EditorRule>) => void;
}) => {
  if (rule.ruleType === 'COLUMN_RANGE') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <InputNumber
          variant="filled"
          value={rule.threshold}
          placeholder="最小值"
          onChange={(threshold) =>
            updateRule(rule.key, { threshold: threshold ?? undefined })
          }
        />
        <span className="text-xs text-[#8a8f99]">至</span>
        <InputNumber
          variant="filled"
          value={rule.thresholdEnd}
          placeholder="最大值"
          onChange={(thresholdEnd) =>
            updateRule(rule.key, { thresholdEnd: thresholdEnd ?? undefined })
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
        onChange={(enumValues) => updateRule(rule.key, { enumValues })}
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
            updateRule(rule.key, { customSql: event.target.value })
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
      onChange={(operator) => updateRule(rule.key, { operator })}
      className="w-24"
    />
    <InputNumber
      variant="filled"
      value={rule.threshold}
      onChange={(threshold) =>
        updateRule(rule.key, { threshold: threshold ?? undefined })
      }
    />
    {rule.operator === 'BETWEEN' ? (
      <InputNumber
        variant="filled"
        value={rule.thresholdEnd}
        onChange={(thresholdEnd) =>
          updateRule(rule.key, { thresholdEnd: thresholdEnd ?? undefined })
        }
      />
    ) : null}
  </div>
);
