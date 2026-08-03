package io.yak.ops.business.sync.offline.service;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.domain.OfflineExecutionStatus;
import io.yak.ops.business.sync.offline.repository.OfflineDefinitionCatalogRepository;
import io.yak.ops.business.sync.offline.repository.OfflineDefinitionCatalogRepository.DefinitionVersion;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.worker.OfflineCapabilityRequirementResolver;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerScheduler;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerScheduler.Assignment;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * 离线同步执行实例原子领取服务。
 *
 * Atomically claims a definition, selects one capability-compatible and reachable Worker and
 * creates one durable execution attempt.
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Service
public class OfflineExecutionClaimService {

  private final OfflineJobDefinitionService definitionService;
  private final OfflineJobExecutionDao executionDao;
  private final OfflineExecutionControlRepository executionRepository;
  private final OfflineDefinitionCatalogRepository catalogRepository;
  private final OfflineCapabilityRequirementResolver capabilityResolver;
  private final OfflineWorkerScheduler workerScheduler;

  public OfflineExecutionClaimService(
      OfflineJobDefinitionService definitionService,
      OfflineJobExecutionDao executionDao,
      OfflineExecutionControlRepository executionRepository,
      OfflineDefinitionCatalogRepository catalogRepository,
      OfflineCapabilityRequirementResolver capabilityResolver,
      OfflineWorkerScheduler workerScheduler) {
    this.definitionService = definitionService;
    this.executionDao = executionDao;
    this.executionRepository = executionRepository;
    this.catalogRepository = catalogRepository;
    this.capabilityResolver = capabilityResolver;
    this.workerScheduler = workerScheduler;
  }

  public ClaimResult claim(
      Long definitionId,
      String triggerType,
      Long retryFromExecutionId,
      int attemptNo) {
    return claim(definitionId, triggerType, retryFromExecutionId, attemptNo, null);
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public ClaimResult claim(
      Long definitionId,
      String triggerType,
      Long retryFromExecutionId,
      int attemptNo,
      String reachabilityRequirementsJson) {
    executionRepository.lockDefinition(definitionId);
    OfflineJobDefinitionPO definition = definitionService.require(definitionId);
    if (!"ONLINE".equalsIgnoreCase(definition.getReleaseState())) {
      throw new IllegalStateException("请先上线任务，再执行运行操作");
    }
    if (executionRepository.hasActiveExecution(definitionId)) {
      throw new IllegalStateException("任务已有运行中的执行实例，不能重复提交");
    }

    DefinitionVersion version = definitionService.requireCurrentVersion(definition);
    String logicalJobSpecJson = definitionService.resolveLogicalJobSpec(version);
    String capabilityRequirementsJson = StringUtils.hasText(version.getCapabilityRequirementsJson())
        ? version.getCapabilityRequirementsJson()
        : StringUtils.hasText(definition.getCapabilityRequirementsJson())
            ? definition.getCapabilityRequirementsJson()
            : capabilityResolver.resolve(logicalJobSpecJson);
    if (!StringUtils.hasText(version.getCapabilityRequirementsJson())) {
      catalogRepository.backfillCapabilityRequirements(
          definition.getId(), version.getId(), capabilityRequirementsJson);
      definition.setCapabilityRequirementsJson(capabilityRequirementsJson);
    }

    Assignment assignment = workerScheduler.select(
        definition,
        capabilityRequirementsJson,
        reachabilityRequirementsJson);
    NodeRecord node = assignment.getNode();
    LocalDateTime now = LocalDateTime.now();
    OfflineJobExecutionPO execution = new OfflineJobExecutionPO();
    execution.setJobDefinitionId(definitionId);
    execution.setDefinitionVersionId(version.getId());
    execution.setDefinitionVersion(version.getVersionNo());
    execution.setEngineNodeId(node.getNodeId());
    execution.setEngineNodeBaseUrl(node.getBaseUrl());
    execution.setWorkerInstanceId(node.getWorkerInstanceId());
    execution.setAssignmentMode(assignment.getMode());
    execution.setAssignmentScore(assignment.getScore());
    execution.setAssignmentReason(assignment.getReason());
    execution.setAssignmentCandidatesJson(assignment.getCandidatesJson());
    execution.setRequiredCapabilitiesJson(capabilityRequirementsJson);
    execution.setAssignedCapabilitiesJson(assignment.getAssignedCapabilitiesJson());
    execution.setReachabilityRequirementsJson(reachabilityRequirementsJson);
    execution.setAssignedReachabilityJson(assignment.getAssignedReachabilityJson());
    execution.setStatus(OfflineExecutionStatus.CREATED.name());
    execution.setStateVersion(1L);
    execution.setAttemptNo(Math.max(1, attemptNo));
    execution.setTriggerType(triggerType);
    execution.setRetryFromExecutionId(retryFromExecutionId);
    execution.setCancellationRequested(false);
    execution.setRetryCreated(false);
    execution.setConfigDigest(version.getConfigDigest());
    execution.setSubmittedConfig(logicalJobSpecJson);
    execution.setSourceRecordCount(0L);
    execution.setSinkSuccessRecordCount(0L);
    execution.setSourceReadBytes(0L);
    execution.setSinkWrittenBytes(0L);
    execution.setQps(0D);
    execution.setDurationMillis(0L);
    execution.setCreateTime(now);
    execution.setUpdateTime(now);
    if (!executionDao.insert(execution) || execution.getId() == null) {
      throw new IllegalStateException("创建离线同步执行实例失败");
    }

    execution.setExternalExecutionId("yak-offline-execution-" + execution.getId());
    execution.setIdempotencyKey(UUID.randomUUID().toString());
    execution.setUpdateTime(LocalDateTime.now());
    if (!executionDao.updateById(execution)) {
      throw new IllegalStateException("初始化离线同步执行标识失败");
    }
    return new ClaimResult(definition, version, logicalJobSpecJson, execution, assignment);
  }

  public static final class ClaimResult {
    private final OfflineJobDefinitionPO definition;
    private final DefinitionVersion version;
    private final String logicalJobSpecJson;
    private final OfflineJobExecutionPO execution;
    private final Assignment assignment;

    public ClaimResult(
        OfflineJobDefinitionPO definition,
        DefinitionVersion version,
        String logicalJobSpecJson,
        OfflineJobExecutionPO execution,
        Assignment assignment) {
      this.definition = definition;
      this.version = version;
      this.logicalJobSpecJson = logicalJobSpecJson;
      this.execution = execution;
      this.assignment = assignment;
    }

    public OfflineJobDefinitionPO getDefinition() { return definition; }
    public DefinitionVersion getVersion() { return version; }
    public String getLogicalJobSpecJson() { return logicalJobSpecJson; }
    public OfflineJobExecutionPO getExecution() { return execution; }
    public Assignment getAssignment() { return assignment; }
  }
}
