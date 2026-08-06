CREATE TABLE IF NOT EXISTS yak_quality_monitor_setting (
    monitor_id BIGINT NOT NULL COMMENT '质量监控 ID',
    run_mode VARCHAR(20) NOT NULL DEFAULT 'MANUAL'
        COMMENT 'MANUAL/SCHEDULE',
    schedule_frequency VARCHAR(20) NULL
        COMMENT 'DAILY/WEEKLY/CRON',
    schedule_time TIME NULL COMMENT '每日或每周执行时间',
    schedule_weekday VARCHAR(3) NULL
        COMMENT 'MON/TUE/WED/THU/FRI/SAT/SUN',
    cron_expression VARCHAR(128) NULL COMMENT 'Spring Cron 表达式',
    next_run_time DATETIME(3) NULL COMMENT '下一次计划运行时间',
    rule_failure_action VARCHAR(20) NOT NULL DEFAULT 'CONTINUE'
        COMMENT 'CONTINUE/STOP',
    notify_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否生成告警事件',
    notify_channel VARCHAR(20) NULL DEFAULT 'MESSAGE'
        COMMENT 'MESSAGE/EMAIL/WEBHOOK',
    notify_target VARCHAR(1000) NULL COMMENT '接收人、邮箱或 Webhook 地址',
    alert_level VARCHAR(20) NOT NULL DEFAULT 'WARNING'
        COMMENT 'WARNING/CRITICAL',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (monitor_id),
    KEY idx_yak_quality_setting_due (run_mode, next_run_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='数据质量监控运行与问题处理设置';

CREATE TABLE IF NOT EXISTS yak_quality_alert_event (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '告警事件 ID',
    monitor_id BIGINT NOT NULL COMMENT '质量监控 ID',
    execution_no VARCHAR(64) NOT NULL COMMENT '执行编号',
    check_result VARCHAR(20) NOT NULL COMMENT 'NOT_PASSED/ERROR',
    alert_level VARCHAR(20) NOT NULL COMMENT 'WARNING/CRITICAL',
    notify_channel VARCHAR(20) NOT NULL COMMENT 'MESSAGE/EMAIL/WEBHOOK',
    notify_target VARCHAR(1000) NULL COMMENT '接收目标快照',
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'RECORDED'
        COMMENT 'RECORDED/PENDING/FAILED',
    alert_message VARCHAR(1000) NOT NULL COMMENT '告警摘要',
    error_message VARCHAR(1000) NULL COMMENT '告警处理错误',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    delivered_at DATETIME(3) NULL COMMENT '实际送达时间',
    PRIMARY KEY (id),
    KEY idx_yak_quality_alert_monitor (monitor_id, created_at),
    KEY idx_yak_quality_alert_execution (execution_no),
    KEY idx_yak_quality_alert_status (delivery_status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='数据质量告警事件';

INSERT INTO yak_quality_monitor_setting (
    monitor_id,
    run_mode,
    rule_failure_action,
    notify_enabled,
    notify_channel,
    alert_level
)
SELECT
    id,
    'MANUAL',
    'CONTINUE',
    0,
    'MESSAGE',
    'WARNING'
FROM yak_quality_monitor
WHERE deleted = 0
ON DUPLICATE KEY UPDATE monitor_id = VALUES(monitor_id);
