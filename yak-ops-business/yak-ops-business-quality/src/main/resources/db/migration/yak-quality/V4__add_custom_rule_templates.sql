CREATE TABLE IF NOT EXISTS yak_quality_template_folder (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自定义规则模板目录 ID',
    parent_id BIGINT NULL COMMENT '上级目录 ID，NULL 表示根目录',
    folder_name VARCHAR(100) NOT NULL COMMENT '目录名称',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
    deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    created_by VARCHAR(128) NOT NULL DEFAULT 'system' COMMENT '创建人',
    updated_by VARCHAR(128) NOT NULL DEFAULT 'system' COMMENT '更新人',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_yak_quality_template_folder_parent (parent_id, deleted, sort_order),
    KEY idx_yak_quality_template_folder_name (folder_name, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='数据质量自定义规则模板目录';

ALTER TABLE yak_quality_rule_template
    ADD COLUMN folder_id BIGINT NULL COMMENT '自定义模板目录 ID' AFTER sort_order,
    ADD COLUMN template_sql MEDIUMTEXT NULL COMMENT '自定义模板 SQL' AFTER folder_id,
    ADD COLUMN set_flag VARCHAR(1000) NULL COMMENT 'SQL 前置 Set Flag，英文逗号分隔' AFTER template_sql,
    ADD COLUMN check_type VARCHAR(32) NOT NULL DEFAULT 'NUMERIC'
        COMMENT '自定义模板校验类型' AFTER set_flag,
    ADD COLUMN check_method VARCHAR(64) NOT NULL DEFAULT 'FIXED_VALUE'
        COMMENT '自定义模板校验方式' AFTER check_type,
    ADD COLUMN created_by VARCHAR(128) NOT NULL DEFAULT 'system'
        COMMENT '模板创建人' AFTER check_method,
    ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '逻辑删除' AFTER created_by,
    ADD KEY idx_yak_quality_template_folder (folder_id, builtin, deleted, enabled),
    ADD KEY idx_yak_quality_template_source (builtin, deleted, enabled, sort_order);

UPDATE yak_quality_rule_template
SET check_type = 'NUMERIC',
    check_method = 'FIXED_VALUE',
    created_by = COALESCE(NULLIF(created_by, ''), 'system'),
    deleted = 0
WHERE builtin = 1;
