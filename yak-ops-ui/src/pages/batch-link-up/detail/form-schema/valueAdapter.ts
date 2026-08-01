import type { ConnectorFormValues, ConnectorRole } from './types';

const RELATIONAL_TYPES = new Set([
  'MYSQL',
  'MARIADB',
  'POSTGRE_SQL',
  'POSTGRESQL',
  'POSTGRES',
  'ORACLE',
  'SQLSERVER',
  'SQL_SERVER',
  'DORIS',
  'STARROCKS',
  'CLICKHOUSE',
  'DB2',
  'HIVE',
  'KINGBASE',
  'DAMENG',
  'DM',
  'JDBC',
]);

export const connectorIdForDataSourceType = (value?: string): string => {
  const normalized = (value || '').trim().toUpperCase().replace(/-/g, '_');
  if (!normalized) return '';
  return RELATIONAL_TYPES.has(normalized) ? 'jdbc' : normalized.toLowerCase();
};

const splitKeys = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const toSchemaValues = (
  config: Record<string, any>,
  role: ConnectorRole,
): ConnectorFormValues => {
  const values: ConnectorFormValues = {
    ...(config.connectorOptions || {}),
  };

  if (role === 'SOURCE') {
    Object.assign(values, {
      table_path: config.table || undefined,
      table_list: config.tables || [],
      query: config.sql || undefined,
      where_condition: config.whereCondition || undefined,
      fetch_size: config.fetchSize,
      partition_column: config.partitionColumn,
      partition_num: config.partitionNum,
      partition_lower_bound: config.partitionLowerBound,
      partition_upper_bound: config.partitionUpperBound,
      split_planning_mode: config.splitPlanningMode,
      statistics_query_timeout: config.statisticsQueryTimeout,
      sample_size: config.sampleSize,
      allow_statistics_fallback: config.allowStatisticsFallback,
      null_partition_single_split: config.nullPartitionSingleSplit,
      multi_table_failure_policy: config.multiTableFailurePolicy,
      int_type_narrowing: config.intTypeNarrowing,
    });
  } else {
    const writeMode = String(config.writeMode || 'append').toLowerCase();
    Object.assign(values, {
      table_path: config.targetTableName || config.table || undefined,
      schema_save_mode: config.autoCreateTable
        ? 'CREATE_SCHEMA_WHEN_NOT_EXIST'
        : 'ERROR_WHEN_SCHEMA_NOT_EXIST',
      data_save_mode: writeMode === 'overwrite' ? 'DROP_DATA' : 'APPEND_DATA',
      write_mode: writeMode === 'upsert' ? 'UPSERT' : 'INSERT',
      primary_keys: splitKeys(config.primaryKey),
      custom_sql: config.sql || undefined,
      batch_size: config.batchSize,
      prepared_statement_cache_size: config.preparedStatementCacheSize,
      query_timeout_sec: config.queryTimeoutSec,
      max_retries: config.maxRetries,
      dirty_data_policy: config.dirtyDataPolicy,
      dirty_data_output_type: config.dirtyDataOutputType,
      dirty_data_output_path: config.dirtyDataOutputPath,
      dirty_data_max_samples: config.dirtyDataMaxSamples,
      dirty_data_max_count: config.dirtyDataMaxCount,
      dirty_data_max_percentage: config.dirtyDataMaxPercentage,
      create_primary_key: config.createPrimaryKey,
    });
  }

  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );
};

const snakeToCamel = (value: string) =>
  value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

export const applySchemaValue = (
  config: Record<string, any>,
  role: ConnectorRole,
  key: string,
  value: unknown,
): Record<string, any> => {
  const connectorOptions = {
    ...(config.connectorOptions || {}),
    [key]: value,
  };
  const patch: Record<string, any> = { connectorOptions };

  if (role === 'SOURCE') {
    const mapping: Record<string, string> = {
      table_path: 'table',
      table_list: 'tables',
      query: 'sql',
      where_condition: 'whereCondition',
      fetch_size: 'fetchSize',
      partition_column: 'partitionColumn',
      partition_num: 'partitionNum',
      partition_lower_bound: 'partitionLowerBound',
      partition_upper_bound: 'partitionUpperBound',
      split_planning_mode: 'splitPlanningMode',
      statistics_query_timeout: 'statisticsQueryTimeout',
      sample_size: 'sampleSize',
      allow_statistics_fallback: 'allowStatisticsFallback',
      null_partition_single_split: 'nullPartitionSingleSplit',
      multi_table_failure_policy: 'multiTableFailurePolicy',
      int_type_narrowing: 'intTypeNarrowing',
    };
    patch[mapping[key] || snakeToCamel(key)] = value;
    return patch;
  }

  if (key === 'table_path') {
    patch[config.autoCreateTable ? 'targetTableName' : 'table'] = value;
  } else if (key === 'schema_save_mode') {
    patch.autoCreateTable = value === 'CREATE_SCHEMA_WHEN_NOT_EXIST';
  } else if (key === 'data_save_mode') {
    if (value === 'DROP_DATA') patch.writeMode = 'overwrite';
    if (value === 'APPEND_DATA' && config.writeMode !== 'upsert') patch.writeMode = 'append';
  } else if (key === 'write_mode') {
    patch.writeMode = value === 'UPSERT'
      ? 'upsert'
      : config.writeMode === 'overwrite'
        ? 'overwrite'
        : 'append';
  } else if (key === 'primary_keys') {
    patch.primaryKey = Array.isArray(value) ? value.join(',') : value;
  } else {
    const mapping: Record<string, string> = {
      custom_sql: 'sql',
      batch_size: 'batchSize',
      prepared_statement_cache_size: 'preparedStatementCacheSize',
      query_timeout_sec: 'queryTimeoutSec',
      max_retries: 'maxRetries',
      dirty_data_policy: 'dirtyDataPolicy',
      dirty_data_output_type: 'dirtyDataOutputType',
      dirty_data_output_path: 'dirtyDataOutputPath',
      dirty_data_max_samples: 'dirtyDataMaxSamples',
      dirty_data_max_count: 'dirtyDataMaxCount',
      dirty_data_max_percentage: 'dirtyDataMaxPercentage',
      create_primary_key: 'createPrimaryKey',
    };
    patch[mapping[key] || snakeToCamel(key)] = value;
  }
  return patch;
};
