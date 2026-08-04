CREATE TABLE IF NOT EXISTS yak_dev_project (
  id BIGINT NOT NULL AUTO_INCREMENT,
  code VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(1000) NULL,
  created_by VARCHAR(128) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_dev_project_code (code)
);

CREATE TABLE IF NOT EXISTS yak_dev_resource (
  id BIGINT NOT NULL AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  parent_id BIGINT NOT NULL DEFAULT 0,
  resource_kind VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(1000) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  owner_id VARCHAR(128) NULL,
  created_by VARCHAR(128) NULL,
  updated_by VARCHAR(128) NULL,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  lock_version INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_dev_resource_name (project_id, parent_id, name, deleted),
  KEY idx_yak_dev_resource_tree (project_id, parent_id, deleted, sort_order),
  KEY idx_yak_dev_resource_owner (project_id, owner_id, deleted)
);

CREATE TABLE IF NOT EXISTS yak_dev_task (
  id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  task_type VARCHAR(64) NOT NULL,
  plugin_version VARCHAR(64) NOT NULL,
  schema_version INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  draft_revision BIGINT NOT NULL DEFAULT 0,
  published_version_id BIGINT NULL,
  engine_type VARCHAR(64) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_yak_dev_task_project_type (project_id, task_type, status),
  KEY idx_yak_dev_task_published_version (published_version_id)
);

CREATE TABLE IF NOT EXISTS yak_dev_task_draft (
  task_id BIGINT NOT NULL,
  revision BIGINT NOT NULL,
  plugin_version VARCHAR(64) NOT NULL,
  schema_version INT NOT NULL,
  definition_json LONGTEXT NOT NULL,
  content_digest VARCHAR(64) NOT NULL,
  updated_by VARCHAR(128) NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (task_id)
);

CREATE TABLE IF NOT EXISTS yak_dev_task_version (
  id BIGINT NOT NULL AUTO_INCREMENT,
  task_id BIGINT NOT NULL,
  version_no INT NOT NULL,
  task_type VARCHAR(64) NOT NULL,
  plugin_version VARCHAR(64) NOT NULL,
  schema_version INT NOT NULL,
  definition_snapshot LONGTEXT NOT NULL,
  compiled_spec LONGTEXT NOT NULL,
  input_schema LONGTEXT NOT NULL,
  output_schema LONGTEXT NOT NULL,
  content_digest VARCHAR(64) NOT NULL,
  publish_comment VARCHAR(1000) NULL,
  published_by VARCHAR(128) NULL,
  published_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_dev_task_version (task_id, version_no),
  KEY idx_yak_dev_task_version_task (task_id, id)
);

CREATE TABLE IF NOT EXISTS yak_dev_execution (
  id BIGINT NOT NULL AUTO_INCREMENT,
  task_id BIGINT NOT NULL,
  source_type VARCHAR(32) NOT NULL,
  draft_revision BIGINT NULL,
  task_version_id BIGINT NULL,
  task_type VARCHAR(64) NOT NULL,
  plugin_version VARCHAR(64) NOT NULL,
  definition_snapshot LONGTEXT NOT NULL,
  compiled_spec_snapshot LONGTEXT NOT NULL,
  runtime_snapshot LONGTEXT NOT NULL,
  input_snapshot LONGTEXT NOT NULL,
  status VARCHAR(32) NOT NULL,
  current_attempt_no INT NOT NULL DEFAULT 0,
  idempotency_key VARCHAR(128) NULL,
  created_by VARCHAR(128) NULL,
  created_at DATETIME(6) NOT NULL,
  started_at DATETIME(6) NULL,
  finished_at DATETIME(6) NULL,
  error_code VARCHAR(128) NULL,
  error_message LONGTEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_dev_execution_idempotency (idempotency_key),
  KEY idx_yak_dev_execution_task_status (task_id, status, id),
  KEY idx_yak_dev_execution_version (task_version_id)
);

CREATE TABLE IF NOT EXISTS yak_dev_execution_attempt (
  id BIGINT NOT NULL AUTO_INCREMENT,
  execution_id BIGINT NOT NULL,
  attempt_no INT NOT NULL,
  executor_type VARCHAR(64) NOT NULL,
  worker_id VARCHAR(128) NULL,
  external_execution_id VARCHAR(255) NULL,
  status VARCHAR(32) NOT NULL,
  exit_code INT NULL,
  error_code VARCHAR(128) NULL,
  error_message LONGTEXT NULL,
  started_at DATETIME(6) NULL,
  finished_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_dev_execution_attempt (execution_id, attempt_no),
  KEY idx_yak_dev_execution_attempt_execution (execution_id, status)
);

CREATE TABLE IF NOT EXISTS yak_dev_execution_event (
  id BIGINT NOT NULL AUTO_INCREMENT,
  execution_id BIGINT NOT NULL,
  attempt_id BIGINT NULL,
  sequence_no BIGINT NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  payload_json LONGTEXT NULL,
  occurred_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_dev_execution_event_sequence (execution_id, sequence_no),
  KEY idx_yak_dev_execution_event_attempt (attempt_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS yak_dev_execution_result (
  id BIGINT NOT NULL AUTO_INCREMENT,
  execution_id BIGINT NOT NULL,
  attempt_id BIGINT NULL,
  result_kind VARCHAR(32) NOT NULL,
  schema_version INT NOT NULL,
  summary_json LONGTEXT NOT NULL,
  payload_json LONGTEXT NULL,
  dataset_ref VARCHAR(255) NULL,
  truncated TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_yak_dev_execution_result_execution (execution_id, id)
);

CREATE TABLE IF NOT EXISTS yak_dev_user_favorite (
  user_id VARCHAR(128) NOT NULL,
  resource_id BIGINT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (user_id, resource_id),
  KEY idx_yak_dev_user_favorite_resource (resource_id)
);
