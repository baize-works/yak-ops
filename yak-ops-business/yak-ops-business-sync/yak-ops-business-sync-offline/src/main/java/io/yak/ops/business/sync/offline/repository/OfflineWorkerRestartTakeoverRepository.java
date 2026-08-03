package io.yak.ops.business.sync.offline.repository;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Link-Up Worker 重启接管所需的条件租约作废和旧执行查询。
 *
 * <p>租约作废使用旧 leaseId、instanceId、baseUrl 和启动时间作为 fencing 条件，避免并发注册时
 * 较旧请求覆盖已经完成的新实例接管。
 */
@ConditionalOnOfflineSyncEnabled
@Repository
public class OfflineWorkerRestartTakeoverRepository {

  private final JdbcTemplate jdbc;

  public OfflineWorkerRestartTakeoverRepository(
      @Qualifier("offlineSyncDataSource") DataSource dataSource) {
    this.jdbc = new JdbcTemplate(dataSource);
  }

  public boolean fenceActiveLease(
      String nodeId,
      String expectedLeaseId,
      String expectedInstanceId,
      String expectedBaseUrl,
      long replacementStartedAtMillis,
      LocalDateTime now,
      String reason) {
    return jdbc.update(
        "UPDATE yak_offline_engine_node SET lease_expires_at = ?, status = 'DOWN', "
            + "last_error_message = ?, update_time = ? "
            + "WHERE node_id = ? AND registration_mode = 'DYNAMIC' "
            + "AND registration_lease_id = ? AND registration_instance_id = ? "
            + "AND base_url = ? AND lease_expires_at > ? "
            + "AND started_at_millis IS NOT NULL AND started_at_millis < ?",
        timestamp(now),
        reason,
        timestamp(now),
        nodeId,
        expectedLeaseId,
        expectedInstanceId,
        expectedBaseUrl,
        timestamp(now),
        replacementStartedAtMillis) > 0;
  }

  public List<Long> findActiveExecutionIds(String nodeId, String workerInstanceId) {
    return jdbc.queryForList(
        "SELECT id FROM yak_offline_job_execution "
            + "WHERE engine_node_id = ? AND worker_instance_id = ? "
            + "AND status IN ('CREATED','SUBMITTED','QUEUED','RUNNING') ORDER BY id ASC",
        Long.class,
        nodeId,
        workerInstanceId);
  }

  private Timestamp timestamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }
}
