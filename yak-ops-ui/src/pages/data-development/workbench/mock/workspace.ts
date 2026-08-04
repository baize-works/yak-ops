import dayjs from 'dayjs';
import {
  DEFAULT_COMMON_RUNTIME,
  type DevelopmentDocument,
  type DevelopmentResource,
  type NodePluginDefinition,
  type ResourceContent,
  type WorkspaceSnapshot,
} from '../core/types';
import { BUILTIN_NODE_PLUGINS } from '../plugins';

const pluginByType = new Map<string, NodePluginDefinition>(
  BUILTIN_NODE_PLUGINS.map((plugin) => [plugin.type, plugin]),
);

const now = '2026-08-04 10:20';

const createResource = (
  id: string,
  name: string,
  resourceType: string,
  options: Partial<DevelopmentResource> = {},
): DevelopmentResource => {
  const plugin = pluginByType.get(resourceType);
  if (!plugin) throw new Error(`Unknown mock plugin: ${resourceType}`);

  return {
    id,
    projectId: 'user-data-platform',
    parentId: null,
    folderId: plugin.metadata.folderId,
    nodeType: 'ARTIFACT',
    resourceType,
    name,
    description: plugin.metadata.description,
    owner: 'me',
    favorite: false,
    engine: plugin.metadata.defaultEngine,
    status: 'DRAFT',
    schemaVersion: plugin.version,
    latestRevision: 1,
    createdAt: now,
    updatedAt: now,
    ...options,
  };
};

const createDocument = (
  resource: DevelopmentResource,
  content?: ResourceContent,
  options: Partial<DevelopmentDocument> = {},
): DevelopmentDocument => {
  const plugin = pluginByType.get(resource.resourceType);
  if (!plugin) throw new Error(`Unknown mock plugin: ${resource.resourceType}`);

  return {
    resourceId: resource.id,
    revision: resource.latestRevision,
    schemaVersion: plugin.version,
    content: content ?? plugin.authoring.createDefaultContent(resource.name),
    config: {},
    runtime: {
      common: { ...DEFAULT_COMMON_RUNTIME },
      specific: plugin.runtime?.defaultValue() ?? {},
    },
    dirty: false,
    loadStatus: 'READY',
    saveStatus: 'IDLE',
    updatedAt: resource.updatedAt,
    ...options,
  };
};

export const createMockWorkspaceSnapshot = (): WorkspaceSnapshot => {
  const resources: DevelopmentResource[] = [
    createResource('mysql-sql-etl', 'mysql_sql_etl.sql', 'FLINK_SQL', {
      favorite: true,
      description: '从 MySQL 读取用户行为数据，清洗后写入 ODPS。',
      status: 'PUBLISHED',
      publishedVersion: 7,
      latestRevision: 8,
      updatedAt: '2026-08-04 09:20',
    }),
    createResource('user-behavior-agg', 'user_behavior_agg.sql', 'SQL', {
      engine: 'Spark SQL',
      updatedAt: '2026-08-04 08:46',
    }),
    createResource('dim-user-profile', 'dim_user_profile.sql', 'SQL', {
      engine: 'Hive',
      owner: 'other',
      favorite: true,
    }),
    createResource('ods-to-dwd-flink', 'ods_to_dwd_flink.sql', 'FLINK_SQL'),
    createResource('udf-string-masking', 'udf_string_masking.py', 'PYTHON', {
      favorite: true,
      updatedAt: '2026-08-03 16:21',
    }),
    createResource('shell-clean-log', 'shell_clean_log.sh', 'SHELL', {
      updatedAt: '2026-08-03 17:20',
    }),
    createResource(
      'notebook-user-profile',
      'notebook_user_profile.ipynb',
      'NOTEBOOK',
      {
        favorite: true,
        updatedAt: '2026-08-03 18:45',
      },
    ),
    createResource(
      'sync-odps-odps',
      'sync_odps_to_odps_20260803',
      'DATA_INTEGRATION',
      { favorite: true },
    ),
    createResource('http-user-profile', 'fetch_user_profile_api', 'HTTP'),
    createResource('dev-env', 'dev.env', 'RESOURCE'),
  ];

  const documents = resources.map((resource) => {
    if (resource.id === 'mysql-sql-etl') {
      return createDocument(resource, {
        kind: 'text',
        language: 'sql',
        value: [
          '-- ================================================================',
          '-- Yak-ops 数据开发 - Flink SQL 脚本',
          '-- 任务名称: mysql_sql_etl',
          '-- 创建人: admin',
          '-- 描述: 从 MySQL 读取用户行为数据，清洗后写入 ODPS',
          '-- ================================================================',
          '',
          "SET 'execution.checkpointing.interval' = '60s';",
          "SET 'parallelism.default' = '4';",
          '',
          'CREATE TABLE src_user_behavior (',
          '  user_id BIGINT,',
          '  event_type STRING,',
          '  event_time TIMESTAMP(3),',
          '  event_value STRING,',
          '  dt STRING',
          ') WITH (',
          "  'connector' = 'mysql-cdc',",
          "  'hostname' = 'rm-bp1abcd123.mysql.rds.aliyuncs.com',",
          "  'port' = '3306',",
          "  'username' = 'yakops',",
          "  'password' = '******',",
          "  'database-name' = 'user_db',",
          "  'table-name' = 'user_behavior',",
          "  'server-time-zone' = 'Asia/Shanghai'",
          ');',
          '',
          '-- 清洗与转换',
          'INSERT INTO dwd_user_behavior',
          'SELECT',
          '  user_id,',
          '  UPPER(event_type) AS event_type,',
          '  event_time,',
          '  event_value,',
          "  DATE_FORMAT(event_time, 'yyyyMMdd') AS dt",
          'FROM src_user_behavior;',
        ].join('\n'),
      });
    }

    if (resource.id === 'udf-string-masking') {
      return createDocument(resource, {
        kind: 'text',
        language: 'python',
        value: [
          'from typing import Optional',
          '',
          '',
          'def mask_phone(value: Optional[str]) -> str:',
          '    """Mask a mobile number while retaining both ends."""',
          '    if not value or len(value) < 7:',
          '        return value or ""',
          '    return f"{value[:3]}****{value[-4:]}"',
        ].join('\n'),
      });
    }

    if (resource.id === 'shell-clean-log') {
      return createDocument(resource, {
        kind: 'text',
        language: 'shell',
        value: [
          '#!/usr/bin/env bash',
          'set -euo pipefail',
          '',
          'LOG_DIR="/data/yak-ops/logs"',
          'RETENTION_DAYS=14',
          '',
          'find "$LOG_DIR" -type f -name "*.log" -mtime +$RETENTION_DAYS -delete',
          'echo "expired logs cleaned"',
        ].join('\n'),
      });
    }

    return createDocument(resource);
  });

  return {
    resources,
    documents,
    openResourceIds: [
      'mysql-sql-etl',
      'sync-odps-odps',
      'notebook-user-profile',
      'http-user-profile',
      'shell-clean-log',
    ],
    activeResourceId: 'mysql-sql-etl',
  };
};

export const createNewResource = (
  plugin: NodePluginDefinition,
  name: string,
): { resource: DevelopmentResource; document: DevelopmentDocument } => {
  const timestamp = Date.now();
  const rawName = name.trim();
  const extension = plugin.metadata.extension ?? '';
  const normalizedName =
    extension && !rawName.endsWith(extension) ? `${rawName}${extension}` : rawName;
  const id = `${plugin.type.toLowerCase()}-${timestamp}`;
  const updatedAt = dayjs().format('YYYY-MM-DD HH:mm');

  const resource = createResource(id, normalizedName, plugin.type, {
    folderId: plugin.metadata.folderId,
    engine: plugin.metadata.defaultEngine,
    updatedAt,
    createdAt: updatedAt,
    latestRevision: 0,
  });

  const document = createDocument(resource, plugin.authoring.createDefaultContent(normalizedName), {
    revision: 0,
    dirty: true,
    updatedAt,
  });

  return { resource, document };
};
