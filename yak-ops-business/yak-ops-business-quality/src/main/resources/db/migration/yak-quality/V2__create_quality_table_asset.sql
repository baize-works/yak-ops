CREATE TABLE IF NOT EXISTS yak_quality_table_asset (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '数据质量表资产 ID',
    data_source_id BIGINT NOT NULL COMMENT '数据源 ID',
    data_source_name VARCHAR(128) NOT NULL COMMENT '数据源名称快照',
    database_name VARCHAR(128) NOT NULL DEFAULT '' COMMENT '数据库名称',
    schema_name VARCHAR(128) NOT NULL DEFAULT '' COMMENT 'Schema 名称',
    table_name VARCHAR(256) NOT NULL COMMENT '数据表名称',
    table_type VARCHAR(40) NULL COMMENT 'TABLE/VIEW 等插件类型',
    remarks VARCHAR(1000) NULL COMMENT '数据表描述快照',
    registered_by VARCHAR(128) NOT NULL DEFAULT 'system' COMMENT '注册人',
    registered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '注册时间',
    deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_yak_quality_table_asset_target
      (data_source_id, database_name, schema_name, table_name),
    KEY idx_yak_quality_table_asset_query
      (data_source_id, database_name, deleted, table_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='数据质量已注册数据表';

-- 已经创建质量监控的数据表自动纳入注册资产，避免升级后列表丢失。
INSERT INTO yak_quality_table_asset (
    data_source_id,
    data_source_name,
    database_name,
    schema_name,
    table_name,
    table_type,
    remarks,
    registered_by,
    registered_at,
    deleted
)
SELECT
    monitor.data_source_id,
    MAX(monitor.data_source_name),
    COALESCE(monitor.database_name, ''),
    COALESCE(monitor.schema_name, ''),
    monitor.table_name,
    NULL,
    NULL,
    'system',
    MIN(monitor.created_at),
    0
FROM yak_quality_monitor monitor
WHERE monitor.deleted = 0
GROUP BY
    monitor.data_source_id,
    COALESCE(monitor.database_name, ''),
    COALESCE(monitor.schema_name, ''),
    monitor.table_name
ON DUPLICATE KEY UPDATE
    data_source_name = VALUES(data_source_name),
    deleted = 0,
    updated_at = CURRENT_TIMESTAMP(3);
