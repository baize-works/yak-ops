-- Yak Ops alarm feature Flyway migration.
-- Alarm channels (SPI instances), rules (who/when), rule-channel links, and
-- delivery records. All tables use utf8mb4 with utf8mb4_unicode_ci.

CREATE TABLE `t_baize_flow_alarm_channel`
(
    `id`          bigint       NOT NULL COMMENT '主键ID',
    `name`        varchar(128) NOT NULL COMMENT '渠道名称',
    `channel_type` varchar(64) NOT NULL COMMENT '渠道类型(SPI key)，如 WEBHOOK/DINGTALK',
    `config_json` text COMMENT '渠道配置(JSON)',
    `enabled`     tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用：0否 1是',
    `description` varchar(512)          DEFAULT NULL COMMENT '备注',
    `create_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY           `idx_channel_type` (`channel_type`),
    KEY           `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='告警渠道实例表';

CREATE TABLE `t_baize_flow_alarm_rule`
(
    `id`                bigint       NOT NULL COMMENT '主键ID',
    `name`              varchar(128) NOT NULL COMMENT '规则名称',
    `target_jobs`     varchar(512)          DEFAULT NULL COMMENT '目标任务定义ID，逗号分隔，NULL表示全部任务',
    `trigger_statuses`  varchar(256) NOT NULL COMMENT '触发的状态(JobStatus名)，逗号分隔，如 FAILED,CANCELED',
    `excludes`          varchar(512)          DEFAULT NULL COMMENT '排除的任务定义ID，逗号分隔',
    `severity`          varchar(32)          DEFAULT 'WARN' COMMENT '严重级别：INFO/WARN/CRITICAL',
    `enabled`           tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用：0否 1是',
    `description`       varchar(512)          DEFAULT NULL COMMENT '备注',
    `create_time`       datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`       datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY                 `idx_target_jobs` (`target_jobs`(191)),
    KEY                 `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='告警规则表';

CREATE TABLE `t_baize_flow_alarm_rule_channel`
(
    `id`          bigint   NOT NULL COMMENT '主键ID',
    `rule_id`     bigint   NOT NULL COMMENT '规则ID',
    `channel_id`  bigint   NOT NULL COMMENT '渠道ID',
    `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_rule_channel` (`rule_id`, `channel_id`),
    KEY          `idx_channel_id` (`channel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='告警规则-渠道关联表';

CREATE TABLE `t_baize_flow_alarm_record`
(
    `id`                bigint       NOT NULL COMMENT '主键ID',
    `rule_id`           bigint                DEFAULT NULL COMMENT '规则ID',
    `channel_id`        bigint                DEFAULT NULL COMMENT '渠道ID',
    `channel_type`      varchar(64)           DEFAULT NULL COMMENT '渠道类型',
    `job_instance_id`   bigint                DEFAULT NULL COMMENT '任务实例ID',
    `job_definition_id` bigint                DEFAULT NULL COMMENT '任务定义ID',
    `job_name`          varchar(256)          DEFAULT NULL COMMENT '任务名称',
    `new_status`        varchar(32)           DEFAULT NULL COMMENT '触发状态',
    `severity`          varchar(32)           DEFAULT NULL COMMENT '严重级别',
    `success`           tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否成功：0否 1是',
    `error_message`     text COMMENT '失败原因',
    `content`           text COMMENT '告警内容',
    `sent_time`         datetime              DEFAULT NULL COMMENT '发送时间',
    `create_time`       datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY                 `idx_rule_id` (`rule_id`),
    KEY                 `idx_job_instance_id` (`job_instance_id`),
    KEY                 `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='告警发送记录表';
