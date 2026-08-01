-- Convert previously persisted resolved JobSpecs back to logical control-plane JobSpecs.
-- Credentials are resolved from datasource references only for the outbound Link-Up request.

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
        '$.source.dataSourceRef.id',
        source_datasource_id)
WHERE job_spec_json IS NOT NULL
  AND JSON_VALID(job_spec_json)
  AND source_datasource_id IS NOT NULL
  AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(job_spec_json, '$.source.connectorId'))) = 'jdbc';

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
        '$.sink.dataSourceRef.id',
        sink_datasource_id)
WHERE job_spec_json IS NOT NULL
  AND JSON_VALID(job_spec_json)
  AND sink_datasource_id IS NOT NULL
  AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(job_spec_json, '$.sink.connectorId'))) = 'jdbc';

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
        '$.source.dataSourceRef.id',
        definition.source_datasource_id)
WHERE version_record.job_spec_json IS NOT NULL
  AND JSON_VALID(version_record.job_spec_json)
  AND definition.source_datasource_id IS NOT NULL
  AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(version_record.job_spec_json, '$.source.connectorId'))) = 'jdbc';

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
        '$.sink.dataSourceRef.id',
        definition.sink_datasource_id)
WHERE version_record.job_spec_json IS NOT NULL
  AND JSON_VALID(version_record.job_spec_json)
  AND definition.sink_datasource_id IS NOT NULL
  AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(version_record.job_spec_json, '$.sink.connectorId'))) = 'jdbc';

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
