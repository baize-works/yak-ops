package io.yak.ops.business.workflow.repository;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.model.WorkflowDag;
import io.yak.ops.business.workflow.model.WorkflowEnums.AttemptState;
import io.yak.ops.business.workflow.model.WorkflowEnums.DefinitionState;
import io.yak.ops.business.workflow.model.WorkflowEnums.FailureStrategy;
import io.yak.ops.business.workflow.model.WorkflowEnums.MisfirePolicy;
import io.yak.ops.business.workflow.model.WorkflowEnums.ScheduleConcurrencyPolicy;
import io.yak.ops.business.workflow.model.WorkflowEnums.TaskState;
import io.yak.ops.business.workflow.model.WorkflowEnums.TriggerType;
import io.yak.ops.business.workflow.model.WorkflowEnums.WorkflowState;
import io.yak.ops.business.workflow.model.WorkflowRecords.Attempt;
import io.yak.ops.business.workflow.model.WorkflowRecords.Definition;
import io.yak.ops.business.workflow.model.WorkflowRecords.Instance;
import io.yak.ops.business.workflow.model.WorkflowRecords.Schedule;
import io.yak.ops.business.workflow.model.WorkflowRecords.TaskInstance;
import io.yak.ops.business.workflow.model.WorkflowRecords.Version;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

/** JDBC persistence boundary for workflow definitions, immutable versions and runtime instances. */
@ConditionalOnWorkflowEnabled
@Repository
public final class JdbcWorkflowRepository {

  private static final Set<WorkflowState> RECOVERABLE_STATES =
      Set.of(WorkflowState.PENDING, WorkflowState.RUNNING, WorkflowState.STOPPING);

  private final NamedParameterJdbcTemplate jdbc;
  private final WorkflowJsonCodec codec;
  private final AtomicLong logSequence = new AtomicLong();

  public JdbcWorkflowRepository(
      @Qualifier("workflowJdbcTemplate") NamedParameterJdbcTemplate workflowJdbcTemplate,
      WorkflowJsonCodec codec) {
    this.jdbc = workflowJdbcTemplate;
    this.codec = codec;
  }

  public long createDefinition(
      String code,
      String name,
      String description,
      FailureStrategy failureStrategy,
      int maxParallelism,
      WorkflowDag draft,
      String operator) {
    Instant now = Instant.now();
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("code", code)
        .addValue("name", name)
        .addValue("description", description)
        .addValue("state", DefinitionState.DRAFT.name())
        .addValue("failureStrategy", failureStrategy.name())
        .addValue("maxParallelism", maxParallelism)
        .addValue("draftJson", codec.write(draft))
        .addValue("createdBy", operator)
        .addValue("createdAt", timestamp(now))
        .addValue("updatedAt", timestamp(now));
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update("""
        INSERT INTO yak_wf_definition
          (code, name, description, state, current_version, failure_strategy,
           max_parallelism, draft_json, created_by, created_at, updated_at)
        VALUES
          (:code, :name, :description, :state, NULL, :failureStrategy,
           :maxParallelism, :draftJson, :createdBy, :createdAt, :updatedAt)
        """, params, keys, new String[] {"id"});
    return requiredKey(keys);
  }

  public void updateDraft(
      long workflowId,
      String name,
      String description,
      FailureStrategy failureStrategy,
      int maxParallelism,
      WorkflowDag draft) {
    int updated = jdbc.update("""
        UPDATE yak_wf_definition
        SET name = :name,
            description = :description,
            failure_strategy = :failureStrategy,
            max_parallelism = :maxParallelism,
            draft_json = :draftJson,
            updated_at = :updatedAt
        WHERE id = :id
        """, new MapSqlParameterSource()
        .addValue("id", workflowId)
        .addValue("name", name)
        .addValue("description", description)
        .addValue("failureStrategy", failureStrategy.name())
        .addValue("maxParallelism", maxParallelism)
        .addValue("draftJson", codec.write(draft))
        .addValue("updatedAt", timestamp(Instant.now())));
    requireUpdated(updated, "Workflow definition does not exist: " + workflowId);
  }

  public Optional<Definition> findDefinition(long workflowId) {
    return queryOptional("""
        SELECT id, code, name, description, state, current_version, failure_strategy,
               max_parallelism, draft_json, created_by, created_at, updated_at
        FROM yak_wf_definition
        WHERE id = :id
        """, Map.of("id", workflowId), this::mapDefinition);
  }

  public List<Definition> listDefinitions() {
    return jdbc.query("""
        SELECT id, code, name, description, state, current_version, failure_strategy,
               max_parallelism, draft_json, created_by, created_at, updated_at
        FROM yak_wf_definition
        ORDER BY updated_at DESC, id DESC
        """, Map.of(), this::mapDefinition);
  }

  public Version publishVersion(long workflowId, WorkflowDag dag, String operator) {
    Definition definition = findDefinition(workflowId)
        .orElseThrow(() -> new IllegalArgumentException("Workflow definition does not exist: " + workflowId));
    int version = definition.currentVersion() == null ? 1 : definition.currentVersion() + 1;
    Instant now = Instant.now();
    String contentHash = codec.sha256(dag);
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("workflowId", workflowId)
        .addValue("version", version)
        .addValue("dagJson", codec.write(dag))
        .addValue("contentHash", contentHash)
        .addValue("publishedBy", operator)
        .addValue("publishedAt", timestamp(now));
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update("""
        INSERT INTO yak_wf_version
          (workflow_id, version, dag_json, content_hash, published_by, published_at)
        VALUES
          (:workflowId, :version, :dagJson, :contentHash, :publishedBy, :publishedAt)
        """, params, keys, new String[] {"id"});
    jdbc.update("""
        UPDATE yak_wf_definition
        SET state = :state, current_version = :version, updated_at = :updatedAt
        WHERE id = :workflowId
        """, new MapSqlParameterSource()
        .addValue("state", DefinitionState.PUBLISHED.name())
        .addValue("version", version)
        .addValue("updatedAt", timestamp(now))
        .addValue("workflowId", workflowId));
    return new Version(requiredKey(keys), workflowId, version, dag, contentHash, operator, now);
  }

  public Optional<Version> findVersion(long workflowId, int version) {
    return queryOptional("""
        SELECT id, workflow_id, version, dag_json, content_hash, published_by, published_at
        FROM yak_wf_version
        WHERE workflow_id = :workflowId AND version = :version
        """, Map.of("workflowId", workflowId, "version", version), this::mapVersion);
  }

  public long createInstance(
      Definition definition,
      Version version,
      TriggerType triggerType,
      Map<String, Object> globalParameters,
      String operator) {
    Instant now = Instant.now();
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("workflowId", definition.id())
        .addValue("workflowVersion", version.version())
        .addValue("triggerType", triggerType.name())
        .addValue("state", WorkflowState.PENDING.name())
        .addValue("globalParams", codec.write(globalParameters))
        .addValue("failureStrategy", definition.failureStrategy().name())
        .addValue("maxParallelism", definition.maxParallelism())
        .addValue("createdBy", operator)
        .addValue("createdAt", timestamp(now));
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update("""
        INSERT INTO yak_wf_instance
          (workflow_id, workflow_version, trigger_type, state, global_params_json,
           failure_strategy, max_parallelism, stop_requested, created_by, created_at)
        VALUES
          (:workflowId, :workflowVersion, :triggerType, :state, :globalParams,
           :failureStrategy, :maxParallelism, 0, :createdBy, :createdAt)
        """, params, keys, new String[] {"id"});
    long instanceId = requiredKey(keys);
    for (WorkflowDag.Node node : version.dag().nodes()) {
      TaskState initialState = node.enabled() ? TaskState.WAITING : TaskState.SKIPPED;
      jdbc.update("""
          INSERT INTO yak_wf_task_instance
            (workflow_instance_id, node_key, node_name, task_type, state, config_json,
             max_retry_times, retry_count, retry_interval_seconds, timeout_seconds,
             idempotent, retry_on_restart, next_retry_time, start_time, end_time,
             result_json, error_message, lock_version)
          VALUES
            (:instanceId, :nodeKey, :nodeName, :taskType, :state, :configJson,
             :maxRetryTimes, 0, :retryIntervalSeconds, :timeoutSeconds,
             :idempotent, :retryOnRestart, NULL, NULL, :endTime,
             NULL, NULL, 0)
          """, new MapSqlParameterSource()
          .addValue("instanceId", instanceId)
          .addValue("nodeKey", node.key())
          .addValue("nodeName", node.name())
          .addValue("taskType", node.type())
          .addValue("state", initialState.name())
          .addValue("configJson", codec.write(node.config()))
          .addValue("maxRetryTimes", node.retryTimes())
          .addValue("retryIntervalSeconds", node.retryIntervalSeconds())
          .addValue("timeoutSeconds", node.timeoutSeconds())
          .addValue("idempotent", node.idempotent())
          .addValue("retryOnRestart", node.retryOnRestart())
          .addValue("endTime", initialState == TaskState.SKIPPED ? timestamp(now) : null));
    }
    return instanceId;
  }

  public Optional<Instance> findInstance(long instanceId) {
    return queryOptional("""
        SELECT id, workflow_id, workflow_version, trigger_type, state, global_params_json,
               failure_strategy, max_parallelism, stop_requested, start_time, end_time,
               created_by, created_at
        FROM yak_wf_instance
        WHERE id = :id
        """, Map.of("id", instanceId), this::mapInstance);
  }

  public List<Instance> listInstances(long workflowId, int limit) {
    return jdbc.query("""
        SELECT id, workflow_id, workflow_version, trigger_type, state, global_params_json,
               failure_strategy, max_parallelism, stop_requested, start_time, end_time,
               created_by, created_at
        FROM yak_wf_instance
        WHERE workflow_id = :workflowId
        ORDER BY id DESC
        LIMIT :limit
        """, Map.of("workflowId", workflowId, "limit", Math.max(1, Math.min(limit, 200))), this::mapInstance);
  }

  public List<Long> findRecoverableInstanceIds(int limit) {
    return jdbc.queryForList("""
        SELECT id
        FROM yak_wf_instance
        WHERE state IN (:states)
        ORDER BY id
        LIMIT :limit
        """, Map.of(
        "states", RECOVERABLE_STATES.stream().map(Enum::name).toList(),
        "limit", Math.max(1, limit)), Long.class);
  }

  public boolean hasRunningInstance(long workflowId) {
    Integer count = jdbc.queryForObject("""
        SELECT COUNT(1)
        FROM yak_wf_instance
        WHERE workflow_id = :workflowId
          AND state IN (:states)
        """, Map.of(
        "workflowId", workflowId,
        "states", RECOVERABLE_STATES.stream().map(Enum::name).toList()), Integer.class);
    return count != null && count > 0;
  }

  public void markInstanceRunning(long instanceId) {
    jdbc.update("""
        UPDATE yak_wf_instance
        SET state = :running,
            start_time = COALESCE(start_time, :startTime),
            lock_version = lock_version + 1
        WHERE id = :id AND state = :pending
        """, Map.of(
        "running", WorkflowState.RUNNING.name(),
        "startTime", timestamp(Instant.now()),
        "id", instanceId,
        "pending", WorkflowState.PENDING.name()));
  }

  public void requestStop(long instanceId) {
    int updated = jdbc.update("""
        UPDATE yak_wf_instance
        SET stop_requested = 1,
            state = CASE WHEN state IN (:activeStates) THEN :stopping ELSE state END,
            lock_version = lock_version + 1
        WHERE id = :id AND state NOT IN (:terminalStates)
        """, Map.of(
        "activeStates", List.of(WorkflowState.PENDING.name(), WorkflowState.RUNNING.name()),
        "stopping", WorkflowState.STOPPING.name(),
        "id", instanceId,
        "terminalStates", List.of(
            WorkflowState.SUCCESS.name(), WorkflowState.FAILED.name(), WorkflowState.STOPPED.name())));
    requireUpdated(updated, "Workflow instance cannot be stopped: " + instanceId);
  }

  public void finishInstance(long instanceId, WorkflowState state) {
    if (!state.isTerminal()) {
      throw new IllegalArgumentException("Workflow final state required: " + state);
    }
    jdbc.update("""
        UPDATE yak_wf_instance
        SET state = :state, end_time = :endTime, lock_version = lock_version + 1
        WHERE id = :id AND state NOT IN (:terminalStates)
        """, Map.of(
        "state", state.name(),
        "endTime", timestamp(Instant.now()),
        "id", instanceId,
        "terminalStates", List.of(
            WorkflowState.SUCCESS.name(), WorkflowState.FAILED.name(), WorkflowState.STOPPED.name())));
  }

  public List<TaskInstance> findTasks(long workflowInstanceId) {
    return jdbc.query("""
        SELECT id, workflow_instance_id, node_key, node_name, task_type, state, config_json,
               max_retry_times, retry_count, retry_interval_seconds, timeout_seconds,
               idempotent, retry_on_restart, next_retry_time, start_time, end_time,
               result_json, error_message
        FROM yak_wf_task_instance
        WHERE workflow_instance_id = :instanceId
        ORDER BY id
        """, Map.of("instanceId", workflowInstanceId), this::mapTaskInstance);
  }

  public Optional<TaskInstance> findTask(long taskInstanceId) {
    return queryOptional("""
        SELECT id, workflow_instance_id, node_key, node_name, task_type, state, config_json,
               max_retry_times, retry_count, retry_interval_seconds, timeout_seconds,
               idempotent, retry_on_restart, next_retry_time, start_time, end_time,
               result_json, error_message
        FROM yak_wf_task_instance
        WHERE id = :id
        """, Map.of("id", taskInstanceId), this::mapTaskInstance);
  }

  public boolean claimTask(long taskInstanceId) {
    return jdbc.update("""
        UPDATE yak_wf_task_instance
        SET state = :running,
            start_time = COALESCE(start_time, :startTime),
            next_retry_time = NULL,
            lock_version = lock_version + 1
        WHERE id = :id
          AND state IN (:claimable)
          AND (next_retry_time IS NULL OR next_retry_time <= :now)
        """, Map.of(
        "running", TaskState.RUNNING.name(),
        "startTime", timestamp(Instant.now()),
        "id", taskInstanceId,
        "claimable", List.of(TaskState.WAITING.name(), TaskState.READY.name(), TaskState.RETRY_WAITING.name()),
        "now", timestamp(Instant.now()))) == 1;
  }

  public long createAttempt(TaskInstance task) {
    int attemptNo = task.retryCount() + 1;
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("taskInstanceId", task.id())
        .addValue("attemptNo", attemptNo)
        .addValue("state", AttemptState.RUNNING.name())
        .addValue("executorType", task.taskType())
        .addValue("startTime", timestamp(Instant.now()));
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update("""
        INSERT INTO yak_wf_task_attempt
          (task_instance_id, attempt_no, state, executor_type, start_time)
        VALUES
          (:taskInstanceId, :attemptNo, :state, :executorType, :startTime)
        """, params, keys, new String[] {"id"});
    return requiredKey(keys);
  }

  public void finishAttempt(
      long attemptId,
      AttemptState state,
      String externalId,
      String errorMessage) {
    jdbc.update("""
        UPDATE yak_wf_task_attempt
        SET state = :state,
            external_id = :externalId,
            error_message = :errorMessage,
            end_time = :endTime
        WHERE id = :id AND state = :running
        """, new MapSqlParameterSource()
        .addValue("state", state.name())
        .addValue("externalId", externalId)
        .addValue("errorMessage", errorMessage)
        .addValue("endTime", timestamp(Instant.now()))
        .addValue("id", attemptId)
        .addValue("running", AttemptState.RUNNING.name()));
  }

  public void appendLog(long attemptId, String content) {
    if (content == null) {
      return;
    }
    long lineNo = Math.max(Instant.now().toEpochMilli() * 1_000L, logSequence.incrementAndGet());
    jdbc.update("""
        INSERT INTO yak_wf_task_log (task_attempt_id, line_no, content, created_at)
        VALUES (:attemptId, :lineNo, :content, :createdAt)
        """, Map.of(
        "attemptId", attemptId,
        "lineNo", lineNo,
        "content", content,
        "createdAt", timestamp(Instant.now())));
  }

  public List<String> findLogs(long taskInstanceId, int limit) {
    return jdbc.queryForList("""
        SELECT log.content
        FROM yak_wf_task_log log
        JOIN yak_wf_task_attempt attempt ON attempt.id = log.task_attempt_id
        WHERE attempt.task_instance_id = :taskInstanceId
        ORDER BY log.id
        LIMIT :limit
        """, Map.of(
        "taskInstanceId", taskInstanceId,
        "limit", Math.max(1, Math.min(limit, 10_000))), String.class);
  }

  public List<Attempt> findAttempts(long taskInstanceId) {
    return jdbc.query("""
        SELECT id, task_instance_id, attempt_no, state, executor_type, external_id,
               start_time, end_time, error_message
        FROM yak_wf_task_attempt
        WHERE task_instance_id = :taskInstanceId
        ORDER BY attempt_no
        """, Map.of("taskInstanceId", taskInstanceId), this::mapAttempt);
  }

  public void markTaskSuccess(long taskInstanceId, Map<String, Object> resultData) {
    jdbc.update("""
        UPDATE yak_wf_task_instance
        SET state = :state,
            result_json = :resultJson,
            error_message = NULL,
            end_time = :endTime,
            lock_version = lock_version + 1
        WHERE id = :id AND state = :running
        """, new MapSqlParameterSource()
        .addValue("state", TaskState.SUCCESS.name())
        .addValue("resultJson", codec.write(resultData))
        .addValue("endTime", timestamp(Instant.now()))
        .addValue("id", taskInstanceId)
        .addValue("running", TaskState.RUNNING.name()));
  }

  public void markTaskRetryWaiting(long taskInstanceId, int retryCount, Instant nextRetryTime, String errorMessage) {
    jdbc.update("""
        UPDATE yak_wf_task_instance
        SET state = :state,
            retry_count = :retryCount,
            next_retry_time = :nextRetryTime,
            error_message = :errorMessage,
            lock_version = lock_version + 1
        WHERE id = :id AND state = :running
        """, new MapSqlParameterSource()
        .addValue("state", TaskState.RETRY_WAITING.name())
        .addValue("retryCount", retryCount)
        .addValue("nextRetryTime", timestamp(nextRetryTime))
        .addValue("errorMessage", errorMessage)
        .addValue("id", taskInstanceId)
        .addValue("running", TaskState.RUNNING.name()));
  }

  public void markTaskFailed(long taskInstanceId, int retryCount, String errorMessage) {
    jdbc.update("""
        UPDATE yak_wf_task_instance
        SET state = :state,
            retry_count = :retryCount,
            error_message = :errorMessage,
            end_time = :endTime,
            lock_version = lock_version + 1
        WHERE id = :id AND state IN (:activeStates)
        """, new MapSqlParameterSource()
        .addValue("state", TaskState.FAILED.name())
        .addValue("retryCount", retryCount)
        .addValue("errorMessage", errorMessage)
        .addValue("endTime", timestamp(Instant.now()))
        .addValue("id", taskInstanceId)
        .addValue("activeStates", List.of(TaskState.RUNNING.name(), TaskState.RETRY_WAITING.name())));
  }

  public void markTaskStopped(long taskInstanceId, String message) {
    jdbc.update("""
        UPDATE yak_wf_task_instance
        SET state = :state,
            error_message = :message,
            end_time = :endTime,
            lock_version = lock_version + 1
        WHERE id = :id AND state NOT IN (:terminalStates)
        """, new MapSqlParameterSource()
        .addValue("state", TaskState.STOPPED.name())
        .addValue("message", message)
        .addValue("endTime", timestamp(Instant.now()))
        .addValue("id", taskInstanceId)
        .addValue("terminalStates", terminalTaskStates()));
  }

  public int markTasksSkipped(long workflowInstanceId, Collection<String> nodeKeys, String reason) {
    if (nodeKeys == null || nodeKeys.isEmpty()) {
      return 0;
    }
    return jdbc.update("""
        UPDATE yak_wf_task_instance
        SET state = :state,
            error_message = :reason,
            end_time = :endTime,
            lock_version = lock_version + 1
        WHERE workflow_instance_id = :instanceId
          AND node_key IN (:nodeKeys)
          AND state NOT IN (:terminalStates)
        """, new MapSqlParameterSource()
        .addValue("state", TaskState.SKIPPED.name())
        .addValue("reason", reason)
        .addValue("endTime", timestamp(Instant.now()))
        .addValue("instanceId", workflowInstanceId)
        .addValue("nodeKeys", nodeKeys)
        .addValue("terminalStates", terminalTaskStates()));
  }

  public int markAllPendingTasksSkipped(long workflowInstanceId, String reason) {
    return jdbc.update("""
        UPDATE yak_wf_task_instance
        SET state = :state,
            error_message = :reason,
            end_time = :endTime,
            lock_version = lock_version + 1
        WHERE workflow_instance_id = :instanceId
          AND state IN (:states)
        """, new MapSqlParameterSource()
        .addValue("state", TaskState.SKIPPED.name())
        .addValue("reason", reason)
        .addValue("endTime", timestamp(Instant.now()))
        .addValue("instanceId", workflowInstanceId)
        .addValue("states", List.of(
            TaskState.WAITING.name(), TaskState.READY.name(), TaskState.RETRY_WAITING.name())));
  }

  public void interruptRunningTask(TaskInstance task) {
    jdbc.update("""
        UPDATE yak_wf_task_attempt
        SET state = :interrupted, end_time = :endTime,
            error_message = COALESCE(error_message, :message)
        WHERE task_instance_id = :taskId AND state = :running
        """, Map.of(
        "interrupted", AttemptState.INTERRUPTED.name(),
        "endTime", timestamp(Instant.now()),
        "message", "Yak Ops restarted while the task was running",
        "taskId", task.id(),
        "running", AttemptState.RUNNING.name()));

    boolean canRetry = task.retryOnRestart()
        && task.idempotent()
        && task.retryCount() < task.maxRetryTimes();
    if (canRetry) {
      jdbc.update("""
          UPDATE yak_wf_task_instance
          SET state = :retryWaiting,
              retry_count = retry_count + 1,
              next_retry_time = :nextRetryTime,
              error_message = :message,
              lock_version = lock_version + 1
          WHERE id = :id AND state = :running
          """, Map.of(
          "retryWaiting", TaskState.RETRY_WAITING.name(),
          "nextRetryTime", timestamp(Instant.now()),
          "message", "Recovered after Yak Ops restart",
          "id", task.id(),
          "running", TaskState.RUNNING.name()));
    } else {
      markTaskFailed(
          task.id(),
          task.retryCount(),
          "Task was interrupted by Yak Ops restart and is not configured for safe restart retry");
    }
  }

  public Schedule upsertSchedule(
      long workflowId,
      String cronExpression,
      String timezone,
      boolean enabled,
      MisfirePolicy misfirePolicy,
      ScheduleConcurrencyPolicy concurrencyPolicy) {
    Instant now = Instant.now();
    jdbc.update("""
        INSERT INTO yak_wf_schedule
          (workflow_id, cron_expression, timezone, enabled, misfire_policy,
           concurrency_policy, updated_at)
        VALUES
          (:workflowId, :cronExpression, :timezone, :enabled, :misfirePolicy,
           :concurrencyPolicy, :updatedAt)
        ON DUPLICATE KEY UPDATE
          cron_expression = VALUES(cron_expression),
          timezone = VALUES(timezone),
          enabled = VALUES(enabled),
          misfire_policy = VALUES(misfire_policy),
          concurrency_policy = VALUES(concurrency_policy),
          updated_at = VALUES(updated_at)
        """, new MapSqlParameterSource()
        .addValue("workflowId", workflowId)
        .addValue("cronExpression", cronExpression)
        .addValue("timezone", timezone)
        .addValue("enabled", enabled)
        .addValue("misfirePolicy", misfirePolicy.name())
        .addValue("concurrencyPolicy", concurrencyPolicy.name())
        .addValue("updatedAt", timestamp(now)));
    return findSchedule(workflowId)
        .orElseThrow(() -> new IllegalStateException("Workflow schedule was not persisted"));
  }

  public Optional<Schedule> findSchedule(long workflowId) {
    return queryOptional("""
        SELECT id, workflow_id, cron_expression, timezone, enabled,
               misfire_policy, concurrency_policy, updated_at
        FROM yak_wf_schedule
        WHERE workflow_id = :workflowId
        """, Map.of("workflowId", workflowId), this::mapSchedule);
  }

  public List<Schedule> findEnabledSchedules() {
    return jdbc.query("""
        SELECT id, workflow_id, cron_expression, timezone, enabled,
               misfire_policy, concurrency_policy, updated_at
        FROM yak_wf_schedule
        WHERE enabled = 1
        ORDER BY id
        """, Map.of(), this::mapSchedule);
  }

  public void deleteSchedule(long workflowId) {
    jdbc.update("DELETE FROM yak_wf_schedule WHERE workflow_id = :workflowId",
        Map.of("workflowId", workflowId));
  }

  private Definition mapDefinition(ResultSet rs, int rowNum) throws SQLException {
    Integer currentVersion = (Integer) rs.getObject("current_version");
    return new Definition(
        rs.getLong("id"),
        rs.getString("code"),
        rs.getString("name"),
        rs.getString("description"),
        DefinitionState.valueOf(rs.getString("state")),
        currentVersion,
        FailureStrategy.valueOf(rs.getString("failure_strategy")),
        rs.getInt("max_parallelism"),
        codec.readDag(rs.getString("draft_json")),
        rs.getString("created_by"),
        instant(rs.getTimestamp("created_at")),
        instant(rs.getTimestamp("updated_at")));
  }

  private Version mapVersion(ResultSet rs, int rowNum) throws SQLException {
    return new Version(
        rs.getLong("id"),
        rs.getLong("workflow_id"),
        rs.getInt("version"),
        codec.readDag(rs.getString("dag_json")),
        rs.getString("content_hash"),
        rs.getString("published_by"),
        instant(rs.getTimestamp("published_at")));
  }

  private Instance mapInstance(ResultSet rs, int rowNum) throws SQLException {
    return new Instance(
        rs.getLong("id"),
        rs.getLong("workflow_id"),
        rs.getInt("workflow_version"),
        TriggerType.valueOf(rs.getString("trigger_type")),
        WorkflowState.valueOf(rs.getString("state")),
        codec.readMap(rs.getString("global_params_json")),
        FailureStrategy.valueOf(rs.getString("failure_strategy")),
        rs.getInt("max_parallelism"),
        rs.getBoolean("stop_requested"),
        instant(rs.getTimestamp("start_time")),
        instant(rs.getTimestamp("end_time")),
        rs.getString("created_by"),
        instant(rs.getTimestamp("created_at")));
  }

  private TaskInstance mapTaskInstance(ResultSet rs, int rowNum) throws SQLException {
    return new TaskInstance(
        rs.getLong("id"),
        rs.getLong("workflow_instance_id"),
        rs.getString("node_key"),
        rs.getString("node_name"),
        rs.getString("task_type"),
        TaskState.valueOf(rs.getString("state")),
        codec.readMap(rs.getString("config_json")),
        rs.getInt("max_retry_times"),
        rs.getInt("retry_count"),
        rs.getInt("retry_interval_seconds"),
        rs.getInt("timeout_seconds"),
        rs.getBoolean("idempotent"),
        rs.getBoolean("retry_on_restart"),
        instant(rs.getTimestamp("next_retry_time")),
        instant(rs.getTimestamp("start_time")),
        instant(rs.getTimestamp("end_time")),
        codec.readMap(rs.getString("result_json")),
        rs.getString("error_message"));
  }

  private Attempt mapAttempt(ResultSet rs, int rowNum) throws SQLException {
    return new Attempt(
        rs.getLong("id"),
        rs.getLong("task_instance_id"),
        rs.getInt("attempt_no"),
        AttemptState.valueOf(rs.getString("state")),
        rs.getString("executor_type"),
        rs.getString("external_id"),
        instant(rs.getTimestamp("start_time")),
        instant(rs.getTimestamp("end_time")),
        rs.getString("error_message"));
  }

  private Schedule mapSchedule(ResultSet rs, int rowNum) throws SQLException {
    return new Schedule(
        rs.getLong("id"),
        rs.getLong("workflow_id"),
        rs.getString("cron_expression"),
        rs.getString("timezone"),
        rs.getBoolean("enabled"),
        MisfirePolicy.valueOf(rs.getString("misfire_policy")),
        ScheduleConcurrencyPolicy.valueOf(rs.getString("concurrency_policy")),
        instant(rs.getTimestamp("updated_at")));
  }

  private <T> Optional<T> queryOptional(
      String sql,
      Map<String, ?> params,
      RowMapper<T> mapper) {
    try {
      return Optional.ofNullable(jdbc.queryForObject(sql, params, mapper));
    } catch (EmptyResultDataAccessException ignored) {
      return Optional.empty();
    }
  }

  private static List<String> terminalTaskStates() {
    return List.of(
        TaskState.SUCCESS.name(),
        TaskState.FAILED.name(),
        TaskState.SKIPPED.name(),
        TaskState.STOPPED.name());
  }

  private static Timestamp timestamp(Instant value) {
    return value == null ? null : Timestamp.from(value);
  }

  private static Instant instant(Timestamp value) {
    return value == null ? null : value.toInstant();
  }

  private static long requiredKey(KeyHolder keys) {
    Number key = keys.getKey();
    if (key == null) {
      throw new IllegalStateException("Database did not return a generated key");
    }
    return key.longValue();
  }

  private static void requireUpdated(int updated, String message) {
    if (updated != 1) {
      throw new IllegalArgumentException(message);
    }
  }
}
