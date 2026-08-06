import { fetchDataSourceAll, dataSourceCatalogApi } from '@/pages/data-source/service';
import type { DataSourceRecord } from '@/pages/data-source/types';
import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';
import { history, useLocation, useModel, useParams } from '@umijs/max';
import {
  Button,
  ConfigProvider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { qualityMonitorApi, qualityTemplateApi } from '../../service';
import type {
  CatalogColumn,
  ComparisonOperator,
  MonitorView,
  RuleType,
  SaveMonitorPayload,
  SaveRulePayload,
  TemplateView,
} from '../../types';

interface EditorRule extends SaveRulePayload {
  key: string;
  templateCode: string;
  ruleType: RuleType;
  scope: 'TABLE' | 'COLUMN';
  dimension: string;
}

const OPERATORS: Array<{ value: ComparisonOperator; label: string }> = [
  { value: 'GT', label: '>' },
  { value: 'GTE', label: '>=' },
  { value: 'EQ', label: '=' },
  { value: 'LTE', label: '<=' },
  { value: 'LT', label: '<' },
  { value: 'BETWEEN', label: '区间' },
];

const unwrap = <T,>(response: { code: number; data: T; message?: string; msg?: string }) => {
  if (response.code !== API_SUCCESS_CODE) {
    throw new Error(response.message || response.msg || '请求失败');
  }
  return response.data;
};

const defaults = (template: TemplateView): EditorRule => {
  const operator: ComparisonOperator =
    template.ruleType === 'TABLE_ROW_COUNT'
      ? 'GT'
      : template.ruleType === 'COLUMN_NOT_NULL' || template.ruleType === 'COLUMN_UNIQUE'
        ? 'GTE'
        : 'EQ';
  const threshold =
    template.ruleType === 'COLUMN_NOT_NULL' || template.ruleType === 'COLUMN_UNIQUE' ? 100 : 0;
  return {
    key: `${template.id}-${Date.now()}-${Math.random()}`,
    templateId: template.id,
    templateCode: template.code,
    name: template.name,
    ruleType: template.ruleType,
    scope: template.scope,
    dimension: template.dimension,
    operator,
    threshold,
    enabled: true,
    enumValues: [],
    customSql:
      template.ruleType === 'CUSTOM_SQL'
        ? 'SELECT COUNT(*) AS metric_value FROM ${table} WHERE ${where}'
        : undefined,
  };
};

const monitorToRules = (monitor: MonitorView): EditorRule[] =>
  monitor.rules.map((rule) => ({
    key: String(rule.id),
    templateId: rule.templateId,
    templateCode: rule.templateCode,
    name: rule.name,
    ruleType: rule.ruleType,
    scope: rule.scope,
    dimension: rule.dimension,
    columnName: rule.columnName,
    operator: (rule.operator || 'EQ') as ComparisonOperator,
    threshold: rule.threshold,
    thresholdEnd: rule.thresholdEnd,
    enumValues: rule.enumValues || [],
    customSql: rule.customSql,
    enabled: rule.enabled,
  }));

const MonitorEditorPage = () => {
  const params = useParams<{ id?: string }>();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser as
    | { realName?: string; username?: string }
    | undefined;
  const editing = Boolean(params.id);
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [form] = Form.useForm<SaveMonitorPayload>();
  const [dataSources, setDataSources] = useState<DataSourceRecord[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<Array<{ name: string; remarks?: string }>>([]);
  const [columns, setColumns] = useState<CatalogColumn[]>([]);
  const [templates, setTemplates] = useState<TemplateView[]>([]);
  const [rules, setRules] = useState<EditorRule[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const dataSourceId = Form.useWatch('dataSourceId', form);
  const databaseName = Form.useWatch('databaseName', form);
  const schemaName = Form.useWatch('schemaName', form);
  const tableName = Form.useWatch('tableName', form);

  useEffect(() => {
    Promise.all([fetchDataSourceAll(), qualityTemplateApi.list()])
      .then(([sourceResponse, templateResponse]) => {
        setDataSources(unwrap(sourceResponse).bizData || []);
        setTemplates(unwrap(templateResponse).records || []);
      })
      .catch((error) => message.error(error?.message || '页面初始化失败'));
  }, []);

  useEffect(() => {
    if (!editing) {
      const sourceId = Number(query.get('dataSourceId')) || undefined;
      form.setFieldsValue({
        dataSourceId: sourceId,
        dataSourceName: query.get('dataSourceName') || undefined,
        databaseName: query.get('databaseName') || undefined,
        schemaName: query.get('schemaName') || undefined,
        tableName: query.get('tableName') || undefined,
        owner:
          currentUser?.realName ||
          currentUser?.username ||
          'system',
        enabled: true,
      });
      setLoading(false);
      return;
    }
    qualityMonitorApi
      .detail(params.id!)
      .then((response) => {
        const monitor = unwrap(response);
        form.setFieldsValue({
          name: monitor.name,
          description: monitor.description,
          dataSourceId: monitor.dataSourceId,
          dataSourceName: monitor.dataSourceName,
          databaseName: monitor.databaseName,
          schemaName: monitor.schemaName,
          tableName: monitor.tableName,
          whereClause: monitor.whereClause,
          owner: monitor.owner,
          enabled: monitor.enabled,
        });
        setRules(monitorToRules(monitor));
      })
      .catch((error) => message.error(error?.message || '质量监控加载失败'))
      .finally(() => setLoading(false));
  }, [currentUser?.realName, currentUser?.username, editing, form, params.id, query]);

  useEffect(() => {
    if (!dataSourceId) return;
    dataSourceCatalogApi
      .listDatabases(dataSourceId)
      .then((response) => setDatabases(unwrap(response)))
      .catch((error) => message.error(error?.message || '数据库加载失败'));
  }, [dataSourceId]);

  useEffect(() => {
    if (!dataSourceId) return;
    dataSourceCatalogApi
      .listSchemas(dataSourceId, databaseName)
      .then((response) => setSchemas(unwrap(response)))
      .catch((error) => message.error(error?.message || 'Schema 加载失败'));
  }, [dataSourceId, databaseName]);

  useEffect(() => {
    if (!dataSourceId) return;
    dataSourceCatalogApi
      .listTables(dataSourceId, databaseName, schemaName)
      .then((response) => setTables(unwrap(response)))
      .catch((error) => message.error(error?.message || '数据表加载失败'));
  }, [dataSourceId, databaseName, schemaName]);

  useEffect(() => {
    if (!dataSourceId || !tableName) {
      setColumns([]);
      return;
    }
    dataSourceCatalogApi
      .listColumns(dataSourceId, databaseName, schemaName, tableName)
      .then((response) => setColumns(unwrap(response)))
      .catch((error) => message.error(error?.message || '字段加载失败'));
  }, [dataSourceId, databaseName, schemaName, tableName]);

  const updateRule = (key: string, values: Partial<EditorRule>) =>
    setRules((current) => current.map((rule) => (rule.key === key ? { ...rule, ...values } : rule)));

  const validateRules = () => {
    if (!rules.length) throw new Error('至少添加一条质量规则');
    rules.forEach((rule) => {
      if (!rule.name.trim()) throw new Error('规则名称不能为空');
      if (rule.scope === 'COLUMN' && !rule.columnName) throw new Error(`${rule.name} 需要选择字段`);
      if (rule.ruleType === 'COLUMN_RANGE' && (rule.threshold === undefined || rule.thresholdEnd === undefined)) {
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

  const save = async () => {
    try {
      const values = await form.validateFields();
      validateRules();
      const source = dataSources.find((item) => Number(item.id) === Number(values.dataSourceId));
      const payload: SaveMonitorPayload = {
        ...values,
        dataSourceId: Number(values.dataSourceId),
        dataSourceName: source?.name || values.dataSourceName,
        rules: rules.map(({ key: _key, templateCode: _code, ruleType: _type, scope: _scope, dimension: _dimension, ...rule }) => rule),
      };
      setSaving(true);
      const result = editing
        ? unwrap(await qualityMonitorApi.update(params.id!, payload))
        : unwrap(await qualityMonitorApi.create(payload));
      message.success(editing ? '质量监控已更新' : '质量监控已创建');
      history.push(`/data-quality/monitor/${result.id}`);
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const renderRuleConfig = (rule: EditorRule) => {
    if (rule.ruleType === 'COLUMN_RANGE') {
      return (
        <div className="flex items-center gap-2">
          <InputNumber value={rule.threshold} placeholder="最小值" onChange={(v) => updateRule(rule.key, { threshold: v ?? undefined })} />
          <span>至</span>
          <InputNumber value={rule.thresholdEnd} placeholder="最大值" onChange={(v) => updateRule(rule.key, { thresholdEnd: v ?? undefined })} />
        </div>
      );
    }
    if (rule.ruleType === 'COLUMN_ENUM') {
      return (
        <Select
          mode="tags"
          value={rule.enumValues}
          placeholder="输入允许值，回车确认"
          onChange={(values) => updateRule(rule.key, { enumValues: values })}
          className="w-full"
        />
      );
    }
    if (rule.ruleType === 'CUSTOM_SQL') {
      return (
        <div className="space-y-2">
          <Input.TextArea
            rows={4}
            value={rule.customSql}
            placeholder="返回首行首列数值，可使用 ${table}、${column}、${where}"
            onChange={(event) => updateRule(rule.key, { customSql: event.target.value })}
          />
          <div className="flex items-center gap-2">
            <Select value={rule.operator} options={OPERATORS} onChange={(v) => updateRule(rule.key, { operator: v })} className="w-24" />
            <InputNumber value={rule.threshold} onChange={(v) => updateRule(rule.key, { threshold: v ?? undefined })} />
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Select value={rule.operator} options={OPERATORS} onChange={(v) => updateRule(rule.key, { operator: v })} className="w-24" />
        <InputNumber value={rule.threshold} onChange={(v) => updateRule(rule.key, { threshold: v ?? undefined })} />
        {rule.operator === 'BETWEEN' && (
          <InputNumber value={rule.thresholdEnd} onChange={(v) => updateRule(rule.key, { thresholdEnd: v ?? undefined })} />
        )}
      </div>
    );
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="min-h-[calc(100vh-64px)] bg-white pb-20">
        <div className="flex h-14 items-center gap-3 border-b border-[#e8e9ec] px-5">
          <Button type="text" icon={<ArrowLeft size={17} />} onClick={() => history.back()} />
          <h1 className="m-0 text-[20px] font-semibold text-[#161823]">
            {editing ? '编辑质量监控' : '新建质量监控'}
          </h1>
        </div>

        <Spin spinning={loading}>
          <div className="mx-auto max-w-[1420px] px-6 py-5">
            <section className="border-b border-[#eceef0] pb-5">
              <h2 className="mb-4 text-base font-semibold text-[#161823]">基本配置</h2>
              <Form form={form} layout="vertical" requiredMark="optional">
                <div className="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
                  <Form.Item name="name" label="监控名称" rules={[{ required: true, message: '请输入监控名称' }]}>
                    <Input variant="filled" placeholder="例如：订单表每日质量检查" />
                  </Form.Item>
                  <Form.Item name="owner" label="负责人" rules={[{ required: true, message: '请输入负责人' }]}>
                    <Input variant="filled" />
                  </Form.Item>
                  <Form.Item name="dataSourceId" label="数据源" rules={[{ required: true, message: '请选择数据源' }]}>
                    <Select
                      variant="filled"
                      showSearch
                      optionFilterProp="label"
                      options={dataSources.map((item) => ({ value: Number(item.id), label: `${item.name} (${item.dbType || '--'})` }))}
                      onChange={(value) => {
                        const source = dataSources.find((item) => Number(item.id) === value);
                        form.setFieldsValue({ dataSourceName: source?.name, databaseName: undefined, schemaName: undefined, tableName: undefined });
                      }}
                    />
                  </Form.Item>
                  <Form.Item name="databaseName" label="数据库">
                    <Select allowClear variant="filled" showSearch options={databases.map((value) => ({ value, label: value }))} />
                  </Form.Item>
                  <Form.Item name="schemaName" label="Schema">
                    <Select allowClear variant="filled" showSearch options={schemas.map((value) => ({ value, label: value }))} />
                  </Form.Item>
                  <Form.Item name="tableName" label="数据表" rules={[{ required: true, message: '请选择数据表' }]}>
                    <Select
                      variant="filled"
                      showSearch
                      optionFilterProp="label"
                      options={tables.map((item) => ({ value: item.name, label: item.remarks ? `${item.name} · ${item.remarks}` : item.name }))}
                    />
                  </Form.Item>
                </div>
                <Form.Item name="whereClause" label="数据范围">
                  <Input.TextArea variant="filled" rows={3} placeholder="填写 WHERE 后的条件，例如 dt = '${bizdate}'；留空表示全表" />
                </Form.Item>
                <Form.Item name="description" label="描述">
                  <Input.TextArea variant="filled" rows={3} />
                </Form.Item>
                <Form.Item name="enabled" label="启用状态" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Form>
            </section>

            <section className="pt-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="m-0 text-base font-semibold text-[#161823]">质量规则</h2>
                  <div className="mt-1 text-xs text-[#8a8f99]">从规则模板中添加检查规则，一次运行会执行当前监控下的全部启用规则。</div>
                </div>
                <Button type="primary" icon={<Plus size={14} />} onClick={() => setTemplateOpen(true)}>从模板添加</Button>
              </div>

              {!rules.length ? (
                <div className="border border-dashed border-[#dfe1e5] py-14"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未添加质量规则" /></div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule, index) => (
                    <div key={rule.key} className="border-b border-[#eceef0] px-2 py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#98a2b3]">{index + 1}</span>
                          <Input value={rule.name} onChange={(event) => updateRule(rule.key, { name: event.target.value })} className="w-[260px]" />
                          <Tag>{rule.dimension}</Tag>
                          <Tag>{rule.scope === 'TABLE' ? '表级' : '字段级'}</Tag>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch size="small" checked={rule.enabled} onChange={(enabled) => updateRule(rule.key, { enabled })} />
                          <Button type="text" danger icon={<Trash2 size={14} />} onClick={() => setRules((current) => current.filter((item) => item.key !== rule.key))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
                        <div>
                          <div className="mb-1 text-xs text-[#6b707a]">检查字段</div>
                          <Select
                            allowClear
                            disabled={rule.scope === 'TABLE' && rule.ruleType !== 'CUSTOM_SQL'}
                            value={rule.columnName}
                            placeholder={rule.scope === 'COLUMN' ? '请选择字段' : '表级规则无需字段'}
                            showSearch
                            optionFilterProp="label"
                            options={columns.map((column) => ({ value: column.name, label: `${column.name}${column.typeName ? ` · ${column.typeName}` : ''}` }))}
                            onChange={(columnName) => updateRule(rule.key, { columnName })}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <div className="mb-1 text-xs text-[#6b707a]">规则参数</div>
                          {renderRuleConfig(rule)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </Spin>

        <div className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-end gap-2 border-t border-[#e8e9ec] bg-white px-6 shadow-[0_-8px_24px_rgba(22,24,35,.04)]">
          <Button onClick={() => history.back()}>取消</Button>
          <Button type="primary" loading={saving} onClick={save}>保存配置</Button>
        </div>

        <Modal
          width={760}
          title="选择规则模板"
          open={templateOpen}
          footer={null}
          onCancel={() => setTemplateOpen(false)}
        >
          <Table<TemplateView>
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={templates}
            columns={[
              { title: '模板名称', dataIndex: 'name', width: 170 },
              { title: '质量维度', dataIndex: 'dimension', width: 100 },
              { title: '范围', dataIndex: 'scope', width: 90, render: (value) => (value === 'TABLE' ? '表级' : '字段级') },
              { title: '说明', dataIndex: 'description' },
              {
                title: '操作',
                width: 80,
                render: (_, template) => (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setRules((current) => [...current, defaults(template)]);
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
      </div>
    </ConfigProvider>
  );
};

export default MonitorEditorPage;
