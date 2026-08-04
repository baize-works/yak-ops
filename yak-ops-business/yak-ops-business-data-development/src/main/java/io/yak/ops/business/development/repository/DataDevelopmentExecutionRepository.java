package io.yak.ops.business.development.repository;

import io.yak.ops.business.development.domain.DataDevelopmentModel.ExecutionAttempt;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ExecutionEvent;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ExecutionResult;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ExecutionSourceType;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ExecutionStatus;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ExecutionSummary;
import io.yak.ops.business.development.service.DataDevelopmentJsonCodec;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

/** JDBC adapter for execution attempts, events, results and state transitions. */
public final class DataDevelopmentExecutionRepository {

  private final NamedParameterJdbcTemplate jdbc;
  private final DataDevelopmentJsonCodec json;

  public DataDevelopmentExecutionRepository(
      NamedParameterJdbcTemplate jdbc,
      DataDevelopmentJsonCodec json) {
    this.jdbc = jdbc;
    this.json = json;
  }

  public int markQueued(long executionId) {
    return jdbc.update("""
        UPDATE yak_dev_execution SET status='QUEUED'
        WHERE id=:id AND status='CREATED'
        """, p("id", executionId));
  }

  public int markRunning(long executionId, int attemptNo, LocalDateTime now) {
    return jdbc.update("""
        UPDATE yak_dev_execution
        SET status='RUNNING',current_attempt_no=:attemptNo,started_at=COALESCE(started_at,:now),
          finished_at=NULL,error_code=NULL,error_message=NULL
        WHERE id=:id AND status IN ('CREATED','QUEUED')
        """, p("id", executionId).addValue("attemptNo", attemptNo).addValue("now", ts(now)));
  }

  public int markSucceeded(long executionId, LocalDateTime now) {
    return terminal(executionId, ExecutionStatus.SUCCEEDED, null, null, now);
  }

  public int markFailed(
      long executionId,
      String errorCode,
      String errorMessage,
      LocalDateTime now) {
    return terminal(executionId, ExecutionStatus.FAILED, errorCode, errorMessage, now);
  }

  public int markCanceled(long executionId, LocalDateTime now) {
    return jdbc.update("""
        UPDATE yak_dev_execution
        SET status='CANCELED',finished_at=:now,error_code=NULL,error_message=NULL
        WHERE id=:id AND status IN ('CREATED','QUEUED','RUNNING')
        """, p("id", executionId).addValue("now", ts(now)));
  }

  public int markTimedOut(long executionId, String message, LocalDateTime now) {
    return terminal(executionId, ExecutionStatus.TIMED_OUT, "EXECUTION_TIMEOUT", message, now);
  }

  public int markLost(long executionId, String message, LocalDateTime now) {
    return terminal(executionId, ExecutionStatus.LOST, "WORKER_RESTARTED", message, now);
  }

  private int terminal(
      long executionId,
      ExecutionStatus status,
      String errorCode,
      String errorMessage,
      LocalDateTime now) {
    return jdbc.update("""
        UPDATE yak_dev_execution
        SET status=:status,finished_at=:now,error_code=:errorCode,error_message=:errorMessage
        WHERE id=:id AND status IN ('CREATED','QUEUED','RUNNING')
        """, p("id", executionId).addValue("status", status.name())
        .addValue("now", ts(now)).addValue("errorCode", errorCode)
        .addValue("errorMessage", errorMessage));
  }

  public List<Long> listRecoverableExecutionIds(int limit) {
    return jdbc.queryForList("""
        SELECT id FROM yak_dev_execution
        WHERE status IN ('CREATED','QUEUED','RUNNING')
        ORDER BY id ASC LIMIT :limit
        """, p("limit", Math.min(1000, Math.max(1, limit))), Long.class);
  }

  public long insertAttempt(
      long executionId,
      int attemptNo,
      String executorType,
      String workerId,
      LocalDateTime now) {
    return insert("""
        INSERT INTO yak_dev_execution_attempt(
          execution_id,attempt_no,executor_type,worker_id,status,started_at)
        VALUES(:executionId,:attemptNo,:executorType,:workerId,'RUNNING',:now)
        """, p("executionId", executionId).addValue("attemptNo", attemptNo)
        .addValue("executorType", executorType).addValue("workerId", workerId)
        .addValue("now", ts(now)));
  }

  public int completeAttempt(
      long attemptId,
      ExecutionStatus status,
      String externalExecutionId,
      Integer exitCode,
      String errorCode,
      String errorMessage,
      LocalDateTime now) {
    return jdbc.update("""
        UPDATE yak_dev_execution_attempt
        SET status=:status,external_execution_id=:externalExecutionId,exit_code=:exitCode,
          error_code=:errorCode,error_message=:errorMessage,finished_at=:now
        WHERE id=:id AND status='RUNNING'
        """, p("id", attemptId).addValue("status", status.name())
        .addValue("externalExecutionId", externalExecutionId).addValue("exitCode", exitCode)
        .addValue("errorCode", errorCode).addValue("errorMessage", errorMessage)
        .addValue("now", ts(now)));
  }

  public int completeRunningAttempt(
      long executionId,
      ExecutionStatus status,
      String errorCode,
      String errorMessage,
      LocalDateTime now) {
    return jdbc.update("""
        UPDATE yak_dev_execution_attempt
        SET status=:status,error_code=:errorCode,error_message=:errorMessage,finished_at=:now
        WHERE execution_id=:executionId AND status='RUNNING'
        """, p("executionId", executionId).addValue("status", status.name())
        .addValue("errorCode", errorCode).addValue("errorMessage", errorMessage)
        .addValue("now", ts(now)));
  }

  public List<ExecutionAttempt> listAttempts(long executionId) {
    return jdbc.query("""
        SELECT * FROM yak_dev_execution_attempt
        WHERE execution_id=:executionId ORDER BY attempt_no,id
        """, p("executionId", executionId), this::attempt);
  }

  public long nextEventSequence(long executionId) {
    Long value = jdbc.queryForObject("""
        SELECT COALESCE(MAX(sequence_no),0)+1
        FROM yak_dev_execution_event WHERE execution_id=:executionId
        """, p("executionId", executionId), Long.class);
    return value == null ? 1L : value;
  }

  public ExecutionEvent insertEvent(
      long executionId,
      Long attemptId,
      long sequenceNo,
      String eventType,
      String payload,
      LocalDateTime now) {
    long id = insert("""
        INSERT INTO yak_dev_execution_event(
          execution_id,attempt_id,sequence_no,event_type,payload_json,occurred_at)
        VALUES(:executionId,:attemptId,:sequenceNo,:eventType,:payload,:now)
        """, p("executionId", executionId).addValue("attemptId", attemptId)
        .addValue("sequenceNo", sequenceNo).addValue("eventType", eventType)
        .addValue("payload", payload).addValue("now", ts(now)));
    return new ExecutionEvent(
        id,
        executionId,
        attemptId,
        sequenceNo,
        eventType,
        json.readTree(payload),
        now);
  }

  public List<ExecutionEvent> listEvents(long executionId, long afterSequence, int limit) {
    return jdbc.query("""
        SELECT * FROM yak_dev_execution_event
        WHERE execution_id=:executionId AND sequence_no>:afterSequence
        ORDER BY sequence_no ASC LIMIT :limit
        """, p("executionId", executionId).addValue("afterSequence", afterSequence)
        .addValue("limit", Math.min(5000, Math.max(1, limit))), this::event);
  }

  public long insertResult(
      long executionId,
      Long attemptId,
      String resultKind,
      String summary,
      String payload,
      String datasetRef,
      boolean truncated,
      LocalDateTime now) {
    return insert("""
        INSERT INTO yak_dev_execution_result(
          execution_id,attempt_id,result_kind,schema_version,summary_json,payload_json,
          dataset_ref,truncated,created_at)
        VALUES(:executionId,:attemptId,:resultKind,1,:summary,:payload,:datasetRef,:truncated,:now)
        """, p("executionId", executionId).addValue("attemptId", attemptId)
        .addValue("resultKind", resultKind).addValue("summary", summary)
        .addValue("payload", payload).addValue("datasetRef", datasetRef)
        .addValue("truncated", truncated).addValue("now", ts(now)));
  }

  public List<ExecutionResult> listResults(long executionId) {
    return jdbc.query("""
        SELECT * FROM yak_dev_execution_result
        WHERE execution_id=:executionId ORDER BY id ASC
        """, p("executionId", executionId), this::result);
  }

  public Optional<String> findTaskName(long taskId) {
    return one(jdbc.queryForList(
        "SELECT name FROM yak_dev_resource WHERE id=:taskId AND deleted=0",
        p("taskId", taskId), String.class));
  }

  public Optional<String> findEngineType(long taskId) {
    return one(jdbc.queryForList(
        "SELECT engine_type FROM yak_dev_task WHERE id=:taskId",
        p("taskId", taskId), String.class));
  }

  public List<ExecutionSummary> listExecutionSummaries(
      String status,
      String taskType,
      String keyword,
      int offset,
      int limit) {
    String normalizedKeyword = keyword == null || keyword.isBlank()
        ? null
        : "%" + keyword.trim() + "%";
    return jdbc.query("""
        SELECT e.id,e.task_id,r.name AS task_name,e.task_type,t.engine_type,e.source_type,
          e.status,e.current_attempt_no,e.created_by,e.created_at,e.started_at,e.finished_at,
          e.error_message
        FROM yak_dev_execution e
        JOIN yak_dev_task t ON t.id=e.task_id
        JOIN yak_dev_resource r ON r.id=e.task_id AND r.deleted=0
        WHERE (:status IS NULL OR e.status=:status)
          AND (:taskType IS NULL OR e.task_type=:taskType)
          AND (:keyword IS NULL OR r.name LIKE :keyword OR CAST(e.id AS CHAR) LIKE :keyword)
        ORDER BY e.id DESC LIMIT :limit OFFSET :offset
        """, filters(status, taskType, normalizedKeyword)
        .addValue("limit", Math.min(500, Math.max(1, limit)))
        .addValue("offset", Math.max(0, offset)), this::summary);
  }

  public long countExecutionSummaries(String status, String taskType, String keyword) {
    String normalizedKeyword = keyword == null || keyword.isBlank()
        ? null
        : "%" + keyword.trim() + "%";
    Long value = jdbc.queryForObject("""
        SELECT COUNT(1)
        FROM yak_dev_execution e
        JOIN yak_dev_task t ON t.id=e.task_id
        JOIN yak_dev_resource r ON r.id=e.task_id AND r.deleted=0
        WHERE (:status IS NULL OR e.status=:status)
          AND (:taskType IS NULL OR e.task_type=:taskType)
          AND (:keyword IS NULL OR r.name LIKE :keyword OR CAST(e.id AS CHAR) LIKE :keyword)
        """, filters(status, taskType, normalizedKeyword), Long.class);
    return value == null ? 0L : value;
  }

  private static MapSqlParameterSource filters(
      String status,
      String taskType,
      String keyword) {
    return p().addValue("status", blankToNull(status))
        .addValue("taskType", blankToNull(taskType))
        .addValue("keyword", keyword);
  }

  private long insert(String sql, MapSqlParameterSource parameters) {
    KeyHolder holder = new GeneratedKeyHolder();
    jdbc.update(sql, parameters, holder, new String[] {"id"});
    Number key = holder.getKey();
    if (key == null) {
      throw new IllegalStateException("Database did not return a generated ID");
    }
    return key.longValue();
  }

  private ExecutionAttempt attempt(ResultSet rs, int row) throws SQLException {
    return new ExecutionAttempt(
        rs.getLong("id"),
        rs.getLong("execution_id"),
        rs.getInt("attempt_no"),
        rs.getString("executor_type"),
        rs.getString("worker_id"),
        rs.getString("external_execution_id"),
        ExecutionStatus.valueOf(rs.getString("status")),
        nullableInteger(rs, "exit_code"),
        rs.getString("error_code"),
        rs.getString("error_message"),
        time(rs, "started_at"),
        time(rs, "finished_at"));
  }

  private ExecutionEvent event(ResultSet rs, int row) throws SQLException {
    return new ExecutionEvent(
        rs.getLong("id"),
        rs.getLong("execution_id"),
        nullableLong(rs, "attempt_id"),
        rs.getLong("sequence_no"),
        rs.getString("event_type"),
        json.readTree(rs.getString("payload_json")),
        time(rs, "occurred_at"));
  }

  private ExecutionResult result(ResultSet rs, int row) throws SQLException {
    return new ExecutionResult(
        rs.getLong("id"),
        rs.getLong("execution_id"),
        nullableLong(rs, "attempt_id"),
        rs.getString("result_kind"),
        rs.getInt("schema_version"),
        json.readTree(rs.getString("summary_json")),
        json.readTree(rs.getString("payload_json")),
        rs.getString("dataset_ref"),
        rs.getBoolean("truncated"),
        time(rs, "created_at"));
  }

  private ExecutionSummary summary(ResultSet rs, int row) throws SQLException {
    return new ExecutionSummary(
        rs.getLong("id"),
        rs.getLong("task_id"),
        rs.getString("task_name"),
        rs.getString("task_type"),
        rs.getString("engine_type"),
        ExecutionSourceType.valueOf(rs.getString("source_type")),
        ExecutionStatus.valueOf(rs.getString("status")),
        rs.getInt("current_attempt_no"),
        rs.getString("created_by"),
        time(rs, "created_at"),
        time(rs, "started_at"),
        time(rs, "finished_at"),
        rs.getString("error_message"));
  }

  private static MapSqlParameterSource p() {
    return new MapSqlParameterSource();
  }

  private static MapSqlParameterSource p(String key, Object value) {
    return p().addValue(key, value);
  }

  private static Timestamp ts(LocalDateTime value) {
    return Timestamp.valueOf(value);
  }

  private static Long nullableLong(ResultSet rs, String column) throws SQLException {
    long value = rs.getLong(column);
    return rs.wasNull() ? null : value;
  }

  private static Integer nullableInteger(ResultSet rs, String column) throws SQLException {
    int value = rs.getInt(column);
    return rs.wasNull() ? null : value;
  }

  private static LocalDateTime time(ResultSet rs, String column) throws SQLException {
    Timestamp value = rs.getTimestamp(column);
    return value == null ? null : value.toLocalDateTime();
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim().toUpperCase();
  }

  private static <T> Optional<T> one(List<T> values) {
    return values.isEmpty() ? Optional.empty() : Optional.ofNullable(values.getFirst());
  }
}
