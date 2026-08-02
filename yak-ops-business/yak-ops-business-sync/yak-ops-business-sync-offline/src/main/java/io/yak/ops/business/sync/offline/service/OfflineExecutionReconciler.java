package io.yak.ops.business.sync.offline.service;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpJobResponse;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
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

/**
 * 后台持续对账每个执行实例固化的 Link-Up Worker，页面查询不再触发远程刷新。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Component
@RequiredArgsConstructor
public class OfflineExecutionReconciler {

  private static final Logger LOG = LoggerFactory.getLogger(OfflineExecutionReconciler.class);

  private final OfflineExecutionControlRepository repository;
  private final OfflineNodeRepository nodeRepository;
  private final OfflineJobExecutionService executionService;
  private final LinkUpClient linkUpClient;
  private final OfflineSyncProperties properties;

  @Scheduled(
      initialDelayString = "${yak.sync.offline.control.reconcile-delay-millis:5000}",
      fixedDelayString = "${yak.sync.offline.control.reconcile-delay-millis:5000}")
  public void reconcile() {
    int limit = Math.max(1, properties.getControl().getScanBatchSize());
    List<OfflineJobExecutionPO> executions = repository.findActiveExecutions(limit);
    for (OfflineJobExecutionPO execution : executions) {
      reconcileExecution(execution);
    }
    for (OfflineJobExecutionPO execution : repository.findRetryCandidates(LocalDateTime.now(), limit)) {
      retry(execution);
    }
  }

  private void reconcileExecution(OfflineJobExecutionPO execution) {
    try {
      NodeRecord node = StringUtils.hasText(execution.getEngineNodeId())
          ? nodeRepository.find(execution.getEngineNodeId())
          : null;
      if (node != null && "UP".equalsIgnoreCase(node.getStatus())
          && StringUtils.hasText(execution.getWorkerInstanceId())
          && StringUtils.hasText(node.getWorkerInstanceId())
          && !execution.getWorkerInstanceId().equals(node.getWorkerInstanceId())) {
        executionService.markLost(
            execution,
            "Link-Up Worker " + execution.getEngineNodeId()
                + " 的 instanceId 已变化，原执行结果无法继续确认");
        return;
      }

      String baseUrl = baseUrl(execution, node);
      LinkUpJobResponse response = StringUtils.hasText(execution.getEngineJobId())
          ? linkUpClient.getJob(baseUrl, execution.getEngineJobId())
          : linkUpClient.findByExternalExecutionId(baseUrl, execution.getExternalExecutionId());
      executionService.applySnapshot(execution, response, "RECONCILED");

      if (Boolean.TRUE.equals(execution.getCancellationRequested())
          && StringUtils.hasText(execution.getEngineJobId())
          && response != null
          && isActive(response.getStatus())) {
        executionService.applySnapshot(
            execution,
            linkUpClient.cancel(baseUrl, execution.getEngineJobId()),
            "CANCEL_RECONCILED");
      }
    } catch (RuntimeException exception) {
      if (isPastLostDeadline(execution)) {
        executionService.markLost(
            execution,
            "Link-Up Worker " + execution.getEngineNodeId()
                + " 状态对账超时：" + exception.getMessage());
      } else {
        LOG.debug("Offline execution reconcile failed, executionId={}", execution.getId(), exception);
      }
    }
  }

  private void retry(OfflineJobExecutionPO execution) {
    try {
      executionService.retryFrom(execution);
      repository.markRetryCreated(execution.getId());
    } catch (RuntimeException exception) {
      LOG.warn("Offline execution retry failed, executionId={}", execution.getId(), exception);
    }
  }

  private String baseUrl(OfflineJobExecutionPO execution, NodeRecord node) {
    if (StringUtils.hasText(execution.getEngineNodeBaseUrl())) {
      return execution.getEngineNodeBaseUrl();
    }
    if (node != null && StringUtils.hasText(node.getBaseUrl())) {
      return node.getBaseUrl();
    }
    return properties.getEngine().getBaseUrl();
  }

  private boolean isPastLostDeadline(OfflineJobExecutionPO execution) {
    LocalDateTime reference = execution.getLastSyncTime() == null
        ? execution.getCreateTime() : execution.getLastSyncTime();
    if (reference == null) {
      return false;
    }
    long elapsed = Duration.between(reference, LocalDateTime.now()).toMillis();
    return elapsed >= Math.max(1_000L, properties.getControl().getLostAfterMillis());
  }

  private boolean isActive(String status) {
    return "CREATED".equalsIgnoreCase(status)
        || "SUBMITTED".equalsIgnoreCase(status)
        || "QUEUED".equalsIgnoreCase(status)
        || "RUNNING".equalsIgnoreCase(status);
  }
}
