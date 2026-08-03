ALTER TABLE yak_offline_engine_node
    ADD COLUMN registration_lease_id VARCHAR(64) NULL AFTER registration_mode,
    ADD COLUMN registration_instance_id VARCHAR(128) NULL AFTER registration_lease_id,
    ADD COLUMN registration_protocol_version VARCHAR(64) NULL AFTER registration_instance_id,
    ADD COLUMN lease_expires_at DATETIME NULL AFTER registration_protocol_version,
    ADD COLUMN last_registration_time DATETIME NULL AFTER lease_expires_at,
    ADD COLUMN heartbeat_sequence BIGINT NOT NULL DEFAULT 0 AFTER last_registration_time;

CREATE UNIQUE INDEX uk_offline_node_registration_lease
    ON yak_offline_engine_node (registration_lease_id);

CREATE INDEX idx_offline_node_dynamic_lease
    ON yak_offline_engine_node (registration_mode, lease_expires_at, status);

CREATE TABLE yak_offline_worker_registration_nonce (
    nonce_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    create_time DATETIME NOT NULL,
    PRIMARY KEY (nonce_hash),
    KEY idx_offline_registration_nonce_expire (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE yak_offline_worker_registration_event (
    id BIGINT NOT NULL AUTO_INCREMENT,
    node_id VARCHAR(128) NULL,
    instance_id VARCHAR(128) NULL,
    lease_id VARCHAR(64) NULL,
    event_type VARCHAR(64) NOT NULL,
    remote_address VARCHAR(128) NULL,
    message VARCHAR(1000) NULL,
    event_time DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_offline_registration_event_node (node_id, event_time),
    KEY idx_offline_registration_event_lease (lease_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
