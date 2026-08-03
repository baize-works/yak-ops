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
    ADD COLUMN assigned_capabilities_json LONGTEXT NULL AFTER required_capabilities_json,
    ADD COLUMN reachability_requirements_json LONGTEXT NULL AFTER assigned_capabilities_json,
    ADD COLUMN assigned_reachability_json LONGTEXT NULL AFTER reachability_requirements_json;

CREATE TABLE yak_offline_worker_preflight (
    id BIGINT NOT NULL AUTO_INCREMENT,
    node_id VARCHAR(128) NOT NULL,
    connector_id VARCHAR(128) NOT NULL,
    connector_role VARCHAR(16) NOT NULL,
    options_digest VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    duration_millis BIGINT NULL,
    error_code VARCHAR(128) NULL,
    error_message VARCHAR(2000) NULL,
    checked_at DATETIME NOT NULL,
    create_time DATETIME NOT NULL,
    update_time DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_offline_worker_preflight
        (node_id, connector_id, connector_role, options_digest),
    KEY idx_offline_worker_preflight_status
        (status, checked_at),
    CONSTRAINT fk_offline_worker_preflight_node
        FOREIGN KEY (node_id)
        REFERENCES yak_offline_engine_node (node_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
