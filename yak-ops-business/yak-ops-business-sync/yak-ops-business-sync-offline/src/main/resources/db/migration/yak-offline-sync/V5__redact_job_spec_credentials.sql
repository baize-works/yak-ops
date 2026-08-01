-- Convert previously persisted resolved JobSpecs back to logical control-plane JobSpecs.
-- Credentials are resolved from datasource references only for the outbound Link-Up request.
-- Phase-four payloads may have used datasource types (MYSQL/ORACLE/...) as connector IDs,
-- so this migration also normalizes all relational variants to the Link-Up connector ID "jdbc".

UPDATE yak_offline_job_definition
SET job_spec_json = JSON_SET(
        JSON_REMOVE(
            job_spec_json,
            '$.source.options.url',
            '$.source.options.driver',
            '$.source.options.username',
            '$.source.options.password',
            '$.source.options.schema',
            '$.source.options.properties'),
        '$.source.connectorId',
        'jdbc',
        '$.source.dataSourceRef.id',
        source_datasource_id)
WHERE job_spec_json IS NOT NULL
  AND JSON_VALID(job_spec_json)
  AND source_datasource_id IS NOT NULL
  AND UPPER(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(job_spec_json, '$.source.connectorId')), '-', '_'))
      IN ('JDBC','MYSQL','MARIADB','POSTGRE_SQL','POSTGRESQL','POSTGRES','ORACLE',
          'SQLSERVER','SQL_SERVER','DORIS','STARROCKS','CLICKHOUSE','DB2','HIVE',
          'KINGBASE','DAMENG','DM');

UPDATE yak_offline_job_definition
SET job_spec_json = JSON_SET(
        JSON_REMOVE(
            job_spec_json,
            '$.sink.options.url',
            '$.sink.options.driver',
            '$.sink.options.username',
            '$.sink.options.password',
            '$.sink.options.schema',
            '$.sink.options.properties'),
        '$.sink.connectorId',
        'jdbc',
        '$.sink.dataSourceRef.id',
        sink_datasource_id)
WHERE job_spec_json IS NOT NULL
  AND JSON_VALID(job_spec_json)
  AND sink_datasource_id IS NOT NULL
  AND UPPER(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(job_spec_json, '$.sink.connectorId')), '-', '_'))
      IN ('JDBC','MYSQL','MARIADB','POSTGRE_SQL','POSTGRESQL','POSTGRES','ORACLE',
          'SQLSERVER','SQL_SERVER','DORIS','STARROCKS','CLICKHOUSE','DB2','HIVE',
          'KINGBASE','DAMENG','DM');

UPDATE yak_offline_job_version version_record
JOIN yak_offline_job_definition definition
  ON definition.id = version_record.job_definition_id
SET version_record.job_spec_json = JSON_SET(
        JSON_REMOVE(
            version_record.job_spec_json,
            '$.source.options.url',
            '$.source.options.driver',
            '$.source.options.username',
            '$.source.options.password',
            '$.source.options.schema',
            '$.source.options.properties'),
        '$.source.connectorId',
        'jdbc',
        '$.source.dataSourceRef.id',
        definition.source_datasource_id)
WHERE version_record.job_spec_json IS NOT NULL
  AND JSON_VALID(version_record.job_spec_json)
  AND definition.source_datasource_id IS NOT NULL
  AND UPPER(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(version_record.job_spec_json, '$.source.connectorId')), '-', '_'))
      IN ('JDBC','MYSQL','MARIADB','POSTGRE_SQL','POSTGRESQL','POSTGRES','ORACLE',
          'SQLSERVER','SQL_SERVER','DORIS','STARROCKS','CLICKHOUSE','DB2','HIVE',
          'KINGBASE','DAMENG','DM');

UPDATE yak_offline_job_version version_record
JOIN yak_offline_job_definition definition
  ON definition.id = version_record.job_definition_id
SET version_record.job_spec_json = JSON_SET(
        JSON_REMOVE(
            version_record.job_spec_json,
            '$.sink.options.url',
            '$.sink.options.driver',
            '$.sink.options.username',
            '$.sink.options.password',
            '$.sink.options.schema',
            '$.sink.options.properties'),
        '$.sink.connectorId',
        'jdbc',
        '$.sink.dataSourceRef.id',
        definition.sink_datasource_id)
WHERE version_record.job_spec_json IS NOT NULL
  AND JSON_VALID(version_record.job_spec_json)
  AND definition.sink_datasource_id IS NOT NULL
  AND UPPER(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(version_record.job_spec_json, '$.sink.connectorId')), '-', '_'))
      IN ('JDBC','MYSQL','MARIADB','POSTGRE_SQL','POSTGRESQL','POSTGRES','ORACLE',
          'SQLSERVER','SQL_SERVER','DORIS','STARROCKS','CLICKHOUSE','DB2','HIVE',
          'KINGBASE','DAMENG','DM');

UPDATE yak_offline_job_version
SET config_digest = SHA2(job_spec_json, 256)
WHERE job_spec_json IS NOT NULL
  AND JSON_VALID(job_spec_json);

UPDATE yak_offline_job_execution
SET submitted_config = JSON_REMOVE(
        submitted_config,
        '$.source.options.url',
        '$.source.options.driver',
        '$.source.options.username',
        '$.source.options.password',
        '$.source.options.schema',
        '$.source.options.properties',
        '$.sink.options.url',
        '$.sink.options.driver',
        '$.sink.options.username',
        '$.sink.options.password',
        '$.sink.options.schema',
        '$.sink.options.properties')
WHERE submitted_config IS NOT NULL
  AND JSON_VALID(submitted_config);
