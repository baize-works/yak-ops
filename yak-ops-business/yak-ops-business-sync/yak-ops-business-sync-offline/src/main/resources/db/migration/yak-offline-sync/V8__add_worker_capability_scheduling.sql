ALTER TABLE yak_offline_engine_node
    ADD COLUMN capability_status VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN' AFTER last_error_message,
    ADD COLUMN capability_digest VARCHAR(128) NULL AFTER capability_status,
    ADD COLUMN connector_schemas_json LONGTEXT NULL AFTER capability_digest,
    ADD COLUMN capability_synced_at DATETIME NULL AFTER connector_schemas_json,
    ADD COLUMN capability_error_message VARCHAR(2000) NULL AFTER capability_synced_at;

CREATE INDEX idx_offline_node_capability_status
    ON yak_offline_engine_node (capability_status, capability_synced_at);

ALTER TABLE yak_offline_job_definition
    ADD COLUMN capability_requirements_json LONGTEXT NULL AFTER worker_required_labels_json;

ALTER TABLE yak_offline_job_version
    ADD COLUMN capability_requirements_json LONGTEXT NULL AFTER config_digest;

ALTER TABLE yak_offline_job_execution
    ADD COLUMN required_capabilities_json LONGTEXT NULL AFTER assignment_candidates_json,
    ADD COLUMN assigned_capabilities_json LONGTEXT NULL AFTER required_capabilities_json;
