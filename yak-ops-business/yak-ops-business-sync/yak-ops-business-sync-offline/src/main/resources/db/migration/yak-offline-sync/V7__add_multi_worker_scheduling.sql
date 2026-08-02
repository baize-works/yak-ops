-- Persist task-level Worker policies and execution-level assignment snapshots.

ALTER TABLE yak_offline_job_definition
    ADD COLUMN worker_select_mode VARCHAR(16) NOT NULL DEFAULT 'AUTO'
        COMMENT 'Worker 选择模式：AUTO/MANUAL' AFTER env_json,
    ADD COLUMN worker_node_id VARCHAR(128) NULL
        COMMENT 'MANUAL 模式指定的稳定 Worker nodeId' AFTER worker_select_mode,
    ADD COLUMN worker_required_labels_json TEXT NULL
        COMMENT 'AUTO/MANUAL 模式要求的 Worker 标签 JSON' AFTER worker_node_id,
    ADD INDEX idx_yak_offline_definition_worker (worker_select_mode, worker_node_id);

UPDATE yak_offline_job_definition
SET worker_select_mode = 'AUTO'
WHERE worker_select_mode IS NULL OR worker_select_mode = '';

ALTER TABLE yak_offline_job_execution
    ADD COLUMN engine_node_base_url VARCHAR(500) NULL
        COMMENT '本次执行固化的 Worker 地址' AFTER engine_node_id,
    ADD COLUMN assignment_mode VARCHAR(16) NULL
        COMMENT '本次分配模式：AUTO/MANUAL' AFTER worker_instance_id,
    ADD COLUMN assignment_score DECIMAL(12, 6) NULL
        COMMENT '自动调度得分' AFTER assignment_mode,
    ADD COLUMN assignment_reason VARCHAR(1000) NULL
        COMMENT 'Worker 分配原因' AFTER assignment_score,
    ADD COLUMN assignment_candidates_json LONGTEXT NULL
        COMMENT '分配时的候选 Worker 快照' AFTER assignment_reason,
    ADD INDEX idx_yak_offline_execution_worker_route
        (engine_node_id, status, last_sync_time);
