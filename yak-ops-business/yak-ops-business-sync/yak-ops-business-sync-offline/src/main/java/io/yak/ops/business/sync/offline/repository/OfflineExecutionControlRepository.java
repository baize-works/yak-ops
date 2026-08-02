package io.yak.ops.business.sync.offline.repository;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * 持久化执行扫描、并发领取、状态事件和告警记录。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Repository
public class OfflineExecutionControlRepository {

  private final JdbcTemplate jdbc;

  public OfflineExecutionControlRepository(
      @Qualifier("offlineSyncDataSource") DataSource dataSource) {
    this.jdbc = new JdbcTemplate(dataSource);
  }

  /** Must be called inside the offline-sync transaction before checking active executions. */
  public void lockDefinition(Long definitionId) {
    Long locked = jdbc.queryForObject(
        "SELECT id FROM yak_offline_job_definition WHERE id = ? FOR UPDATE",
        Long.class,
        definitionId);
    if (locked == null) {
      throw new IllegalArgumentException("离线同步任务不存在：" + definitionId);
    }
  }

  public boolean hasActiveExecution(Long definitionId) {
    Integer count = jdbc.queryForObject(
        "SELECT COUNT(1) FROM yak_offline_job_execution WHERE job_definition_id = ? "
            + "AND status IN ('CREATED','SUBMITTED','QUEUED','RUNNING')",
        Integer.class,
        definitionId);
    return count != null && count > 0;
  }

  /**
   * 返回 Yak Ops 已创建但尚未结束的执行数，用于弥补 Worker 心跳负载的时间差。
   *
   * <p>该查询使用 FOR UPDATE 当前读，避免 MySQL REPEATABLE READ 继续读取领取事务
   * 建立时的旧快照。调用方必须先按固定顺序锁定 Worker 行。
   */
  public Map<String, Integer> countActiveExecutionsByNode() {
    Map<String, Integer> result = new LinkedHashMap<>();
    jdbc.query(
        "SELECT engine_node_id FROM yak_offline_job_execution "
            + "WHERE engine_node_id IS NOT NULL "
            + "AND status IN ('CREATED','SUBMITTED','QUEUED','RUNNING') "
            + "ORDER BY id ASC FOR UPDATE",
        resultSet -> {
          String nodeId = resultSet.getString("engine_node_id");
          result.merge(nodeId, 1, Integer::sum);
        });
    return result;
  }

  public List<OfflineJobExecutionPO> findActiveExecutions(int limit) {
    return jdbc.query(
        "SELECT * FROM yak_offline_job_execution WHERE status IN "
            + "('CREATED','SUBMITTED','QUEUED','RUNNING') ORDER BY id ASC LIMIT ?",
        (resultSet, rowNum) -> mapExecution(resultSet),
        Math.max(1, limit));
  }

  public List<OfflineJobExecutionPO> findRetryCandidates(LocalDateTime now, int limit) {
    return jdbc.query(
        "SELECT * FROM yak_offline_job_execution WHERE status IN ('FAILED','LOST') "
            + "AND retry_created = 0 AND next_retry_time IS NOT NULL AND next_retry_time <= ? "
            + "ORDER BY next_retry_time ASC LIMIT ?",
        (resultSet, rowNum) -> mapExecution(resultSet),
        Timestamp.valueOf(now),
        Math.max(1, limit));
  }

  public void markRetryCreated(Long executionId) {
    jdbc.update(
        "UPDATE yak_offline_job_execution SET retry_created = 1, update_time = ? WHERE id = ?",
        Timestamp.valueOf(LocalDateTime.now()), executionId);
  }

  public void recordExecutionEvent(
      Long executionId,
      long stateVersion,
      String fromStatus,
      String toStatus,
      String eventType,
      String message,
      String payloadJson) {
    jdbc.update(
        "INSERT INTO yak_offline_execution_event "
            + "(execution_id, state_version, from_status, to_status, event_type, message, payload_json, create_time) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        executionId, stateVersion, fromStatus, toStatus, eventType, message, payloadJson,
        Timestamp.valueOf(LocalDateTime.now()));
  }

  public List<ExecutionEventRecord> listExecutionEvents(Long executionId) {
    return jdbc.query(
        "SELECT id, execution_id, state_version, from_status, to_status, event_type, message, "
            + "payload_json, create_time FROM yak_offline_execution_event "
            + "WHERE execution_id = ? ORDER BY id ASC",
        (resultSet, rowNum) -> new ExecutionEventRecord(
            resultSet.getLong("id"), resultSet.getLong("execution_id"),
            resultSet.getLong("state_version"), resultSet.getString("from_status"),
            resultSet.getString("to_status"), resultSet.getString("event_type"),
            resultSet.getString("message"), resultSet.getString("payload_json"),
            resultSet.getTimestamp("create_time").toLocalDateTime()),
        executionId);
  }

  public boolean createAlert(
      Long definitionId,
      Long executionId,
      String alertType,
      String level,
      String message,
      String payloadJson) {
    return jdbc.update(
        "INSERT IGNORE INTO yak_offline_alert_event "
            + "(job_definition_id, execution_id, alert_type, alert_level, message, payload_json, "
            + "delivery_status, create_time) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)",
        definitionId, executionId, alertType, level, message, payloadJson,
        Timestamp.valueOf(LocalDateTime.now())) > 0;
  }

  public List<Map<String, Object>> listAlerts(Long definitionId) {
    if (definitionId == null) {
      return Collections.emptyList();
    }
    return jdbc.queryForList(
        "SELECT id, job_definition_id, execution_id, alert_type, alert_level, message, "
            + "delivery_status, create_time FROM yak_offline_alert_event "
            + "WHERE job_definition_id = ? ORDER BY id DESC LIMIT 100",
        definitionId);
  }

  private OfflineJobExecutionPO mapExecution(java.sql.ResultSet resultSet)
      throws java.sql.SQLException {
    OfflineJobExecutionPO execution = new OfflineJobExecutionPO();
    execution.setId(resultSet.getLong("id"));
    execution.setJobDefinitionId(resultSet.getLong("job_definition_id"));
    execution.setDefinitionVersionId(nullableLong(resultSet, "definition_version_id"));
    execution.setDefinitionVersion(resultSet.getInt("definition_version"));
    execution.setEngineNodeId(resultSet.getString("engine_node_id"));
    execution.setEngineNodeBaseUrl(resultSet.getString("engine_node_base_url"));
    execution.setEngineJobId(resultSet.getString("engine_job_id"));
    execution.setExternalExecutionId(resultSet.getString("external_execution_id"));
    execution.setIdempotencyKey(resultSet.getString("idempotency_key"));
    execution.setWorkerInstanceId(resultSet.getString("worker_instance_id"));
    execution.setAssignmentMode(resultSet.getString("assignment_mode"));
    execution.setAssignmentScore(nullableDouble(resultSet, "assignment_score"));
    execution.setAssignmentReason(resultSet.getString("assignment_reason"));
    execution.setAssignmentCandidatesJson(resultSet.getString("assignment_candidates_json"));
    execution.setRequiredCapabilitiesJson(resultSet.getString("required_capabilities_json"));
    execution.setAssignedCapabilitiesJson(resultSet.getString("assigned_capabilities_json"));
    execution.setStatus(resultSet.getString("status"));
    execution.setStateVersion(resultSet.getLong("state_version"));
    execution.setAttemptNo(resultSet.getInt("attempt_no"));
    execution.setTriggerType(resultSet.getString("trigger_type"));
    execution.setRetryFromExecutionId(nullableLong(resultSet, "retry_from_execution_id"));
    execution.setCancellationRequested(resultSet.getBoolean("cancellation_requested"));
    execution.setRetryCreated(resultSet.getBoolean("retry_created"));
    execution.setNextRetryTime(localDateTime(resultSet.getTimestamp("next_retry_time")));
    execution.setConfigDigest(resultSet.getString("config_digest"));
    execution.setSubmittedConfig(resultSet.getString("submitted_config"));
    execution.setEngineSnapshotJson(resultSet.getString("engine_snapshot_json"));
    execution.setErrorMessage(resultSet.getString("error_message"));
    execution.setSourceRecordCount(resultSet.getLong("source_record_count"));
    execution.setSinkSuccessRecordCount(resultSet.getLong("sink_success_record_count"));
    execution.setSourceReadBytes(resultSet.getLong("source_read_bytes"));
    execution.setSinkWrittenBytes(resultSet.getLong("sink_written_bytes"));
    execution.setQps(resultSet.getDouble("qps"));
    execution.setDurationMillis(resultSet.getLong("duration_millis"));
    execution.setCreateTime(localDateTime(resultSet.getTimestamp("create_time")));
    execution.setStartTime(localDateTime(resultSet.getTimestamp("start_time")));
    execution.setEndTime(localDateTime(resultSet.getTimestamp("end_time")));
    execution.setLastSyncTime(localDateTime(resultSet.getTimestamp("last_sync_time")));
    execution.setUpdateTime(localDateTime(resultSet.getTimestamp("update_time")));
    return execution;
  }

  private Long nullableLong(java.sql.ResultSet resultSet, String column)
      throws java.sql.SQLException {
    long value = resultSet.getLong(column);
    return resultSet.wasNull() ? null : value;
  }

  private Double nullableDouble(java.sql.ResultSet resultSet, String column)
      throws java.sql.SQLException {
    double value = resultSet.getDouble(column);
    return resultSet.wasNull() ? null : value;
  }

  private LocalDateTime localDateTime(Timestamp value) {
    return value == null ? null : value.toLocalDateTime();
  }

  public static final class ExecutionEventRecord {
    private final Long id;
    private final Long executionId;
    private final long stateVersion;
    private final String fromStatus;
    private final String toStatus;
    private final String eventType;
    private final String message;
    private final String payloadJson;
    private final LocalDateTime createTime;

    public ExecutionEventRecord(Long id, Long executionId, long stateVersion, String fromStatus,
        String toStatus, String eventType, String message, String payloadJson,
        LocalDateTime createTime) {
      this.id = id;
      this.executionId = executionId;
      this.stateVersion = stateVersion;
      this.fromStatus = fromStatus;
      this.toStatus = toStatus;
      this.eventType = eventType;
      this.message = message;
      this.payloadJson = payloadJson;
      this.createTime = createTime;
    }

    public Long getId() { return id; }
    public Long getExecutionId() { return executionId; }
    public long getStateVersion() { return stateVersion; }
    public String getFromStatus() { return fromStatus; }
    public String getToStatus() { return toStatus; }
    public String getEventType() { return eventType; }
    public String getMessage() { return message; }
    public String getPayloadJson() { return payloadJson; }
    public LocalDateTime getCreateTime() { return createTime; }
  }
}
