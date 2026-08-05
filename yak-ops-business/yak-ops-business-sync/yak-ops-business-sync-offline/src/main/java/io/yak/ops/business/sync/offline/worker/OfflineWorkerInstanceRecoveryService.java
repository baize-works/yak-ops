package io.yak.ops.business.sync.offline.worker;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.domain.OfflineExecutionStatus;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerInstanceRecoveryRepository;
import io.yak.ops.business.sync.offline.service.OfflineJobExecutionService;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Worker 进程实例变化后，将旧实例上的活动执行标记为 LOST。 */
@ConditionalOnOfflineSyncEnabled
@Service
public class OfflineWorkerInstanceRecoveryService {

  private final OfflineWorkerInstanceRecoveryRepository repository;
  private final OfflineJobExecutionDao executionDao;
  private final OfflineJobExecutionService executionService;

  public OfflineWorkerInstanceRecoveryService(
      OfflineWorkerInstanceRecoveryRepository repository,
      OfflineJobExecutionDao executionDao,
      OfflineJobExecutionService executionService) {
    this.repository = repository;
    this.executionDao = executionDao;
    this.executionService = executionService;
  }

  public int recover(String nodeId, String previousInstanceId, String currentInstanceId) {
    if (!StringUtils.hasText(nodeId)
        || !StringUtils.hasText(previousInstanceId)
        || !StringUtils.hasText(currentInstanceId)
        || previousInstanceId.equals(currentInstanceId)) {
      return 0;
    }

    int recovered = 0;
    List<Long> executionIds = repository.findActiveExecutionIds(nodeId, previousInstanceId);
    for (Long executionId : executionIds) {
      OfflineJobExecutionPO execution = executionDao.selectById(executionId);
      if (execution == null
          || !OfflineExecutionStatus.isActive(execution.getStatus())
          || !nodeId.equals(execution.getEngineNodeId())
          || !previousInstanceId.equals(execution.getWorkerInstanceId())) {
        continue;
      }
      executionService.markLost(
          execution,
          "Link-Up Worker " + nodeId + " 的进程实例已变化："
              + previousInstanceId + " -> " + currentInstanceId);
      recovered++;
    }
    return recovered;
  }
}
