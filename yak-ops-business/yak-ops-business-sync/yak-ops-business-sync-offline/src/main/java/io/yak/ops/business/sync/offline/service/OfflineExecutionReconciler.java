package io.yak.ops.business.sync.offline.service;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpJobResponse;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpNodeResponse;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** 使用 YAML 固定地址持续对账，并通过 instanceId 识别 Worker 重启。 */
@ConditionalOnOfflineSyncEnabled @Component @RequiredArgsConstructor
public class OfflineExecutionReconciler {
  private static final Logger LOG=LoggerFactory.getLogger(OfflineExecutionReconciler.class);
  private final OfflineExecutionControlRepository repository;private final OfflineJobExecutionService executionService;private final LinkUpClient linkUpClient;private final OfflineSyncProperties properties;
  @Scheduled(initialDelayString="${yak.sync.offline.control.reconcile-delay-millis:5000}",fixedDelayString="${yak.sync.offline.control.reconcile-delay-millis:5000}")
  public void reconcile(){int limit=Math.max(1,properties.getControl().getScanBatchSize());List<OfflineJobExecutionPO> executions=repository.findActiveExecutions(limit);LinkUpNodeResponse node=null;RuntimeException probeError=null;try{node=linkUpClient.node();}catch(RuntimeException e){probeError=e;}for(OfflineJobExecutionPO execution:executions)reconcileExecution(execution,node,probeError);for(OfflineJobExecutionPO execution:repository.findRetryCandidates(LocalDateTime.now(),limit))retry(execution);}
  private void reconcileExecution(OfflineJobExecutionPO e,LinkUpNodeResponse node,RuntimeException probeError){try{if(probeError!=null)throw probeError;if(node!=null&&StringUtils.hasText(e.getWorkerInstanceId())&&StringUtils.hasText(node.getInstanceId())&&!e.getWorkerInstanceId().equals(node.getInstanceId())){executionService.markLost(e,"Link-Up instanceId 已变化，旧实例执行结果无法继续确认");return;}LinkUpJobResponse response=StringUtils.hasText(e.getEngineJobId())?linkUpClient.getJob(e.getEngineJobId()):linkUpClient.findByExternalExecutionId(e.getExternalExecutionId());executionService.applySnapshot(e,response,"RECONCILED");if(Boolean.TRUE.equals(e.getCancellationRequested())&&StringUtils.hasText(e.getEngineJobId())&&response!=null&&isActive(response.getStatus()))executionService.applySnapshot(e,linkUpClient.cancel(e.getEngineJobId()),"CANCEL_RECONCILED");}catch(RuntimeException ex){if(isPastLostDeadline(e))executionService.markLost(e,"Link-Up 状态对账超时："+ex.getMessage());else LOG.debug("Offline execution reconcile failed, executionId={}",e.getId(),ex);}}
  private void retry(OfflineJobExecutionPO e){try{executionService.retryFrom(e);repository.markRetryCreated(e.getId());}catch(RuntimeException ex){LOG.warn("Offline execution retry failed, executionId={}",e.getId(),ex);}}
  private boolean isPastLostDeadline(OfflineJobExecutionPO e){LocalDateTime reference=e.getLastSyncTime()==null?e.getCreateTime():e.getLastSyncTime();return reference!=null&&Duration.between(reference,LocalDateTime.now()).toMillis()>=Math.max(1000,properties.getControl().getLostAfterMillis());}
  private boolean isActive(String s){return "CREATED".equalsIgnoreCase(s)||"SUBMITTED".equalsIgnoreCase(s)||"QUEUED".equalsIgnoreCase(s)||"RUNNING".equalsIgnoreCase(s);}
}
