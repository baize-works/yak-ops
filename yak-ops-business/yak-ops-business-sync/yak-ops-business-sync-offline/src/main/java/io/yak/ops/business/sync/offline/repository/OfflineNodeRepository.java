package io.yak.ops.business.sync.offline.repository;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** 持久化单 Link-Up Worker 的身份和心跳。 */
@ConditionalOnOfflineSyncEnabled
@Repository
public class OfflineNodeRepository {

  private final JdbcTemplate jdbc;

  public OfflineNodeRepository(@Qualifier("offlineSyncDataSource") DataSource dataSource) {
    this.jdbc = new JdbcTemplate(dataSource);
  }

  public void upsert(NodeRecord node) {
    jdbc.update(
        "INSERT INTO yak_offline_engine_node "
            + "(node_id, node_name, base_url, worker_instance_id, engine_version, status, "
            + "max_concurrent_jobs, max_queued_jobs, running_jobs, queued_jobs, last_heartbeat_time, "
            + "last_error_message, create_time, update_time) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
            + "ON DUPLICATE KEY UPDATE node_name = VALUES(node_name), base_url = VALUES(base_url), "
            + "worker_instance_id = VALUES(worker_instance_id), engine_version = VALUES(engine_version), "
            + "status = VALUES(status), max_concurrent_jobs = VALUES(max_concurrent_jobs), "
            + "max_queued_jobs = VALUES(max_queued_jobs), running_jobs = VALUES(running_jobs), "
            + "queued_jobs = VALUES(queued_jobs), last_heartbeat_time = VALUES(last_heartbeat_time), "
            + "last_error_message = VALUES(last_error_message), update_time = VALUES(update_time)",
        node.getNodeId(), node.getNodeName(), node.getBaseUrl(), node.getWorkerInstanceId(),
        node.getEngineVersion(), node.getStatus(), node.getMaxConcurrentJobs(),
        node.getMaxQueuedJobs(), node.getRunningJobs(), node.getQueuedJobs(),
        timestamp(node.getLastHeartbeatTime()), node.getLastErrorMessage(),
        Timestamp.valueOf(LocalDateTime.now()), Timestamp.valueOf(LocalDateTime.now()));
  }

  public NodeRecord find(String nodeId) {
    try {
      return jdbc.queryForObject(
          "SELECT node_id, node_name, base_url, worker_instance_id, engine_version, status, "
              + "max_concurrent_jobs, max_queued_jobs, running_jobs, queued_jobs, "
              + "last_heartbeat_time, last_error_message FROM yak_offline_engine_node WHERE node_id = ?",
          (resultSet, rowNum) -> new NodeRecord(
              resultSet.getString("node_id"), resultSet.getString("node_name"),
              resultSet.getString("base_url"), resultSet.getString("worker_instance_id"),
              resultSet.getString("engine_version"), resultSet.getString("status"),
              resultSet.getInt("max_concurrent_jobs"), resultSet.getInt("max_queued_jobs"),
              resultSet.getInt("running_jobs"), resultSet.getInt("queued_jobs"),
              localDateTime(resultSet.getTimestamp("last_heartbeat_time")),
              resultSet.getString("last_error_message")),
          nodeId);
    } catch (EmptyResultDataAccessException exception) {
      return null;
    }
  }

  private Timestamp timestamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }

  private LocalDateTime localDateTime(Timestamp value) {
    return value == null ? null : value.toLocalDateTime();
  }

  public static final class NodeRecord {
    private final String nodeId;
    private final String nodeName;
    private final String baseUrl;
    private final String workerInstanceId;
    private final String engineVersion;
    private final String status;
    private final int maxConcurrentJobs;
    private final int maxQueuedJobs;
    private final int runningJobs;
    private final int queuedJobs;
    private final LocalDateTime lastHeartbeatTime;
    private final String lastErrorMessage;

    public NodeRecord(String nodeId, String nodeName, String baseUrl, String workerInstanceId,
        String engineVersion, String status, int maxConcurrentJobs, int maxQueuedJobs,
        int runningJobs, int queuedJobs, LocalDateTime lastHeartbeatTime, String lastErrorMessage) {
      this.nodeId = nodeId;
      this.nodeName = nodeName;
      this.baseUrl = baseUrl;
      this.workerInstanceId = workerInstanceId;
      this.engineVersion = engineVersion;
      this.status = status;
      this.maxConcurrentJobs = maxConcurrentJobs;
      this.maxQueuedJobs = maxQueuedJobs;
      this.runningJobs = runningJobs;
      this.queuedJobs = queuedJobs;
      this.lastHeartbeatTime = lastHeartbeatTime;
      this.lastErrorMessage = lastErrorMessage;
    }

    public String getNodeId() { return nodeId; }
    public String getNodeName() { return nodeName; }
    public String getBaseUrl() { return baseUrl; }
    public String getWorkerInstanceId() { return workerInstanceId; }
    public String getEngineVersion() { return engineVersion; }
    public String getStatus() { return status; }
    public int getMaxConcurrentJobs() { return maxConcurrentJobs; }
    public int getMaxQueuedJobs() { return maxQueuedJobs; }
    public int getRunningJobs() { return runningJobs; }
    public int getQueuedJobs() { return queuedJobs; }
    public LocalDateTime getLastHeartbeatTime() { return lastHeartbeatTime; }
    public String getLastErrorMessage() { return lastErrorMessage; }
  }
}
