package io.yak.ops.business.sync.offline.service;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpNodeResponse;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 单 Link-Up Worker 注册、心跳和选择器。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Component
@RequiredArgsConstructor
public class OfflineWorkerRegistry {

  private final LinkUpClient linkUpClient;
  private final OfflineNodeRepository repository;
  private final OfflineSyncProperties properties;

  @Scheduled(
      initialDelayString = "${yak.sync.offline.control.heartbeat-delay-millis:10000}",
      fixedDelayString = "${yak.sync.offline.control.heartbeat-delay-millis:10000}")
  public void heartbeat() {
    refresh(false);
  }

  public NodeRecord selectNode() {
    NodeRecord node = refresh(true);
    if (node == null || !"UP".equalsIgnoreCase(node.getStatus())) {
      throw new IllegalStateException("Link-Up 离线 Worker 当前不可用");
    }
    if (node.getRunningJobs() >= node.getMaxConcurrentJobs()
        && node.getQueuedJobs() >= node.getMaxQueuedJobs()) {
      throw new IllegalStateException("Link-Up 离线 Worker 的执行队列已满");
    }
    return node;
  }

  public NodeRecord currentNode() {
    return repository.find(properties.getEngine().getNodeId());
  }

  private NodeRecord refresh(boolean failFast) {
    try {
      LinkUpNodeResponse response = linkUpClient.node();
      if (!Boolean.TRUE.equals(response.getOfflineOnly())) {
        throw new IllegalStateException("目标 Link-Up 节点不是离线专用 Worker");
      }
      String configuredNodeId = properties.getEngine().getNodeId();
      if (StringUtils.hasText(response.getNodeId())
          && !configuredNodeId.equals(response.getNodeId())) {
        throw new IllegalStateException(
            "Link-Up nodeId 不匹配，配置=" + configuredNodeId + "，实际=" + response.getNodeId());
      }
      NodeRecord node = new NodeRecord(
          configuredNodeId,
          StringUtils.hasText(response.getNodeName())
              ? response.getNodeName() : properties.getEngine().getNodeName(),
          properties.getEngine().getBaseUrl(),
          response.getInstanceId(),
          response.getVersion(),
          response.getStatus(),
          value(response.getMaxConcurrentJobs(), 1),
          value(response.getMaxQueuedJobs(), 1),
          value(response.getRunningJobs(), 0),
          value(response.getQueuedJobs(), 0),
          LocalDateTime.now(),
          null);
      repository.upsert(node);
      return node;
    } catch (RuntimeException exception) {
      NodeRecord down = new NodeRecord(
          properties.getEngine().getNodeId(),
          properties.getEngine().getNodeName(),
          properties.getEngine().getBaseUrl(),
          currentNode() == null ? null : currentNode().getWorkerInstanceId(),
          currentNode() == null ? null : currentNode().getEngineVersion(),
          "DOWN", 1, 1, 0, 0, LocalDateTime.now(), exception.getMessage());
      repository.upsert(down);
      if (failFast) {
        throw exception;
      }
      return down;
    }
  }

  private int value(Integer value, int fallback) {
    return value == null ? fallback : Math.max(0, value);
  }
}
