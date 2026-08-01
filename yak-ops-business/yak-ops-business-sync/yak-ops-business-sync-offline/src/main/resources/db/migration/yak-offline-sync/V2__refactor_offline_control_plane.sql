-- Yak Ops owns durable offline-sync control-plane state; Link-Up remains an execution-only Worker.

CREATE TABLE IF NOT EXISTS yak_offline_job_version (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '任务版本 ID',
    job_definition_id BIGINT NOT NULL COMMENT '任务定义 ID',
    version_no INT NOT NULL COMMENT '版本号',
    definition_json LONGTEXT NOT NULL COMMENT '前端定义 JSON 快照',
    hocon_config LONGTEXT NOT NULL COMMENT '提交给 Link-Up 的 HOCON 快照',
    config_digest CHAR(64) NOT NULL COMMENT '定义与 HOCON 的 SHA-256 摘要',
    create_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_yak_offline_version (job_definition_id, version_no),
    KEY idx_yak_offline_version_digest (config_digest),
    CONSTRAINT fk_yak_offline_version_definition
        FOREIGN KEY (job_definition_id) REFERENCES yak_offline_job_definition (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='离线同步不可变任务版本';

ALTER TABLE yak_offline_job_definition
    ADD COLUMN IF NOT EXISTS current_version_id BIGINT NULL COMMENT '当前任务版本 ID' AFTER version;

INSERT IGNORE INTO yak_offline_job_version
    (job_definition_id, version_no, definition_json, hocon_config, config_digest, create_time)
SELECT id,
       version,
       definition_json,
       hocon_config,
       SHA2(CONCAT(definition_json, '\n', COALESCE(hocon_config, '')), 256),
       create_time
FROM yak_offline_job_definition;

UPDATE yak_offline_job_definition definition
JOIN yak_offline_job_version version
  ON version.job_definition_id = definition.id
 AND version.version_no = definition.version
SET definition.current_version_id = version.id
WHERE definition.current_version_id IS NULL;

CREATE TABLE IF NOT EXISTS yak_offline_schedule (
    job_definition_id BIGINT NOT NULL COMMENT '任务定义 ID',
    cron_expression VARCHAR(128) NULL COMMENT 'Spring Cron 表达式',
    enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否启用',
    retry_max_attempts INT NOT NULL DEFAULT 1 COMMENT '包含首次执行的最大尝试次数',
    retry_backoff_seconds INT NOT NULL DEFAULT 30 COMMENT '重试退避秒数',
    next_fire_time DATETIME(3) NULL COMMENT '下次触发时间',
    last_fire_time DATETIME(3) NULL COMMENT '最近触发时间',
    schedule_json LONGTEXT NULL COMMENT '完整调度配置 JSON',
    create_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    update_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (job_definition_id),
    KEY idx_yak_offline_schedule_due (enabled, next_fire_time),
    CONSTRAINT fk_yak_offline_schedule_definition
        FOREIGN KEY (job_definition_id) REFERENCES yak_offline_job_definition (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='离线同步持久化调度配置';

INSERT IGNORE INTO yak_offline_schedule
    (job_definition_id, cron_expression, enabled, retry_max_attempts,
     retry_backoff_seconds, next_fire_time, schedule_json, create_time, update_time)
SELECT id,
       NULLIF(JSON_UNQUOTE(JSON_EXTRACT(schedule_json, '$.cronExpression')), 'null'),
       CASE
         WHEN LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(schedule_json, '$.scheduleRunType')), 'pause'))
              IN ('pause', 'paused') THEN 0
         WHEN JSON_UNQUOTE(JSON_EXTRACT(schedule_json, '$.cronExpression')) IS NULL THEN 0
         ELSE 1
       END,
       GREATEST(1, COALESCE(JSON_EXTRACT(schedule_json, '$.retryPolicy.maxAttempts'),
                            JSON_EXTRACT(schedule_json, '$.retryTimes'), 1)),
       GREATEST(1, COALESCE(JSON_EXTRACT(schedule_json, '$.retryPolicy.backoffSeconds'),
                            JSON_EXTRACT(schedule_json, '$.retryIntervalSeconds'), 30)),
       NULL,
       schedule_json,
       create_time,
       update_time
FROM yak_offline_job_definition
WHERE schedule_json IS NOT NULL
  AND JSON_VALID(schedule_json);

CREATE TABLE IF NOT EXISTS yak_offline_engine_node (
    node_id VARCHAR(128) NOT NULL COMMENT '稳定节点 ID',
    node_name VARCHAR(200) NOT NULL COMMENT '节点名称',
    base_url VARCHAR(500) NOT NULL COMMENT 'Link-Up 地址',
    worker_instance_id VARCHAR(128) NULL COMMENT '本次 Worker 进程实例 ID',
    engine_version VARCHAR(64) NULL COMMENT 'Link-Up 版本',
    status VARCHAR(16) NOT NULL COMMENT 'UP/DOWN',
    max_concurrent_jobs INT NOT NULL DEFAULT 1,
    max_queued_jobs INT NOT NULL DEFAULT 1,
    running_jobs INT NOT NULL DEFAULT 0,
    queued_jobs INT NOT NULL DEFAULT 0,
    last_heartbeat_time DATETIME(3) NULL,
    last_error_message TEXT NULL,
    create_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    update_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (node_id),
    KEY idx_yak_offline_node_status (status, last_heartbeat_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='离线同步 Link-Up Worker 节点';

ALTER TABLE yak_offline_job_execution
    ADD COLUMN IF NOT EXISTS definition_version_id BIGINT NULL COMMENT '任务版本 ID' AFTER job_definition_id,
    ADD COLUMN IF NOT EXISTS definition_version INT NOT NULL DEFAULT 1 COMMENT '任务版本号' AFTER definition_version_id,
    ADD COLUMN IF NOT EXISTS engine_node_id VARCHAR(128) NULL COMMENT '执行节点 ID' AFTER definition_version,
    ADD COLUMN IF NOT EXISTS external_execution_id VARCHAR(128) NULL COMMENT 'Yak Ops 全局执行标识' AFTER engine_job_id,
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128) NULL COMMENT 'Link-Up 幂等键' AFTER external_execution_id,
    ADD COLUMN IF NOT EXISTS worker_instance_id VARCHAR(128) NULL COMMENT 'Link-Up 进程实例 ID' AFTER idempotency_key,
    ADD COLUMN IF NOT EXISTS state_version BIGINT NOT NULL DEFAULT 1 COMMENT '状态版本' AFTER status,
    ADD COLUMN IF NOT EXISTS attempt_no INT NOT NULL DEFAULT 1 COMMENT '尝试序号' AFTER state_version,
    ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(16) NOT NULL DEFAULT 'MANUAL' COMMENT 'MANUAL/SCHEDULE/RETRY' AFTER attempt_no,
    ADD COLUMN IF NOT EXISTS retry_from_execution_id BIGINT NULL COMMENT '重试来源实例 ID' AFTER trigger_type,
    ADD COLUMN IF NOT EXISTS cancellation_requested TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否请求取消' AFTER retry_from_execution_id,
    ADD COLUMN IF NOT EXISTS retry_created TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已创建重试实例' AFTER cancellation_requested,
    ADD COLUMN IF NOT EXISTS next_retry_time DATETIME(3) NULL COMMENT '下次重试时间' AFTER retry_created,
    ADD COLUMN IF NOT EXISTS config_digest CHAR(64) NULL COMMENT '提交配置摘要' AFTER next_retry_time,
    ADD COLUMN IF NOT EXISTS last_sync_time DATETIME(3) NULL COMMENT '最近与 Link-Up 对账时间' AFTER end_time,
    ADD UNIQUE INDEX IF NOT EXISTS uk_yak_offline_external_execution (external_execution_id),
    ADD UNIQUE INDEX IF NOT EXISTS uk_yak_offline_idempotency (idempotency_key),
    ADD INDEX IF NOT EXISTS idx_yak_offline_execution_active (status, last_sync_time),
    ADD INDEX IF NOT EXISTS idx_yak_offline_execution_retry (retry_created, next_retry_time),
    ADD INDEX IF NOT EXISTS idx_yak_offline_execution_node (engine_node_id, worker_instance_id);

CREATE TABLE IF NOT EXISTS yak_offline_execution_event (
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
  COMMENT='离线同步执行状态与控制事件';

CREATE TABLE IF NOT EXISTS yak_offline_alert_event (
    id BIGINT NOT NULL AUTO_INCREMENT,
    job_definition_id BIGINT NOT NULL,
    execution_id BIGINT NOT NULL,
    alert_type VARCHAR(64) NOT NULL,
    alert_level VARCHAR(16) NOT NULL,
    message TEXT NOT NULL,
    payload_json LONGTEXT NULL,
    delivery_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    create_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    delivered_time DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_yak_offline_alert_execution_type (execution_id, alert_type),
    KEY idx_yak_offline_alert_status (delivery_status, create_time),
    CONSTRAINT fk_yak_offline_alert_definition
        FOREIGN KEY (job_definition_id) REFERENCES yak_offline_job_definition (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_yak_offline_alert_execution
        FOREIGN KEY (execution_id) REFERENCES yak_offline_job_execution (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='离线同步待投递告警事件';
