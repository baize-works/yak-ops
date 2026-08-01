-- Replace the Yak Ops -> Link-Up execution payload with the structured JobSpec protocol.
-- Historical HOCON remains nullable for audit compatibility and is never generated for new versions.

ALTER TABLE yak_offline_job_definition
    MODIFY COLUMN hocon_config LONGTEXT NULL COMMENT 'Legacy Link-Up HOCON 配置（已停用）',
    ADD COLUMN job_spec_json LONGTEXT NULL COMMENT 'Link-Up 结构化 JobSpec JSON' AFTER definition_json;

ALTER TABLE yak_offline_job_version
    MODIFY COLUMN hocon_config LONGTEXT NULL COMMENT 'Legacy Link-Up HOCON 配置（已停用）',
    ADD COLUMN job_spec_json LONGTEXT NULL COMMENT 'Link-Up 结构化 JobSpec JSON' AFTER definition_json;

ALTER TABLE yak_offline_job_execution
    MODIFY COLUMN submitted_config LONGTEXT NOT NULL COMMENT '本次提交的 Link-Up JobSpec JSON 快照';
