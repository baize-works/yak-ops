import {
  CodeOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  Button,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Switch,
} from 'antd';
import { useEffect, useMemo, type ReactNode } from 'react';
import {
  COLUMN_OPTIONS,
  DATABASE_OPTIONS,
  DATA_SOURCE_OPTIONS,
  QUALITY_RULE_TYPE_META,
  TABLE_OPTIONS,
} from '../mock';
import type {
  QualityOperator,
  QualityRule,
  QualityRuleFormValues,
  QualityRuleType,
  QualityTriggerType,
} from '../types';

interface QualityRuleDrawerProps {
  open: boolean;
  record?: QualityRule;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: QualityRuleFormValues) => void;
}

const DEFAULT_VALUES: QualityRuleFormValues = {
  name: '',
  importance: 'NORMAL',
  dataSourceId: 'ds-mysql-prod',
  databaseName: 'yak_ops',
  tableName: 'user_info',
  ruleType: 'TABLE_ROW_COUNT',
  operator: '>',
  threshold: 0,
  scheduleMode: 'MANUAL',
  schedulePreset: 'DAILY_0200',
  enabled: true,
};

const ruleTypeOptions = Object.entries(QUALITY_RULE_TYPE_META).map(
  ([value, meta]) => ({
    value: value as QualityRuleType,
    label: `${meta.label} · ${meta.dimension}`,
  }),
);

const operatorOptions: Array<{ label: string; value: QualityOperator }> = [
  { label: '大于 >', value: '>' },
  { label: '大于等于 >=', value: '>=' },
  { label: '等于 =', value: '=' },
  { label: '小于等于 <=', value: '<=' },
  { label: '小于 <', value: '<' },
  { label: '区间 BETWEEN', value: 'BETWEEN' },
];

const scheduleOptions = [
  { label: '每小时', value: 'HOURLY' },
  { label: '每天 02:00', value: 'DAILY_0200' },
  { label: '每天 03:00', value: 'DAILY_0300' },
  { label: '每 30 分钟', value: 'EVERY_30_MINUTES' },
  { label: '自定义 Cron', value: 'CUSTOM' },
];

const toFormValues = (record?: QualityRule): QualityRuleFormValues => {
  if (!record) return DEFAULT_VALUES;
  return {
    name: record.name,
    description: record.description,
    importance: record.importance,
    dataSourceId: record.dataSourceId,
    databaseName: record.databaseName,
    tableName: record.tableName,
    columnName: record.columnName,
    ruleType: record.ruleType,
    operator: record.operator,
    threshold: record.threshold,
    thresholdEnd: record.thresholdEnd,
    scheduleMode: record.scheduleMode,
    schedulePreset: record.cronExpression ? 'CUSTOM' : 'DAILY_0200',
    cronExpression: record.cronExpression,
    enabled: record.enabled,
    customSql: record.customSql,
  };
};

const SectionTitle = ({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) => (
  <div className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#161823]">
    <span className="text-[#667085]">{icon}</span>
    {title}
  </div>
);

const QualityRuleDrawer = ({
  open,
  record,
  submitting,
  onCancel,
  onSubmit,
}: QualityRuleDrawerProps) => {
  const [form] = Form.useForm<QualityRuleFormValues>();
  const ruleType =
    (Form.useWatch('ruleType', form) as QualityRuleType | undefined) ||
    DEFAULT_VALUES.ruleType;
  const operator =
    (Form.useWatch('operator', form) as QualityOperator | undefined) ||
    DEFAULT_VALUES.operator;
  const scheduleMode =
    (Form.useWatch('scheduleMode', form) as QualityTriggerType | undefined) ||
    DEFAULT_VALUES.scheduleMode;
  const schedulePreset = Form.useWatch('schedulePreset', form);
  const databaseName = Form.useWatch('databaseName', form);
  const tableName = Form.useWatch('tableName', form);
  const columnName = Form.useWatch('columnName', form);
  const threshold = Form.useWatch('threshold', form);
  const thresholdEnd = Form.useWatch('thresholdEnd', form);

  const meta = QUALITY_RULE_TYPE_META[ruleType];

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(toFormValues(record));
  }, [form, open, record]);

  useEffect(() => {
    if (!open) return;
    const nextMeta = QUALITY_RULE_TYPE_META[ruleType];
    if (nextMeta.scope === 'TABLE') {
      form.setFieldValue('columnName', undefined);
    } else if (!form.getFieldValue('columnName')) {
      form.setFieldValue('columnName', COLUMN_OPTIONS[0].value);
    }
  }, [form, open, ruleType]);

  const preview = useMemo(() => {
    const target = [databaseName, tableName, columnName]
      .filter(Boolean)
      .join('.');
    const range =
      operator === 'BETWEEN'
        ? `${threshold ?? '--'} ~ ${thresholdEnd ?? '--'}`
        : `${operator} ${threshold ?? '--'}`;
    return `检查 ${target || '未选择对象'} 的${meta.label}，期望结果 ${range}${meta.unit || ''}。`;
  }, [
    columnName,
    databaseName,
    meta.label,
    meta.unit,
    operator,
    tableName,
    threshold,
    thresholdEnd,
  ]);

  const handleFinish = async () => {
    const values = await form.validateFields();
    onSubmit(values);
  };

  return (
    <Drawer
      width={640}
      open={open}
      destroyOnClose
      title={record ? '编辑质量规则' : '新建质量规则'}
      onClose={onCancel}
      extra={
        <Space size={8}>
          <Button onClick={onCancel}>取消</Button>
          <Button
            type="primary"
            loading={submitting}
            onClick={() => void handleFinish()}
          >
            {record ? '保存修改' : '创建规则'}
          </Button>
        </Space>
      }
    >
      <Form<QualityRuleFormValues>
        form={form}
        layout="vertical"
        requiredMark="optional"
        initialValues={DEFAULT_VALUES}
      >
        <SectionTitle icon={<SafetyCertificateOutlined />} title="基本信息" />
        <Form.Item
          name="name"
          label="规则名称"
          rules={[
            { required: true, message: '请输入规则名称' },
            { max: 80, message: '规则名称不能超过 80 个字符' },
          ]}
        >
          <Input variant="filled" placeholder="例如：用户手机号非空率" />
        </Form.Item>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="importance" label="重要程度">
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              options={[
                { label: '普通', value: 'NORMAL' },
                { label: '重要', value: 'IMPORTANT' },
              ]}
            />
          </Form.Item>
          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="已启用" unCheckedChildren="已停用" />
          </Form.Item>
        </div>
        <Form.Item name="description" label="规则描述">
          <Input.TextArea
            variant="filled"
            rows={3}
            maxLength={300}
            showCount
            placeholder="补充规则背景、口径或处理建议"
          />
        </Form.Item>

        <Divider />
        <SectionTitle icon={<DatabaseOutlined />} title="检查对象" />
        <div className="grid grid-cols-2 gap-3">
          <Form.Item
            name="dataSourceId"
            label="数据源"
            rules={[{ required: true, message: '请选择数据源' }]}
          >
            <Select variant="filled" options={DATA_SOURCE_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="databaseName"
            label="数据库 / Schema"
            rules={[{ required: true, message: '请选择数据库或 Schema' }]}
          >
            <Select variant="filled" options={DATABASE_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="tableName"
            label="数据表"
            rules={[{ required: true, message: '请选择数据表' }]}
          >
            <Select
              showSearch
              variant="filled"
              options={TABLE_OPTIONS}
              optionFilterProp="label"
            />
          </Form.Item>
          {meta.scope === 'COLUMN' ? (
            <Form.Item
              name="columnName"
              label="字段"
              rules={[{ required: true, message: '请选择字段' }]}
            >
              <Select
                showSearch
                variant="filled"
                options={COLUMN_OPTIONS}
                optionFilterProp="label"
              />
            </Form.Item>
          ) : (
            <div className="rounded-lg border border-dashed border-[#e4e7ec] bg-[#fafafa] px-3 py-2.5 text-[12px] leading-5 text-[#98a2b3]">
              当前为表级规则，无需选择字段。
            </div>
          )}
        </div>

        <Divider />
        <SectionTitle icon={<SettingOutlined />} title="规则配置" />
        <Form.Item
          name="ruleType"
          label="规则类型"
          rules={[{ required: true, message: '请选择规则类型' }]}
        >
          <Select variant="filled" options={ruleTypeOptions} />
        </Form.Item>
        {ruleType === 'CUSTOM_SQL' ? (
          <Form.Item
            name="customSql"
            label="检查 SQL"
            extra="SQL 需要返回单行单列指标值，后端接入时仅允许只读查询。"
            rules={[{ required: true, message: '请输入检查 SQL' }]}
          >
            <Input.TextArea
              variant="filled"
              rows={6}
              className="font-mono"
              placeholder="SELECT COUNT(*) AS metric_value FROM ..."
            />
          </Form.Item>
        ) : null}
        <div className="grid grid-cols-[170px_minmax(0,1fr)] gap-3">
          <Form.Item name="operator" label="比较方式">
            <Select variant="filled" options={operatorOptions} />
          </Form.Item>
          <div
            className={[
              'grid gap-3',
              operator === 'BETWEEN' ? 'grid-cols-2' : 'grid-cols-1',
            ].join(' ')}
          >
            <Form.Item
              name="threshold"
              label={operator === 'BETWEEN' ? '最小值' : '阈值'}
              rules={[{ required: true, message: '请输入阈值' }]}
            >
              <InputNumber
                variant="filled"
                className="w-full"
                addonAfter={meta.unit}
              />
            </Form.Item>
            {operator === 'BETWEEN' ? (
              <Form.Item
                name="thresholdEnd"
                label="最大值"
                rules={[{ required: true, message: '请输入最大值' }]}
              >
                <InputNumber
                  variant="filled"
                  className="w-full"
                  addonAfter={meta.unit}
                />
              </Form.Item>
            ) : null}
          </div>
        </div>
        <div className="rounded-lg border border-[#eceef2] bg-[#f8f9fb] px-4 py-3">
          <div className="mb-1 flex items-center gap-2 text-[12px] font-medium text-[#667085]">
            <CodeOutlined />
            规则预览
          </div>
          <div className="text-[13px] leading-6 text-[#344054]">{preview}</div>
        </div>

        <Divider />
        <SectionTitle icon={<SettingOutlined />} title="执行设置" />
        <Form.Item name="scheduleMode" label="执行方式">
          <Radio.Group
            options={[
              { label: '仅手动执行', value: 'MANUAL' },
              { label: '定时执行', value: 'SCHEDULE' },
            ]}
          />
        </Form.Item>
        {scheduleMode === 'SCHEDULE' ? (
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="schedulePreset" label="调度周期">
              <Select variant="filled" options={scheduleOptions} />
            </Form.Item>
            {schedulePreset === 'CUSTOM' ? (
              <Form.Item
                name="cronExpression"
                label="Cron 表达式"
                rules={[{ required: true, message: '请输入 Cron 表达式' }]}
              >
                <Input variant="filled" placeholder="0 0 2 * * ?" />
              </Form.Item>
            ) : (
              <div className="rounded-lg border border-dashed border-[#e4e7ec] bg-[#fafafa] px-3 py-2.5 text-[12px] leading-5 text-[#98a2b3]">
                第一期仅设计调度配置，后续统一接入 Yak Schedule。
              </div>
            )}
          </div>
        ) : null}
      </Form>
    </Drawer>
  );
};

export default QualityRuleDrawer;
