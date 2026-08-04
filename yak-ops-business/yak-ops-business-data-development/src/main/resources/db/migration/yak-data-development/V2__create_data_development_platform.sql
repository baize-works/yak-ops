CREATE TABLE IF NOT EXISTS yak_dev_environment (
  id BIGINT NOT NULL AUTO_INCREMENT,
  code VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  environment_type VARCHAR(32) NOT NULL,
  description VARCHAR(1000) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  variables_json LONGTEXT NOT NULL,
  lock_version INT NOT NULL DEFAULT 0,
  created_by VARCHAR(128) NULL,
  updated_by VARCHAR(128) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_dev_environment_code (code),
  KEY idx_yak_dev_environment_enabled (enabled, environment_type)
);

CREATE TABLE IF NOT EXISTS yak_dev_secret (
  id BIGINT NOT NULL AUTO_INCREMENT,
  environment_id BIGINT NOT NULL DEFAULT 0,
  secret_key VARCHAR(255) NOT NULL,
  description VARCHAR(1000) NULL,
  encrypted_value LONGTEXT NOT NULL,
  value_digest VARCHAR(64) NOT NULL,
  created_by VARCHAR(128) NULL,
  updated_by VARCHAR(128) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_dev_secret_scope (environment_id, secret_key),
  KEY idx_yak_dev_secret_environment (environment_id, updated_at)
);

CREATE TABLE IF NOT EXISTS yak_dev_parameter_template (
  id BIGINT NOT NULL AUTO_INCREMENT,
  code VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(1000) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  parameters_json LONGTEXT NOT NULL,
  lock_version INT NOT NULL DEFAULT 0,
  created_by VARCHAR(128) NULL,
  updated_by VARCHAR(128) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_dev_parameter_template_code (code),
  KEY idx_yak_dev_parameter_template_enabled (enabled, updated_at)
);

CREATE TABLE IF NOT EXISTS yak_dev_engine_endpoint (
  id BIGINT NOT NULL AUTO_INCREMENT,
  task_type VARCHAR(64) NOT NULL,
  code VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  probe_type VARCHAR(32) NOT NULL,
  endpoint VARCHAR(1000) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  config_json LONGTEXT NOT NULL,
  health_status VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
  health_message VARCHAR(1000) NULL,
  last_checked_at DATETIME(6) NULL,
  lock_version INT NOT NULL DEFAULT 0,
  created_by VARCHAR(128) NULL,
  updated_by VARCHAR(128) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yak_dev_engine_endpoint_code (code),
  KEY idx_yak_dev_engine_endpoint_type (task_type, enabled),
  KEY idx_yak_dev_engine_endpoint_health (health_status, last_checked_at)
);

CREATE TABLE IF NOT EXISTS yak_dev_audit_log (
  id BIGINT NOT NULL AUTO_INCREMENT,
  action VARCHAR(128) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(128) NULL,
  summary_json LONGTEXT NOT NULL,
  operator VARCHAR(128) NOT NULL,
  occurred_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_yak_dev_audit_time (occurred_at, id),
  KEY idx_yak_dev_audit_resource (resource_type, resource_id, occurred_at),
  KEY idx_yak_dev_audit_operator (operator, occurred_at)
);


INSERT IGNORE INTO yak_dev_engine_endpoint
  (task_type,code,name,probe_type,endpoint,enabled,config_json,health_status,
   lock_version,created_by,updated_by,created_at,updated_at)
VALUES
  ('HTTP','builtin-http','HTTP 请求','LOCAL_PLUGIN',NULL,1,'{}','UNKNOWN',0,'system','system',NOW(6),NOW(6)),
  ('SHELL','builtin-shell','Shell 任务','LOCAL_PLUGIN',NULL,1,'{}','UNKNOWN',0,'system','system',NOW(6),NOW(6)),
  ('SQL','builtin-jdbc-sql','JDBC SQL','LOCAL_PLUGIN',NULL,1,'{}','UNKNOWN',0,'system','system',NOW(6),NOW(6)),
  ('FLINK_SQL','builtin-flink-sql','Flink SQL Gateway','LOCAL_PLUGIN',NULL,1,'{}','UNKNOWN',0,'system','system',NOW(6),NOW(6)),
  ('PYTHON','builtin-python','Python','LOCAL_PLUGIN',NULL,1,'{}','UNKNOWN',0,'system','system',NOW(6),NOW(6)),
  ('NOTEBOOK','builtin-notebook','Notebook','LOCAL_PLUGIN',NULL,1,'{}','UNKNOWN',0,'system','system',NOW(6),NOW(6));
