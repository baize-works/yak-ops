DROP TABLE IF EXISTS yak_offline_worker_registration_event;
DROP TABLE IF EXISTS yak_offline_worker_registration_nonce;

ALTER TABLE yak_offline_engine_node
    DROP COLUMN registration_lease_id,
    DROP COLUMN registration_instance_id,
    DROP COLUMN registration_protocol_version,
    DROP COLUMN lease_expires_at,
    DROP COLUMN last_registration_time,
    DROP COLUMN heartbeat_sequence;
