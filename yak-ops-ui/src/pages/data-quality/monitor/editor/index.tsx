import {
  dataSourceCatalogApi,
  fetchDataSourceAll,
} from '@/pages/data-source/service';
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
import { Plus, Trash2 } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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

const SECTION_ITEMS = [
  { key: 'monitor-basic', label: '监控基础信息' },
  { key: 'monitor-target', label: '监控对象' },
  { key: 'quality-rules', label: '质量规则' },
] as const;

type SectionKey = (typeof SECTION_ITEMS)[number]['key'];

const LAST_SECTION_KEY = SECTION_ITEMS[SECTION_ITEMS.length - 1].key;
const SCROLL_BOTTOM_THRESHOLD = 12;
const SECTION_TOP_OFFSET = 24;
const LOCATE_LOCK_DURATION = 650;

const unwrap = <T,>(response: {
  code: number;
  data: T;
  message?: string;
  msg?: string;
}) => {
  if (response.code !== API_SUCCESS_CODE) {
    throw new Error(response.message || response.msg || '请求失败');
  }
  return response.data;
};

const defaults = (template: TemplateView): EditorRule => {
  const operator: ComparisonOperator =
    template.ruleType === 'TABLE_ROW_COUNT'
      ? 'GT'
      : template.ruleType === 'COLUMN_NOT_NULL' ||
          template.ruleType === 'COLUMN_UNIQUE'
        ? 'GTE'
        : 'EQ';
  const threshold =
    template.ruleType === 'COLUMN_NOT_NULL' ||
    template.ruleType === 'COLUMN_UNIQUE'
      ? 100
      : 0;

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

interface EditorSectionProps {
  id: SectionKey;
  title: string;
  description?: string;
  extra?: ReactNode;
  children: ReactNode;
}

const EditorSection = ({
  id,
  title,
  description,
  extra,
  children,
}: EditorSectionProps) => (
  <section id={id} className="scroll-mt-6 overflow-hidden rounded-xl bg-white">
    <header className="flex items-start justify-between gap-4 px-7 pt-5">
      <div>
        <h2 className="m-0 text-[17px] font-semibold leading-6 text-[#161823]">
          {title}
        </h2>
        {description ? (
          <div className="mt-1 text-xs leading-5 text-[#8a8f99]">
            {description}
          </div>
        ) : null}
      </div>
      {extra}
    </header>
    <div className="px-7 pb-6 pt-5">{children}</div>
  </section>
);

interface EditorFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

const EditorField = ({
  label,
  required = false,
  hint,
  children,
}: EditorFieldProps) => (
  <div className="grid grid-cols-[116px_minmax(0,1fr)] items-start gap-5 max-md:grid-cols-1 max-md:gap-2">
    <div className="pt-2.5 text-[13px] font-medium text-[#344054]">
      {label}
      {required ? (
        <span className="ml-1 text-[var(--yak-brand-color)]">*</span>
      ) : null}
    </div>
    <div className="min-w-0">
      {children}
      {hint ? (
        <div className="mt-1.5 text-[11px] leading-5 text-[#98a2b3]">
          {hint}
        </div>
      ) : null}
    </div>
  </div>
);

interface SectionNavigatorProps {
  activeKey: SectionKey;
  onSelect: (key: SectionKey) => void;
}

const SectionNavigator = ({
  activeKey,
  onSelect,
}: SectionNavigatorProps) => (
  <nav aria-label="配置区块定位" className="rounded-xl bg-white px-3 py-4">
    <div className="mb-3 px-2 text-[12px] font-semibold text-[#344054]">
      快速定位
    </div>
    <div className="relative">
      <span
        aria-hidden
        className="absolute bottom-4 left-[13px] top-4 w-px bg-[#e4e7ec]"
      />
      <div className="space-y-1">
        {SECTION_ITEMS.map((item) => {
          const active = activeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-current={active ? 'location' : undefined}
              className={[
                'group relative flex w-full cursor-pointer items-center gap-3',
                'rounded-lg border-0 px-2 py-2 text-left transition-colors',
                active
                  ? 'bg-[rgba(254,44,85,0.08)]'
                  : 'bg-transparent hover:bg-[#f7f8fa]',
              ].join(' ')}
              onClick={() => onSelect(item.key)}
            >
              <span
                aria-hidden
                className={[
                  'relative z-10 h-[11px] w-[11px] shrink-0 rounded-full',
                  'border transition-all duration-200',
                  active
                    ? [
                        'border-[var(--yak-brand-color)]',
                        'bg-[var(--yak-brand-color)]',
                        'shadow-[0_0_0_3px_rgba(254,44,85,0.12)]',
                      ].join(' ')
                    : 'border-[#d0d5dd] bg-[#98a2b3] group-hover:border-[#98a2b3]',
                ].join(' ')}
              />
              <span
                className={[
                  'text-[12px] leading-5 transition-colors',
                  active
                    ? 'font-semibold text-[var(--yak-brand-color)]'
                    : 'font-normal text-[#667085] group-hover:text-[#344054]',
                ].join(' ')}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  </nav>
);

const MonitorEditorPage = () => {
  const params = useParams<{ id?: string }>();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser as
    | { realName?: string; username?: string }
    | undefined;
  const editing = Boolean(params.id);
  const query = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const [form] = Form.useForm<SaveMonitorPayload>();

  const pageRootRef = useRef<HTMLDivElement>(null);
  const locatingSectionRef = useRef<SectionKey | null>(null);
  const locateTimerRef = useRef<number>();

  const [dataSources, setDataSources] = useState<DataSourceRecord[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<
    Array<{ name: string; remarks?: string }>
  >([]);
  const [columns, setColumns] = useState<CatalogColumn[]>([]);
  const [templates, setTemplates] = useState<TemplateView[]>([]);
  const [rules, setRules] = useState<EditorRule[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] =
    useState<SectionKey>('monitor-basic');

  const dataSourceId = Form.useWatch('dataSourceId', form);
  const databaseName = Form.useWatch('databaseName', form);
  const schemaName = Form.useWatch('schemaName', form);
  const tableName = Form.useWatch('tableName', form);

  const updateActiveSection = useCallback(() => {
    const container = pageRootRef.current;
    if (!container || locatingSectionRef.current) return;

    const maxScrollTop = Math.max(
      0,
      container.scrollHeight - container.clientHeight,
    );
    const distanceToBottom = maxScrollTop - container.scrollTop;

    if (distanceToBottom <= SCROLL_BOTTOM_THRESHOLD) {
      setActiveSection((current) =>
        current === LAST_SECTION_KEY ? current : LAST_SECTION_KEY,
      );
      return;
    }

    const threshold = container.getBoundingClientRect().top + 140;
    let nextActive: SectionKey = SECTION_ITEMS[0].key;

    SECTION_ITEMS.forEach((item) => {
      const element = document.getElementById(item.key);
      if (element && element.getBoundingClientRect().top <= threshold) {
        nextActive = item.key;
      }
    });

    setActiveSection((current) =>
      current === nextActive ? current : nextActive,
    );
  }, []);

  useEffect(() => {
    const container = pageRootRef.current;
    if (!container) return undefined;

    let animationFrameId = 0;
    const handleViewportChange = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(updateActiveSection);
    };

    container.addEventListener('scroll', handleViewportChange, {
      passive: true,
    });
    window.addEventListener('resize', handleViewportChange);
    updateActiveSection();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      container.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [loading, updateActiveSection]);

  useEffect(
    () => () => {
      if (locateTimerRef.current) {
        window.clearTimeout(locateTimerRef.current);
      }
    },
    [],
  );

  const handleSectionLocate = (key: SectionKey) => {
    const container = pageRootRef.current;
    const element = document.getElementById(key);
    if (!container || !element) return;

    if (locateTimerRef.current) {
      window.clearTimeout(locateTimerRef.current);
    }

    locatingSectionRef.current = key;
    setActiveSection(key);

    const maxScrollTop = Math.max(
      0,
      container.scrollHeight - container.clientHeight,
    );
    let nextScrollTop = 0;

    if (key === LAST_SECTION_KEY) {
      nextScrollTop = maxScrollTop;
    } else {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const expectedTop =
        container.scrollTop +
        elementRect.top -
        containerRect.top -
        SECTION_TOP_OFFSET;
      nextScrollTop = Math.min(Math.max(expectedTop, 0), maxScrollTop);
    }

    container.scrollTo({ top: nextScrollTop, behavior: 'smooth' });
    locateTimerRef.current = window.setTimeout(() => {
      locatingSectionRef.current = null;
      updateActiveSection();
    }, LOCATE_LOCK_DURATION);
  };

  useEffect(() => {
    Promise.all([fetchDataSourceAll(), qualityTemplateApi.list()])
      .then(([sourceResponse, templateResponse]) => {
        setDataSources(unwrap(sourceResponse).bizData || []);
        setTemplates(unwrap(templateResponse).records || []);
      })
      .catch((error) =>
        message.error(error?.message || '页面初始化失败'),
      );
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
          currentUser?.realName || currentUser?.username || 'system',
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
      .catch((error) =>
        message.error(error?.message || '质量监控加载失败'),
      )
      .finally(() => setLoading(false));
  }, [
    currentUser?.realName,
    currentUser?.username,
    editing,
    form,
    params.id,
    query,
  ]);

  useEffect(() => {
    if (!dataSourceId) {
      setDatabases([]);
      setSchemas([]);
      setTables([]);
      return;
    }

    dataSourceCatalogApi
      .listDatabases(dataSourceId)
      .then((response) => setDatabases(unwrap(response)))
      .catch((error) =>
        message.error(error?.message || '数据库加载失败'),
      );
  }, [dataSourceId]);

  useEffect(() => {
    if (!dataSourceId) {
      setSchemas([]);
      return;
    }

    dataSourceCatalogApi
      .listSchemas(dataSourceId, databaseName)
      .then((response) => setSchemas(unwrap(response)))
      .catch((error) =>
        message.error(error?.message || 'Schema 加载失败'),
      );
  }, [dataSourceId, databaseName]);

  useEffect(() => {
    if (!dataSourceId) {
      setTables([]);
      return;
    }

    dataSourceCatalogApi
      .listTables(dataSourceId, databaseName, schemaName)
      .then((response) => setTables(unwrap(response)))
      .catch((error) =>
        message.error(error?.message || '数据表加载失败'),
      );
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
    setRules((current) =>
      current.map((rule) =>
        rule.key === key ? { ...rule, ...values } : rule,
      ),
    );

  const validateRules = () => {
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
      if (
        rule.ruleType === 'COLUMN_ENUM' &&
        !rule.enumValues?.length
      ) {
        throw new Error(`${rule.name} 至少填写一个枚举值`);
      }
      if (
        rule.ruleType === 'CUSTOM_SQL' &&
        !rule.customSql?.trim()
      ) {
        throw new Error(`${rule.name} 需要填写 SQL`);
      }
    });
  };

  const save = async () => {
    try {
      const values = await form.validateFields();
      validateRules();
      const source = dataSources.find(
        (item) => Number(item.id) === Number(values.dataSourceId),
      );
      const payload: SaveMonitorPayload = {
        ...values,
        dataSourceId: Number(values.dataSourceId),
        dataSourceName: source?.name || values.dataSourceName,
        rules: rules.map(
          ({
            key: _key,
            templateCode: _code,
            ruleType: _type,
            scope: _scope,
            dimension: _dimension,
            ...rule
          }) => rule,
        ),
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
        <div className="flex flex-wrap items-center gap-2">
          <InputNumber
            variant="filled"
            value={rule.threshold}
            placeholder="最小值"
            onChange={(value) =>
              updateRule(rule.key, { threshold: value ?? undefined })
            }
          />
          <span className="text-xs text-[#8a8f99]">至</span>
          <InputNumber
            variant="filled"
            value={rule.thresholdEnd}
            placeholder="最大值"
            onChange={(value) =>
              updateRule(rule.key, { thresholdEnd: value ?? undefined })
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
          onChange={(values) =>
            updateRule(rule.key, { enumValues: values })
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
              updateRule(rule.key, { customSql: event.target.value })
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              variant="filled"
              value={rule.operator}
              options={OPERATORS}
              onChange={(value) =>
                updateRule(rule.key, { operator: value })
              }
              className="w-24"
            />
            <InputNumber
              variant="filled"
              value={rule.threshold}
              onChange={(value) =>
                updateRule(rule.key, { threshold: value ?? undefined })
              }
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <Select
          variant="filled"
          value={rule.operator}
          options={OPERATORS}
          onChange={(value) => updateRule(rule.key, { operator: value })}
          className="w-24"
        />
        <InputNumber
          variant="filled"
          value={rule.threshold}
          onChange={(value) =>
            updateRule(rule.key, { threshold: value ?? undefined })
          }
        />
        {rule.operator === 'BETWEEN' ? (
          <InputNumber
            variant="filled"
            value={rule.thresholdEnd}
            onChange={(value) =>
              updateRule(rule.key, { thresholdEnd: value ?? undefined })
            }
          />
        ) : null}
      </div>
    );
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="h-[calc(100vh-64px)] overflow-hidden bg-[#f7f8fa] text-[#161823]">
        <div
          ref={pageRootRef}
          className="h-full overflow-y-auto overscroll-contain scroll-smooth"
        >
          <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-6 px-6 pb-6 pt-6 max-xl:max-w-[1040px] xl:grid-cols-[minmax(0,1fr)_160px]">
            <div className="min-w-0">
              <Spin spinning={loading}>
                <Form form={form} requiredMark={false}>
                  <main className="space-y-5 pb-4">
                    <EditorSection
                      id="monitor-basic"
                      title="监控基础信息"
                      description="配置监控名称、负责人和启用状态。"
                    >
                      <div className="space-y-5">
                        <EditorField label="监控名称" required>
                          <Form.Item
                            name="name"
                            rules={[
                              { required: true, message: '请输入监控名称' },
                            ]}
                            className="!mb-0"
                          >
                            <Input
                              variant="filled"
                              maxLength={100}
                              showCount
                              placeholder="例如：订单表每日质量检查"
                            />
                          </Form.Item>
                        </EditorField>

                        <EditorField label="负责人" required>
                          <Form.Item
                            name="owner"
                            rules={[
                              { required: true, message: '请输入负责人' },
                            ]}
                            className="!mb-0"
                          >
                            <Input
                              variant="filled"
                              placeholder="请输入质量监控负责人"
                            />
                          </Form.Item>
                        </EditorField>

                        <EditorField label="监控描述">
                          <Form.Item name="description" className="!mb-0">
                            <Input.TextArea
                              variant="filled"
                              rows={4}
                              maxLength={500}
                              showCount
                              placeholder="请说明监控目的、质量要求和异常处理方式"
                            />
                          </Form.Item>
                        </EditorField>

                        <EditorField label="启用状态">
                          <div className="flex min-h-10 items-center justify-between rounded-lg bg-[#f5f5f6] px-3">
                            <div>
                              <div className="text-[13px] font-medium text-[#344054]">
                                创建后立即启用
                              </div>
                              <div className="mt-0.5 text-[11px] text-[#98a2b3]">
                                关闭后仍保留监控配置，但不会执行质量检查
                              </div>
                            </div>
                            <Form.Item
                              name="enabled"
                              valuePropName="checked"
                              className="!mb-0"
                            >
                              <Switch />
                            </Form.Item>
                          </div>
                        </EditorField>
                      </div>
                    </EditorSection>

                    <EditorSection
                      id="monitor-target"
                      title="监控对象"
                      description="选择需要质量管理的数据表，并设置本次检查的数据范围。"
                    >
                      <div className="space-y-5">
                        <EditorField label="数据源" required>
                          <Form.Item
                            name="dataSourceId"
                            rules={[
                              { required: true, message: '请选择数据源' },
                            ]}
                            className="!mb-0"
                          >
                            <Select
                              variant="filled"
                              showSearch
                              optionFilterProp="label"
                              placeholder="请选择已配置的数据源"
                              options={dataSources.map((item) => ({
                                value: Number(item.id),
                                label: `${item.name} · ${item.dbType || '--'}`,
                              }))}
                              onChange={(value) => {
                                const source = dataSources.find(
                                  (item) => Number(item.id) === value,
                                );
                                form.setFieldsValue({
                                  dataSourceName: source?.name,
                                  databaseName: undefined,
                                  schemaName: undefined,
                                  tableName: undefined,
                                });
                              }}
                            />
                          </Form.Item>
                        </EditorField>

                        <EditorField label="数据库">
                          <Form.Item name="databaseName" className="!mb-0">
                            <Select
                              allowClear
                              variant="filled"
                              showSearch
                              placeholder="请选择数据库"
                              options={databases.map((value) => ({
                                value,
                                label: value,
                              }))}
                              onChange={() =>
                                form.setFieldsValue({
                                  schemaName: undefined,
                                  tableName: undefined,
                                })
                              }
                            />
                          </Form.Item>
                        </EditorField>

                        <EditorField label="Schema">
                          <Form.Item name="schemaName" className="!mb-0">
                            <Select
                              allowClear
                              variant="filled"
                              showSearch
                              placeholder="请选择 Schema"
                              options={schemas.map((value) => ({
                                value,
                                label: value,
                              }))}
                              onChange={() =>
                                form.setFieldValue('tableName', undefined)
                              }
                            />
                          </Form.Item>
                        </EditorField>

                        <EditorField label="数据表" required>
                          <Form.Item
                            name="tableName"
                            rules={[
                              { required: true, message: '请选择数据表' },
                            ]}
                            className="!mb-0"
                          >
                            <Select
                              variant="filled"
                              showSearch
                              optionFilterProp="label"
                              placeholder="请选择需要监控的数据表"
                              options={tables.map((item) => ({
                                value: item.name,
                                label: item.remarks
                                  ? `${item.name} · ${item.remarks}`
                                  : item.name,
                              }))}
                            />
                          </Form.Item>
                        </EditorField>

                        <EditorField
                          label="数据范围"
                          hint="仅填写 WHERE 后的条件；留空时检查整张表。"
                        >
                          <Form.Item name="whereClause" className="!mb-0">
                            <Input.TextArea
                              variant="filled"
                              rows={4}
                              maxLength={4000}
                              showCount
                              placeholder="例如：dt = '${bizdate}' AND status = 1"
                            />
                          </Form.Item>
                        </EditorField>
                      </div>
                    </EditorSection>

                    <EditorSection
                      id="quality-rules"
                      title="质量规则"
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
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#f2f3f5] text-xs font-medium text-[#667085]">
                                    {index + 1}
                                  </span>
                                  <Input
                                    variant="filled"
                                    value={rule.name}
                                    maxLength={100}
                                    onChange={(event) =>
                                      updateRule(rule.key, {
                                        name: event.target.value,
                                      })
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
                                    onChange={(enabled) =>
                                      updateRule(rule.key, { enabled })
                                    }
                                  />
                                  <Button
                                    type="text"
                                    danger
                                    aria-label={`删除规则 ${rule.name}`}
                                    icon={<Trash2 size={14} />}
                                    onClick={() =>
                                      setRules((current) =>
                                        current.filter(
                                          (item) => item.key !== rule.key,
                                        ),
                                      )
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
                                      rule.scope === 'TABLE' &&
                                      rule.ruleType !== 'CUSTOM_SQL'
                                    }
                                    value={rule.columnName}
                                    placeholder={
                                      rule.scope === 'COLUMN'
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
                                      updateRule(rule.key, { columnName })
                                    }
                                    className="w-full"
                                  />
                                </div>
                                <div>
                                  <div className="mb-1.5 text-xs font-medium text-[#667085]">
                                    规则参数
                                  </div>
                                  {renderRuleConfig(rule)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </EditorSection>
                  </main>
                </Form>
              </Spin>

              <footer className="sticky bottom-0 z-50 overflow-hidden rounded-t-lg border border-b-0 border-[#eaecf0] bg-white shadow-[0_-8px_16px_rgba(0,0,0,0.06)]">
                <div className="flex min-h-[80px] items-center gap-3 px-8 py-4">
                  <Button
                    type="primary"
                    loading={saving}
                    className="!h-9 !min-w-[120px] !rounded-lg !px-6 !font-medium !text-white"
                    onClick={save}
                  >
                    保存配置
                  </Button>
                  <Button
                    disabled={saving}
                    className="!h-9 !min-w-[120px] !rounded-lg !border-0 !bg-[#f2f3f5] !px-5 !font-medium !text-[#344054] hover:!bg-[#e9eaec]"
                    onClick={() => history.back()}
                  >
                    取消
                  </Button>
                </div>
              </footer>
            </div>

            <aside className="hidden xl:block">
              <div className="sticky top-6">
                <SectionNavigator
                  activeKey={activeSection}
                  onSelect={handleSectionLocate}
                />
              </div>
            </aside>
          </div>
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
                      setRules((current) => [
                        ...current,
                        defaults(template),
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
      </div>
    </ConfigProvider>
  );
};

export default MonitorEditorPage;
