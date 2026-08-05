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
  public OfflineExecutionControlRepository(@Qualifier("offlineSyncDataSource") DataSource dataSource) {
    this.jdbc = new JdbcTemplate(dataSource);
  }
  public void lockDefinition(Long id) {
    Long locked = jdbc.queryForObject("SELECT id FROM yak_offline_job_definition WHERE id=? FOR UPDATE", Long.class, id);
    if (locked == null) throw new IllegalArgumentException("离线同步任务不存在：" + id);
  }
  public boolean hasActiveExecution(Long id) {
    Integer count = jdbc.queryForObject("SELECT COUNT(1) FROM yak_offline_job_execution WHERE job_definition_id=? "
        + "AND status IN ('CREATED','SUBMITTED','QUEUED','RUNNING')", Integer.class, id);
    return count != null && count > 0;
  }
  public List<OfflineJobExecutionPO> findActiveExecutions(int limit) {
    return jdbc.query("SELECT * FROM yak_offline_job_execution WHERE status IN "
        + "('CREATED','SUBMITTED','QUEUED','RUNNING') ORDER BY id LIMIT ?",
        (rs,row)->map(rs), Math.max(1, limit));
  }
  public List<OfflineJobExecutionPO> findRetryCandidates(LocalDateTime now, int limit) {
    return jdbc.query("SELECT * FROM yak_offline_job_execution WHERE status IN ('FAILED','LOST') "
        + "AND retry_created=0 AND next_retry_time IS NOT NULL AND next_retry_time<=? "
        + "ORDER BY next_retry_time LIMIT ?", (rs,row)->map(rs), Timestamp.valueOf(now), Math.max(1,limit));
  }
  public void markRetryCreated(Long id) {
    jdbc.update("UPDATE yak_offline_job_execution SET retry_created=1, update_time=? WHERE id=?",
        Timestamp.valueOf(LocalDateTime.now()), id);
  }
  public void recordExecutionEvent(Long executionId, long version, String from, String to,
      String type, String message, String payload) {
    jdbc.update("INSERT INTO yak_offline_execution_event "
        + "(execution_id,state_version,from_status,to_status,event_type,message,payload_json,create_time) "
        + "VALUES (?,?,?,?,?,?,?,?)", executionId, version, from, to, type, message, payload,
        Timestamp.valueOf(LocalDateTime.now()));
  }
  public List<ExecutionEventRecord> listExecutionEvents(Long id) {
    return jdbc.query("SELECT * FROM yak_offline_execution_event WHERE execution_id=? ORDER BY id",
        (rs,row)->new ExecutionEventRecord(rs.getLong("id"), rs.getLong("execution_id"),
            rs.getLong("state_version"), rs.getString("from_status"), rs.getString("to_status"),
            rs.getString("event_type"), rs.getString("message"), rs.getString("payload_json"),
            rs.getTimestamp("create_time").toLocalDateTime()), id);
  }
  private OfflineJobExecutionPO map(java.sql.ResultSet rs) throws java.sql.SQLException {
    OfflineJobExecutionPO e=new OfflineJobExecutionPO();
    e.setId(rs.getLong("id")); e.setJobDefinitionId(rs.getLong("job_definition_id"));
    e.setDefinitionVersion(rs.getInt("definition_version")); e.setEngineBaseUrl(rs.getString("engine_base_url"));
    e.setEngineJobId(rs.getString("engine_job_id")); e.setExternalExecutionId(rs.getString("external_execution_id"));
    e.setIdempotencyKey(rs.getString("idempotency_key")); e.setWorkerInstanceId(rs.getString("worker_instance_id"));
    e.setStatus(rs.getString("status")); e.setStateVersion(rs.getLong("state_version")); e.setAttemptNo(rs.getInt("attempt_no"));
    e.setTriggerType(rs.getString("trigger_type")); e.setRetryFromExecutionId(nullableLong(rs,"retry_from_execution_id"));
    e.setCancellationRequested(rs.getBoolean("cancellation_requested")); e.setRetryCreated(rs.getBoolean("retry_created"));
    e.setNextRetryTime(local(rs.getTimestamp("next_retry_time"))); e.setConfigDigest(rs.getString("config_digest"));
    e.setDefinitionSnapshotJson(rs.getString("definition_snapshot_json")); e.setSubmittedConfig(rs.getString("submitted_config"));
    e.setEngineSnapshotJson(rs.getString("engine_snapshot_json")); e.setErrorMessage(rs.getString("error_message"));
    e.setSourceRecordCount(rs.getLong("source_record_count")); e.setSinkSuccessRecordCount(rs.getLong("sink_success_record_count"));
    e.setSourceReadBytes(rs.getLong("source_read_bytes")); e.setSinkWrittenBytes(rs.getLong("sink_written_bytes"));
    e.setQps(rs.getDouble("qps")); e.setDurationMillis(rs.getLong("duration_millis"));
    e.setCreateTime(local(rs.getTimestamp("create_time"))); e.setStartTime(local(rs.getTimestamp("start_time")));
    e.setEndTime(local(rs.getTimestamp("end_time"))); e.setLastSyncTime(local(rs.getTimestamp("last_sync_time")));
    e.setUpdateTime(local(rs.getTimestamp("update_time"))); return e;
  }
  private Long nullableLong(java.sql.ResultSet rs,String col)throws java.sql.SQLException{long v=rs.getLong(col);return rs.wasNull()?null:v;}
  private LocalDateTime local(Timestamp t){return t==null?null:t.toLocalDateTime();}
  public static final class ExecutionEventRecord {
    private final Long id,executionId; private final long stateVersion; private final String fromStatus,toStatus,eventType,message,payloadJson;
    private final LocalDateTime createTime;
    public ExecutionEventRecord(Long id,Long executionId,long stateVersion,String from,String to,String type,String message,String payload,LocalDateTime time){
      this.id=id;this.executionId=executionId;this.stateVersion=stateVersion;this.fromStatus=from;this.toStatus=to;this.eventType=type;this.message=message;this.payloadJson=payload;this.createTime=time;}
    public Long getId(){return id;} public Long getExecutionId(){return executionId;} public long getStateVersion(){return stateVersion;}
    public String getFromStatus(){return fromStatus;} public String getToStatus(){return toStatus;} public String getEventType(){return eventType;}
    public String getMessage(){return message;} public String getPayloadJson(){return payloadJson;} public LocalDateTime getCreateTime(){return createTime;}
  }
}
