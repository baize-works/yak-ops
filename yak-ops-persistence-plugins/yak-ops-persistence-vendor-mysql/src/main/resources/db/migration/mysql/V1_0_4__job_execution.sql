-- Execution attempts are append-only. engine_job_id remains a latest-execution compatibility projection.
CREATE TABLE `job_execution` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `instance_id` bigint NOT NULL,
  `attempt_no` int NOT NULL,
  `engine_type` varchar(64) NOT NULL,
  `engine_endpoint_id` bigint DEFAULT NULL,
  `external_job_id` varchar(255) DEFAULT NULL,
  `submission_status` varchar(32) NOT NULL,
  `execution_status` varchar(32) NOT NULL,
  `submitting_at` datetime DEFAULT NULL, `submitted_at` datetime DEFAULT NULL,
  `started_at` datetime DEFAULT NULL, `cancelling_at` datetime DEFAULT NULL,
  `canceled_at` datetime DEFAULT NULL, `finished_at` datetime DEFAULT NULL,
  `last_synced_at` datetime DEFAULT NULL,
  `error_code` varchar(128) DEFAULT NULL, `error_message` text,
  `engine_snapshot` longtext COMMENT 'Sanitized engine response; credentials must never be stored',
  `created_by` varchar(128) DEFAULT NULL, `updated_by` varchar(128) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `uk_job_execution_instance_attempt` (`instance_id`, `attempt_no`),
  KEY `idx_job_execution_external_job_id` (`external_job_id`),
  KEY `idx_job_execution_last_synced_at` (`last_synced_at`),
  KEY `idx_job_execution_status` (`execution_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Java has always treated this ID as String; widen legacy numeric projection without losing values.
ALTER TABLE `t_baize_flow_job_instance` MODIFY COLUMN `engine_job_id` varchar(255) DEFAULT NULL COMMENT 'Latest execution external job ID compatibility projection';
