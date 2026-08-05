package io.yak.ops.business.sync.offline.repository;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** 查询指定 Worker 进程仍处于活动状态的执行实例。 */
@ConditionalOnOfflineSyncEnabled
@Repository
public class OfflineWorkerInstanceRecoveryRepository {

  private final JdbcTemplate jdbc;

  public OfflineWorkerInstanceRecoveryRepository(
      @Qualifier("offlineSyncDataSource") DataSource dataSource) {
    this.jdbc = new JdbcTemplate(dataSource);
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
}
