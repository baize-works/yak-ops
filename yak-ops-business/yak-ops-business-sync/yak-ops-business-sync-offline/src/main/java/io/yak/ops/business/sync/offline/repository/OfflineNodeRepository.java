package io.yak.ops.business.sync.offline.repository;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import javax.sql.DataSource;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/**
 * Link-Up Worker 注册信息、调度状态、心跳和能力快照持久化。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Repository
public class OfflineNodeRepository {

  private static final String SELECT_COLUMNS =
      "node_id, node_name, base_url, registration_mode, enabled, scheduling_status, "
          + "weight, labels_json, worker_instance_id, engine_version, started_at_millis, "
          + "offline_only, status, max_concurrent_jobs, max_queued_jobs, running_jobs, "
          + "queued_jobs, last_heartbeat_time, last_success_time, consecutive_failures, "
          + "last_error_message, capability_status, capability_digest, connector_schemas_json, "
          + "capability_synced_at, capability_error_message, create_time, update_time";

  private final JdbcTemplate jdbc;
  private final RowMapper<NodeRecord> rowMapper = this::map;

  public OfflineNodeRepository(@Qualifier("offlineSyncDataSource") DataSource dataSource) {
    this.jdbc = new JdbcTemplate(dataSource);
  }

  /** 创建或覆盖配置来源的默认 Worker；已有能力快照不会被心跳登记覆盖。 */
  public void upsert(NodeRecord node) {
    LocalDateTime now = LocalDateTime.now();
    jdbc.update(
        "INSERT INTO yak_offline_engine_node ("
            + "node_id, node_name, base_url, registration_mode, enabled, scheduling_status, "
            + "weight, labels_json, worker_instance_id, engine_version, started_at_millis, "
            + "offline_only, status, max_concurrent_jobs, max_queued_jobs, running_jobs, "
            + "queued_jobs, last_heartbeat_time, last_success_time, consecutive_failures, "
            + "last_error_message, capability_status, capability_digest, connector_schemas_json, "
            + "capability_synced_at, capability_error_message, create_time, update_time) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
            + "ON DUPLICATE KEY UPDATE "
            + "node_name = VALUES(node_name), base_url = VALUES(base_url), "
            + "registration_mode = VALUES(registration_mode), enabled = VALUES(enabled), "
            + "scheduling_status = VALUES(scheduling_status), weight = VALUES(weight), "
            + "labels_json = VALUES(labels_json), worker_instance_id = VALUES(worker_instance_id), "
            + "engine_version = VALUES(engine_version), started_at_millis = VALUES(started_at_millis), "
            + "offline_only = VALUES(offline_only), status = VALUES(status), "
            + "max_concurrent_jobs = VALUES(max_concurrent_jobs), "
            + "max_queued_jobs = VALUES(max_queued_jobs), running_jobs = VALUES(running_jobs), "
            + "queued_jobs = VALUES(queued_jobs), last_heartbeat_time = VALUES(last_heartbeat_time), "
            + "last_success_time = VALUES(last_success_time), "
            + "consecutive_failures = VALUES(consecutive_failures), "
            + "last_error_message = VALUES(last_error_message), update_time = VALUES(update_time)",
        node.getNodeId(), node.getNodeName(), node.getBaseUrl(), node.getRegistrationMode(),
        bool(node.getEnabled()), node.getSchedulingStatus(), node.getWeight(), node.getLabelsJson(),
        node.getWorkerInstanceId(), node.getEngineVersion(), node.getStartedAtMillis(),
        bool(node.getOfflineOnly()), node.getStatus(), node.getMaxConcurrentJobs(),
        node.getMaxQueuedJobs(), node.getRunningJobs(), node.getQueuedJobs(),
        timestamp(node.getLastHeartbeatTime()), timestamp(node.getLastSuccessTime()),
        node.getConsecutiveFailures(), node.getLastErrorMessage(),
        text(node.getCapabilityStatus(), "UNKNOWN"), node.getCapabilityDigest(),
        node.getConnectorSchemasJson(), timestamp(node.getCapabilitySyncedAt()),
        node.getCapabilityErrorMessage(), timestamp(now), timestamp(now));
  }

  /** 更新用户可编辑的 Worker 定义，并同步本次验证得到的运行信息。 */
  public boolean update(NodeRecord node) {
    int updated = jdbc.update(
        "UPDATE yak_offline_engine_node SET node_name = ?, base_url = ?, enabled = ?, "
            + "scheduling_status = ?, weight = ?, labels_json = ?, worker_instance_id = ?, "
            + "engine_version = ?, started_at_millis = ?, offline_only = ?, status = ?, "
            + "max_concurrent_jobs = ?, max_queued_jobs = ?, running_jobs = ?, queued_jobs = ?, "
            + "last_heartbeat_time = ?, last_success_time = ?, consecutive_failures = ?, "
            + "last_error_message = ?, update_time = ? WHERE node_id = ?",
        node.getNodeName(), node.getBaseUrl(), bool(node.getEnabled()),
        node.getSchedulingStatus(), node.getWeight(), node.getLabelsJson(),
        node.getWorkerInstanceId(), node.getEngineVersion(), node.getStartedAtMillis(),
        bool(node.getOfflineOnly()), node.getStatus(), node.getMaxConcurrentJobs(),
        node.getMaxQueuedJobs(), node.getRunningJobs(), node.getQueuedJobs(),
        timestamp(node.getLastHeartbeatTime()), timestamp(node.getLastSuccessTime()),
        node.getConsecutiveFailures(), node.getLastErrorMessage(),
        timestamp(LocalDateTime.now()), node.getNodeId());
    return updated > 0;
  }

  public void updateHeartbeatSuccess(NodeRecord node) {
    LocalDateTime now = node.getLastHeartbeatTime() == null
        ? LocalDateTime.now() : node.getLastHeartbeatTime();
    jdbc.update(
        "UPDATE yak_offline_engine_node SET node_name = ?, worker_instance_id = ?, "
            + "engine_version = ?, started_at_millis = ?, offline_only = ?, status = 'UP', "
            + "max_concurrent_jobs = ?, max_queued_jobs = ?, running_jobs = ?, queued_jobs = ?, "
            + "last_heartbeat_time = ?, last_success_time = ?, consecutive_failures = 0, "
            + "last_error_message = NULL, update_time = ? WHERE node_id = ?",
        node.getNodeName(), node.getWorkerInstanceId(), node.getEngineVersion(),
        node.getStartedAtMillis(), bool(node.getOfflineOnly()), node.getMaxConcurrentJobs(),
        node.getMaxQueuedJobs(), node.getRunningJobs(), node.getQueuedJobs(), timestamp(now),
        timestamp(now), timestamp(LocalDateTime.now()), node.getNodeId());
  }

  public void updateHeartbeatFailure(String nodeId, String message) {
    jdbc.update(
        "UPDATE yak_offline_engine_node SET status = 'DOWN', last_heartbeat_time = ?, "
            + "consecutive_failures = consecutive_failures + 1, last_error_message = ?, "
            + "update_time = ? WHERE node_id = ?",
        timestamp(LocalDateTime.now()), message, timestamp(LocalDateTime.now()), nodeId);
  }

  public void updateCapabilitySuccess(
      String nodeId,
      String digest,
      String connectorSchemasJson,
      LocalDateTime syncedAt) {
    LocalDateTime now = syncedAt == null ? LocalDateTime.now() : syncedAt;
    jdbc.update(
        "UPDATE yak_offline_engine_node SET capability_status = 'READY', capability_digest = ?, "
            + "connector_schemas_json = ?, capability_synced_at = ?, "
            + "capability_error_message = NULL, update_time = ? WHERE node_id = ?",
        digest, connectorSchemasJson, timestamp(now), timestamp(LocalDateTime.now()), nodeId);
  }

  /** 保留最后一次成功快照，只更新错误状态，便于诊断和短时容错。 */
  public void updateCapabilityFailure(String nodeId, String message) {
    jdbc.update(
        "UPDATE yak_offline_engine_node SET capability_status = 'ERROR', "
            + "capability_error_message = ?, update_time = ? WHERE node_id = ?",
        message, timestamp(LocalDateTime.now()), nodeId);
  }

  public void resetCapabilities(String nodeId) {
    jdbc.update(
        "UPDATE yak_offline_engine_node SET capability_status = 'UNKNOWN', "
            + "capability_digest = NULL, connector_schemas_json = NULL, "
            + "capability_synced_at = NULL, capability_error_message = NULL, update_time = ? "
            + "WHERE node_id = ?",
        timestamp(LocalDateTime.now()), nodeId);
  }

  public boolean updateSchedulingStatus(String nodeId, String status, boolean enabled) {
    return jdbc.update(
        "UPDATE yak_offline_engine_node SET scheduling_status = ?, enabled = ?, update_time = ? "
            + "WHERE node_id = ?",
        status, bool(enabled), timestamp(LocalDateTime.now()), nodeId) > 0;
  }

  public NodeRecord find(String nodeId) {
    try {
      return jdbc.queryForObject(
          "SELECT " + SELECT_COLUMNS + " FROM yak_offline_engine_node WHERE node_id = ?",
          rowMapper,
          nodeId);
    } catch (EmptyResultDataAccessException exception) {
      return null;
    }
  }

  public NodeRecord findByBaseUrl(String baseUrl) {
    try {
      return jdbc.queryForObject(
          "SELECT " + SELECT_COLUMNS + " FROM yak_offline_engine_node WHERE base_url = ? LIMIT 1",
          rowMapper,
          baseUrl);
    } catch (EmptyResultDataAccessException exception) {
      return null;
    }
  }

  public List<NodeRecord> listAll() {
    return jdbc.query(
        "SELECT " + SELECT_COLUMNS + " FROM yak_offline_engine_node "
            + "ORDER BY update_time DESC, node_name ASC",
        rowMapper);
  }

  /** 调度事务内按稳定顺序锁定全部 Worker 行。 */
  public List<NodeRecord> listAllForScheduling() {
    return jdbc.query(
        "SELECT " + SELECT_COLUMNS + " FROM yak_offline_engine_node "
            + "ORDER BY node_id ASC FOR UPDATE",
        rowMapper);
  }

  public List<NodeRecord> listHeartbeatTargets() {
    return jdbc.query(
        "SELECT " + SELECT_COLUMNS + " FROM yak_offline_engine_node "
            + "WHERE enabled = 1 AND scheduling_status <> 'DISABLED' "
            + "ORDER BY node_id ASC",
        rowMapper);
  }

  public List<NodeRecord> listCapabilityRefreshTargets() {
    return jdbc.query(
        "SELECT " + SELECT_COLUMNS + " FROM yak_offline_engine_node "
            + "WHERE enabled = 1 AND status = 'UP' AND scheduling_status <> 'DISABLED' "
            + "ORDER BY node_id ASC",
        rowMapper);
  }

  public boolean delete(String nodeId) {
    return jdbc.update("DELETE FROM yak_offline_engine_node WHERE node_id = ?", nodeId) > 0;
  }

  private NodeRecord map(ResultSet rs, int rowNum) throws SQLException {
    return NodeRecord.builder()
        .nodeId(rs.getString("node_id"))
        .nodeName(rs.getString("node_name"))
        .baseUrl(rs.getString("base_url"))
        .registrationMode(rs.getString("registration_mode"))
        .enabled(rs.getBoolean("enabled"))
        .schedulingStatus(rs.getString("scheduling_status"))
        .weight(rs.getInt("weight"))
        .labelsJson(rs.getString("labels_json"))
        .workerInstanceId(rs.getString("worker_instance_id"))
        .engineVersion(rs.getString("engine_version"))
        .startedAtMillis((Long) rs.getObject("started_at_millis"))
        .offlineOnly(rs.getBoolean("offline_only"))
        .status(rs.getString("status"))
        .maxConcurrentJobs(rs.getInt("max_concurrent_jobs"))
        .maxQueuedJobs(rs.getInt("max_queued_jobs"))
        .runningJobs(rs.getInt("running_jobs"))
        .queuedJobs(rs.getInt("queued_jobs"))
        .lastHeartbeatTime(localDateTime(rs.getTimestamp("last_heartbeat_time")))
        .lastSuccessTime(localDateTime(rs.getTimestamp("last_success_time")))
        .consecutiveFailures(rs.getInt("consecutive_failures"))
        .lastErrorMessage(rs.getString("last_error_message"))
        .capabilityStatus(rs.getString("capability_status"))
        .capabilityDigest(rs.getString("capability_digest"))
        .connectorSchemasJson(rs.getString("connector_schemas_json"))
        .capabilitySyncedAt(localDateTime(rs.getTimestamp("capability_synced_at")))
        .capabilityErrorMessage(rs.getString("capability_error_message"))
        .createTime(localDateTime(rs.getTimestamp("create_time")))
        .updateTime(localDateTime(rs.getTimestamp("update_time")))
        .build();
  }

  private String text(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value;
  }

  private int bool(Boolean value) {
    return Boolean.TRUE.equals(value) ? 1 : 0;
  }

  private Timestamp timestamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }

  private LocalDateTime localDateTime(Timestamp value) {
    return value == null ? null : value.toLocalDateTime();
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class NodeRecord {

    private String nodeId;
    private String nodeName;
    private String baseUrl;
    private String registrationMode;
    private Boolean enabled;
    private String schedulingStatus;
    private Integer weight;
    private String labelsJson;
    private String workerInstanceId;
    private String engineVersion;
    private Long startedAtMillis;
    private Boolean offlineOnly;
    private String status;
    private Integer maxConcurrentJobs;
    private Integer maxQueuedJobs;
    private Integer runningJobs;
    private Integer queuedJobs;
    private LocalDateTime lastHeartbeatTime;
    private LocalDateTime lastSuccessTime;
    private Integer consecutiveFailures;
    private String lastErrorMessage;
    private String capabilityStatus;
    private String capabilityDigest;
    private String connectorSchemasJson;
    private LocalDateTime capabilitySyncedAt;
    private String capabilityErrorMessage;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
  }
}
