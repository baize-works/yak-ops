package io.yak.ops.business.sync.offline.service;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpNodeResponse;
import io.yak.ops.business.sync.offline.engine.LinkUpWorkerProbeClient;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerInstanceRecoveryService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Link-Up Worker 注册表、定时心跳和默认节点选择器。
 *
 * <p>Yak Ops 主动探测固定地址；Worker 不再反向注册、续租或注销。
 *
 * @author weifuwan
 */
@Slf4j
@ConditionalOnOfflineSyncEnabled
@Component
@RequiredArgsConstructor
public class OfflineWorkerRegistry {

  private final LinkUpWorkerProbeClient probeClient;
  private final OfflineNodeRepository repository;
  private final OfflineSyncProperties properties;
  private final OfflineWorkerInstanceRecoveryService instanceRecoveryService;

  @Scheduled(
      initialDelayString = "${yak.sync.offline.control.heartbeat-delay-millis:10000}",
      fixedDelayString = "${yak.sync.offline.control.heartbeat-delay-millis:10000}")
  public void heartbeat() {
    refreshAll();
  }

  public void refreshAll() {
    try {
      ensureConfiguredWorker();
    } catch (RuntimeException exception) {
      log.warn("初始化默认 Link-Up Worker 失败：{}", message(exception));
    }
    List<NodeRecord> targets = repository.listHeartbeatTargets();
    for (NodeRecord target : targets) {
      refresh(target, false);
    }
  }

  public NodeRecord refresh(String nodeId, boolean failFast) {
    NodeRecord node = repository.find(nodeId);
    if (node == null) {
      throw new IllegalArgumentException("Link-Up Worker 不存在：" + nodeId);
    }
    return refresh(node, failFast);
  }

  public NodeRecord selectNode() {
    NodeRecord configured = ensureConfiguredWorker();
    if (configured == null) {
      throw new IllegalStateException("未配置默认 Link-Up 离线 Worker");
    }
    NodeRecord node = refresh(configured, true);
    if (!Boolean.TRUE.equals(node.getEnabled())
        || !"ENABLED".equalsIgnoreCase(node.getSchedulingStatus())) {
      throw new IllegalStateException("默认 Link-Up Worker 已禁用或处于排空状态");
    }
    if (!"UP".equalsIgnoreCase(node.getStatus())) {
      throw new IllegalStateException("默认 Link-Up Worker 当前不可用");
    }
    int runningJobs = value(node.getRunningJobs(), 0);
    int queuedJobs = value(node.getQueuedJobs(), 0);
    int maxConcurrentJobs = Math.max(1, value(node.getMaxConcurrentJobs(), 1));
    int maxQueuedJobs = Math.max(0, value(node.getMaxQueuedJobs(), 0));
    if (runningJobs >= maxConcurrentJobs && queuedJobs >= maxQueuedJobs) {
      throw new IllegalStateException("默认 Link-Up Worker 的执行队列已满");
    }
    return node;
  }

  public NodeRecord currentNode() {
    ensureConfiguredWorker();
    return repository.find(properties.getEngine().getNodeId());
  }

  /** 保证 application.yml 中的默认 Worker 在管理页面可见。 */
  public NodeRecord ensureConfiguredWorker() {
    OfflineSyncProperties.Engine engine = properties.getEngine();
    if (!engine.isEnabled()
        || !StringUtils.hasText(engine.getNodeId())
        || !StringUtils.hasText(engine.getBaseUrl())) {
      return null;
    }
    String nodeId = engine.getNodeId().trim();
    String configuredNodeName = StringUtils.hasText(engine.getNodeName())
        ? engine.getNodeName().trim() : nodeId;
    String baseUrl = probeClient.normalizeBaseUrl(engine.getBaseUrl());
    NodeRecord existing = repository.find(nodeId);
    String nodeName = existing != null && StringUtils.hasText(existing.getNodeName())
        ? existing.getNodeName() : configuredNodeName;
    if (existing != null
        && "CONFIG".equalsIgnoreCase(existing.getRegistrationMode())
        && baseUrl.equals(existing.getBaseUrl())) {
      return existing;
    }

    boolean addressChanged = existing != null
        && StringUtils.hasText(existing.getBaseUrl())
        && !baseUrl.equals(existing.getBaseUrl());
    LocalDateTime now = LocalDateTime.now();
    NodeRecord configured = existing == null ? NodeRecord.builder().build() : existing;
    configured.setNodeId(nodeId);
    configured.setNodeName(nodeName);
    configured.setBaseUrl(baseUrl);
    configured.setRegistrationMode("CONFIG");
    configured.setEnabled(existing == null
        ? true : !Boolean.FALSE.equals(existing.getEnabled()));
    configured.setSchedulingStatus(existing == null
        || !StringUtils.hasText(existing.getSchedulingStatus())
            ? "ENABLED" : existing.getSchedulingStatus());
    configured.setWeight(value(configured.getWeight(), 100));
    configured.setOfflineOnly(configured.getOfflineOnly() == null
        || configured.getOfflineOnly());
    configured.setStatus(StringUtils.hasText(configured.getStatus())
        ? configured.getStatus() : "DOWN");
    configured.setMaxConcurrentJobs(value(configured.getMaxConcurrentJobs(), 1));
    configured.setMaxQueuedJobs(value(configured.getMaxQueuedJobs(), 1));
    configured.setRunningJobs(value(configured.getRunningJobs(), 0));
    configured.setQueuedJobs(value(configured.getQueuedJobs(), 0));
    configured.setConsecutiveFailures(value(configured.getConsecutiveFailures(), 0));
    configured.setCreateTime(configured.getCreateTime() == null
        ? now : configured.getCreateTime());
    configured.setUpdateTime(now);
    repository.upsert(configured);
    if (addressChanged) {
      repository.resetCapabilities(nodeId);
    }
    return repository.find(nodeId);
  }

  private NodeRecord refresh(NodeRecord node, boolean failFast) {
    try {
      LinkUpNodeResponse response = probeClient.node(node.getBaseUrl());
      validate(node, response);
      boolean instanceChanged = instanceChanged(node, response);
      boolean runtimeChanged = instanceChanged || versionChanged(node, response);
      NodeRecord heartbeat = NodeRecord.builder()
          .nodeId(node.getNodeId())
          .nodeName(StringUtils.hasText(node.getNodeName())
              ? node.getNodeName() : response.getNodeName())
          .workerInstanceId(response.getInstanceId())
          .engineVersion(response.getVersion())
          .startedAtMillis(response.getStartedAtMillis())
          .offlineOnly(response.getOfflineOnly())
          .maxConcurrentJobs(value(response.getMaxConcurrentJobs(), 1))
          .maxQueuedJobs(value(response.getMaxQueuedJobs(), 1))
          .runningJobs(value(response.getRunningJobs(), 0))
          .queuedJobs(value(response.getQueuedJobs(), 0))
          .lastHeartbeatTime(LocalDateTime.now())
          .build();
      repository.updateHeartbeatSuccess(heartbeat);
      if (instanceChanged) {
        instanceRecoveryService.recover(
            node.getNodeId(), node.getWorkerInstanceId(), response.getInstanceId());
      }
      if (runtimeChanged) {
        repository.resetCapabilities(node.getNodeId());
      }
      return repository.find(node.getNodeId());
    } catch (RuntimeException exception) {
      repository.updateHeartbeatFailure(node.getNodeId(), message(exception));
      if (failFast) {
        throw exception;
      }
      return repository.find(node.getNodeId());
    }
  }

  private boolean instanceChanged(NodeRecord previous, LinkUpNodeResponse current) {
    return StringUtils.hasText(previous.getWorkerInstanceId())
        && StringUtils.hasText(current.getInstanceId())
        && !Objects.equals(previous.getWorkerInstanceId(), current.getInstanceId());
  }

  private boolean versionChanged(NodeRecord previous, LinkUpNodeResponse current) {
    return StringUtils.hasText(previous.getEngineVersion())
        && StringUtils.hasText(current.getVersion())
        && !Objects.equals(previous.getEngineVersion(), current.getVersion());
  }

  private void validate(NodeRecord expected, LinkUpNodeResponse response) {
    if (response == null) {
      throw new IllegalStateException("Link-Up Worker 返回了空节点信息");
    }
    if (!Boolean.TRUE.equals(response.getOfflineOnly())) {
      throw new IllegalStateException("目标 Link-Up 节点不是离线专用 Worker");
    }
    if (!StringUtils.hasText(response.getNodeId())) {
      throw new IllegalStateException("Link-Up Worker 未返回稳定 nodeId");
    }
    if (!Objects.equals(expected.getNodeId(), response.getNodeId())) {
      throw new IllegalStateException(
          "Link-Up nodeId 不匹配，登记=" + expected.getNodeId()
              + "，实际=" + response.getNodeId());
    }
  }

  private String message(RuntimeException exception) {
    return StringUtils.hasText(exception.getMessage())
        ? exception.getMessage() : exception.getClass().getSimpleName();
  }

  private int value(Integer value, int fallback) {
    return value == null ? fallback : Math.max(0, value);
  }
}
