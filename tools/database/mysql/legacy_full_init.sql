-- Yak Ops MySQL full initialization script
-- WARNING: this script drops and recreates all Yak Ops and Quartz tables.

CREATE
DATABASE IF NOT EXISTS `baize_flow`
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE
`baize_flow`;

SET NAMES utf8mb4;
SET
FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. Yak Ops business tables
-- ============================================================

DROP TABLE IF EXISTS `t_baize_flow_connector_param_meta`;
CREATE TABLE `t_baize_flow_connector_param_meta`
(
    `id`             bigint       NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `type`           varchar(32)  NOT NULL COMMENT '参数类型，如 connector/time',
    `connector_name` varchar(128) NOT NULL COMMENT '连接器名称，如 Jdbc',
    `connector_type` varchar(128) NOT NULL COMMENT '连接器类型，如 source',
    `param_name`     varchar(128) NOT NULL COMMENT '参数名，如 fetch.size / split.size',
    `param_desc`     varchar(512)          DEFAULT NULL COMMENT '参数描述',
    `param_type`     varchar(64)           DEFAULT NULL COMMENT '参数值类型，如 string/number/boolean',
    `required_flag`  tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否必填：0否 1是',
    `default_value`  varchar(512)          DEFAULT NULL COMMENT '默认值',
    `example_value`  varchar(1000)         DEFAULT NULL COMMENT '示例值',
    `param_context`  text COMMENT '参数上下文(JSON字符串)，用于AI推荐',
    `remark`         varchar(512)          DEFAULT NULL COMMENT '备注',
    `create_time`    datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`    datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted`        tinyint(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_connector_param` (`type`,`connector_name`,`param_name`,`deleted`),
    KEY              `idx_connector_name` (`connector_name`),
    KEY              `idx_param_name` (`param_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='连接器参数元数据表';

DROP TABLE IF EXISTS `t_baize_flow_client`;
CREATE TABLE `t_baize_flow_client`
(
    `id`                    bigint       NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `client_name`           varchar(128) NOT NULL COMMENT 'Client名称',
    `engine_type`           varchar(32)  NOT NULL COMMENT '引擎类型',
    `base_url`              varchar(512)          DEFAULT NULL COMMENT '基础访问地址',
    `context_path`          varchar(255)          DEFAULT NULL COMMENT '上下文路径',
    `health_status`         int                   DEFAULT NULL COMMENT '健康状态',
    `heartbeat_time`        datetime              DEFAULT NULL COMMENT '心跳时间',
    `client_version`        varchar(128)          DEFAULT NULL COMMENT 'Client版本',
    `client_address`        varchar(255)          DEFAULT NULL COMMENT 'Client地址',
    `client_port`           varchar(32)           DEFAULT NULL COMMENT 'Client端口',
    `deploy_mode`           varchar(32)           DEFAULT 'SINGLE' COMMENT '部署模式：SINGLE / SEPARATED_CLUSTER',
    `protocol`              varchar(16)           DEFAULT 'http' COMMENT '协议：http / https',
    `active_master_node_id` bigint                DEFAULT NULL COMMENT '当前可用 Master 节点 ID',
    `last_error`            text COMMENT '最近一次连接失败原因',
    `auth_enabled`          tinyint(1) DEFAULT 0 COMMENT '是否开启认证',
    `username`              varchar(128)          DEFAULT NULL COMMENT 'Zeta Engine 用户名',
    `password`              varchar(512)          DEFAULT NULL COMMENT 'Zeta Engine 密码',
    `remark`                varchar(500)          DEFAULT NULL COMMENT '备注',
    `create_time`           datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`           datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY                     `idx_engine_type` (`engine_type`),
    KEY                     `idx_health_status` (`health_status`),
    KEY                     `idx_heartbeat_time` (`heartbeat_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SeaTunnel Client 表';

DROP TABLE IF EXISTS `t_baize_flow_client_node`;
CREATE TABLE `t_baize_flow_client_node`
(
    `id`                  bigint       NOT NULL COMMENT '主键 ID',
    `client_id`           bigint       NOT NULL COMMENT '客户端 ID',
    `node_role`           varchar(32)  NOT NULL COMMENT '节点角色：MASTER / WORKER',
    `node_name`           varchar(128)          DEFAULT NULL COMMENT '节点名称',
    `host`                varchar(255) NOT NULL COMMENT '节点地址',
    `hostname`            varchar(255)          DEFAULT NULL COMMENT '主机名称',
    `port`                int                   DEFAULT NULL COMMENT 'REST 端口',
    `base_url`            varchar(512)          DEFAULT NULL COMMENT 'REST Base URL',
    `active_master`       tinyint(1) DEFAULT 0 COMMENT '是否当前活跃 Master',
    `health_status`       int                   DEFAULT 0 COMMENT '健康状态：0 UNKNOWN, 1 LIVE, 2 DEAD',
    `client_version`      varchar(64)           DEFAULT NULL COMMENT '节点版本',
    `last_heartbeat_time` datetime              DEFAULT NULL COMMENT '最近探活时间',
    `last_error`          text COMMENT '最近错误信息',
    `create_time`         datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`         datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_client_role_host_port` (`client_id`, `node_role`, `host`, `port`),
    KEY                   `idx_client_id` (`client_id`),
    KEY                   `idx_client_role` (`client_id`, `node_role`),
    KEY                   `idx_health_status` (`health_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SeaTunnel Client 节点表';

DROP TABLE IF EXISTS `t_baize_flow_datasource`;
CREATE TABLE `t_baize_flow_datasource`
(
    `id`                bigint NOT NULL COMMENT '主键',
    `name`              varchar(64)   DEFAULT NULL COMMENT '数据源名称',
    `db_type`           varchar(64)   DEFAULT NULL COMMENT '数据源类型',
    `original_json`     text COMMENT '原始 JSON 配置',
    `connection_params` text COMMENT '数据库连接参数',
    `environment`       varchar(200)  DEFAULT NULL COMMENT '环境',
    `remark`            varchar(2048) DEFAULT NULL COMMENT '描述',
    `conn_status`       varchar(24)   DEFAULT NULL COMMENT '连接状态',
    `create_time`       datetime      DEFAULT NULL COMMENT '创建时间',
    `update_time`       datetime      DEFAULT NULL COMMENT '更新时间',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据集成-数据源表';

DROP TABLE IF EXISTS `t_baize_flow_datasource_plugin_config`;
CREATE TABLE `t_baize_flow_datasource_plugin_config`
(
    `id`            varchar(32) NOT NULL COMMENT '主键',
    `plugin_type`   varchar(50) NOT NULL COMMENT '插件类型，如 mysql、postgresql、oracle 等',
    `config_schema` text        NOT NULL COMMENT '配置字段的 JSON schema',
    `create_time`   datetime DEFAULT NULL COMMENT '创建时间',
    `update_time`   datetime DEFAULT NULL COMMENT '更新时间',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据源插件动态配置表';

DROP TABLE IF EXISTS `t_baize_flow_cdc_server_id_pool`;
CREATE TABLE `t_baize_flow_cdc_server_id_pool`
(
    `id`            bigint                                                        NOT NULL COMMENT 'primary key',
    `datasource_id` bigint                                                        NOT NULL COMMENT 'datasource id for this MySQL CDC server-id pool',
    `instance_key`  varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'unique MySQL instance or cluster key',
    `min_server_id` bigint                                                        NOT NULL DEFAULT 5400 COMMENT 'minimum allocatable server-id',
    `max_server_id` bigint                                                        NOT NULL DEFAULT 6400 COMMENT 'maximum allocatable server-id',
    `status`        tinyint(4) NOT NULL DEFAULT 1 COMMENT '1 enabled, 0 disabled',
    `create_time`   datetime                                                      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
    `update_time`   datetime                                                      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'update time',
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `uk_cdc_server_id_pool_instance` (`instance_key`) USING BTREE,
    KEY             `idx_cdc_server_id_pool_datasource` (`datasource_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='MySQL CDC server-id allocation pool';

DROP TABLE IF EXISTS `t_baize_flow_cdc_server_id_allocation`;
CREATE TABLE `t_baize_flow_cdc_server_id_allocation`
(
    `id`                bigint                                                       NOT NULL COMMENT 'primary key',
    `pool_id`           bigint                                                       NOT NULL COMMENT 'server-id pool id',
    `server_id`         bigint                                                       NOT NULL COMMENT 'allocated MySQL CDC server-id',
    `job_definition_id` bigint                                                       NOT NULL COMMENT 'job definition id',
    `job_instance_id`   bigint NULL DEFAULT NULL COMMENT 'job instance id',
    `source`            varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MANUAL' COMMENT 'MANUAL or AUTO',
    `active`            tinyint(4) NULL DEFAULT 1 COMMENT '1 currently occupied, NULL released',
    `allocated_time`    datetime                                                     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'allocated time',
    `released_time`     datetime NULL DEFAULT NULL COMMENT 'released time',
    `create_time`       datetime                                                     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
    `update_time`       datetime                                                     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'update time',
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `uk_cdc_server_id_active` (`pool_id`, `server_id`, `active`) USING BTREE,
    KEY                 `idx_cdc_server_id_job_definition` (`job_definition_id`) USING BTREE,
    KEY                 `idx_cdc_server_id_job_instance` (`job_instance_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='MySQL CDC server-id allocation records';

DROP TABLE IF EXISTS `t_baize_flow_user`;
CREATE TABLE `t_baize_flow_user`
(
    `id`            int NOT NULL COMMENT '用户ID',
    `user_name`     varchar(64)  DEFAULT NULL COMMENT '用户名',
    `user_password` varchar(128) DEFAULT NULL COMMENT '用户密码',
    `user_type`     int          DEFAULT NULL COMMENT '用户类型',
    `email`         varchar(64)  DEFAULT NULL COMMENT '邮箱地址',
    `phone`         varchar(11)  DEFAULT NULL COMMENT '手机号',
    `create_time`   timestamp NULL DEFAULT NULL COMMENT '创建时间',
    `update_time`   timestamp NULL DEFAULT NULL COMMENT '更新时间',
    `state`         tinyint      DEFAULT 1 COMMENT '状态：0禁用 1启用',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

DROP TABLE IF EXISTS `t_baize_flow_session`;
CREATE TABLE `t_baize_flow_session`
(
    `id`              varchar(64) NOT NULL COMMENT '会话ID',
    `user_id`         int         DEFAULT NULL COMMENT '关联用户ID',
    `ip`              varchar(45) DEFAULT NULL COMMENT '客户端IP地址',
    `last_login_time` timestamp NULL DEFAULT NULL COMMENT '最后登录时间',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户会话表';

DROP TABLE IF EXISTS `t_baize_flow_time_variable`;
CREATE TABLE `t_baize_flow_time_variable`
(
    `id`              bigint       NOT NULL COMMENT '主键ID',
    `param_name`      varchar(128) NOT NULL COMMENT '变量名称，如 biz_date、start_time、end_time',
    `param_desc`      varchar(500)          DEFAULT NULL COMMENT '变量说明',
    `variable_source` varchar(32)  NOT NULL DEFAULT 'CUSTOM' COMMENT '变量来源：SYSTEM / CUSTOM',
    `value_type`      varchar(32)  NOT NULL DEFAULT 'DYNAMIC' COMMENT '取值方式：FIXED / DYNAMIC',
    `time_format`     varchar(64)  NOT NULL DEFAULT 'yyyy-MM-dd HH:mm:ss' COMMENT '输出时间格式',
    `default_value`   varchar(255)          DEFAULT NULL COMMENT '默认值，固定值模式下直接使用',
    `expression`      varchar(255)          DEFAULT NULL COMMENT '动态表达式，如 schedule_time-1d@day_start',
    `example_value`   varchar(128)          DEFAULT NULL COMMENT '示例值',
    `enabled`         tinyint      NOT NULL DEFAULT 1 COMMENT '是否启用：1启用 0禁用',
    `remark`          varchar(500)          DEFAULT NULL COMMENT '备注',
    `create_time`     datetime              DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`     datetime              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_param_name` (`param_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SeaTunnel时间变量表';

DROP TABLE IF EXISTS `t_baize_flow_job_definition`;
CREATE TABLE `t_baize_flow_job_definition`
(
    `id`                   bigint       NOT NULL COMMENT '主键ID',
    `job_name`             varchar(255) NOT NULL COMMENT '任务名称',
    `job_desc`             varchar(500)          DEFAULT NULL COMMENT '任务描述',
    `mode`                 varchar(32)  NOT NULL COMMENT 'SCRIPT / GUIDE_SINGLE / GUIDE_MULTI',
    `job_type`             varchar(32)  NOT NULL DEFAULT 'BATCH' COMMENT '任务类型：BATCH / STREAMING',
    `client_id`            bigint                DEFAULT NULL COMMENT '桥接客户端ID',
    `job_version`          int          NOT NULL DEFAULT 1 COMMENT '任务版本号',
    `release_state`        varchar(32)           DEFAULT NULL COMMENT '任务状态',
    `source_type`          varchar(255)          DEFAULT NULL COMMENT '源类型摘要',
    `sink_type`            varchar(255)          DEFAULT NULL COMMENT '目标类型摘要',
    `source_table`         varchar(1024)         DEFAULT NULL COMMENT '源表摘要',
    `sink_table`           varchar(1024)         DEFAULT NULL COMMENT '目标表摘要',
    `source_datasource_id` bigint       NOT NULL COMMENT '源端数据源ID',
    `sink_datasource_id`   bigint       NOT NULL COMMENT '目标端数据源ID',
    `create_time`          datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`          datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY                    `idx_mode` (`mode`),
    KEY                    `idx_job_type` (`job_type`),
    KEY                    `idx_client_id` (`client_id`),
    KEY                    `idx_job_name` (`job_name`),
    KEY                    `idx_source_datasource_id` (`source_datasource_id`),
    KEY                    `idx_sink_datasource_id` (`sink_datasource_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务定义主表';

DROP TABLE IF EXISTS `t_baize_flow_job_definition_content`;
CREATE TABLE `t_baize_flow_job_definition_content`
(
    `id`                     bigint      NOT NULL AUTO_INCREMENT COMMENT '主键',
    `job_definition_id`      bigint      NOT NULL COMMENT '任务定义ID',
    `version`                int         NOT NULL COMMENT '版本号',
    `mode`                   varchar(32) NOT NULL COMMENT 'SCRIPT / GUIDE_SINGLE / GUIDE_MULTI',
    `content_schema_version` int         NOT NULL DEFAULT 1 COMMENT '内容 schema 版本',
    `definition_content`     longtext    NOT NULL COMMENT '完整定义内容 JSON',
    `env_config`             text COMMENT '环境配置',
    `create_time`            datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_definition_version` (`job_definition_id`,`version`),
    KEY                      `idx_job_definition_id` (`job_definition_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务定义内容版本表';

DROP TABLE IF EXISTS `t_baize_flow_job_instance`;
CREATE TABLE `t_baize_flow_job_instance`
(
    `id`                bigint      NOT NULL COMMENT '主键ID',
    `job_definition_id` bigint      NOT NULL COMMENT '任务定义ID',
    `client_id`         bigint               DEFAULT NULL COMMENT '客户端ID',
    `run_mode`          varchar(32) NOT NULL COMMENT '运行模式：MANUAL / SCHEDULE / RETRY',
    `job_status`        varchar(32) NOT NULL COMMENT '实例状态',
    `trigger_source`    varchar(64)          DEFAULT NULL COMMENT '触发来源',
    `retry_count`       int         NOT NULL DEFAULT 0 COMMENT '重试次数',
    `engine_job_id`     bigint               DEFAULT NULL COMMENT '引擎侧任务ID',
    `runtime_config`    longtext COMMENT '本次执行使用的运行配置',
    `log_path`          varchar(512)         DEFAULT NULL COMMENT '日志路径',
    `error_message`     text COMMENT '错误摘要',
    `submit_time`       datetime             DEFAULT NULL COMMENT '提交时间',
    `start_time`        datetime             DEFAULT NULL COMMENT '开始时间',
    `end_time`          datetime             DEFAULT NULL COMMENT '结束时间',
    `job_mode`          varchar(32)          DEFAULT NULL COMMENT '任务模式：BATCH / STREAMING',
    `create_time`       datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`       datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY                 `idx_job_definition_id` (`job_definition_id`),
    KEY                 `idx_job_status` (`job_status`),
    KEY                 `idx_engine_job_id` (`engine_job_id`),
    KEY                 `idx_create_time` (`create_time`),
    KEY                 `idx_definition_status` (`job_definition_id`, `job_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务运行实例表';

DROP TABLE IF EXISTS `t_baize_flow_job_schedule`;
CREATE TABLE `t_baize_flow_job_schedule`
(
    `id`                 bigint      NOT NULL COMMENT '主键ID',
    `job_definition_id`  bigint      NOT NULL COMMENT '任务定义ID',
    `cron_expression`    varchar(64) NOT NULL COMMENT 'Cron表达式',
    `schedule_status`    varchar(20) NOT NULL DEFAULT 'PAUSE' COMMENT '调度状态：NORMAL / PAUSE / EMPTY',
    `schedule_config`    text COMMENT '前端完整调度配置JSON',
    `last_schedule_time` datetime             DEFAULT NULL COMMENT '最后调度时间',
    `next_schedule_time` datetime             DEFAULT NULL COMMENT '下次调度时间',
    `create_time`        datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`        datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_job_definition_id` (`job_definition_id`),
    KEY                  `idx_schedule_status` (`schedule_status`),
    KEY                  `idx_next_schedule_time` (`next_schedule_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务调度表';

DROP TABLE IF EXISTS `t_baize_flow_job_metrics`;
CREATE TABLE `t_baize_flow_job_metrics`
(
    `id`                      bigint NOT NULL COMMENT '主键ID',
    `job_instance_id`         bigint NOT NULL COMMENT '任务实例ID',
    `job_definition_id`       bigint         DEFAULT NULL COMMENT '任务定义ID',
    `pipeline_id`             int            DEFAULT 0 COMMENT 'Pipeline ID',
    `read_row_count`          bigint         DEFAULT 0 COMMENT '读取行数',
    `write_row_count`         bigint         DEFAULT 0 COMMENT '写入行数',
    `read_qps`                decimal(18, 4) DEFAULT 0.0000 COMMENT '读取QPS',
    `write_qps`               decimal(18, 4) DEFAULT 0.0000 COMMENT '写入QPS',
    `read_bytes`              bigint         DEFAULT 0 COMMENT '读取字节数',
    `write_bytes`             bigint         DEFAULT 0 COMMENT '写入字节数',
    `read_bps`                decimal(18, 4) DEFAULT 0.0000 COMMENT '读取BPS，单位：字节/秒',
    `write_bps`               decimal(18, 4) DEFAULT 0.0000 COMMENT '写入BPS，单位：字节/秒',
    `intermediate_queue_size` bigint         DEFAULT 0 COMMENT '中间队列大小',
    `lag_count`               bigint         DEFAULT 0 COMMENT '滞后数量',
    `loss_rate`               decimal(10, 6) DEFAULT 0.000000 COMMENT '丢失率',
    `avg_row_size`            bigint         DEFAULT 0 COMMENT '平均行大小，单位：字节',
    `record_delay`            bigint         DEFAULT 0 COMMENT '数据延迟，单位：毫秒',
    `create_time`             datetime       DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`             datetime       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_instance_pipeline` (`job_instance_id`, `pipeline_id`),
    KEY                       `idx_job_instance_id` (`job_instance_id`),
    KEY                       `idx_job_definition_id` (`job_definition_id`),
    KEY                       `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务运行汇总指标表';

DROP TABLE IF EXISTS `t_baize_flow_job_table_metrics`;
CREATE TABLE `t_baize_flow_job_table_metrics`
(
    `id`                bigint NOT NULL COMMENT '主键ID',
    `job_instance_id`   bigint NOT NULL COMMENT '任务实例ID',
    `job_definition_id` bigint         DEFAULT NULL COMMENT '任务定义ID',
    `pipeline_id`       int            DEFAULT 0 COMMENT 'Pipeline ID',
    `source_table`      varchar(255)   DEFAULT NULL COMMENT '来源表',
    `sink_table`        varchar(255)   DEFAULT NULL COMMENT '目标表',
    `read_row_count`    bigint         DEFAULT 0 COMMENT '读取行数',
    `write_row_count`   bigint         DEFAULT 0 COMMENT '写入行数',
    `read_qps`          decimal(18, 4) DEFAULT 0.0000 COMMENT '读取QPS',
    `write_qps`         decimal(18, 4) DEFAULT 0.0000 COMMENT '写入QPS',
    `read_bytes`        bigint         DEFAULT 0 COMMENT '读取字节数',
    `write_bytes`       bigint         DEFAULT 0 COMMENT '写入字节数',
    `read_bps`          decimal(18, 4) DEFAULT 0.0000 COMMENT '读取BPS，单位：字节/秒',
    `write_bps`         decimal(18, 4) DEFAULT 0.0000 COMMENT '写入BPS，单位：字节/秒',
    `status`            varchar(32)    DEFAULT NULL COMMENT '表级状态',
    `error_msg`         text COMMENT '表级错误信息',
    `create_time`       datetime       DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`       datetime       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_instance_pipeline_table` (`job_instance_id`, `pipeline_id`, `source_table`, `sink_table`),
    KEY                 `idx_job_instance_id` (`job_instance_id`),
    KEY                 `idx_job_definition_id` (`job_definition_id`),
    KEY                 `idx_source_table` (`source_table`),
    KEY                 `idx_sink_table` (`sink_table`),
    KEY                 `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务表级运行指标表';

DROP TABLE IF EXISTS `t_baize_flow_streaming_job_definition`;
CREATE TABLE `t_baize_flow_streaming_job_definition`
(
    `id`                   bigint NOT NULL COMMENT '主键ID',
    `job_name`             varchar(255)  DEFAULT NULL COMMENT '任务名称',
    `job_desc`             varchar(1000) DEFAULT NULL COMMENT '任务描述',
    `mode`                 varchar(64)   DEFAULT NULL COMMENT '任务定义模式：GUIDE_SINGLE / GUIDE_MULTI / SCRIPT',
    `job_type`             varchar(64)   DEFAULT NULL COMMENT '任务类型：BATCH / STREAMING',
    `client_id`            bigint        DEFAULT NULL COMMENT 'SeaTunnel Client ID',
    `job_version`          int           DEFAULT 1 COMMENT '任务当前版本',
    `release_state`        varchar(64)   DEFAULT NULL COMMENT '发布状态：ONLINE / OFFLINE',
    `source_type`          varchar(128)  DEFAULT NULL COMMENT '源端类型',
    `sink_type`            varchar(128)  DEFAULT NULL COMMENT '目标端类型',
    `source_table`         varchar(512)  DEFAULT NULL COMMENT '源表',
    `sink_table`           varchar(512)  DEFAULT NULL COMMENT '目标表',
    `source_datasource_id` bigint NOT NULL COMMENT '源数据源ID',
    `sink_datasource_id`   bigint NOT NULL COMMENT '目标数据源ID',
    `create_time`          datetime      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`          datetime      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY                    `idx_streaming_job_name` (`job_name`),
    KEY                    `idx_streaming_client_id` (`client_id`),
    KEY                    `idx_streaming_release_state` (`release_state`),
    KEY                    `idx_streaming_source_datasource_id` (`source_datasource_id`),
    KEY                    `idx_streaming_sink_datasource_id` (`sink_datasource_id`),
    KEY                    `idx_streaming_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='实时任务定义表';

DROP TABLE IF EXISTS `t_baize_flow_streaming_job_definition_content`;
CREATE TABLE `t_baize_flow_streaming_job_definition_content`
(
    `id`                     bigint NOT NULL COMMENT '主键ID',
    `job_definition_id`      bigint NOT NULL COMMENT '任务定义ID',
    `version`                int    NOT NULL COMMENT '任务版本',
    `mode`                   varchar(64) DEFAULT NULL COMMENT '任务定义模式：GUIDE_SINGLE / GUIDE_MULTI / SCRIPT',
    `content_schema_version` int         DEFAULT 1 COMMENT '内容结构版本',
    `definition_content`     longtext COMMENT '任务定义内容，向导模式一般存 workflow，脚本模式一般存 HOCON',
    `env_config`             longtext COMMENT '环境配置',
    `checkpoint_config`      longtext COMMENT 'Checkpoint 配置',
    `create_time`            datetime    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`            datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_streaming_job_definition_version` (`job_definition_id`, `version`),
    KEY                      `idx_streaming_content_job_definition_id` (`job_definition_id`),
    KEY                      `idx_streaming_content_mode` (`mode`),
    KEY                      `idx_streaming_content_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='实时任务定义内容表';

DROP TABLE IF EXISTS `t_baize_flow_streaming_job_instance`;
CREATE TABLE `t_baize_flow_streaming_job_instance`
(
    `id`                bigint      NOT NULL COMMENT '主键ID',
    `job_definition_id` bigint      NOT NULL COMMENT '实时任务定义ID',
    `client_id`         bigint               DEFAULT NULL COMMENT 'SeaTunnel Client ID',
    `run_mode`          varchar(32) NOT NULL COMMENT '运行模式：MANUAL / SCHEDULE / RETRY',
    `job_status`        varchar(32) NOT NULL COMMENT '实例状态',
    `trigger_source`    varchar(64)          DEFAULT NULL COMMENT '触发来源',
    `retry_count`       int         NOT NULL DEFAULT 0 COMMENT '重试次数',
    `engine_job_id`     varchar(64)          DEFAULT NULL COMMENT 'SeaTunnel Engine Job ID',
    `runtime_config`    longtext COMMENT '本次执行使用的 HOCON 配置',
    `log_path`          varchar(512)         DEFAULT NULL COMMENT '日志路径',
    `error_message`     text COMMENT '错误摘要',
    `submit_time`       datetime             DEFAULT NULL COMMENT '提交时间',
    `start_time`        datetime             DEFAULT NULL COMMENT '开始时间',
    `end_time`          datetime             DEFAULT NULL COMMENT '结束时间',
    `checkpoint_path`   varchar(1024)        DEFAULT NULL COMMENT 'Checkpoint 路径',
    `savepoint_path`    varchar(1024)        DEFAULT NULL COMMENT 'Savepoint 路径',
    `last_collect_time` datetime             DEFAULT NULL COMMENT '最后一次指标采集时间',
    `create_time`       datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`       datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY                 `idx_streaming_instance_definition_id` (`job_definition_id`),
    KEY                 `idx_streaming_instance_status` (`job_status`),
    KEY                 `idx_streaming_instance_engine_job_id` (`engine_job_id`),
    KEY                 `idx_streaming_instance_create_time` (`create_time`),
    KEY                 `idx_streaming_instance_definition_status` (`job_definition_id`, `job_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='实时任务运行实例表';

DROP TABLE IF EXISTS `t_baize_flow_streaming_job_metrics_current`;
CREATE TABLE `t_baize_flow_streaming_job_metrics_current`
(
    `job_instance_id`         bigint         NOT NULL COMMENT 'Web侧实例ID',
    `job_definition_id`       bigint         NOT NULL COMMENT '任务定义ID',
    `engine_job_id`           varchar(64)             DEFAULT NULL COMMENT 'SeaTunnel Engine Job ID',
    `client_id`               bigint                  DEFAULT NULL COMMENT 'SeaTunnel Client ID',
    `job_status`              varchar(32)             DEFAULT NULL COMMENT '引擎返回的任务状态',
    `read_row_count`          bigint         NOT NULL DEFAULT 0 COMMENT '读取行数',
    `write_row_count`         bigint         NOT NULL DEFAULT 0 COMMENT '写入行数',
    `read_qps`                decimal(20, 4) NOT NULL DEFAULT 0.0000 COMMENT '读取QPS',
    `write_qps`               decimal(20, 4) NOT NULL DEFAULT 0.0000 COMMENT '写入QPS',
    `read_bytes`              bigint         NOT NULL DEFAULT 0 COMMENT '读取字节数',
    `write_bytes`             bigint         NOT NULL DEFAULT 0 COMMENT '写入字节数',
    `read_bps`                decimal(20, 4) NOT NULL DEFAULT 0.0000 COMMENT '读取BPS，单位：字节/秒',
    `write_bps`               decimal(20, 4) NOT NULL DEFAULT 0.0000 COMMENT '写入BPS，单位：字节/秒',
    `intermediate_queue_size` bigint         NOT NULL DEFAULT 0 COMMENT '中间队列大小',
    `lag_count`               bigint         NOT NULL DEFAULT 0 COMMENT '滞后数量',
    `record_delay`            bigint         NOT NULL DEFAULT 0 COMMENT '数据延迟，单位：毫秒',
    `pipeline_count`          int            NOT NULL DEFAULT 0 COMMENT 'Pipeline 数量',
    `table_count`             int            NOT NULL DEFAULT 0 COMMENT '表数量',
    `last_collect_time_ms`    bigint         NOT NULL COMMENT '最近采集时间戳，单位：毫秒',
    `last_collect_time`       datetime       NOT NULL COMMENT '最近采集时间',
    `create_time`             datetime       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`             datetime       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`job_instance_id`),
    KEY                       `idx_streaming_current_definition` (`job_definition_id`),
    KEY                       `idx_streaming_current_engine` (`engine_job_id`),
    KEY                       `idx_streaming_current_status` (`job_status`),
    KEY                       `idx_streaming_current_update_time` (`update_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='实时任务当前汇总指标表';

DROP TABLE IF EXISTS `t_baize_flow_streaming_job_metrics_snapshot`;
CREATE TABLE `t_baize_flow_streaming_job_metrics_snapshot`
(
    `collect_time_ms`         bigint         NOT NULL COMMENT '采集时间戳，单位：毫秒',
    `job_instance_id`         bigint         NOT NULL COMMENT 'Web侧实例ID',
    `job_definition_id`       bigint         NOT NULL COMMENT '任务定义ID',
    `engine_job_id`           varchar(64)             DEFAULT NULL COMMENT 'SeaTunnel Engine Job ID',
    `client_id`               bigint                  DEFAULT NULL COMMENT 'SeaTunnel Client ID',
    `pipeline_id`             int            NOT NULL DEFAULT 0 COMMENT 'Pipeline ID',
    `job_status`              varchar(32)             DEFAULT NULL COMMENT '引擎返回的任务状态',
    `read_row_count`          bigint         NOT NULL DEFAULT 0 COMMENT '读取行数',
    `write_row_count`         bigint         NOT NULL DEFAULT 0 COMMENT '写入行数',
    `read_qps`                decimal(20, 4) NOT NULL DEFAULT 0.0000 COMMENT '读取QPS',
    `write_qps`               decimal(20, 4) NOT NULL DEFAULT 0.0000 COMMENT '写入QPS',
    `read_bytes`              bigint         NOT NULL DEFAULT 0 COMMENT '读取字节数',
    `write_bytes`             bigint         NOT NULL DEFAULT 0 COMMENT '写入字节数',
    `read_bps`                decimal(20, 4) NOT NULL DEFAULT 0.0000 COMMENT '读取BPS，单位：字节/秒',
    `write_bps`               decimal(20, 4) NOT NULL DEFAULT 0.0000 COMMENT '写入BPS，单位：字节/秒',
    `intermediate_queue_size` bigint         NOT NULL DEFAULT 0 COMMENT '中间队列大小',
    `lag_count`               bigint         NOT NULL DEFAULT 0 COMMENT '滞后数量',
    `record_delay`            bigint         NOT NULL DEFAULT 0 COMMENT '数据延迟，单位：毫秒',
    `collect_time`            datetime       NOT NULL COMMENT '采集时间',
    `create_time`             datetime       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`job_instance_id`, `collect_time_ms`, `pipeline_id`),
    KEY                       `idx_streaming_metrics_definition_time` (`job_definition_id`, `collect_time_ms`),
    KEY                       `idx_streaming_metrics_engine_time` (`engine_job_id`, `collect_time_ms`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='实时任务指标快照表';

DROP TABLE IF EXISTS `t_baize_flow_streaming_job_table_metrics_current`;
CREATE TABLE `t_baize_flow_streaming_job_table_metrics_current`
(
    `job_instance_id`      bigint         NOT NULL COMMENT 'Web侧实例ID',
    `job_definition_id`    bigint         NOT NULL COMMENT '任务定义ID',
    `engine_job_id`        varchar(64)             DEFAULT NULL COMMENT 'SeaTunnel Engine Job ID',
    `client_id`            bigint                  DEFAULT NULL COMMENT 'SeaTunnel Client ID',
    `pipeline_id`          int            NOT NULL DEFAULT 0 COMMENT 'Pipeline ID',
    `source_table`         varchar(512)            DEFAULT NULL COMMENT '源表',
    `sink_table`           varchar(512)            DEFAULT NULL COMMENT '目标表',
    `table_key`            varchar(1024)  NOT NULL COMMENT 'source/sink 合成 key',
    `table_key_hash`       char(32)       NOT NULL COMMENT 'table_key MD5 hash',
    `read_row_count`       bigint         NOT NULL DEFAULT 0 COMMENT '读取行数',
    `write_row_count`      bigint         NOT NULL DEFAULT 0 COMMENT '写入行数',
    `read_qps`             decimal(20, 4) NOT NULL DEFAULT 0.0000 COMMENT '读取QPS',
    `write_qps`            decimal(20, 4) NOT NULL DEFAULT 0.0000 COMMENT '写入QPS',
    `read_bytes`           bigint         NOT NULL DEFAULT 0 COMMENT '读取字节数',
    `write_bytes`          bigint         NOT NULL DEFAULT 0 COMMENT '写入字节数',
    `read_bps`             decimal(20, 4) NOT NULL DEFAULT 0.0000 COMMENT '读取BPS，单位：字节/秒',
    `write_bps`            decimal(20, 4) NOT NULL DEFAULT 0.0000 COMMENT '写入BPS，单位：字节/秒',
    `status`               varchar(32)             DEFAULT NULL COMMENT '表级状态',
    `error_msg`            text COMMENT '表级错误信息',
    `last_collect_time_ms` bigint         NOT NULL COMMENT '最近采集时间戳，单位：毫秒',
    `last_collect_time`    datetime       NOT NULL COMMENT '最近采集时间',
    `create_time`          datetime       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`          datetime       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`job_instance_id`, `pipeline_id`, `table_key_hash`),
    KEY                    `idx_streaming_table_current_definition` (`job_definition_id`),
    KEY                    `idx_streaming_table_current_source` (`source_table`),
    KEY                    `idx_streaming_table_current_sink` (`sink_table`),
    KEY                    `idx_streaming_table_current_update_time` (`update_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='实时任务当前表级指标表';

-- ============================================================
-- 2. Quartz scheduler tables
-- ============================================================

DROP TABLE IF EXISTS `QRTZ_JOB_DETAILS`;
CREATE TABLE `QRTZ_JOB_DETAILS`
(
    `sched_name`        varchar(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `job_name`          varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `job_group`         varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `description`       varchar(250) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
    `job_class_name`    varchar(250) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `is_durable`        varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci   NOT NULL,
    `is_nonconcurrent`  varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci   NOT NULL,
    `is_update_data`    varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci   NOT NULL,
    `requests_recovery` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci   NOT NULL,
    `job_data`          blob NULL,
    PRIMARY KEY (`sched_name`, `job_name`, `job_group`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

DROP TABLE IF EXISTS `QRTZ_TRIGGERS`;
CREATE TABLE `QRTZ_TRIGGERS`
(
    `sched_name`     varchar(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `trigger_name`   varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `trigger_group`  varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `job_name`       varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `job_group`      varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `description`    varchar(250) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
    `next_fire_time` bigint(0) NULL DEFAULT NULL,
    `prev_fire_time` bigint(0) NULL DEFAULT NULL,
    `priority`       int(0) NULL DEFAULT NULL,
    `trigger_state`  varchar(16) CHARACTER SET utf8 COLLATE utf8_general_ci  NOT NULL,
    `trigger_type`   varchar(8) CHARACTER SET utf8 COLLATE utf8_general_ci   NOT NULL,
    `start_time`     bigint(0) NOT NULL,
    `end_time`       bigint(0) NULL DEFAULT NULL,
    `calendar_name`  varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
    `misfire_instr`  smallint(0) NULL DEFAULT NULL,
    `job_data`       blob NULL,
    PRIMARY KEY (`sched_name`, `trigger_name`, `trigger_group`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

DROP TABLE IF EXISTS `QRTZ_SIMPLE_TRIGGERS`;
CREATE TABLE `QRTZ_SIMPLE_TRIGGERS`
(
    `sched_name`      varchar(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `trigger_name`    varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `trigger_group`   varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `repeat_count`    bigint(0) NOT NULL,
    `repeat_interval` bigint(0) NOT NULL,
    `times_triggered` bigint(0) NOT NULL,
    PRIMARY KEY (`sched_name`, `trigger_name`, `trigger_group`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

DROP TABLE IF EXISTS `QRTZ_CRON_TRIGGERS`;
CREATE TABLE `QRTZ_CRON_TRIGGERS`
(
    `sched_name`      varchar(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `trigger_name`    varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `trigger_group`   varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `cron_expression` varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `time_zone_id`    varchar(80) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
    PRIMARY KEY (`sched_name`, `trigger_name`, `trigger_group`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

DROP TABLE IF EXISTS `QRTZ_SIMPROP_TRIGGERS`;
CREATE TABLE `QRTZ_SIMPROP_TRIGGERS`
(
    `sched_name`    varchar(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `trigger_name`  varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `trigger_group` varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `str_prop_1`    varchar(512) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
    `str_prop_2`    varchar(512) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
    `str_prop_3`    varchar(512) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
    `int_prop_1`    int(0) NULL DEFAULT NULL,
    `int_prop_2`    int(0) NULL DEFAULT NULL,
    `long_prop_1`   bigint(0) NULL DEFAULT NULL,
    `long_prop_2`   bigint(0) NULL DEFAULT NULL,
    `dec_prop_1`    decimal(13, 4) NULL DEFAULT NULL,
    `dec_prop_2`    decimal(13, 4) NULL DEFAULT NULL,
    `bool_prop_1`   varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
    `bool_prop_2`   varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
    PRIMARY KEY (`sched_name`, `trigger_name`, `trigger_group`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

DROP TABLE IF EXISTS `QRTZ_BLOB_TRIGGERS`;
CREATE TABLE `QRTZ_BLOB_TRIGGERS`
(
    `sched_name`    varchar(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `trigger_name`  varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `trigger_group` varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `blob_data`     blob NULL,
    PRIMARY KEY (`sched_name`, `trigger_name`, `trigger_group`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

DROP TABLE IF EXISTS `QRTZ_CALENDARS`;
CREATE TABLE `QRTZ_CALENDARS`
(
    `sched_name`    varchar(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `calendar_name` varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `calendar`      blob                                                    NOT NULL,
    PRIMARY KEY (`sched_name`, `calendar_name`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

DROP TABLE IF EXISTS `QRTZ_PAUSED_TRIGGER_GRPS`;
CREATE TABLE `QRTZ_PAUSED_TRIGGER_GRPS`
(
    `sched_name`    varchar(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `trigger_group` varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    PRIMARY KEY (`sched_name`, `trigger_group`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

DROP TABLE IF EXISTS `QRTZ_FIRED_TRIGGERS`;
CREATE TABLE `QRTZ_FIRED_TRIGGERS`
(
    `sched_name`        varchar(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `entry_id`          varchar(95) CHARACTER SET utf8 COLLATE utf8_general_ci  NOT NULL,
    `trigger_name`      varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `trigger_group`     varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `instance_name`     varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `fired_time`        bigint(0) NOT NULL,
    `sched_time`        bigint(0) NOT NULL,
    `priority`          int(0) NOT NULL,
    `state`             varchar(16) CHARACTER SET utf8 COLLATE utf8_general_ci  NOT NULL,
    `job_name`          varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
    `job_group`         varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
    `is_nonconcurrent`  varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
    `requests_recovery` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
    PRIMARY KEY (`sched_name`, `entry_id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

DROP TABLE IF EXISTS `QRTZ_SCHEDULER_STATE`;
CREATE TABLE `QRTZ_SCHEDULER_STATE`
(
    `sched_name`        varchar(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `instance_name`     varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `last_checkin_time` bigint(0) NOT NULL,
    `checkin_interval`  bigint(0) NOT NULL,
    PRIMARY KEY (`sched_name`, `instance_name`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

DROP TABLE IF EXISTS `QRTZ_LOCKS`;
CREATE TABLE `QRTZ_LOCKS`
(
    `sched_name` varchar(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
    `lock_name`  varchar(40) CHARACTER SET utf8 COLLATE utf8_general_ci  NOT NULL,
    PRIMARY KEY (`sched_name`, `lock_name`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

-- ============================================================
-- 3. Initial data
-- ============================================================

INSERT INTO `t_baize_flow_time_variable`
(`id`, `param_name`, `param_desc`, `variable_source`, `value_type`, `time_format`, `default_value`, `expression`,
 `example_value`, `enabled`, `remark`)
VALUES (10001, 'now', '当前时间', 'SYSTEM', 'DYNAMIC', 'yyyy-MM-dd HH:mm:ss', NULL, 'now', '2026-05-02 09:30:00', 1,
        '系统内置变量'),
       (10002, 'today', '今天零点', 'SYSTEM', 'DYNAMIC', 'yyyy-MM-dd HH:mm:ss', NULL, 'today', '2026-05-02 00:00:00', 1,
        '系统内置变量'),
       (10003, 'biz_date', '业务日期，默认取调度时间的前一天', 'SYSTEM', 'DYNAMIC', 'yyyy-MM-dd', NULL, 'schedule_time-1d',
        '2026-05-01', 1, '系统内置变量'),
       (10004, 'start_time', '同步开始时间，默认取调度时间前一天零点', 'SYSTEM', 'DYNAMIC', 'yyyy-MM-dd HH:mm:ss', NULL,
        'schedule_time-1d@day_start', '2026-05-01 00:00:00', 1, '系统内置变量'),
       (10005, 'end_time', '同步结束时间，默认取调度当天零点', 'SYSTEM', 'DYNAMIC', 'yyyy-MM-dd HH:mm:ss', NULL,
        'schedule_time@day_start', '2026-05-02 00:00:00', 1, '系统内置变量');

INSERT INTO `t_baize_flow_user`
(`id`, `user_name`, `user_password`, `user_type`, `email`, `phone`, `create_time`, `update_time`, `state`)
VALUES (1, 'admin', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi4iFP1Zc2l1N9CifJmJ4PrGiHeq.8K', 0, NULL, NULL, NULL, NULL, 1);

SET
FOREIGN_KEY_CHECKS = 1;


-- Connector parameter metadata
-- JDBC Connector 参数元数据初始化脚本
-- 生成内容：Jdbc Source + Jdbc Sink
-- 注意：参数名以用户提供的 SeaTunnel 配置项为准，例如 fetch_size、split.size。

ALTER TABLE `t_baize_flow_connector_param_meta`
DROP
INDEX `uk_connector_param`,
  ADD UNIQUE KEY `uk_connector_param`
  (`type`, `connector_name`, `connector_type`, `param_name`, `deleted`);

START TRANSACTION;

-- ==================== Jdbc Source：31 个参数 ====================
INSERT INTO `t_baize_flow_connector_param_meta`
(`type`, `connector_name`, `connector_type`, `param_name`, `param_desc`,
 `param_type`, `required_flag`, `default_value`, `example_value`, `param_context`,
 `remark`, `deleted`)
VALUES ('connector', 'Jdbc', 'source', 'compatible_mode',
        '数据库兼容模式，例如 OceanBase 使用 mysql 或 oracle，StarRocks 使用 starrocks。', 'string', 0, NULL, 'mysql',
        '{"summary":"指定数据库兼容模式。","coreMeaning":"用于同一数据库产品支持多种协议或兼容语义时选择正确解析方式。","recommendationHints":["OceanBase 按实际租户模式选择 mysql 或 oracle。","StarRocks 场景设置为 starrocks。"],"cautions":["配置值必须与目标数据库真实兼容模式一致。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'dialect', '显式指定 JDBC 方言，优先级高于通过 URL 自动识别。', 'string', 0, NULL, 'mysql',
        '{"summary":"指定 SeaTunnel 使用的 JDBC 方言。","coreMeaning":"方言决定类型映射、SQL 生成、元数据读取等数据库差异化行为。","recommendationHints":["URL 无法准确识别或使用兼容数据库时显式配置。"],"cautions":["错误方言可能导致类型映射或 SQL 语法错误。","未支持方言可能回退到 GenericDialect。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'connection_check_timeout_sec', '验证数据库连接操作的超时时间，单位秒。', 'number', 0, '30', '30',
        '{"summary":"控制 JDBC 连接检查的等待时间。","coreMeaning":"超过该时间仍未完成连接验证时，连接检查会失败。","recommendationHints":["网络稳定的内网环境通常保持默认值。","跨区域、代理或高延迟网络可适当调大。"],"cautions":["过大可能延长故障发现时间。","过小可能在网络抖动时产生误判。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'partition_column', '用于并行分片读取的列名。', 'string', 0, NULL, 'id',
        '{"summary":"指定 query 模式下的分片列。","coreMeaning":"SeaTunnel 根据该列的上下界划分多个读取分区。","recommendationHints":["优先选择有索引、分布较均匀、可比较的数值列。"],"cautions":["分布严重倾斜会造成任务长尾。","该参数主要用于 query 模式。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'partition_upper_bound', '分片列扫描上界；未配置时 SeaTunnel 会查询最大值。', 'number', 0, NULL,
        '1000000',
        '{"summary":"设置 partition_column 的最大扫描边界。","coreMeaning":"与下界及分片数共同决定 query 模式的分区范围。","recommendationHints":["边界已知且稳定时可显式配置，减少额外元数据查询。"],"cautions":["配置过小会漏读超过上界的数据。","应与 partition_column 数据类型匹配。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'partition_lower_bound', '分片列扫描下界；未配置时 SeaTunnel 会查询最小值。', 'number', 0, NULL,
        '1',
        '{"summary":"设置 partition_column 的最小扫描边界。","coreMeaning":"与上界及分片数共同决定 query 模式的分区范围。","recommendationHints":["边界已知且稳定时可显式配置。"],"cautions":["配置过大会漏读低于下界的数据。","应与 partition_column 数据类型匹配。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'partition_num', 'query 模式下的分区数量；默认采用作业并行度，不推荐直接使用，优先通过合理分片策略控制。', 'number', 0,
        'job parallelism', '8',
        '{"summary":"控制 query 模式下生成的读取分区数量。","coreMeaning":"分区数通常影响 JDBC 并发连接数及读取并行度。","recommendationHints":["仅在 query 模式确有并行分区需求时设置。","通常不应超过数据库可承受的并发连接数。"],"cautions":["table_path 模式下不生效。","过大可能压垮源库，过小可能限制吞吐。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'decimal_type_narrowing', '是否在无精度损失时将 DECIMAL 缩窄为 INT 或 LONG；目前主要支持 Oracle。',
        'boolean', 0, 'true', 'true',
        '{"summary":"控制 DECIMAL 类型是否进行无损缩窄。","coreMeaning":"开启后，满足精度范围的 DECIMAL 可映射为更紧凑的整数类型。","recommendationHints":["Oracle 且下游更适合整数类型时可开启。"],"cautions":["目前仅部分数据库支持。","关闭可保留更稳定的 DECIMAL 语义。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'int_type_narrowing', '是否在无精度损失时将整数类型缩窄，例如 MySQL tinyint(1) 转为 boolean。',
        'boolean', 0, 'true', 'true',
        '{"summary":"控制整数类型的语义化缩窄。","coreMeaning":"开启后，特定数据库的小整数类型可能映射为 BOOLEAN 等更精确类型。","recommendationHints":["MySQL tinyint(1) 作为布尔字段时可保持默认开启。"],"cautions":["若 tinyint(1) 实际存储数值含义，应谨慎开启。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'handle_blob_as_string', '是否将 BLOB 转换为 STRING；目前仅支持 Oracle。', 'boolean', 0,
        'false', 'true',
        '{"summary":"控制 Oracle BLOB 字段是否按字符串读取。","coreMeaning":"适合 BLOB 实际承载文本且下游系统更易处理 STRING 的场景。","recommendationHints":["Oracle BLOB 为文本内容并写入 Doris 等系统时可评估开启。"],"cautions":["二进制内容不应直接按字符串处理。","大字段会显著增加网络和内存压力。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'use_select_count', '动态分片阶段是否直接使用 SELECT COUNT 获取表行数；目前仅适用于 JDBC Oracle。',
        'boolean', 0, 'false', 'true',
        '{"summary":"控制动态分片阶段的表行数统计方式。","coreMeaning":"开启后直接执行 SELECT COUNT，而不是依赖其他统计信息方式。","recommendationHints":["Oracle 表统计信息不准确但直接 COUNT 更可靠时使用。"],"cautions":["大表 SELECT COUNT 可能产生较高数据库开销。","仅 JDBC Oracle 生效。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'skip_analyze', '动态分片阶段是否跳过表行数分析；目前仅适用于 JDBC Oracle。', 'boolean', 0, 'false',
        'true',
        '{"summary":"控制是否跳过动态分片前的表行数分析。","coreMeaning":"适合已有定期统计信息维护，或表数据变化不频繁的场景。","recommendationHints":["已由 DBA 定期更新统计信息时可评估开启。"],"cautions":["统计信息过旧可能导致分片估算不准确。","仅 JDBC Oracle 生效。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'use_regex', '是否将 table_path 按正则表达式匹配；关闭时按精确路径处理。', 'boolean', 0, 'false',
        'true',
        '{"summary":"控制 table_path 的匹配方式。","coreMeaning":"开启后可通过正则一次匹配多张表，关闭时仅匹配精确表路径。","recommendationHints":["批量匹配命名规则一致的表时使用。"],"cautions":["正则范围过宽可能误匹配大量表。","开启前应验证匹配结果。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'fetch_size', 'JDBC 查询结果集每次抓取的行数；0 表示使用 JDBC 驱动默认值。', 'number', 0, '0', '2048',
        '{"summary":"控制 JDBC 结果集读取时的单次抓取批量。","coreMeaning":"影响结果集分批拉取节奏，不等于返回总条数。","processingLogic":["值小：单批更轻，但数据库与客户端往返更多。","值大：往返更少，但单批网络和内存压力更高。"],"recommendationHints":["大结果集、轻量行数据可适当调大。","宽表、大字段、内存敏感场景应谨慎调大。","稳定性优先时可适当调小。"],"cautions":["不等于 limit。","不是越大越好。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'properties', '附加 JDBC 连接属性；与 URL 参数重复时，优先级由具体驱动决定。', 'map', 0, NULL,
        '{"useSSL":"false","serverTimezone":"Asia/Shanghai"}',
        '{"summary":"补充 JDBC 驱动连接属性。","coreMeaning":"适合配置 SSL、时区、字符集、连接行为及厂商特有参数。","recommendationHints":["将驱动专属参数集中放在 properties 中便于管理。"],"cautions":["与 URL 重复时必须确认驱动的实际优先级。","不要在 properties 中明文保存密钥。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'where_condition', '应用于所有表或查询的公共行过滤条件，必须以 where 开头。', 'string', 0, NULL,
        'where id > 100',
        '{"summary":"为 JDBC Source 追加统一行过滤条件。","coreMeaning":"用于减少读取范围，实现增量窗口或业务条件过滤。","recommendationHints":["过滤列应尽量有索引。","用于时间窗口时应明确边界是否包含。"],"cautions":["必须以 where 开头。","拼接条件前应验证 SQL 注入和语法风险。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'split.size', 'table_path 模式下每个读取分片包含的行数。', 'number', 0, '8096', '20000',
        '{"summary":"控制 JDBC 表读取时单个 split 的目标行数。","coreMeaning":"表会按该值拆分成多个读取分片，影响并行粒度和调度开销。","recommendationHints":["大表可结合数据库承载能力适当调小以增加并行度。","中小表或调度开销敏感时可适当调大。"],"cautions":["仅 table_path 模式生效，query 模式不生效。","过小会产生过多 split，过大可能造成任务长尾。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'split.even-distribution.factor.lower-bound', '判断分片键是否均匀分布的下界因子，不推荐常规修改。',
        'number', 0, '0.05', '0.05',
        '{"summary":"设置分片键均匀分布判断的下界。","coreMeaning":"当 (MAX-MIN+1)/行数 低于该值时，数据可能被判定为非均匀分布。","recommendationHints":["通常保持默认值。","仅在充分理解分片算法并完成压测后调整。"],"cautions":["错误调整可能导致不合适的分片策略。","不推荐常规业务直接配置。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'split.even-distribution.factor.upper-bound', '判断分片键是否均匀分布的上界因子，不推荐常规修改。',
        'number', 0, '100', '100',
        '{"summary":"设置分片键均匀分布判断的上界。","coreMeaning":"当 (MAX-MIN+1)/行数 高于该值时，数据可能被判定为非均匀分布。","recommendationHints":["通常保持默认值。","仅在充分理解分片算法并完成压测后调整。"],"cautions":["错误调整可能导致不合适的分片策略。","不推荐常规业务直接配置。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'split.sample-sharding.threshold', '估算分片数超过该阈值且数据分布不均时，触发采样分片策略。', 'number', 0,
        '1000', '1000',
        '{"summary":"控制何时启用采样分片策略。","coreMeaning":"数据分布因子超出均匀范围，且预计分片数超过阈值时使用采样。","recommendationHints":["超大表且分片键稀疏或倾斜时保持默认或结合压测调整。"],"cautions":["阈值过低会增加采样开销。","阈值过高可能导致非均匀分片。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'split.inverse-sampling.rate', '采样分片策略的采样率倒数，例如 1000 表示采样率为 1/1000。', 'number',
        0, '1000', '1000',
        '{"summary":"控制采样分片时的采样密度。","coreMeaning":"值越大，实际采样比例越低；值越小，采样数据越多。","recommendationHints":["超大数据集可使用较低采样率以控制采样成本。"],"cautions":["采样过少可能降低分片边界估算准确性。","采样过多会增加数据库扫描开销。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'common-options', 'Source 插件通用参数集合，具体字段参见 SeaTunnel Source Common Options。',
        'object', 0, NULL, '{"plugin_output":"jdbc_source_result"}',
        '{"summary":"承载 Source 插件公共能力参数。","coreMeaning":"不是 JDBC 专属业务参数，通常用于结果表名、并行度等公共配置。","recommendationHints":["仅填写当前 SeaTunnel 版本明确支持的公共参数。"],"cautions":["不同版本支持项可能不同。","该项可作为参数组展示，而非直接输出 common-options 键。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'split.string_split_mode', '字符串分片算法，可选 sample 或 charset_based。', 'string', 0,
        'sample', 'charset_based',
        '{"summary":"选择字符串类型 partition_column 的分片算法。","coreMeaning":"sample 通过采样估算边界；charset_based 按字符集范围计算分片。","recommendationHints":["普通字符串键保持 sample。","字符主要位于 ASCII 32-126 范围时可评估 charset_based。"],"cautions":["charset_based 对字符范围有假设。","特殊字符集或排序规则需额外配置 collation。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'source', 'split.string_split_mode_collate',
        '当 split.string_split_mode=charset_based 且表使用特殊排序规则时指定 collation。', 'string', 0, NULL, 'utf8mb4_bin',
        '{"summary":"指定字符串字符集分片使用的排序规则。","coreMeaning":"用于保证字符比较顺序与数据库实际 collation 一致。","recommendationHints":["仅在 charset_based 模式且数据库默认排序规则不适用时配置。"],"cautions":["错误 collation 可能造成分片边界不准确。"]}',
        '用于AI参数推荐', 0) ON DUPLICATE KEY
UPDATE
    `param_desc` =
VALUES (`param_desc`),
    `param_type` =
VALUES (`param_type`),
    `required_flag` =
VALUES (`required_flag`),
    `default_value` =
VALUES (`default_value`),
    `example_value` =
VALUES (`example_value`),
    `param_context` =
VALUES (`param_context`),
    `remark` =
VALUES (`remark`),
    `update_time` = CURRENT_TIMESTAMP;

-- ==================== Jdbc Sink：31 个参数 ====================
INSERT INTO `t_baize_flow_connector_param_meta`
(`type`, `connector_name`, `connector_type`, `param_name`, `param_desc`,
 `param_type`, `required_flag`, `default_value`, `example_value`, `param_context`,
 `remark`, `deleted`)
VALUES ('connector', 'Jdbc', 'sink', 'compatible_mode',
        '数据库兼容模式，例如 OceanBase 使用 mysql 或 oracle，StarRocks 使用 starrocks。', 'string', 0, NULL, 'mysql',
        '{"summary":"指定目标数据库的兼容模式。","coreMeaning":"用于选择正确的类型映射和 SQL 生成行为。","recommendationHints":["OceanBase、StarRocks、低版本 PostgreSQL 等兼容场景按文档设置。"],"cautions":["配置错误可能导致生成 SQL 不兼容。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'dialect', '显式指定 JDBC 方言，优先级高于通过 URL 自动识别。', 'string', 0, NULL, 'mysql',
        '{"summary":"指定 JDBC Sink 方言。","coreMeaning":"影响建表语句、Upsert 语法、标识符处理和类型映射。","recommendationHints":["URL 无法准确识别或兼容数据库时显式配置。"],"cautions":["不支持的方言可能回退 GenericDialect。","错误方言可能生成不可执行 SQL。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'primary_keys', '目标表主键字段列表，用于自动生成 INSERT、UPDATE、DELETE 或 UPSERT SQL。', 'array', 0,
        NULL, '["id"]',
        '{"summary":"声明目标表主键。","coreMeaning":"SeaTunnel 使用主键识别记录并生成 Upsert、更新和删除语义。","recommendationHints":["CDC 或需要幂等写入时应准确配置。","联合主键按字段顺序填写。"],"cautions":["错误主键可能导致重复数据或误更新。","目标表应具备对应唯一性约束。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'connection_check_timeout_sec', '验证目标数据库连接操作的超时时间，单位秒。', 'number', 0, '30', '30',
        '{"summary":"控制 JDBC Sink 连接检查等待时间。","coreMeaning":"超过该时间仍未完成验证时判定连接失败。","recommendationHints":["跨区域或高延迟环境可适当调大。"],"cautions":["过大延长故障反馈，过小可能误判网络抖动。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'max_retries', 'executeBatch 批量提交失败后的最大重试次数。', 'number', 0, '0', '3',
        '{"summary":"控制批量写入失败的重试次数。","coreMeaning":"适合应对短暂网络抖动、连接重置或数据库瞬时不可用。","recommendationHints":["存在短暂故障时可设置 2~3 次并配合退避。"],"cautions":["非幂等 SQL 重试可能导致重复写入。","持续性错误重试只会延长失败时间。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'batch_size', '批量写入缓冲记录数；达到 batch_size 或 checkpoint.interval 时触发刷写。', 'number', 0,
        '1000', '2000',
        '{"summary":"控制 JDBC Sink 单次 executeBatch 的记录数量。","coreMeaning":"影响写入吞吐、数据库事务大小、网络往返和内存占用。","recommendationHints":["高吞吐、窄表场景可适当调大。","宽表、大字段或数据库压力高时适当调小。"],"cautions":["过大可能造成事务过重、锁持有时间变长或 OOM。","过小会增加网络往返和提交开销。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'is_exactly_once', '是否通过 XA 事务启用 Exactly-Once 语义。', 'boolean', 0, 'false', 'true',
        '{"summary":"控制 JDBC Sink 是否启用 XA Exactly-Once。","coreMeaning":"开启后通过分布式事务协调 checkpoint 与数据库提交。","recommendationHints":["强一致且能接受 XA 成本时开启。","开启时必须配置 xa_data_source_class_name。"],"cautions":["XA 会增加事务开销和运维复杂度。","目标数据库与驱动必须支持 XA。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'generate_sink_sql', '是否基于目标数据库表结构自动生成 Sink SQL。', 'boolean', 0, 'false', 'true',
        '{"summary":"控制是否自动生成 JDBC Sink 写入 SQL。","coreMeaning":"开启后 SeaTunnel 根据目标表、字段和主键生成语句。","recommendationHints":["标准表结构和字段映射场景可开启。"],"cautions":["复杂表达式、特殊函数或非标准写法应使用 query。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'xa_data_source_class_name',
        'XA 数据源类名，例如 MySQL 使用 com.mysql.cj.jdbc.MysqlXADataSource。', 'string', 0, NULL,
        'com.mysql.cj.jdbc.MysqlXADataSource',
        '{"summary":"指定 Exactly-Once 使用的 XADataSource 实现类。","coreMeaning":"SeaTunnel 通过该类创建 XA 连接并参与两阶段提交。","recommendationHints":["仅在 is_exactly_once=true 时配置。"],"cautions":["类名必须与数据库驱动版本匹配。","普通 DataSource 类不能替代 XADataSource。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'max_commit_attempts', '事务提交失败时的最大重试次数。', 'number', 0, '3', '3',
        '{"summary":"控制事务 commit 失败后的重试次数。","coreMeaning":"主要用于 Exactly-Once 或显式事务提交阶段的瞬时故障恢复。","recommendationHints":["保持默认值或结合数据库故障特征小幅调整。"],"cautions":["过多重试会延长 checkpoint 完成时间。","提交结果不确定时需关注重复提交风险。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'transaction_timeout_sec', '事务开启后的超时时间，-1 表示永不超时。', 'number', 0, '-1', '300',
        '{"summary":"控制 JDBC Sink 事务最大持续时间。","coreMeaning":"超过超时时间的事务可能被回滚或判定失败。","recommendationHints":["长 checkpoint 场景应保证超时大于正常事务周期。"],"cautions":["设置过短可能破坏 Exactly-Once。","-1 虽无超时，但可能导致异常事务长时间占用资源。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'auto_commit', '是否启用 JDBC 自动提交。', 'boolean', 0, 'true', 'false',
        '{"summary":"控制 JDBC 连接的自动提交模式。","coreMeaning":"开启时每次数据库操作按驱动行为自动提交；关闭时由任务显式管理事务。","recommendationHints":["普通简单写入可保持默认。","需要批次事务控制时结合整体语义评估关闭。"],"cautions":["与 Exactly-Once、checkpoint 和事务配置存在联动。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'field_ide', '字段名大小写转换策略：ORIGINAL、UPPERCASE、LOWERCASE。', 'string', 0, NULL,
        'ORIGINAL',
        '{"summary":"控制从 Source 到 Sink 的字段名大小写转换。","coreMeaning":"用于适配 Oracle 等对未加引号标识符大小写处理不同的数据库。","recommendationHints":["无转换需求使用 ORIGINAL。","目标表字段统一大写或小写时选择对应策略。"],"cautions":["转换后可能出现字段重名。","需与目标表真实字段名保持一致。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'properties', '附加 JDBC 连接属性；与 URL 参数重复时，优先级由具体驱动决定。', 'map', 0, NULL,
        '{"rewriteBatchedStatements":"true","useSSL":"false"}',
        '{"summary":"补充 JDBC Sink 驱动连接属性。","coreMeaning":"可用于批处理优化、SSL、时区、字符集及厂商专属配置。","recommendationHints":["MySQL 批量写入可评估 rewriteBatchedStatements=true。"],"cautions":["驱动属性存在版本差异。","与 URL 重复参数需确认优先级。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'common-options', 'Sink 插件通用参数集合，具体字段参见 SeaTunnel Sink Common Options。', 'object',
        0, NULL, '{"parallelism":4}',
        '{"summary":"承载 Sink 插件公共能力参数。","coreMeaning":"不是 JDBC 专属参数，通常用于并行度等通用任务配置。","recommendationHints":["仅填写当前 SeaTunnel 版本支持的公共参数。"],"cautions":["该项可作为参数组展示，而不是直接输出 common-options 键。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'schema_save_mode', '任务启动前目标表结构处理策略。', 'enum', 0, 'CREATE_SCHEMA_WHEN_NOT_EXIST',
        'CREATE_SCHEMA_WHEN_NOT_EXIST',
        '{"summary":"控制目标表不存在或已存在时的结构处理方式。","coreMeaning":"可选 RECREATE_SCHEMA、CREATE_SCHEMA_WHEN_NOT_EXIST、ERROR_WHEN_SCHEMA_NOT_EXIST、IGNORE。","recommendationHints":["首次迁移常用 CREATE_SCHEMA_WHEN_NOT_EXIST。","需要完全重建且可接受删表时使用 RECREATE_SCHEMA。"],"cautions":["RECREATE_SCHEMA 会删除并重建已有表，存在数据丢失风险。","生产环境应谨慎授予 DDL 权限。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'data_save_mode', '任务启动前目标表已有数据的处理策略。', 'enum', 0, 'APPEND_DATA', 'APPEND_DATA',
        '{"summary":"控制目标端已有数据如何处理。","coreMeaning":"可选 DROP_DATA、APPEND_DATA、CUSTOM_PROCESSING、ERROR_WHEN_DATA_EXISTS。","recommendationHints":["增量同步通常使用 APPEND_DATA。","全量重灌可在确认风险后使用 DROP_DATA。"],"cautions":["DROP_DATA 会清空数据。","CUSTOM_PROCESSING 必须同时配置 custom_sql。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'custom_sql', '当 data_save_mode=CUSTOM_PROCESSING 时，在同步前执行的自定义 SQL。', 'string', 0,
        NULL, 'TRUNCATE TABLE test.user',
        '{"summary":"定义同步任务开始前的自定义数据处理 SQL。","coreMeaning":"适合清理分区、删除时间窗口数据或执行业务化预处理。","recommendationHints":["仅在 CUSTOM_PROCESSING 模式使用。","应保证 SQL 可重复执行或具备明确幂等性。"],"cautions":["高风险 DDL/DML 可能造成不可逆数据损失。","需要严格限制权限并记录审计日志。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'enable_upsert', '存在 primary_keys 时是否启用 Upsert；无重复键场景关闭可提升导入性能。', 'boolean', 0,
        'true', 'true',
        '{"summary":"控制基于主键的插入或更新语义。","coreMeaning":"开启后相同主键记录可更新目标数据；关闭后通常按纯插入处理。","recommendationHints":["CDC、去重或幂等同步保持开启。","确认数据绝无重复且追求纯插入性能时可关闭。"],"cautions":["关闭后重复键可能导致失败。","开启 Upsert 通常比纯 INSERT 开销更高。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'use_copy_statement',
        '是否使用 COPY ${table} FROM STDIN 导入；仅支持提供 Copy API 的驱动，例如 PostgreSQL。', 'boolean', 0, 'false', 'true',
        '{"summary":"控制是否使用数据库 COPY 协议进行高速批量导入。","coreMeaning":"COPY 通常比逐批 INSERT 更高效，主要用于 PostgreSQL 等支持 Copy API 的驱动。","recommendationHints":["PostgreSQL 大批量追加写入可评估开启。"],"cautions":["不支持 MAP、ARRAY、ROW 类型。","仅驱动连接提供 getCopyAPI() 时可用。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'create_index', '自动建表时是否创建主键及其他索引。关闭可提升大表迁移写入速度，迁移后可手动补建索引。', 'boolean', 0, 'true',
        'false',
        '{"summary":"控制自动创建目标表时是否同步创建索引。","coreMeaning":"索引可提升后续查询和约束能力，但会增加写入维护成本。","recommendationHints":["大批量全量迁移可暂时关闭，完成后手动创建索引。","在线增量或依赖主键约束时保持开启。"],"cautions":["关闭后查询性能和唯一性约束可能不足。","开启索引会降低批量写入吞吐。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'access_key_id', 'AWS 认证 Access Key ID，仅 dialect=dsql 时有效。', 'string', 0, NULL,
        '${AWS_ACCESS_KEY_ID}',
        '{"summary":"配置 Amazon Aurora DSQL 认证 Access Key ID。","coreMeaning":"仅在 JDBC dialect=dsql 时参与 AWS 身份认证。","recommendationHints":["通过 IAM 角色或环境变量注入。"],"cautions":["不要明文保存到数据库或代码仓库。","非 dsql 方言不生效。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'secret_access_key', 'AWS 认证 Secret Access Key，仅 dialect=dsql 时有效。', 'string', 0,
        NULL, '${AWS_SECRET_ACCESS_KEY}',
        '{"summary":"配置 Amazon Aurora DSQL 认证 Secret Access Key。","coreMeaning":"与 access_key_id 配合完成 AWS 身份认证。","recommendationHints":["通过安全密钥服务或环境变量注入。"],"cautions":["属于高敏感凭据，禁止明文展示。","非 dsql 方言不生效。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'Jdbc', 'sink', 'region', 'Amazon Aurora DSQL 所在区域，仅 dialect=dsql 时有效。', 'string', 0, NULL,
        'us-east-1',
        '{"summary":"指定 Amazon Aurora DSQL 的 AWS Region。","coreMeaning":"用于访问正确区域的 DSQL 服务端点。","recommendationHints":["填写目标 DSQL 集群实际所在区域。"],"cautions":["区域错误会导致认证或连接失败。","非 dsql 方言不生效。"]}',
        '用于AI参数推荐', 0) ON DUPLICATE KEY
UPDATE
    `param_desc` =
VALUES (`param_desc`),
    `param_type` =
VALUES (`param_type`),
    `required_flag` =
VALUES (`required_flag`),
    `default_value` =
VALUES (`default_value`),
    `example_value` =
VALUES (`example_value`),
    `param_context` =
VALUES (`param_context`),
    `remark` =
VALUES (`remark`),
    `update_time` = CURRENT_TIMESTAMP;

COMMIT;



-- MySQL CDC Source 参数元数据初始化脚本
-- 参数数量：32
-- 说明：
-- 1. 不显式写入 id，由 AUTO_INCREMENT 自动生成。
-- 2. server-id 使用平台建议默认值 5600；SeaTunnel 原生未配置时会随机生成。
-- 3. 使用 ON DUPLICATE KEY UPDATE，可重复执行并更新已有参数元数据。
-- 4. 依赖唯一索引能够唯一标识 connector_name + connector_type + param_name。

START TRANSACTION;

INSERT INTO `baize_flow`.`t_baize_flow_connector_param_meta`
(`type`, `connector_name`, `connector_type`, `param_name`, `param_desc`,
 `param_type`, `required_flag`, `default_value`, `example_value`, `param_context`,
 `remark`, `deleted`)
VALUES ('connector', 'MySQL-CDC', 'source', 'table-names-config', '表级配置列表，可为不同表指定主键和快照分片列。', 'array', 0, NULL,
        '[{"table":"db1.table1","primaryKeys":["key1"],"snapshotSplitColumn":"key2"}]',
        '{"summary":"为指定表覆盖主键和快照分片列配置。","coreMeaning":"用于无主键表、复合主键表或默认分片列不合适的场景。","recommendationHints":["仅对确有特殊需求的表进行单独配置。"],"cautions":["primaryKeys 必须能够唯一标识记录。","snapshotSplitColumn 应尽量有索引且分布均匀。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'stop.mode', 'MySQL CDC 停止模式：never、latest 或 specific。', 'enum', 0, 'NEVER',
        'never',
        '{"summary":"控制 CDC Source 是否在指定 Binlog 位置自动结束。","coreMeaning":"never 用于持续实时任务，latest 或 specific 用于有界增量读取。","validValues":["never","latest","specific"],"recommendationHints":["长期实时同步使用 never。","批式增量截取可根据需求使用 latest 或 specific。"],"cautions":["specific 需要同时配置停止文件和位置。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'stop.specific-offset.file', 'stop.mode=specific 时指定停止 Binlog 文件名。',
        'string', 0, NULL, 'mysql-bin.000130',
        '{"summary":"指定 CDC 消费的结束 Binlog 文件。","coreMeaning":"与 stop.specific-offset.pos 共同定义有界 CDC 的停止位置。","dependencies":["stop.mode=specific","stop.specific-offset.pos"],"recommendationHints":["用于明确限定增量采集区间。"],"cautions":["仅 stop.mode=specific 时生效。","停止位点必须晚于启动位点。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'stop.specific-offset.pos', 'stop.mode=specific 时指定停止 Binlog 文件位置。',
        'number', 0, NULL, '15678',
        '{"summary":"指定 CDC 消费的结束 Binlog position。","coreMeaning":"任务消费到该位置后停止。","dependencies":["stop.mode=specific","stop.specific-offset.file"],"recommendationHints":["应与停止 Binlog 文件配套配置。"],"cautions":["仅 stop.mode=specific 时生效。","位点不合理可能导致任务立即结束或无法到达。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'snapshot.split.size', '快照阶段单个分片包含的目标行数。', 'number', 0, '8096', '20000',
        '{"summary":"控制历史快照读取时的分片粒度。","coreMeaning":"表会拆分为多个 snapshot split，并由并行任务读取。","recommendationHints":["超大表可结合数据库承载能力适当调小以提升并行度。","中小表可保持默认。"],"cautions":["过小会产生大量 split 和调度开销。","过大可能造成单分片长尾。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'snapshot.fetch.size', '快照读取时每次轮询最多抓取的记录数。', 'number', 0, '1024', '2048',
        '{"summary":"控制快照阶段 JDBC 结果集单次拉取批量。","coreMeaning":"影响数据库往返次数、网络传输和 TaskManager 内存占用。","recommendationHints":["窄表、大结果集可适当调大。","宽表、大字段或内存敏感时适当调小。"],"cautions":["不是快照总行数限制。","不是越大越好。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'server-time-zone', 'MySQL 数据库服务器会话时区。', 'string', 0, 'UTC',
        'Asia/Shanghai',
        '{"summary":"指定 MySQL CDC 解析时间字段时使用的服务器时区。","coreMeaning":"用于避免 TIMESTAMP、DATETIME 等字段在源端与运行环境之间产生时区偏差。","recommendationHints":["应与 MySQL server/session time_zone 保持一致。","中国标准时间通常使用 Asia/Shanghai。"],"cautions":["错误时区可能造成时间字段整体偏移。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'connect.timeout.ms', '连接 MySQL 数据库的最大等待时间，单位毫秒。', 'duration', 0, '30000',
        '60000',
        '{"summary":"控制建立 MySQL 连接时的超时时间。","coreMeaning":"连接超过该时长仍未成功时判定失败。","recommendationHints":["内网环境通常保持默认。","跨区域或代理网络可适当调大。"],"cautions":["过大延长故障发现时间。","过小可能在网络抖动时误判失败。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'connect.max-retries', '建立 MySQL 数据库连接失败后的最大重试次数。', 'number', 0, '3', '5',
        '{"summary":"控制连接初始化失败后的重试次数。","coreMeaning":"用于应对数据库短暂不可用、网络抖动或连接建立失败。","recommendationHints":["生产环境可结合故障恢复时间设置 3 至 5 次。"],"cautions":["持续性配置错误不会因重试而恢复。","次数过大将延迟任务失败反馈。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'connection.pool.size', '快照阶段使用的 JDBC 连接池大小。', 'number', 0, '20', '20',
        '{"summary":"控制 MySQL CDC 快照读取使用的 JDBC 连接数量。","coreMeaning":"连接池大小影响快照并发能力和源数据库连接压力。","recommendationHints":["应结合 Source 并行度、MySQL max_connections 和其他业务负载设置。"],"cautions":["过大可能压垮源库或耗尽连接数。","过小可能限制快照阶段吞吐。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'chunk-key.even-distribution.factor.upper-bound', '判断快照分片键是否均匀分布的上界因子。',
        'number', 0, '100', '100',
        '{"summary":"设置分片键均匀分布判断的上界。","coreMeaning":"当 (MAX-MIN+1)/行数 超过该值时，分片键可能被判定为非均匀分布。","recommendationHints":["通常保持默认值。","仅在理解分片算法并完成压测后调整。"],"cautions":["错误调整可能导致不合适的分片策略。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'chunk-key.even-distribution.factor.lower-bound', '判断快照分片键是否均匀分布的下界因子。',
        'number', 0, '0.05', '0.05',
        '{"summary":"设置分片键均匀分布判断的下界。","coreMeaning":"当 (MAX-MIN+1)/行数 低于该值时，分片键可能被判定为非均匀分布。","recommendationHints":["通常保持默认值。","仅在理解分片算法并完成压测后调整。"],"cautions":["错误调整可能导致不合适的分片策略。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'sample-sharding.threshold', '估算分片数超过该阈值且数据分布不均时触发采样分片策略。', 'number', 0,
        '1000', '1000',
        '{"summary":"控制何时启用采样分片策略。","coreMeaning":"当分片键分布不均且预计分片数超过阈值时，通过采样估算分片边界。","recommendationHints":["超大表和稀疏主键场景通常保持默认或通过压测调整。"],"cautions":["阈值过低会增加采样开销。","阈值过高可能产生不均匀分片。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'inverse-sampling.rate', '采样分片策略的采样率倒数，例如 1000 表示采样率为 1/1000。', 'number', 0,
        '1000', '1000',
        '{"summary":"控制采样分片时的采样密度。","coreMeaning":"值越大实际采样比例越低，值越小采样数据越多。","recommendationHints":["超大数据集可使用较低采样率控制数据库开销。"],"cautions":["采样过少可能降低分片边界准确性。","采样过多会增加数据库扫描压力。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'exactly_once', '是否启用 MySQL CDC Exactly-Once 语义。', 'boolean', 0, 'false',
        'true',
        '{"summary":"控制 CDC Source 是否启用精确一次语义。","coreMeaning":"开启后结合 checkpoint 保存消费位点，降低故障恢复后的重复或遗漏风险。","recommendationHints":["对一致性要求高的实时任务建议结合可靠 checkpoint 开启并验证。"],"cautions":["必须同时保证下游 Sink 的一致性语义。","仅 Source 开启不能保证端到端 Exactly-Once。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'format', 'MySQL CDC 输出格式，可选 DEFAULT 或 COMPATIBLE_DEBEZIUM_JSON。', 'enum',
        0, 'DEFAULT', 'COMPATIBLE_DEBEZIUM_JSON',
        '{"summary":"控制 MySQL CDC 事件输出的数据格式。","coreMeaning":"DEFAULT 使用 SeaTunnel 内部 CDC 事件结构；COMPATIBLE_DEBEZIUM_JSON 输出兼容 Debezium 的 JSON。","validValues":["DEFAULT","COMPATIBLE_DEBEZIUM_JSON"],"recommendationHints":["SeaTunnel 内部链路通常使用 DEFAULT。","需要兼容 Debezium 消费格式时使用 COMPATIBLE_DEBEZIUM_JSON。"],"cautions":["切换格式会改变下游字段结构和解析逻辑。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'schema-changes.enabled', '是否启用 Schema Evolution，目前支持新增列、删除列、重命名列和修改列。',
        'boolean', 0, 'false', 'true',
        '{"summary":"控制是否捕获并向下游传递表结构变更。","coreMeaning":"开启后可处理部分 DDL 事件并推动下游结构演进。","recommendationHints":["源表频繁变更且下游支持 Schema Evolution 时开启。"],"cautions":["当前只支持部分 DDL 类型。","下游连接器不支持结构变更时可能导致任务失败。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'debezium', '透传给 Debezium Embedded Engine 的配置项。', 'map', 0, NULL,
        '{"snapshot.locking.mode":"none","include.schema.changes":"false"}',
        '{"summary":"配置底层 Debezium 引擎的高级参数。","coreMeaning":"用于覆盖快照锁、心跳、Binlog 解析和其他 Debezium 行为。","recommendationHints":["仅在 SeaTunnel 标准参数无法满足需求时使用。","配置前应核对当前内置 Debezium 版本。"],"cautions":["错误参数可能导致数据不一致或任务无法启动。","不同 Debezium 版本的参数支持存在差异。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'int_type_narrowing', '是否在无精度损失时进行整数类型缩窄，例如将 MySQL tinyint(1) 映射为 boolean。',
        'boolean', 0, 'true', 'true',
        '{"summary":"控制 MySQL 整数类型的语义化缩窄。","coreMeaning":"开启后 tinyint(1) 等类型可能被识别为 BOOLEAN。","recommendationHints":["字段确实表达布尔含义时保持开启。"],"cautions":["若 tinyint(1) 实际存储数值而非布尔值，应关闭。"]}',
        '用于AI参数推荐', 0),
       ('connector', 'MySQL-CDC', 'source', 'common-options', 'Source 插件通用参数集合，具体字段参见 SeaTunnel Source Common Options。',
        'object', 0, NULL, '{"plugin_output":"mysql_cdc_result","parallelism":4}',
        '{"summary":"承载 Source 插件公共配置。","coreMeaning":"通常包括结果表名、并行度等非 MySQL CDC 专属参数。","recommendationHints":["仅配置当前 SeaTunnel 版本明确支持的公共参数。"],"cautions":["该项更适合作为参数组展示，而非直接输出 common-options 键。"]}',
        '用于AI参数推荐', 0) ON DUPLICATE KEY
UPDATE
    `param_desc` =
VALUES (`param_desc`),
    `param_type` =
VALUES (`param_type`),
    `required_flag` =
VALUES (`required_flag`),
    `default_value` =
VALUES (`default_value`),
    `example_value` =
VALUES (`example_value`),
    `param_context` =
VALUES (`param_context`),
    `remark` =
VALUES (`remark`),
    `update_time` = CURRENT_TIMESTAMP;

COMMIT;

-- 校验 MySQL-CDC Source 参数数量
SELECT `connector_name`, `connector_type`, COUNT(*) AS `param_count`
FROM `baize_flow`.`t_baize_flow_connector_param_meta`
WHERE `type` = 'connector'
  AND `connector_name` = 'MySQL-CDC'
  AND `connector_type` = 'source'
  AND `deleted` = 0
GROUP BY `connector_name`, `connector_type`;