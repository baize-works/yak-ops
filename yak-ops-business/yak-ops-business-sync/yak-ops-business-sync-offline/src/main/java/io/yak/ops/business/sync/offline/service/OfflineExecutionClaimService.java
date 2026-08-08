package io.yak.ops.business.sync.offline.service;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.domain.OfflineExecutionStatus;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 固定 Link-Up 地址下原子创建执行实例。 */
@ConditionalOnOfflineSyncEnabled
@Service
public class OfflineExecutionClaimService {
  private final OfflineJobDefinitionService definitionService; private final OfflineJobExecutionDao executionDao;
  private final OfflineExecutionControlRepository repository; private final OfflineSyncProperties properties;
  public OfflineExecutionClaimService(OfflineJobDefinitionService definitionService,OfflineJobExecutionDao executionDao,
      OfflineExecutionControlRepository repository,OfflineSyncProperties properties){this.definitionService=definitionService;this.executionDao=executionDao;this.repository=repository;this.properties=properties;}

  @Transactional(transactionManager="offlineSyncTransactionManager",rollbackFor=Exception.class)
  public ClaimResult claim(Long definitionId,String triggerType,Long retryFromExecutionId,int attemptNo){
    repository.lockDefinition(definitionId);OfflineJobDefinitionPO d=definitionService.require(definitionId);
    if(!"ONLINE".equalsIgnoreCase(d.getReleaseState()))throw new IllegalStateException("请先上线任务，再执行运行操作");
    if(repository.hasActiveExecution(definitionId))throw new IllegalStateException("任务已有运行中的执行实例，不能重复提交");
    String logical=definitionService.resolveLogicalJobSpec(d);
    LocalDateTime now=LocalDateTime.now();OfflineJobExecutionPO e=new OfflineJobExecutionPO();
    e.setJobDefinitionId(definitionId);e.setDefinitionVersion(Math.max(1,d.getVersion()==null?1:d.getVersion()));e.setEngineBaseUrl(properties.getEngine().getBaseUrl());
    e.setExternalExecutionId("yak-offline-"+UUID.randomUUID());e.setIdempotencyKey(UUID.randomUUID().toString());e.setStatus(OfflineExecutionStatus.CREATED.name());e.setStateVersion(1L);e.setAttemptNo(Math.max(1,attemptNo));
    e.setTriggerType(triggerType);e.setRetryFromExecutionId(retryFromExecutionId);e.setCancellationRequested(false);e.setRetryCreated(false);
    e.setConfigDigest(d.getConfigDigest());e.setDefinitionSnapshotJson(d.getDefinitionJson());e.setSubmittedConfig(logical);
    e.setSourceRecordCount(0L);e.setSinkSuccessRecordCount(0L);e.setSourceReadBytes(0L);e.setSinkWrittenBytes(0L);e.setQps(0D);e.setDurationMillis(0L);e.setCreateTime(now);e.setUpdateTime(now);
    if(!executionDao.insert(e)||e.getId()==null)throw new IllegalStateException("创建离线同步执行实例失败");
    return new ClaimResult(d,logical,e);
  }
  public static final class ClaimResult {private final OfflineJobDefinitionPO definition;private final String logicalJobSpecJson;private final OfflineJobExecutionPO execution;
    public ClaimResult(OfflineJobDefinitionPO definition,String logical,OfflineJobExecutionPO execution){this.definition=definition;this.logicalJobSpecJson=logical;this.execution=execution;}
    public OfflineJobDefinitionPO getDefinition(){return definition;}public String getLogicalJobSpecJson(){return logicalJobSpecJson;}public OfflineJobExecutionPO getExecution(){return execution;}}
}
