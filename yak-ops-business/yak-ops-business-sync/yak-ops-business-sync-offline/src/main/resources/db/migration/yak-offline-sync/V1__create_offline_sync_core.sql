-- Destructive phase-one rebuild. Existing offline-sync history and business data are intentionally removed.
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS yak_offline_worker_registration_event;
DROP TABLE IF EXISTS yak_offline_worker_registration_nonce;
DROP TABLE IF EXISTS yak_offline_worker_preflight;
DROP TABLE IF EXISTS yak_offline_connector_schema;
DROP TABLE IF EXISTS yak_offline_alert_event;
DROP TABLE IF EXISTS yak_offline_execution_event;
DROP TABLE IF EXISTS yak_offline_job_execution;
DROP TABLE IF EXISTS yak_offline_schedule;
DROP TABLE IF EXISTS yak_offline_job_version;
DROP TABLE IF EXISTS yak_offline_engine_node;
DROP TABLE IF EXISTS yak_offline_job_definition;
DROP TABLE IF EXISTS yak_offline_schema_history;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE yak_offline_job_definition (
    id BIGINT NOT NULL COMMENT '任务定义 ID',
    job_name VARCHAR(200) NOT NULL COMMENT '任务名称',
    job_desc VARCHAR(1000) NULL COMMENT '任务描述',
    mode VARCHAR(32) NOT NULL COMMENT 'GUIDE_SINGLE/GUIDE_MULTI',
    definition_json LONGTEXT NOT NULL COMMENT '当前可编辑任务定义',
    job_spec_json LONGTEXT NULL COMMENT '当前可执行 Link-Up JobSpec',
    config_digest CHAR(64) NULL COMMENT 'JobSpec SHA-256 摘要',
    release_state VARCHAR(16) NOT NULL DEFAULT 'OFFLINE',
    source_type VARCHAR(64) NULL,
    sink_type VARCHAR(64) NULL,
    source_datasource_id BIGINT NULL,
    sink_datasource_id BIGINT NULL,
    source_table TEXT NULL,
    sink_table TEXT NULL,
    schedule_json LONGTEXT NULL COMMENT '任务级调度原始配置',
    schedule_enabled TINYINT(1) NOT NULL DEFAULT 0,
    cron_expression VARCHAR(128) NULL,
    retry_max_attempts INT NOT NULL DEFAULT 1,
    retry_backoff_seconds INT NOT NULL DEFAULT 60,
    schedule_last_fire_time DATETIME(3) NULL,
    schedule_next_fire_time DATETIME(3) NULL,
    version INT NOT NULL DEFAULT 0 COMMENT '当前定义版本号',
    last_execution_id BIGINT NULL,
    last_engine_job_id VARCHAR(128) NULL,
    last_job_status VARCHAR(32) NULL,
    last_error_message TEXT NULL,
    last_duration_millis BIGINT NULL,
    last_read_row_count BIGINT NULL,
    last_qps DOUBLE NULL,
    last_sync_bytes BIGINT NULL,
    last_start_time DATETIME(3) NULL,
    last_end_time DATETIME(3) NULL,
    create_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    update_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_yak_offline_job_name (job_name),
    KEY idx_yak_offline_release_state (release_state),
    KEY idx_yak_offline_job_status (last_job_status),
    KEY idx_yak_offline_schedule (schedule_enabled, cron_expression),
    KEY idx_yak_offline_update_time (update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='离线同步任务定义';

CREATE TABLE yak_offline_job_execution (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '执行实例 ID',
    job_definition_id BIGINT NOT NULL,
    definition_version INT NOT NULL DEFAULT 1,
    engine_base_url VARCHAR(500) NOT NULL COMMENT '本次执行使用的 YAML 地址快照',
    engine_job_id VARCHAR(128) NULL,
    external_execution_id VARCHAR(128) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    worker_instance_id VARCHAR(128) NULL,
    status VARCHAR(32) NOT NULL,
    state_version BIGINT NOT NULL DEFAULT 1,
    attempt_no INT NOT NULL DEFAULT 1,
    trigger_type VARCHAR(16) NOT NULL DEFAULT 'MANUAL',
    retry_from_execution_id BIGINT NULL,
    cancellation_requested TINYINT(1) NOT NULL DEFAULT 0,
    retry_created TINYINT(1) NOT NULL DEFAULT 0,
    next_retry_time DATETIME(3) NULL,
    config_digest CHAR(64) NULL,
    definition_snapshot_json LONGTEXT NOT NULL COMMENT '本次执行的任务定义快照',
    submitted_config LONGTEXT NOT NULL COMMENT '本次执行的逻辑 JobSpec 快照',
    engine_snapshot_json LONGTEXT NULL,
    error_message TEXT NULL,
    source_record_count BIGINT NOT NULL DEFAULT 0,
    sink_success_record_count BIGINT NOT NULL DEFAULT 0,
    source_read_bytes BIGINT NOT NULL DEFAULT 0,
    sink_written_bytes BIGINT NOT NULL DEFAULT 0,
    qps DOUBLE NOT NULL DEFAULT 0,
    duration_millis BIGINT NOT NULL DEFAULT 0,
    create_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    start_time DATETIME(3) NULL,
    end_time DATETIME(3) NULL,
    last_sync_time DATETIME(3) NULL,
    update_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_yak_offline_external_execution (external_execution_id),
    UNIQUE KEY uk_yak_offline_idempotency (idempotency_key),
    KEY idx_yak_offline_execution_definition (job_definition_id, id),
    KEY idx_yak_offline_execution_status (status, last_sync_time),
    KEY idx_yak_offline_execution_retry (retry_created, next_retry_time),
    CONSTRAINT fk_yak_offline_execution_definition
        FOREIGN KEY (job_definition_id) REFERENCES yak_offline_job_definition (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='离线同步执行实例';

CREATE TABLE yak_offline_execution_event (
    id BIGINT NOT NULL AUTO_INCREMENT,
    execution_id BIGINT NOT NULL,
    state_version BIGINT NOT NULL,
    from_status VARCHAR(32) NULL,
    to_status VARCHAR(32) NULL,
    event_type VARCHAR(64) NOT NULL,
    message TEXT NULL,
    payload_json LONGTEXT NULL,
    create_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_yak_offline_event_execution (execution_id, id),
    CONSTRAINT fk_yak_offline_event_execution
        FOREIGN KEY (execution_id) REFERENCES yak_offline_job_execution (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='离线同步执行状态事件';
