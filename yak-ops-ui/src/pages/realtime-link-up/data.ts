import type {
  ColumnMapping,
  MultiTableDraft,
  PipelineConfig,
  RealtimeTaskMode,
  RealtimeTaskRecord,
  SingleTableDraft,
  SourceConfig,
  SinkConfig,
  TransformRule,
  UdfDefinition,
} from './types';

export const REALTIME_TASK_STORAGE_KEY = 'yak-ops-realtime-task-records';
export const REALTIME_DRAFT_STORAGE_PREFIX = 'yak-ops-realtime-draft-';

export const modeMeta: Record<
  RealtimeTaskMode,
  { label: string; description: string; className: string }
> = {
  SINGLE_TABLE: {
    label: '单表同步',
    description: '一个来源表同步到一个目标表，支持完整 Transform 配置。',
    className: 'border-[#c7d7fe] bg-[#eff4ff] text-[#315efb]',
  },
  MULTI_TABLE: {
    label: '多表同步',
    description: '整库或多表同步，支持多条 Transform 与 Route 规则。',
    className: 'border-[#d9d6fe] bg-[#f4f3ff] text-[#6938ef]',
  },
  CUSTOM_YAML: {
    label: '自定义 YAML',
    description: '直接编辑或导入 Flink CDC Pipeline YAML。',
    className: 'border-[#fedf89] bg-[#fffaeb] text-[#b54708]',
  },
};

export const sourceDataSourceOptions = [
  { label: '生产环境 / MySQL 订单库', value: 'mysql-prod-order', type: 'mysql' },
  { label: '测试环境 / MySQL 业务库', value: 'mysql-test-app', type: 'mysql' },
  { label: '生产环境 / PostgreSQL 用户库', value: 'pg-prod-user', type: 'postgres' },
  { label: '生产环境 / Oracle HIS', value: 'oracle-prod-his', type: 'oracle' },
];

export const sinkDataSourceOptions = [
  { label: '生产环境 / Doris 数仓', value: 'doris-prod-warehouse', type: 'doris' },
  { label: '生产环境 / Paimon Lakehouse', value: 'paimon-prod-lake', type: 'paimon' },
  { label: '生产环境 / StarRocks', value: 'starrocks-prod', type: 'starrocks' },
  { label: '生产环境 / Iceberg Catalog', value: 'iceberg-prod', type: 'iceberg' },
];

export const sampleTables = [
  'trade_db.order_main',
  'trade_db.order_item',
  'trade_db.order_payment',
  'trade_db.order_refund',
  'trade_db.order_address',
];

export const sampleColumns: ColumnMapping[] = [
  { id: 'id', sourceName: 'id', sourceType: 'BIGINT', selected: true, targetName: 'id', expression: 'id', computed: false, comment: '主键' },
  { id: 'order_no', sourceName: 'order_no', sourceType: 'STRING', selected: true, targetName: 'order_no', expression: 'order_no', computed: false },
  { id: 'user_id', sourceName: 'user_id', sourceType: 'BIGINT', selected: true, targetName: 'user_id', expression: 'user_id', computed: false },
  { id: 'product_name', sourceName: 'product_name', sourceType: 'STRING', selected: true, targetName: 'product_name', expression: 'product_name', computed: false },
  { id: 'amount', sourceName: 'amount', sourceType: 'DECIMAL(18,2)', selected: true, targetName: 'amount', expression: 'amount', computed: false },
  { id: 'status', sourceName: 'status', sourceType: 'STRING', selected: true, targetName: 'status', expression: 'status', computed: false },
  { id: 'created_at', sourceName: 'created_at', sourceType: 'TIMESTAMP', selected: true, targetName: 'created_at', expression: 'created_at', computed: false },
  { id: 'updated_at', sourceName: 'updated_at', sourceType: 'TIMESTAMP', selected: true, targetName: 'updated_at', expression: 'updated_at', computed: false },
];

export const transformFunctionGroups = [
  {
    label: '字符串函数',
    options: [
      { label: 'UPPER(value)', value: 'UPPER(${field})' },
      { label: 'LOWER(value)', value: 'LOWER(${field})' },
      { label: 'TRIM(value)', value: 'TRIM(${field})' },
      { label: 'CONCAT(a, b)', value: "CONCAT(${field}, '')" },
      { label: 'SUBSTRING(value, 1, 10)', value: 'SUBSTRING(${field}, 1, 10)' },
      { label: 'REGEXP_REPLACE(value, pattern, replacement)', value: "REGEXP_REPLACE(${field}, '', '')" },
    ],
  },
  {
    label: '时间函数',
    options: [
      { label: 'CURRENT_TIMESTAMP', value: 'CURRENT_TIMESTAMP' },
      { label: 'LOCALTIME', value: 'LOCALTIME' },
      { label: 'LOCALTIMESTAMP', value: 'LOCALTIMESTAMP' },
      { label: 'DATE_FORMAT(time, format)', value: "DATE_FORMAT(${field}, 'yyyy-MM-dd HH:mm:ss')" },
      { label: 'TIMESTAMPDIFF(unit, start, end)', value: 'TIMESTAMPDIFF(DAY, ${field}, CURRENT_TIMESTAMP)' },
    ],
  },
  {
    label: '算术函数',
    options: [
      { label: 'ABS(value)', value: 'ABS(${field})' },
      { label: 'ROUND(value, 2)', value: 'ROUND(${field}, 2)' },
      { label: 'CEIL(value)', value: 'CEIL(${field})' },
      { label: 'FLOOR(value)', value: 'FLOOR(${field})' },
      { label: 'value * 100', value: '${field} * 100' },
    ],
  },
  {
    label: '条件函数',
    options: [
      { label: 'CASE WHEN', value: "CASE WHEN ${field} IS NULL THEN '' ELSE ${field} END" },
      { label: 'COALESCE(value, default)', value: "COALESCE(${field}, '')" },
      { label: 'NULLIF(a, b)', value: "NULLIF(${field}, '')" },
    ],
  },
];

const now = () => new Date().toLocaleString('zh-CN', { hour12: false });
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createTaskId = () => `rt-${Date.now()}`;

export const createDefaultPipeline = (name = '未命名实时同步任务'): PipelineConfig => ({
  name,
  description: '',
  parallelism: 2,
  timezone: 'Asia/Shanghai',
  schemaOperatorUid: 'schema-operator',
  localTimezone: 'Asia/Shanghai',
  checkpointInterval: 60,
  restartStrategy: 'fixed-delay',
  flinkVersion: '2.2.1',
  cdcVersion: '3.6.0',
});

export const createDefaultSource = (): SourceConfig => ({
  dataSourceId: 'mysql-prod-order',
  type: 'mysql',
  database: 'trade_db',
  schema: '',
  table: 'order_main',
  tables: ['trade_db.order_main', 'trade_db.order_item'],
  tablePattern: 'trade_db.order_.*',
  startupMode: 'initial',
  serverId: '5400-5404',
  timezone: 'Asia/Shanghai',
  advanced: [],
});

export const createDefaultSink = (): SinkConfig => ({
  dataSourceId: 'doris-prod-warehouse',
  type: 'doris',
  database: 'ods_db',
  schema: '',
  table: 'ods_order_main',
  tablePrefix: 'ods_',
  tableSuffix: '',
  createTable: true,
  schemaChangeBehavior: 'evolve',
  advanced: [],
});

export const createDefaultTransform = (sourceTable = 'trade_db.order_main'): TransformRule => ({
  id: uid('transform'),
  sourceTable,
  description: '',
  columns: sampleColumns.map((column) => ({ ...column })),
  filter: '',
  primaryKeys: ['id'],
  partitionKeys: [],
  tableOptions: [],
  tableOptionsDelimiter: ',',
});

export const createDefaultUdf = (): UdfDefinition => ({
  id: uid('udf'),
  name: '',
  classpath: '',
  options: [],
});

export const createDefaultSingleDraft = (taskId: string): SingleTableDraft => ({
  taskId,
  mode: 'SINGLE_TABLE',
  pipeline: createDefaultPipeline('订单单表实时同步'),
  source: createDefaultSource(),
  sink: createDefaultSink(),
  transform: createDefaultTransform(),
  udfs: [],
});

export const createDefaultMultiDraft = (taskId: string): MultiTableDraft => ({
  taskId,
  mode: 'MULTI_TABLE',
  pipeline: createDefaultPipeline('订单库多表实时同步'),
  source: createDefaultSource(),
  sink: createDefaultSink(),
  transforms: [
    createDefaultTransform('trade_db.order_main'),
    createDefaultTransform('trade_db.order_item'),
  ],
  routes: [
    { id: uid('route'), sourceTable: 'trade_db.order_main', sinkTable: 'ods_db.ods_order_main', description: '' },
    { id: uid('route'), sourceTable: 'trade_db.order_item', sinkTable: 'ods_db.ods_order_item', description: '' },
  ],
  udfs: [],
});

const builtinTasks: RealtimeTaskRecord[] = [
  {
    id: 'rt-demo-001',
    name: '订单主表实时同步',
    description: 'MySQL 订单主表实时写入 Doris ODS 层',
    mode: 'SINGLE_TABLE',
    status: 'RUNNING',
    sourceType: 'MySQL CDC',
    sourceSummary: 'trade_db.order_main',
    sinkType: 'Doris',
    sinkSummary: 'ods_db.ods_order_main',
    flinkVersion: '2.2.1',
    cdcVersion: '3.6.0',
    updatedAt: now(),
  },
  {
    id: 'rt-demo-002',
    name: '订单库多表实时入仓',
    description: 'order_* 多表同步与路由',
    mode: 'MULTI_TABLE',
    status: 'DRAFT',
    sourceType: 'MySQL CDC',
    sourceSummary: 'trade_db.order_*（5 张表）',
    sinkType: 'Doris',
    sinkSummary: 'ods_db.ods_*',
    flinkVersion: '2.2.1',
    cdcVersion: '3.6.0',
    updatedAt: now(),
  },
  {
    id: 'rt-demo-003',
    name: '自定义会员同步 Pipeline',
    description: '通过 YAML 管理复杂 Pipeline 配置',
    mode: 'CUSTOM_YAML',
    status: 'STOPPED',
    sourceType: 'PostgreSQL CDC',
    sourceSummary: 'member.public.*',
    sinkType: 'Paimon',
    sinkSummary: 'ods_member.*',
    flinkVersion: '2.2.1',
    cdcVersion: '3.6.0',
    updatedAt: now(),
  },
];

export const loadRealtimeTasks = (): RealtimeTaskRecord[] => {
  if (typeof window === 'undefined') return builtinTasks;
  try {
    const raw = window.localStorage.getItem(REALTIME_TASK_STORAGE_KEY);
    if (!raw) return builtinTasks;
    const saved = JSON.parse(raw) as RealtimeTaskRecord[];
    const demoIds = new Set(saved.map((item) => item.id));
    return [...saved, ...builtinTasks.filter((item) => !demoIds.has(item.id))];
  } catch {
    return builtinTasks;
  }
};

export const saveRealtimeTask = (task: RealtimeTaskRecord) => {
  if (typeof window === 'undefined') return;
  const tasks = loadRealtimeTasks().filter((item) => !item.id.startsWith('rt-demo-'));
  const next = [task, ...tasks.filter((item) => item.id !== task.id)];
  window.localStorage.setItem(REALTIME_TASK_STORAGE_KEY, JSON.stringify(next));
};

export const removeRealtimeTask = (taskId: string) => {
  if (typeof window === 'undefined') return;
  const tasks = loadRealtimeTasks().filter(
    (item) => item.id !== taskId && !item.id.startsWith('rt-demo-'),
  );
  window.localStorage.setItem(REALTIME_TASK_STORAGE_KEY, JSON.stringify(tasks));
};

export const saveRealtimeDraft = (taskId: string, draft: unknown) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${REALTIME_DRAFT_STORAGE_PREFIX}${taskId}`, JSON.stringify(draft));
};

export const loadRealtimeDraft = <T,>(taskId: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${REALTIME_DRAFT_STORAGE_PREFIX}${taskId}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const formatUpdatedAt = () => now();
