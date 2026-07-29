export type RealtimeTaskMode = 'SINGLE_TABLE' | 'MULTI_TABLE' | 'CUSTOM_YAML';

export type RealtimeTaskStatus = 'DRAFT' | 'RUNNING' | 'STOPPED' | 'FAILED';

export interface RealtimeTaskRecord {
  id: string;
  name: string;
  description?: string;
  mode: RealtimeTaskMode;
  status: RealtimeTaskStatus;
  sourceType: string;
  sourceSummary: string;
  sinkType: string;
  sinkSummary: string;
  flinkVersion: string;
  cdcVersion: string;
  updatedAt: string;
  yaml?: string;
}

export interface ColumnMapping {
  id: string;
  sourceName: string;
  sourceType: string;
  selected: boolean;
  targetName: string;
  expression: string;
  computed: boolean;
  comment?: string;
}

export interface TableOptionEntry {
  id: string;
  key: string;
  value: string;
}

export interface UdfOptionEntry {
  id: string;
  key: string;
  value: string;
}

export interface UdfDefinition {
  id: string;
  name: string;
  classpath: string;
  options: UdfOptionEntry[];
}

export interface TransformRule {
  id: string;
  sourceTable: string;
  description: string;
  columns: ColumnMapping[];
  filter: string;
  primaryKeys: string[];
  partitionKeys: string[];
  tableOptions: TableOptionEntry[];
  tableOptionsDelimiter: string;
}

export interface SourceConfig {
  dataSourceId: string;
  type: 'mysql' | 'postgres' | 'oracle';
  database: string;
  schema: string;
  table: string;
  tables: string[];
  tablePattern: string;
  startupMode: 'initial' | 'latest-offset' | 'specific-offset' | 'timestamp';
  serverId: string;
  timezone: string;
  advanced: TableOptionEntry[];
}

export interface SinkConfig {
  dataSourceId: string;
  type: 'doris' | 'paimon' | 'starrocks' | 'iceberg';
  database: string;
  schema: string;
  table: string;
  tablePrefix: string;
  tableSuffix: string;
  createTable: boolean;
  schemaChangeBehavior: 'evolve' | 'try_evolve' | 'lenient' | 'ignore' | 'exception';
  advanced: TableOptionEntry[];
}

export interface PipelineConfig {
  name: string;
  description: string;
  parallelism: number;
  timezone: string;
  schemaOperatorUid: string;
  localTimezone: string;
  checkpointInterval: number;
  restartStrategy: 'fixed-delay' | 'failure-rate' | 'none';
  flinkVersion: string;
  cdcVersion: string;
}

export interface SingleTableDraft {
  taskId: string;
  mode: 'SINGLE_TABLE';
  pipeline: PipelineConfig;
  source: SourceConfig;
  sink: SinkConfig;
  transform: TransformRule;
  udfs: UdfDefinition[];
}

export interface MultiTableDraft {
  taskId: string;
  mode: 'MULTI_TABLE';
  pipeline: PipelineConfig;
  source: SourceConfig;
  sink: SinkConfig;
  transforms: TransformRule[];
  routes: Array<{
    id: string;
    sourceTable: string;
    sinkTable: string;
    description: string;
  }>;
  udfs: UdfDefinition[];
}

export interface CustomYamlDraft {
  taskId: string;
  mode: 'CUSTOM_YAML';
  name: string;
  description: string;
  flinkVersion: string;
  cdcVersion: string;
  yaml: string;
}
