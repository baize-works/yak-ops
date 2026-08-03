package io.yak.ops.business.sync.offline.repository;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** 动态 Worker 注册 nonce、租约过期和事件审计仓储。 */
@ConditionalOnOfflineSyncEnabled
@Repository
public class OfflineWorkerRegistrationRepository {

  private final JdbcTemplate jdbc;

  public OfflineWorkerRegistrationRepository(
      @Qualifier("offlineSyncDataSource") DataSource dataSource) {
    this.jdbc = new JdbcTemplate(dataSource);
  }

  /** nonce 在有效期内只能成功写入一次。 */
  public boolean consumeNonce(String nonceHash, LocalDateTime expiresAt) {
    try {
      jdbc.update(
          "INSERT INTO yak_offline_worker_registration_nonce "
              + "(nonce_hash, expires_at, create_time) VALUES (?, ?, ?)",
          nonceHash,
          timestamp(expiresAt),
          timestamp(LocalDateTime.now()));
      return true;
    } catch (DuplicateKeyException exception) {
      return false;
    }
  }

  public int cleanupNonces(LocalDateTime now) {
    return jdbc.update(
        "DELETE FROM yak_offline_worker_registration_nonce WHERE expires_at < ?",
        timestamp(now));
  }

  public int expireLeases(LocalDateTime now) {
    return jdbc.update(
        "UPDATE yak_offline_engine_node SET status = 'DOWN', "
            + "last_error_message = '动态注册租约已过期', update_time = ? "
            + "WHERE registration_mode = 'DYNAMIC' AND lease_expires_at < ? AND status <> 'DOWN'",
        timestamp(now),
        timestamp(now));
  }

  public boolean revokeLease(String nodeId, LocalDateTime now, String reason) {
    return jdbc.update(
        "UPDATE yak_offline_engine_node SET lease_expires_at = ?, status = 'DOWN', "
            + "last_error_message = ?, update_time = ? "
            + "WHERE node_id = ? AND registration_mode = 'DYNAMIC'",
        timestamp(now),
        reason,
        timestamp(now),
        nodeId) > 0;
  }

  public void recordEvent(
      String nodeId,
      String instanceId,
      String leaseId,
      String eventType,
      String remoteAddress,
      String message) {
    jdbc.update(
        "INSERT INTO yak_offline_worker_registration_event "
            + "(node_id, instance_id, lease_id, event_type, remote_address, message, event_time) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?)",
        nodeId,
        instanceId,
        leaseId,
        eventType,
        remoteAddress,
        concise(message),
        timestamp(LocalDateTime.now()));
  }

  private String concise(String value) {
    if (value == null) {
      return null;
    }
    return value.length() <= 1000 ? value : value.substring(0, 1000);
  }

  private Timestamp timestamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }
}
