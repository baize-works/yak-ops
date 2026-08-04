ALTER TABLE yak_dev_execution
  ADD KEY idx_yak_dev_execution_recent_user (created_by, task_id, created_at);

ALTER TABLE yak_dev_task
  ADD KEY idx_yak_dev_task_library (status, project_id, task_type, published_version_id);
