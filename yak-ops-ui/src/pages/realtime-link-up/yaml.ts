import type {
  MultiTableDraft,
  SingleTableDraft,
  TableOptionEntry,
  TransformRule,
  UdfDefinition,
} from './types';

const quote = (value: string) => {
  if (!value) return '""';
  if (/^[a-zA-Z0-9_./:*\\-]+$/.test(value)) return value;
  return JSON.stringify(value);
};

const indent = (level: number) => '  '.repeat(level);

const appendOptions = (
  lines: string[],
  options: TableOptionEntry[],
  level: number,
) => {
  options
    .filter((option) => option.key.trim())
    .forEach((option) => {
      lines.push(`${indent(level)}${option.key.trim()}: ${quote(option.value)}`);
    });
};

const projectionOf = (rule: TransformRule) => {
  const expressions = rule.columns
    .filter((column) => column.selected)
    .map((column) => {
      const expression = column.expression.trim() || column.sourceName;
      const targetName = column.targetName.trim() || column.sourceName;
      const isDirect = expression === column.sourceName && targetName === column.sourceName;
      return isDirect ? column.sourceName : `${expression} AS ${targetName}`;
    });
  return expressions.length ? expressions.join(', ') : '\\*';
};

const appendTransform = (lines: string[], rule: TransformRule) => {
  lines.push(`  - source-table: ${quote(rule.sourceTable)}`);
  lines.push(`    projection: ${quote(projectionOf(rule))}`);
  if (rule.filter.trim()) lines.push(`    filter: ${quote(rule.filter.trim())}`);
  if (rule.primaryKeys.length) {
    lines.push(`    primary-keys: ${quote(rule.primaryKeys.join(', '))}`);
  }
  if (rule.partitionKeys.length) {
    lines.push(`    partition-keys: ${quote(rule.partitionKeys.join(', '))}`);
  }
  const tableOptions = rule.tableOptions
    .filter((option) => option.key.trim())
    .map((option) => `${option.key.trim()}=${option.value}`)
    .join(rule.tableOptionsDelimiter || ',');
  if (tableOptions) {
    lines.push(`    table-options: ${quote(tableOptions)}`);
    if ((rule.tableOptionsDelimiter || ',') !== ',') {
      lines.push(`    table-options.delimiter: ${quote(rule.tableOptionsDelimiter)}`);
    }
  }
  if (rule.description.trim()) {
    lines.push(`    description: ${quote(rule.description.trim())}`);
  }
};

const appendUdfs = (lines: string[], udfs: UdfDefinition[]) => {
  const validUdfs = udfs.filter((udf) => udf.name.trim() && udf.classpath.trim());
  if (!validUdfs.length) return;
  lines.push('  user-defined-function:');
  validUdfs.forEach((udf) => {
    lines.push(`    - name: ${quote(udf.name.trim())}`);
    lines.push(`      classpath: ${quote(udf.classpath.trim())}`);
    const options = udf.options.filter((option) => option.key.trim());
    if (options.length) {
      lines.push('      options:');
      options.forEach((option) => {
        lines.push(`        ${option.key.trim()}: ${quote(option.value)}`);
      });
    }
  });
};

const appendPipeline = (
  lines: string[],
  draft: SingleTableDraft | MultiTableDraft,
) => {
  lines.push('pipeline:');
  lines.push(`  name: ${quote(draft.pipeline.name)}`);
  lines.push(`  parallelism: ${draft.pipeline.parallelism}`);
  lines.push(`  schema.change.behavior: ${draft.sink.schemaChangeBehavior}`);
  lines.push(`  local-time-zone: ${quote(draft.pipeline.localTimezone)}`);
  lines.push(`  schema-operator.uid: ${quote(draft.pipeline.schemaOperatorUid)}`);
  appendUdfs(lines, draft.udfs);
};

const appendSource = (
  lines: string[],
  draft: SingleTableDraft | MultiTableDraft,
) => {
  lines.push('source:');
  lines.push(`  type: ${draft.source.type}`);
  lines.push(`  datasource-id: ${quote(draft.source.dataSourceId)}`);
  if (draft.source.database) lines.push(`  database: ${quote(draft.source.database)}`);
  if (draft.source.schema) lines.push(`  schema: ${quote(draft.source.schema)}`);
  const tables =
    draft.mode === 'SINGLE_TABLE'
      ? [draft.source.database, draft.source.schema, draft.source.table]
          .filter(Boolean)
          .join('.')
      : draft.source.tablePattern || draft.source.tables.join('|');
  lines.push(`  tables: ${quote(tables)}`);
  lines.push(`  scan.startup.mode: ${draft.source.startupMode}`);
  if (draft.source.type === 'mysql' && draft.source.serverId) {
    lines.push(`  server-id: ${quote(draft.source.serverId)}`);
  }
  if (draft.source.timezone) {
    lines.push(`  server-time-zone: ${quote(draft.source.timezone)}`);
  }
  appendOptions(lines, draft.source.advanced, 1);
};

const appendSink = (
  lines: string[],
  draft: SingleTableDraft | MultiTableDraft,
) => {
  lines.push('sink:');
  lines.push(`  type: ${draft.sink.type}`);
  lines.push(`  datasource-id: ${quote(draft.sink.dataSourceId)}`);
  if (draft.sink.database) lines.push(`  database: ${quote(draft.sink.database)}`);
  if (draft.sink.schema) lines.push(`  schema: ${quote(draft.sink.schema)}`);
  if (draft.mode === 'SINGLE_TABLE' && draft.sink.table) {
    lines.push(`  table: ${quote(draft.sink.table)}`);
  }
  if (draft.mode === 'MULTI_TABLE') {
    if (draft.sink.tablePrefix) lines.push(`  table-prefix: ${quote(draft.sink.tablePrefix)}`);
    if (draft.sink.tableSuffix) lines.push(`  table-suffix: ${quote(draft.sink.tableSuffix)}`);
  }
  appendOptions(lines, draft.sink.advanced, 1);
};

export const buildSingleTableYaml = (draft: SingleTableDraft) => {
  const lines: string[] = [];
  appendSource(lines, draft);
  lines.push('');
  appendSink(lines, draft);
  lines.push('');
  lines.push('transform:');
  appendTransform(lines, draft.transform);
  lines.push('');
  appendPipeline(lines, draft);
  return lines.join('\n');
};

export const buildMultiTableYaml = (draft: MultiTableDraft) => {
  const lines: string[] = [];
  appendSource(lines, draft);
  lines.push('');
  appendSink(lines, draft);
  if (draft.transforms.length) {
    lines.push('');
    lines.push('transform:');
    draft.transforms.forEach((rule) => appendTransform(lines, rule));
  }
  if (draft.routes.length) {
    lines.push('');
    lines.push('route:');
    draft.routes.forEach((route) => {
      lines.push(`  - source-table: ${quote(route.sourceTable)}`);
      lines.push(`    sink-table: ${quote(route.sinkTable)}`);
      if (route.description.trim()) {
        lines.push(`    description: ${quote(route.description.trim())}`);
      }
    });
  }
  lines.push('');
  appendPipeline(lines, draft);
  return lines.join('\n');
};

export const validateCustomYaml = (yaml: string) => {
  const missing = ['source:', 'sink:', 'pipeline:'].filter(
    (section) => !new RegExp(`^${section}`, 'm').test(yaml),
  );
  return {
    valid: missing.length === 0,
    missing,
  };
};
