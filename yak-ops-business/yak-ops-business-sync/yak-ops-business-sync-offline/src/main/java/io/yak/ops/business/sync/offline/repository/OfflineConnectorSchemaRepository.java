package io.yak.ops.business.sync.offline.repository;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * 持久化 Link-Up Connector Schema 快照，Worker 暂时离线时仍可编辑任务。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Repository
public class OfflineConnectorSchemaRepository {

  private final JdbcTemplate jdbc;

  public OfflineConnectorSchemaRepository(
      @Qualifier("offlineSyncDataSource") DataSource dataSource) {
    this.jdbc = new JdbcTemplate(dataSource);
  }

  public void upsert(SchemaRecord record) {
    LocalDateTime now = LocalDateTime.now();
    jdbc.update(
        "INSERT INTO yak_offline_connector_schema "
            + "(connector_id, connector_role, schema_version, schema_fingerprint, "
            + "worker_node_id, worker_instance_id, schema_json, synced_at, create_time, update_time) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
            + "ON DUPLICATE KEY UPDATE schema_version = VALUES(schema_version), "
            + "schema_fingerprint = VALUES(schema_fingerprint), worker_node_id = VALUES(worker_node_id), "
            + "worker_instance_id = VALUES(worker_instance_id), schema_json = VALUES(schema_json), "
            + "synced_at = VALUES(synced_at), update_time = VALUES(update_time)",
        record.getConnectorId(), record.getRole(), record.getSchemaVersion(),
        record.getSchemaFingerprint(), record.getWorkerNodeId(), record.getWorkerInstanceId(),
        record.getSchemaJson(), timestamp(record.getSyncedAt()), Timestamp.valueOf(now),
        Timestamp.valueOf(now));
  }

  public SchemaRecord find(String connectorId, String role) {
    try {
      return jdbc.queryForObject(
          selectSql() + " WHERE connector_id = ? AND connector_role = ?",
          (resultSet, rowNum) -> map(resultSet), connectorId, role);
    } catch (EmptyResultDataAccessException exception) {
      return null;
    }
  }

  public List<SchemaRecord> list(String role) {
    if (role == null) {
      return jdbc.query(selectSql() + " ORDER BY connector_id, connector_role",
          (resultSet, rowNum) -> map(resultSet));
    }
    return jdbc.query(selectSql() + " WHERE connector_role = ? ORDER BY connector_id",
        (resultSet, rowNum) -> map(resultSet), role);
  }

  private String selectSql() {
    return "SELECT connector_id, connector_role, schema_version, schema_fingerprint, "
        + "worker_node_id, worker_instance_id, schema_json, synced_at "
        + "FROM yak_offline_connector_schema";
  }

  private SchemaRecord map(java.sql.ResultSet resultSet) throws java.sql.SQLException {
    Timestamp syncedAt = resultSet.getTimestamp("synced_at");
    return new SchemaRecord(
        resultSet.getString("connector_id"), resultSet.getString("connector_role"),
        resultSet.getString("schema_version"), resultSet.getString("schema_fingerprint"),
        resultSet.getString("worker_node_id"), resultSet.getString("worker_instance_id"),
        resultSet.getString("schema_json"), syncedAt == null ? null : syncedAt.toLocalDateTime());
  }

  private Timestamp timestamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }

  public static final class SchemaRecord {
    private final String connectorId;
    private final String role;
    private final String schemaVersion;
    private final String schemaFingerprint;
    private final String workerNodeId;
    private final String workerInstanceId;
    private final String schemaJson;
    private final LocalDateTime syncedAt;

    public SchemaRecord(String connectorId, String role, String schemaVersion,
        String schemaFingerprint, String workerNodeId, String workerInstanceId,
        String schemaJson, LocalDateTime syncedAt) {
      this.connectorId = connectorId;
      this.role = role;
      this.schemaVersion = schemaVersion;
      this.schemaFingerprint = schemaFingerprint;
      this.workerNodeId = workerNodeId;
      this.workerInstanceId = workerInstanceId;
      this.schemaJson = schemaJson;
      this.syncedAt = syncedAt;
    }

    public String getConnectorId() { return connectorId; }
    public String getRole() { return role; }
    public String getSchemaVersion() { return schemaVersion; }
    public String getSchemaFingerprint() { return schemaFingerprint; }
    public String getWorkerNodeId() { return workerNodeId; }
    public String getWorkerInstanceId() { return workerInstanceId; }
    public String getSchemaJson() { return schemaJson; }
    public LocalDateTime getSyncedAt() { return syncedAt; }
  }
}
