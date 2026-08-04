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

import { QUALITY_RULE_TYPE_META } from '../mock';
import type {
  QualityOperator,
  QualityRule,
  QualityRuleFormValues,
  QualityRuleType,
  QualitySelectOption,
  QualityTriggerType,
} from '../types';

interface QualityRuleDrawerProps {
  open: boolean;
  record?: QualityRule;
  submitting?: boolean;
  dataSourceOptions: QualitySelectOption[];
  databaseOptions: QualitySelectOption[];
  schemaOptions: QualitySelectOption[];
  tableOptions: QualitySelectOption[];
  columnOptions: QualitySelectOption[];
  dataSourceLoading?: boolean;
  databaseLoading?: boolean;
  schemaLoading?: boolean;
  tableLoading?: boolean;
  columnLoading?: boolean;
  onDataSourceChange: (dataSourceId: string) => void;
  onDatabaseChange: (databaseName: string) => void;
  onSchemaChange: (schemaName?: string) => void;
  onTableChange: (tableName: string) => void;
  onCancel: () => void;
  onSubmit: (values: QualityRuleFormValues) => void | Promise<void>;
}

const DEFAULT_VALUES: QualityRuleFormValues = {
  name: '',
  importance: 'NORMAL',
  dataSourceId: '',
  databaseName: '',
  tableName: '',
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
    dataSourceName: record.dataSourceName,
    catalogName: record.catalogName,
    schemaName: record.schemaName,
    databaseName: record.databaseName,
    tableName: record.tableName,
    columnName: record.columnName,
    ruleType: record.ruleType,
    operator: record.operator,
    threshold: record.threshold,
    thresholdEnd: record.thresholdEnd,
    scheduleMode: record.scheduleMode,
    schedulePreset:
      record.schedulePreset ||
      (record.cronExpression ? 'CUSTOM' : 'DAILY_0200'),
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
  dataSourceOptions,
  databaseOptions,
  schemaOptions,
  tableOptions,
  columnOptions,
  dataSourceLoading,
  databaseLoading,
  schemaLoading,
  tableLoading,
  columnLoading,
  onDataSourceChange,
  onDatabaseChange,
  onSchemaChange,
  onTableChange,
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
  const dataSourceId = Form.useWatch('dataSourceId', form);
  const databaseName = Form.useWatch('databaseName', form);
  const schemaName = Form.useWatch('schemaName', form);
  const tableName = Form.useWatch('tableName', form);
  const columnName = Form.useWatch('columnName', form);
  const threshold = Form.useWatch('threshold', form);
  const thresholdEnd = Form.useWatch('thresholdEnd', form);

  const meta = QUALITY_RULE_TYPE_META[ruleType];

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(toFormValues(record));
  }, [form, open, record]);

  useEffect(() => {
    if (!open) return;
    if (QUALITY_RULE_TYPE_META[ruleType].scope === 'TABLE') {
      form.setFieldValue('columnName', undefined);
    }
  }, [form, open, ruleType]);

  const preview = useMemo(() => {
    const target = [databaseName, schemaName, tableName, columnName]
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
    schemaName,
    operator,
    tableName,
    threshold,
    thresholdEnd,
  ]);

  const handleFinish = async () => {
    const values = await form.validateFields();
    await onSubmit(values);
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
            <Select
              showSearch
              variant="filled"
              optionFilterProp="label"
              options={dataSourceOptions}
              loading={dataSourceLoading}
              placeholder="请选择已配置的数据源"
              onChange={(value: string) => {
                form.setFieldValue('dataSourceId', value);
                form.resetFields([
                  'databaseName',
                  'schemaName',
                  'tableName',
                  'columnName',
                ]);
                onDataSourceChange(value);
              }}
            />
          </Form.Item>
          <Form.Item
            name="databaseName"
            label="数据库"
            rules={[{ required: true, message: '请选择数据库或 Schema' }]}
          >
            <Select
              showSearch
              variant="filled"
              optionFilterProp="label"
              options={databaseOptions}
              loading={databaseLoading}
              disabled={!dataSourceId}
              placeholder={dataSourceId ? '请选择数据库' : '请先选择数据源'}
              onChange={(value: string) => {
                form.setFieldValue('databaseName', value);
                form.resetFields(['schemaName', 'tableName', 'columnName']);
                onDatabaseChange(value);
              }}
            />
          </Form.Item>
          {schemaOptions.length > 0 ? (
            <Form.Item
              name="schemaName"
              label="Schema"
              rules={[{ required: true, message: '请选择 Schema' }]}
            >
              <Select
                showSearch
                allowClear
                variant="filled"
                optionFilterProp="label"
                options={schemaOptions}
                loading={schemaLoading}
                disabled={!databaseName}
                placeholder="请选择 Schema"
                onChange={(value?: string) => {
                  form.setFieldValue('schemaName', value);
                  form.resetFields(['tableName', 'columnName']);
                  onSchemaChange(value);
                }}
              />
            </Form.Item>
          ) : null}
          <Form.Item
            name="tableName"
            label="数据表"
            rules={[{ required: true, message: '请选择数据表' }]}
          >
            <Select
              showSearch
              variant="filled"
              options={tableOptions}
              loading={tableLoading}
              disabled={
                !dataSourceId ||
                !databaseName ||
                (schemaOptions.length > 0 && !schemaName)
              }
              optionFilterProp="label"
              placeholder={
                !databaseName
                  ? '请先选择数据库'
                  : schemaOptions.length > 0 && !schemaName
                    ? '请先选择 Schema'
                    : '请选择数据表'
              }
              onChange={(value: string) => {
                form.setFieldValue('tableName', value);
                form.resetFields(['columnName']);
                onTableChange(value);
              }}
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
                options={columnOptions}
                loading={columnLoading}
                disabled={!tableName}
                optionFilterProp="label"
                placeholder={tableName ? '请选择字段' : '请先选择数据表'}
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
            extra="SQL 需要返回单行单列指标值；第 2 步接入执行引擎时会增加只读 SQL 校验。"
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
                dependencies={['threshold']}
                rules={[
                  { required: true, message: '请输入最大值' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const minimum = getFieldValue('threshold');
                      if (
                        value === undefined ||
                        minimum === undefined ||
                        Number(value) >= Number(minimum)
                      ) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error('最大值不能小于最小值'),
                      );
                    },
                  }),
                ]}
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
            <Form.Item
              name="schedulePreset"
              label="调度周期"
              rules={[{ required: true, message: '请选择调度周期' }]}
            >
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
                当前保存调度配置；实际定时触发将在第 3 步接入 Yak Schedule。
              </div>
            )}
          </div>
        ) : null}
      </Form>
    </Drawer>
  );
};

export default QualityRuleDrawer;
