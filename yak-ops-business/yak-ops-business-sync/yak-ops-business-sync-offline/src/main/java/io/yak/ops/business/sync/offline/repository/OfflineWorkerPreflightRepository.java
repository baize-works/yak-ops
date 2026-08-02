package io.yak.ops.business.sync.offline.repository;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import javax.sql.DataSource;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Worker 视角 Connector 可达性预检的多实例共享短缓存。 */
@ConditionalOnOfflineSyncEnabled
@Repository
public class OfflineWorkerPreflightRepository {

  private final JdbcTemplate jdbc;

  public OfflineWorkerPreflightRepository(
      @Qualifier("offlineSyncDataSource") DataSource dataSource) {
    this.jdbc = new JdbcTemplate(dataSource);
  }

  public PreflightRecord find(
      String nodeId,
      String connectorId,
      String role,
      String optionsDigest) {
    try {
      return jdbc.queryForObject(
          "SELECT node_id, connector_id, connector_role, options_digest, status, "
              + "duration_millis, error_code, error_message, checked_at, create_time, update_time "
              + "FROM yak_offline_worker_preflight WHERE node_id = ? AND connector_id = ? "
              + "AND connector_role = ? AND options_digest = ?",
          this::map,
          nodeId,
          connectorId,
          role,
          optionsDigest);
    } catch (EmptyResultDataAccessException exception) {
      return null;
    }
  }

  public void save(PreflightRecord record) {
    LocalDateTime now = LocalDateTime.now();
    LocalDateTime checkedAt = record.getCheckedAt() == null ? now : record.getCheckedAt();
    jdbc.update(
        "INSERT INTO yak_offline_worker_preflight "
            + "(node_id, connector_id, connector_role, options_digest, status, duration_millis, "
            + "error_code, error_message, checked_at, create_time, update_time) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
            + "ON DUPLICATE KEY UPDATE status = VALUES(status), "
            + "duration_millis = VALUES(duration_millis), error_code = VALUES(error_code), "
            + "error_message = VALUES(error_message), checked_at = VALUES(checked_at), "
            + "update_time = VALUES(update_time)",
        record.getNodeId(),
        record.getConnectorId(),
        record.getRole(),
        record.getOptionsDigest(),
        record.getStatus(),
        record.getDurationMillis(),
        record.getErrorCode(),
        record.getErrorMessage(),
        timestamp(checkedAt),
        timestamp(now),
        timestamp(now));
  }

  public int deleteExpired(LocalDateTime cutoff) {
    return jdbc.update(
        "DELETE FROM yak_offline_worker_preflight WHERE checked_at < ?",
        timestamp(cutoff));
  }

  private PreflightRecord map(ResultSet rs, int rowNum) throws SQLException {
    return PreflightRecord.builder()
        .nodeId(rs.getString("node_id"))
        .connectorId(rs.getString("connector_id"))
        .role(rs.getString("connector_role"))
        .optionsDigest(rs.getString("options_digest"))
        .status(rs.getString("status"))
        .durationMillis(nullableLong(rs, "duration_millis"))
        .errorCode(rs.getString("error_code"))
        .errorMessage(rs.getString("error_message"))
        .checkedAt(localDateTime(rs.getTimestamp("checked_at")))
        .createTime(localDateTime(rs.getTimestamp("create_time")))
        .updateTime(localDateTime(rs.getTimestamp("update_time")))
        .build();
  }

  private Long nullableLong(ResultSet rs, String column) throws SQLException {
    long value = rs.getLong(column);
    return rs.wasNull() ? null : value;
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
  public static class PreflightRecord {
    private String nodeId;
    private String connectorId;
    private String role;
    private String optionsDigest;
    private String status;
    private Long durationMillis;
    private String errorCode;
    private String errorMessage;
    private LocalDateTime checkedAt;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
  }
}
