-- Extend the existing Link-Up node table into a manageable Worker registry.

ALTER TABLE yak_offline_engine_node
    ADD COLUMN registration_mode VARCHAR(16) NOT NULL DEFAULT 'MANUAL'
        COMMENT 'CONFIG/MANUAL' AFTER base_url,
    ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1
        COMMENT '是否参与心跳和调度' AFTER registration_mode,
    ADD COLUMN scheduling_status VARCHAR(16) NOT NULL DEFAULT 'ENABLED'
        COMMENT 'ENABLED/DRAINING/DISABLED' AFTER enabled,
    ADD COLUMN weight INT NOT NULL DEFAULT 100
        COMMENT '后续自动分配权重' AFTER scheduling_status,
    ADD COLUMN labels_json LONGTEXT NULL
        COMMENT '节点标签 JSON' AFTER weight,
    ADD COLUMN started_at_millis BIGINT NULL
        COMMENT 'Worker 进程启动时间戳' AFTER engine_version,
    ADD COLUMN offline_only TINYINT(1) NOT NULL DEFAULT 1
        COMMENT '是否为离线专用 Worker' AFTER started_at_millis,
    ADD COLUMN last_success_time DATETIME(3) NULL
        COMMENT '最近成功心跳时间' AFTER last_heartbeat_time,
    ADD COLUMN consecutive_failures INT NOT NULL DEFAULT 0
        COMMENT '连续心跳失败次数' AFTER last_success_time,
    ADD INDEX idx_yak_offline_worker_schedule
        (enabled, scheduling_status, status, last_heartbeat_time),
    ADD INDEX idx_yak_offline_worker_registration
        (registration_mode, update_time);

UPDATE yak_offline_engine_node
SET registration_mode = 'CONFIG',
    enabled = 1,
    scheduling_status = 'ENABLED',
    weight = 100,
    offline_only = 1,
    last_success_time = CASE WHEN status = 'UP' THEN last_heartbeat_time ELSE NULL END,
    consecutive_failures = CASE WHEN status = 'UP' THEN 0 ELSE 1 END
WHERE registration_mode = 'MANUAL';
