ALTER TABLE yak_offline_job_execution
    ADD COLUMN sink_attempted_record_count BIGINT NOT NULL DEFAULT 0
        COMMENT 'Sink 尝试写入记录数' AFTER source_record_count,
    ADD COLUMN sink_committed_record_count BIGINT NOT NULL DEFAULT 0
        COMMENT 'Sink 已提交记录数' AFTER sink_success_record_count,
    ADD COLUMN source_average_qps DOUBLE NOT NULL DEFAULT 0
        COMMENT 'Source 平均读取 QPS' AFTER sink_written_bytes,
    ADD COLUMN sink_average_qps DOUBLE NOT NULL DEFAULT 0
        COMMENT 'Sink 平均写入 QPS' AFTER source_average_qps,
    ADD COLUMN failed_record_count BIGINT NOT NULL DEFAULT 0
        COMMENT '失败记录数' AFTER sink_average_qps,
    ADD COLUMN skipped_record_count BIGINT NOT NULL DEFAULT 0
        COMMENT '跳过记录数' AFTER failed_record_count,
    ADD COLUMN database_commit_millis BIGINT NOT NULL DEFAULT 0
        COMMENT '数据库提交耗时，毫秒' AFTER skipped_record_count,
    ADD COLUMN sql_execution_millis BIGINT NOT NULL DEFAULT 0
        COMMENT 'SQL 执行耗时，毫秒' AFTER database_commit_millis;
