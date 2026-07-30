CREATE TABLE IF NOT EXISTS yak_rt_cdc_version (
    id BIGINT NOT NULL AUTO_INCREMENT,
    version VARCHAR(64) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    flink_min_version VARCHAR(32) NOT NULL,
    flink_max_version VARCHAR(32) NOT NULL,
    cdc_home VARCHAR(512) NULL,
    connector_directory VARCHAR(512) NULL,
    description VARCHAR(1000) NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    default_version TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_yak_rt_cdc_version (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Flink CDC 发行版本';

CREATE TABLE IF NOT EXISTS yak_rt_environment (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(128) NOT NULL,
    deployment_mode VARCHAR(64) NOT NULL,
    flink_version VARCHAR(32) NOT NULL,
    cdc_version_id BIGINT NOT NULL,
    flink_home VARCHAR(512) NULL,
    rest_address VARCHAR(512) NULL,
    cluster_id VARCHAR(256) NULL,
    namespace VARCHAR(128) NULL,
    deployment_config_json LONGTEXT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_yak_rt_environment_name (name),
    KEY idx_yak_rt_environment_cdc (cdc_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实时同步运行环境';

CREATE TABLE IF NOT EXISTS yak_rt_job (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(128) NOT NULL,
    description VARCHAR(1000) NULL,
    environment_id BIGINT NOT NULL,
    cdc_version_id BIGINT NOT NULL,
    pipeline_yaml LONGTEXT NOT NULL,
    runtime_options_json LONGTEXT NULL,
    state VARCHAR(32) NOT NULL,
    current_deployment_id BIGINT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_yak_rt_job_name (name),
    KEY idx_yak_rt_job_environment (environment_id),
    KEY idx_yak_rt_job_cdc (cdc_version_id),
    KEY idx_yak_rt_job_state (state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实时同步任务定义';

CREATE TABLE IF NOT EXISTS yak_rt_deployment (
    id BIGINT NOT NULL AUTO_INCREMENT,
    job_id BIGINT NOT NULL,
    environment_id BIGINT NOT NULL,
    cdc_version_id BIGINT NOT NULL,
    deployment_mode VARCHAR(64) NOT NULL,
    state VARCHAR(32) NOT NULL,
    external_id VARCHAR(256) NULL,
    command_json LONGTEXT NULL,
    manifest_path VARCHAR(1000) NULL,
    output LONGTEXT NULL,
    error_message LONGTEXT NULL,
    savepoint_path VARCHAR(1000) NULL,
    submitted_at DATETIME(3) NULL,
    finished_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_yak_rt_deployment_job (job_id, id),
    KEY idx_yak_rt_deployment_external (external_id),
    KEY idx_yak_rt_deployment_state (state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实时同步任务部署记录';
