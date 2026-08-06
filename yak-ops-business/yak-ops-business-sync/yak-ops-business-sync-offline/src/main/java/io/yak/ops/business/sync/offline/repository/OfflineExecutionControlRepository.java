package io.yak.ops.business.sync.offline.repository;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** 执行领取、对账、重试和状态事件持久化。 */
@ConditionalOnOfflineSyncEnabled
@Repository
public class OfflineExecutionControlRepository {
  private final JdbcTemplate jdbc;

  public OfflineExecutionControlRepository(
      @Qualifier("offlineSyncDataSource") DataSource dataSource) {
    this.jdbc = new JdbcTemplate(dataSource);
  }

  public void lockDefinition(Long id) {
    Long locked =
        jdbc.queryForObject(
            "SELECT id FROM yak_offline_job_definition WHERE id=? FOR UPDATE",
            Long.class,
            id);
    if (locked == null) {
      throw new IllegalArgumentException("离线同步任务不存在：" + id);
    }
  }

  public boolean hasActiveExecution(Long id) {
    Integer count =
        jdbc.queryForObject(
            "SELECT COUNT(1) FROM yak_offline_job_execution WHERE job_definition_id=? "
                + "AND status IN ('CREATED','SUBMITTED','QUEUED','RUNNING')",
            Integer.class,
            id);
    return count != null && count > 0;
  }

  public List<OfflineJobExecutionPO> findActiveExecutions(int limit) {
    return jdbc.query(
        "SELECT * FROM yak_offline_job_execution WHERE status IN "
            + "('CREATED','SUBMITTED','QUEUED','RUNNING') ORDER BY id LIMIT ?",
        (rs, row) -> map(rs),
        Math.max(1, limit));
  }

  public List<OfflineJobExecutionPO> findRetryCandidates(
      LocalDateTime now,
      int limit) {
    return jdbc.query(
        "SELECT * FROM yak_offline_job_execution WHERE status IN ('FAILED','LOST') "
            + "AND retry_created=0 AND next_retry_time IS NOT NULL AND next_retry_time<=? "
            + "ORDER BY next_retry_time LIMIT ?",
        (rs, row) -> map(rs),
        Timestamp.valueOf(now),
        Math.max(1, limit));
  }

  public void markRetryCreated(Long id) {
    jdbc.update(
        "UPDATE yak_offline_job_execution SET retry_created=1, update_time=? WHERE id=?",
        Timestamp.valueOf(LocalDateTime.now()),
        id);
  }

  public void recordExecutionEvent(
      Long executionId,
      long version,
      String from,
      String to,
      String type,
      String message,
      String payload) {
    jdbc.update(
        "INSERT INTO yak_offline_execution_event "
            + "(execution_id,state_version,from_status,to_status,event_type,message,payload_json,create_time) "
            + "VALUES (?,?,?,?,?,?,?,?)",
        executionId,
        version,
        from,
        to,
        type,
        message,
        payload,
        Timestamp.valueOf(LocalDateTime.now()));
  }

  public List<ExecutionEventRecord> listExecutionEvents(Long id) {
    return jdbc.query(
        "SELECT * FROM yak_offline_execution_event WHERE execution_id=? ORDER BY id",
        (rs, row) -> event(rs),
        id);
  }

  public List<ExecutionEventRecord> listExecutionEventsAfter(
      Long executionId,
      long afterId,
      int limit) {
    if (afterId < 0L) {
      throw new IllegalArgumentException("事件游标不能为负数");
    }
    if (limit < 1 || limit > 1000) {
      throw new IllegalArgumentException("日志 limit 必须在 1 到 1000 之间");
    }
    return jdbc.query(
        "SELECT * FROM yak_offline_execution_event "
            + "WHERE execution_id=? AND id>? ORDER BY id LIMIT ?",
        (rs, row) -> event(rs),
        executionId,
        afterId,
        limit);
  }

  private ExecutionEventRecord event(
      java.sql.ResultSet rs)
      throws java.sql.SQLException {
    return new ExecutionEventRecord(
        rs.getLong("id"),
        rs.getLong("execution_id"),
        rs.getLong("state_version"),
        rs.getString("from_status"),
        rs.getString("to_status"),
        rs.getString("event_type"),
        rs.getString("message"),
        rs.getString("payload_json"),
        rs.getTimestamp("create_time").toLocalDateTime());
  }

  private OfflineJobExecutionPO map(
      java.sql.ResultSet rs)
      throws java.sql.SQLException {
    OfflineJobExecutionPO execution = new OfflineJobExecutionPO();
    execution.setId(rs.getLong("id"));
    execution.setJobDefinitionId(rs.getLong("job_definition_id"));
    execution.setDefinitionVersion(rs.getInt("definition_version"));
    execution.setEngineBaseUrl(rs.getString("engine_base_url"));
    execution.setEngineJobId(rs.getString("engine_job_id"));
    execution.setExternalExecutionId(rs.getString("external_execution_id"));
    execution.setIdempotencyKey(rs.getString("idempotency_key"));
    execution.setWorkerInstanceId(rs.getString("worker_instance_id"));
    execution.setStatus(rs.getString("status"));
    execution.setStateVersion(rs.getLong("state_version"));
    execution.setAttemptNo(rs.getInt("attempt_no"));
    execution.setTriggerType(rs.getString("trigger_type"));
    execution.setRetryFromExecutionId(nullableLong(rs, "retry_from_execution_id"));
    execution.setCancellationRequested(rs.getBoolean("cancellation_requested"));
    execution.setRetryCreated(rs.getBoolean("retry_created"));
    execution.setNextRetryTime(local(rs.getTimestamp("next_retry_time")));
    execution.setConfigDigest(rs.getString("config_digest"));
    execution.setDefinitionSnapshotJson(rs.getString("definition_snapshot_json"));
    execution.setSubmittedConfig(rs.getString("submitted_config"));
    execution.setEngineSnapshotJson(rs.getString("engine_snapshot_json"));
    execution.setErrorMessage(rs.getString("error_message"));
    execution.setSourceRecordCount(rs.getLong("source_record_count"));
    execution.setSinkSuccessRecordCount(rs.getLong("sink_success_record_count"));
    execution.setSourceReadBytes(rs.getLong("source_read_bytes"));
    execution.setSinkWrittenBytes(rs.getLong("sink_written_bytes"));
    execution.setQps(rs.getDouble("qps"));
    execution.setDurationMillis(rs.getLong("duration_millis"));
    execution.setCreateTime(local(rs.getTimestamp("create_time")));
    execution.setStartTime(local(rs.getTimestamp("start_time")));
    execution.setEndTime(local(rs.getTimestamp("end_time")));
    execution.setLastSyncTime(local(rs.getTimestamp("last_sync_time")));
    execution.setUpdateTime(local(rs.getTimestamp("update_time")));
    return execution;
  }

  private Long nullableLong(
      java.sql.ResultSet rs,
      String column)
      throws java.sql.SQLException {
    long value = rs.getLong(column);
    return rs.wasNull() ? null : value;
  }

  private LocalDateTime local(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toLocalDateTime();
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

    public ExecutionEventRecord(
        Long id,
        Long executionId,
        long stateVersion,
        String fromStatus,
        String toStatus,
        String eventType,
        String message,
        String payloadJson,
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

    public Long getId() {
      return id;
    }

    public Long getExecutionId() {
      return executionId;
    }

    public long getStateVersion() {
      return stateVersion;
    }

    public String getFromStatus() {
      return fromStatus;
    }

    public String getToStatus() {
      return toStatus;
    }

    public String getEventType() {
      return eventType;
    }

    public String getMessage() {
      return message;
    }

    public String getPayloadJson() {
      return payloadJson;
    }

    public LocalDateTime getCreateTime() {
      return createTime;
    }
  }
}
