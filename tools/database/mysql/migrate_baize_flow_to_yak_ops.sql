-- Manual one-time migration from the legacy baize_flow database and table names.
--
-- BACK UP THE ENTIRE baize_flow DATABASE AND TEST RESTORE BEFORE RUNNING THIS FILE.
-- Stop all application instances and writers before migration. Run as an account with
-- CREATE, ALTER, DROP, and RENAME privileges. This script targets MySQL 8.0+.
-- MySQL has no atomic RENAME DATABASE statement, so the supported approach is to
-- create yak_ops and atomically move each table with one RENAME TABLE statement.

-- Preflight: these queries must return the expected source tables and no target tables.
SELECT TABLE_NAME, TABLE_TYPE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'baize_flow'
ORDER BY TABLE_NAME;
SELECT TABLE_NAME, TABLE_TYPE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'yak_ops'
ORDER BY TABLE_NAME;

CREATE DATABASE IF NOT EXISTS `yak_ops`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- Base tables, including Flyway history. A single RENAME TABLE is atomic: if any
-- named table is absent or a target exists, none of these renames is applied.
RENAME TABLE
  `baize_flow`.`t_baize_flow_alarm_channel` TO `yak_ops`.`t_yak_ops_alarm_channel`,
  `baize_flow`.`t_baize_flow_alarm_record` TO `yak_ops`.`t_yak_ops_alarm_record`,
  `baize_flow`.`t_baize_flow_alarm_rule` TO `yak_ops`.`t_yak_ops_alarm_rule`,
  `baize_flow`.`t_baize_flow_alarm_rule_channel` TO `yak_ops`.`t_yak_ops_alarm_rule_channel`,
  `baize_flow`.`t_baize_flow_cdc_server_id_allocation` TO `yak_ops`.`t_yak_ops_cdc_server_id_allocation`,
  `baize_flow`.`t_baize_flow_cdc_server_id_pool` TO `yak_ops`.`t_yak_ops_cdc_server_id_pool`,
  `baize_flow`.`t_baize_flow_client` TO `yak_ops`.`t_yak_ops_client`,
  `baize_flow`.`t_baize_flow_client_node` TO `yak_ops`.`t_yak_ops_client_node`,
  `baize_flow`.`t_baize_flow_connector_param_meta` TO `yak_ops`.`t_yak_ops_connector_param_meta`,
  `baize_flow`.`t_baize_flow_datasource` TO `yak_ops`.`t_yak_ops_datasource`,
  `baize_flow`.`t_baize_flow_datasource_plugin_config` TO `yak_ops`.`t_yak_ops_datasource_plugin_config`,
  `baize_flow`.`t_baize_flow_job_definition` TO `yak_ops`.`t_yak_ops_job_definition`,
  `baize_flow`.`t_baize_flow_job_definition_content` TO `yak_ops`.`t_yak_ops_job_definition_content`,
  `baize_flow`.`t_baize_flow_job_instance` TO `yak_ops`.`t_yak_ops_job_instance`,
  `baize_flow`.`t_baize_flow_job_metrics` TO `yak_ops`.`t_yak_ops_job_metrics`,
  `baize_flow`.`t_baize_flow_job_schedule` TO `yak_ops`.`t_yak_ops_job_schedule`,
  `baize_flow`.`t_baize_flow_job_table_metrics` TO `yak_ops`.`t_yak_ops_job_table_metrics`,
  `baize_flow`.`t_baize_flow_schema_history` TO `yak_ops`.`t_yak_ops_schema_history`,
  `baize_flow`.`t_baize_flow_session` TO `yak_ops`.`t_yak_ops_session`,
  `baize_flow`.`t_baize_flow_streaming_job_definition` TO `yak_ops`.`t_yak_ops_streaming_job_definition`,
  `baize_flow`.`t_baize_flow_streaming_job_definition_content` TO `yak_ops`.`t_yak_ops_streaming_job_definition_content`,
  `baize_flow`.`t_baize_flow_streaming_job_instance` TO `yak_ops`.`t_yak_ops_streaming_job_instance`,
  `baize_flow`.`t_baize_flow_streaming_job_metrics_current` TO `yak_ops`.`t_yak_ops_streaming_job_metrics_current`,
  `baize_flow`.`t_baize_flow_streaming_job_metrics_snapshot` TO `yak_ops`.`t_yak_ops_streaming_job_metrics_snapshot`,
  `baize_flow`.`t_baize_flow_streaming_job_table_metrics_current` TO `yak_ops`.`t_yak_ops_streaming_job_table_metrics_current`,
  `baize_flow`.`t_baize_flow_time_variable` TO `yak_ops`.`t_yak_ops_time_variable`,
  `baize_flow`.`t_baize_flow_user` TO `yak_ops`.`t_yak_ops_user`;

-- Validation: compare counts with the backup and inspect all dependent objects.
SELECT TABLE_NAME, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'yak_ops'
ORDER BY TABLE_NAME;
SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'yak_ops';
SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'yak_ops';

-- RENAME TABLE preserves table indexes, table triggers, and foreign-key relationships.
-- It does not rewrite SQL text stored in views, procedures, functions, or events.
-- Export their SHOW CREATE output before migration, then recreate them in yak_ops with
-- yak_ops/t_yak_ops references. MySQL has no standalone sequence objects; if another
-- database engine is used, rename/recreate sequences and update their OWNED BY/defaults.
-- Review old-named constraint/index identifiers and rename them separately if naming
-- policy requires it; their functionality is retained by the table move.
-- Existing Flyway migrations were intentionally not renumbered or renamed, but their
-- contents now use the new table names and therefore have new checksums. After backing
-- up t_yak_ops_schema_history, run Flyway repair exactly once against yak_ops with the
-- same release artifact, then run validate before application startup. Never delete the
-- history rows or rerun versioned initialization migrations on the populated database.

-- After validation and application cutover only:
-- DROP DATABASE `baize_flow`;

-- ROLLBACK (stop writers first). Run only while all listed target tables still exist.
-- CREATE DATABASE IF NOT EXISTS `baize_flow` DEFAULT CHARACTER SET utf8mb4;
-- Explicit rollback rename (remove the comment prefixes only after review):
-- RENAME TABLE
--   `yak_ops`.`t_yak_ops_alarm_channel` TO `baize_flow`.`t_baize_flow_alarm_channel`,
--   `yak_ops`.`t_yak_ops_alarm_record` TO `baize_flow`.`t_baize_flow_alarm_record`,
--   `yak_ops`.`t_yak_ops_alarm_rule` TO `baize_flow`.`t_baize_flow_alarm_rule`,
--   `yak_ops`.`t_yak_ops_alarm_rule_channel` TO `baize_flow`.`t_baize_flow_alarm_rule_channel`,
--   `yak_ops`.`t_yak_ops_cdc_server_id_allocation` TO `baize_flow`.`t_baize_flow_cdc_server_id_allocation`,
--   `yak_ops`.`t_yak_ops_cdc_server_id_pool` TO `baize_flow`.`t_baize_flow_cdc_server_id_pool`,
--   `yak_ops`.`t_yak_ops_client` TO `baize_flow`.`t_baize_flow_client`,
--   `yak_ops`.`t_yak_ops_client_node` TO `baize_flow`.`t_baize_flow_client_node`,
--   `yak_ops`.`t_yak_ops_connector_param_meta` TO `baize_flow`.`t_baize_flow_connector_param_meta`,
--   `yak_ops`.`t_yak_ops_datasource` TO `baize_flow`.`t_baize_flow_datasource`,
--   `yak_ops`.`t_yak_ops_datasource_plugin_config` TO `baize_flow`.`t_baize_flow_datasource_plugin_config`,
--   `yak_ops`.`t_yak_ops_job_definition` TO `baize_flow`.`t_baize_flow_job_definition`,
--   `yak_ops`.`t_yak_ops_job_definition_content` TO `baize_flow`.`t_baize_flow_job_definition_content`,
--   `yak_ops`.`t_yak_ops_job_instance` TO `baize_flow`.`t_baize_flow_job_instance`,
--   `yak_ops`.`t_yak_ops_job_metrics` TO `baize_flow`.`t_baize_flow_job_metrics`,
--   `yak_ops`.`t_yak_ops_job_schedule` TO `baize_flow`.`t_baize_flow_job_schedule`,
--   `yak_ops`.`t_yak_ops_job_table_metrics` TO `baize_flow`.`t_baize_flow_job_table_metrics`,
--   `yak_ops`.`t_yak_ops_schema_history` TO `baize_flow`.`t_baize_flow_schema_history`,
--   `yak_ops`.`t_yak_ops_session` TO `baize_flow`.`t_baize_flow_session`,
--   `yak_ops`.`t_yak_ops_streaming_job_definition` TO `baize_flow`.`t_baize_flow_streaming_job_definition`,
--   `yak_ops`.`t_yak_ops_streaming_job_definition_content` TO `baize_flow`.`t_baize_flow_streaming_job_definition_content`,
--   `yak_ops`.`t_yak_ops_streaming_job_instance` TO `baize_flow`.`t_baize_flow_streaming_job_instance`,
--   `yak_ops`.`t_yak_ops_streaming_job_metrics_current` TO `baize_flow`.`t_baize_flow_streaming_job_metrics_current`,
--   `yak_ops`.`t_yak_ops_streaming_job_metrics_snapshot` TO `baize_flow`.`t_baize_flow_streaming_job_metrics_snapshot`,
--   `yak_ops`.`t_yak_ops_streaming_job_table_metrics_current` TO `baize_flow`.`t_baize_flow_streaming_job_table_metrics_current`,
--   `yak_ops`.`t_yak_ops_time_variable` TO `baize_flow`.`t_baize_flow_time_variable`,
--   `yak_ops`.`t_yak_ops_user` TO `baize_flow`.`t_baize_flow_user`;
--
-- Recreate legacy views/routines/events from the pre-migration export and restore the
-- original application configuration. Restore the backup if post-cutover writes make
-- a reverse rename unsafe.
