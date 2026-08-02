package io.yak.ops.business.sync.offline.service;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.repository.OfflineDefinitionCatalogRepository;
import io.yak.ops.business.sync.offline.repository.OfflineDefinitionCatalogRepository.DefinitionVersion;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.worker.OfflineCapabilityRequirementResolver;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerReachabilityService;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerScheduler;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 第三阶段能力调度使用的主领取服务。
 *
 * <p>Worker 远程预检由执行门面在事务外完成；这里仅根据不可变 JobSpec 本地重算摘要，
 * 再进入原有原子领取流程读取共享预检缓存。
 *
 * @author weifuwan
 */
@Primary
@ConditionalOnOfflineSyncEnabled
@Service
public class CapabilityAwareOfflineExecutionClaimService extends OfflineExecutionClaimService {

  private final OfflineJobDefinitionService definitionService;
  private final OfflineWorkerReachabilityService reachabilityService;

  public CapabilityAwareOfflineExecutionClaimService(
      OfflineJobDefinitionService definitionService,
      OfflineJobExecutionDao executionDao,
      OfflineExecutionControlRepository executionRepository,
      OfflineDefinitionCatalogRepository catalogRepository,
      OfflineCapabilityRequirementResolver capabilityResolver,
      OfflineWorkerScheduler workerScheduler,
      OfflineWorkerReachabilityService reachabilityService) {
    super(
        definitionService,
        executionDao,
        executionRepository,
        catalogRepository,
        capabilityResolver,
        workerScheduler);
    this.definitionService = definitionService;
    this.reachabilityService = reachabilityService;
  }

  @Override
  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public ClaimResult claim(
      Long definitionId,
      String triggerType,
      Long retryFromExecutionId,
      int attemptNo) {
    OfflineJobDefinitionPO definition = definitionService.require(definitionId);
    DefinitionVersion version = definitionService.requireCurrentVersion(definition);
    String reachabilityRequirements = reachabilityService.requirements(definition, version);
    return super.claim(
        definitionId,
        triggerType,
        retryFromExecutionId,
        attemptNo,
        reachabilityRequirements);
  }
}
