CREATE TABLE IF NOT EXISTS yak_offline_connector_schema (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    connector_id VARCHAR(128) NOT NULL COMMENT 'Connector 标识',
    connector_role VARCHAR(16) NOT NULL COMMENT 'SOURCE 或 SINK',
    schema_version VARCHAR(64) NULL COMMENT 'Link-Up Schema 版本',
    schema_fingerprint VARCHAR(128) NULL COMMENT 'Link-Up Schema 指纹',
    worker_node_id VARCHAR(128) NULL COMMENT '同步来源 Worker 节点',
    worker_instance_id VARCHAR(128) NULL COMMENT '同步来源 Worker 实例',
    schema_json LONGTEXT NOT NULL COMMENT '原始 Connector Schema JSON',
    synced_at DATETIME(3) NOT NULL COMMENT '最近成功同步时间',
    create_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    update_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_offline_connector_schema (connector_id, connector_role),
    KEY idx_offline_connector_schema_synced (synced_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Link-Up Connector Schema 本地快照';
