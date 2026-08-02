package io.yak.ops.business.sync.offline.service;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerCapabilityService;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerReachabilityService;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionVO;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

/**
 * 执行命令主实现：在原子领取事务之前预热 Worker Connector 能力和数据源可达性。
 *
 * @author weifuwan
 */
@Primary
@ConditionalOnOfflineSyncEnabled
@Service
public class ReachabilityAwareOfflineJobExecutionService extends OfflineJobExecutionService {

  private final OfflineExecutionReadService readService;
  private final OfflineWorkerReachabilityService reachabilityService;

  public ReachabilityAwareOfflineJobExecutionService(
      OfflineExecutionOrchestrator orchestrator,
      OfflineExecutionReadService readService,
      OfflineJobDefinitionService definitionService,
      OfflineWorkerCapabilityService capabilityService,
      OfflineWorkerReachabilityService reachabilityService) {
    super(orchestrator, readService, definitionService, capabilityService);
    this.readService = readService;
    this.reachabilityService = reachabilityService;
  }

  @Override
  public OfflineJobExecutionVO execute(Long definitionId) {
    reachabilityService.preheat(definitionId);
    return super.execute(definitionId);
  }

  @Override
  public OfflineJobExecutionVO executeScheduled(Long definitionId) {
    reachabilityService.preheat(definitionId);
    return super.executeScheduled(definitionId);
  }

  @Override
  public OfflineJobExecutionVO retry(Long executionId) {
    OfflineJobExecutionPO previous = readService.require(executionId);
    reachabilityService.preheat(previous.getJobDefinitionId());
    return super.retry(executionId);
  }

  @Override
  public OfflineJobExecutionVO retryFrom(OfflineJobExecutionPO previous) {
    if (previous != null) {
      reachabilityService.preheat(previous.getJobDefinitionId());
    }
    return super.retryFrom(previous);
  }
}
