-- 修复旧版本在非空 schema 中以版本 1 建立基线，导致 V1 建表迁移被跳过的问题。
-- 所有语句均使用 IF NOT EXISTS，可兼容已经正常完成 V1 的数据库。
CREATE TABLE IF NOT EXISTS yak_wf_definition (
  id BIGINT NOT NULL AUTO_INCREMENT,
  code VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(1000) NULL,
  state VARCHAR(32) NOT NULL,
  current_version INT NULL,
  failure_strategy VARCHAR(32) NOT NULL,
  max_parallelism INT NOT NULL,
  draft_json LONGTEXT NOT NULL,
  created_by VARCHAR(128) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_wf_definition_code (code)
);

CREATE TABLE IF NOT EXISTS yak_wf_version (
  id BIGINT NOT NULL AUTO_INCREMENT,
  workflow_id BIGINT NOT NULL,
  version INT NOT NULL,
  dag_json LONGTEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  published_by VARCHAR(128) NULL,
  published_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_wf_version (workflow_id, version),
  KEY idx_yak_wf_version_workflow (workflow_id)
);

CREATE TABLE IF NOT EXISTS yak_wf_schedule (
  id BIGINT NOT NULL AUTO_INCREMENT,
  workflow_id BIGINT NOT NULL,
  cron_expression VARCHAR(255) NOT NULL,
  timezone VARCHAR(64) NOT NULL,
  enabled TINYINT(1) NOT NULL,
  misfire_policy VARCHAR(32) NOT NULL,
  concurrency_policy VARCHAR(32) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_wf_schedule_workflow (workflow_id)
);

CREATE TABLE IF NOT EXISTS yak_wf_instance (
  id BIGINT NOT NULL AUTO_INCREMENT,
  workflow_id BIGINT NOT NULL,
  workflow_version INT NOT NULL,
  trigger_type VARCHAR(32) NOT NULL,
  state VARCHAR(32) NOT NULL,
  global_params_json LONGTEXT NOT NULL,
  failure_strategy VARCHAR(32) NOT NULL,
  max_parallelism INT NOT NULL,
  stop_requested TINYINT(1) NOT NULL DEFAULT 0,
  start_time DATETIME(6) NULL,
  end_time DATETIME(6) NULL,
  created_by VARCHAR(128) NULL,
  created_at DATETIME(6) NOT NULL,
  lock_version INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_yak_wf_instance_workflow_state (workflow_id, state),
  KEY idx_yak_wf_instance_state (state)
);

CREATE TABLE IF NOT EXISTS yak_wf_task_instance (
  id BIGINT NOT NULL AUTO_INCREMENT,
  workflow_instance_id BIGINT NOT NULL,
  node_key VARCHAR(64) NOT NULL,
  node_name VARCHAR(255) NOT NULL,
  task_type VARCHAR(64) NOT NULL,
  state VARCHAR(32) NOT NULL,
  config_json LONGTEXT NOT NULL,
  max_retry_times INT NOT NULL,
  retry_count INT NOT NULL DEFAULT 0,
  retry_interval_seconds INT NOT NULL DEFAULT 0,
  timeout_seconds INT NOT NULL DEFAULT 0,
  idempotent TINYINT(1) NOT NULL DEFAULT 0,
  retry_on_restart TINYINT(1) NOT NULL DEFAULT 0,
  next_retry_time DATETIME(6) NULL,
  start_time DATETIME(6) NULL,
  end_time DATETIME(6) NULL,
  result_json LONGTEXT NULL,
  error_message LONGTEXT NULL,
  lock_version INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_wf_task_instance_node (workflow_instance_id, node_key),
  KEY idx_yak_wf_task_instance_state (workflow_instance_id, state)
);

CREATE TABLE IF NOT EXISTS yak_wf_task_attempt (
  id BIGINT NOT NULL AUTO_INCREMENT,
  task_instance_id BIGINT NOT NULL,
  attempt_no INT NOT NULL,
  state VARCHAR(32) NOT NULL,
  executor_type VARCHAR(64) NOT NULL,
  external_id VARCHAR(255) NULL,
  start_time DATETIME(6) NOT NULL,
  end_time DATETIME(6) NULL,
  error_message LONGTEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_wf_task_attempt (task_instance_id, attempt_no),
  KEY idx_yak_wf_task_attempt_task (task_instance_id)
);

CREATE TABLE IF NOT EXISTS yak_wf_task_log (
  id BIGINT NOT NULL AUTO_INCREMENT,
  task_attempt_id BIGINT NOT NULL,
  line_no BIGINT NOT NULL,
  content LONGTEXT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_wf_task_log_line (task_attempt_id, line_no),
  KEY idx_yak_wf_task_log_attempt (task_attempt_id)
);
