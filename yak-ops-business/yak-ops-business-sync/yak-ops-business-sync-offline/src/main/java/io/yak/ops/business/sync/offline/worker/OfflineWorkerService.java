package io.yak.ops.business.sync.offline.worker;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpNodeResponse;
import io.yak.ops.business.sync.offline.engine.LinkUpWorkerProbeClient;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.service.OfflineWorkerRegistry;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.CreateRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.OptionView;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.PageView;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.QueryRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.UpdateRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.WorkerView;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Link-Up Worker 管理、验证和页面查询服务。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Service
public class OfflineWorkerService {

  private static final TypeReference<Map<String, String>> LABELS_TYPE =
      new TypeReference<Map<String, String>>() { };

  private final OfflineNodeRepository repository;
  private final OfflineWorkerRegistry registry;
  private final LinkUpWorkerProbeClient probeClient;
  private final OfflineSyncProperties properties;
  private final ObjectMapper objectMapper;

  public OfflineWorkerService(
      OfflineNodeRepository repository,
      OfflineWorkerRegistry registry,
      LinkUpWorkerProbeClient probeClient,
      OfflineSyncProperties properties,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.repository = repository;
    this.registry = registry;
    this.probeClient = probeClient;
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  public PageView page(QueryRequest request) {
    registry.ensureConfiguredWorker();
    QueryRequest query = request == null ? new QueryRequest() : request;
    int pageNo = query.getPageNo() == null ? 1 : Math.max(1, query.getPageNo());
    int pageSize = query.getPageSize() == null ? 20 : Math.min(500, Math.max(1, query.getPageSize()));
    List<NodeRecord> filtered = repository.listAll().stream()
        .filter(node -> matches(node, query))
        .sorted(Comparator.comparing(
            NodeRecord::getUpdateTime,
            Comparator.nullsLast(Comparator.reverseOrder())))
        .collect(Collectors.toList());
    int from = Math.min(filtered.size(), (pageNo - 1) * pageSize);
    int to = Math.min(filtered.size(), from + pageSize);
    List<WorkerView> records = filtered.subList(from, to).stream()
        .map(this::view)
        .collect(Collectors.toList());
    return PageView.builder()
        .records(records)
        .total((long) filtered.size())
        .pageNo(pageNo)
        .pageSize(pageSize)
        .build();
  }

  public WorkerView get(String nodeId) {
    return view(require(nodeId));
  }

  public WorkerView verify(String baseUrl) {
    String normalized = probeClient.normalizeBaseUrl(baseUrl);
    LinkUpNodeResponse response = probeClient.node(normalized);
    validateResponse(response);
    return view(fromResponse(response, normalized, "MANUAL", null, 100, Collections.emptyMap()));
  }

  public WorkerView create(CreateRequest request) {
    if (request == null) {
      throw new IllegalArgumentException("Worker 创建参数不能为空");
    }
    String baseUrl = probeClient.normalizeBaseUrl(request.getBaseUrl());
    LinkUpNodeResponse response = probeClient.node(baseUrl);
    validateResponse(response);
    if (repository.find(response.getNodeId()) != null) {
      throw new IllegalStateException("Worker nodeId 已登记：" + response.getNodeId());
    }
    NodeRecord sameAddress = repository.findByBaseUrl(baseUrl);
    if (sameAddress != null) {
      throw new IllegalStateException("Worker 地址已登记：" + baseUrl);
    }
    String nodeName = StringUtils.hasText(request.getNodeName())
        ? request.getNodeName().trim() : response.getNodeName();
    NodeRecord record = fromResponse(
        response,
        baseUrl,
        "MANUAL",
        nodeName,
        weight(request.getWeight()),
        request.getLabels());
    repository.upsert(record);
    return get(record.getNodeId());
  }

  public WorkerView update(String nodeId, UpdateRequest request) {
    if (request == null) {
      throw new IllegalArgumentException("Worker 更新参数不能为空");
    }
    NodeRecord existing = require(nodeId);
    String requestedUrl = probeClient.normalizeBaseUrl(request.getBaseUrl());
    if ("CONFIG".equalsIgnoreCase(existing.getRegistrationMode())
        && !requestedUrl.equals(existing.getBaseUrl())) {
      throw new IllegalStateException("默认 Worker 地址由 application.yml 管理，不能在页面修改");
    }
    NodeRecord sameAddress = repository.findByBaseUrl(requestedUrl);
    if (sameAddress != null && !nodeId.equals(sameAddress.getNodeId())) {
      throw new IllegalStateException("Worker 地址已被其他节点使用：" + requestedUrl);
    }
    LinkUpNodeResponse response = probeClient.node(requestedUrl);
    validateResponse(response);
    if (!nodeId.equals(response.getNodeId())) {
      throw new IllegalStateException(
          "更新后的地址属于其他 Worker，登记=" + nodeId + "，实际=" + response.getNodeId());
    }
    NodeRecord updated = fromResponse(
        response,
        requestedUrl,
        existing.getRegistrationMode(),
        StringUtils.hasText(request.getNodeName())
            ? request.getNodeName().trim() : existing.getNodeName(),
        weight(request.getWeight()),
        request.getLabels());
    updated.setEnabled(existing.getEnabled());
    updated.setSchedulingStatus(existing.getSchedulingStatus());
    updated.setCreateTime(existing.getCreateTime());
    if (!repository.update(updated)) {
      throw new IllegalStateException("Worker 更新失败：" + nodeId);
    }
    return get(nodeId);
  }

  public WorkerView refresh(String nodeId) {
    registry.refresh(nodeId, true);
    return get(nodeId);
  }

  public WorkerView changeSchedulingStatus(String nodeId, String schedulingStatus) {
    NodeRecord node = require(nodeId);
    String status = normalizeSchedulingStatus(schedulingStatus);
    boolean enabled = !"DISABLED".equals(status);
    if (!repository.updateSchedulingStatus(node.getNodeId(), status, enabled)) {
      throw new IllegalStateException("Worker 调度状态更新失败：" + nodeId);
    }
    if (enabled) {
      registry.refresh(nodeId, false);
    }
    return get(nodeId);
  }

  public boolean delete(String nodeId) {
    NodeRecord node = require(nodeId);
    if ("CONFIG".equalsIgnoreCase(node.getRegistrationMode())
        || nodeId.equals(properties.getEngine().getNodeId())) {
      throw new IllegalStateException("默认 Worker 不能删除，可将其设置为排空或禁用");
    }
    return repository.delete(nodeId);
  }

  public List<OptionView> options() {
    registry.ensureConfiguredWorker();
    List<OptionView> options = new ArrayList<>();
    for (NodeRecord node : repository.listAll()) {
      WorkerView worker = view(node);
      options.add(OptionView.builder()
          .value(worker.getNodeId())
          .label(worker.getNodeName())
          .status(worker.getStatus())
          .schedulingStatus(worker.getSchedulingStatus())
          .runningJobs(worker.getRunningJobs())
          .maxConcurrentJobs(worker.getMaxConcurrentJobs())
          .queuedJobs(worker.getQueuedJobs())
          .maxQueuedJobs(worker.getMaxQueuedJobs())
          .available(worker.getAvailable())
          .build());
    }
    return options;
  }

  private NodeRecord fromResponse(
      LinkUpNodeResponse response,
      String baseUrl,
      String registrationMode,
      String requestedName,
      int weight,
      Map<String, String> labels) {
    LocalDateTime now = LocalDateTime.now();
    return NodeRecord.builder()
        .nodeId(response.getNodeId())
        .nodeName(StringUtils.hasText(requestedName)
            ? requestedName : first(response.getNodeName(), response.getNodeId()))
        .baseUrl(baseUrl)
        .registrationMode(registrationMode)
        .enabled(true)
        .schedulingStatus("ENABLED")
        .weight(weight)
        .labelsJson(writeLabels(labels))
        .workerInstanceId(response.getInstanceId())
        .engineVersion(response.getVersion())
        .startedAtMillis(response.getStartedAtMillis())
        .offlineOnly(response.getOfflineOnly())
        .status(first(response.getStatus(), "UP").toUpperCase(Locale.ROOT))
        .maxConcurrentJobs(value(response.getMaxConcurrentJobs(), 1))
        .maxQueuedJobs(value(response.getMaxQueuedJobs(), 1))
        .runningJobs(value(response.getRunningJobs(), 0))
        .queuedJobs(value(response.getQueuedJobs(), 0))
        .lastHeartbeatTime(now)
        .lastSuccessTime(now)
        .consecutiveFailures(0)
        .lastErrorMessage(null)
        .createTime(now)
        .updateTime(now)
        .build();
  }

  private WorkerView view(NodeRecord node) {
    if (node == null) {
      return null;
    }
    int running = value(node.getRunningJobs(), 0);
    int queued = value(node.getQueuedJobs(), 0);
    int maxRunning = Math.max(1, value(node.getMaxConcurrentJobs(), 1));
    int maxQueued = Math.max(0, value(node.getMaxQueuedJobs(), 0));
    int capacity = Math.max(1, maxRunning + maxQueued);
    boolean available = Boolean.TRUE.equals(node.getEnabled())
        && "ENABLED".equalsIgnoreCase(node.getSchedulingStatus())
        && "UP".equalsIgnoreCase(node.getStatus())
        && !(running >= maxRunning && queued >= maxQueued);
    return WorkerView.builder()
        .nodeId(node.getNodeId())
        .nodeName(node.getNodeName())
        .baseUrl(node.getBaseUrl())
        .registrationMode(node.getRegistrationMode())
        .enabled(node.getEnabled())
        .schedulingStatus(node.getSchedulingStatus())
        .weight(node.getWeight())
        .labels(readLabels(node.getLabelsJson()))
        .workerInstanceId(node.getWorkerInstanceId())
        .engineVersion(node.getEngineVersion())
        .status(node.getStatus())
        .startedAtMillis(node.getStartedAtMillis())
        .offlineOnly(node.getOfflineOnly())
        .maxConcurrentJobs(maxRunning)
        .maxQueuedJobs(maxQueued)
        .runningJobs(running)
        .queuedJobs(queued)
        .activeJobs(running + queued)
        .available(available)
        .loadRatio(Math.min(1D, (double) (running + queued) / capacity))
        .lastHeartbeatTime(node.getLastHeartbeatTime())
        .lastSuccessTime(node.getLastSuccessTime())
        .consecutiveFailures(value(node.getConsecutiveFailures(), 0))
        .lastErrorMessage(node.getLastErrorMessage())
        .createTime(node.getCreateTime())
        .updateTime(node.getUpdateTime())
        .build();
  }

  private boolean matches(NodeRecord node, QueryRequest query) {
    if (query.getEnabled() != null
        && query.getEnabled() != Boolean.TRUE.equals(node.getEnabled())) {
      return false;
    }
    if (StringUtils.hasText(query.getStatus())
        && !query.getStatus().trim().equalsIgnoreCase(node.getStatus())) {
      return false;
    }
    if (StringUtils.hasText(query.getSchedulingStatus())
        && !query.getSchedulingStatus().trim().equalsIgnoreCase(node.getSchedulingStatus())) {
      return false;
    }
    if (!StringUtils.hasText(query.getKeyword())) {
      return true;
    }
    String keyword = query.getKeyword().trim().toLowerCase(Locale.ROOT);
    return contains(node.getNodeId(), keyword)
        || contains(node.getNodeName(), keyword)
        || contains(node.getBaseUrl(), keyword)
        || contains(node.getEngineVersion(), keyword)
        || contains(node.getLabelsJson(), keyword);
  }

  private boolean contains(String value, String keyword) {
    return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
  }

  private NodeRecord require(String nodeId) {
    if (!StringUtils.hasText(nodeId)) {
      throw new IllegalArgumentException("Worker nodeId 不能为空");
    }
    NodeRecord node = repository.find(nodeId.trim());
    if (node == null) {
      throw new IllegalArgumentException("Link-Up Worker 不存在：" + nodeId);
    }
    return node;
  }

  private void validateResponse(LinkUpNodeResponse response) {
    if (response == null || !StringUtils.hasText(response.getNodeId())) {
      throw new IllegalStateException("Link-Up Worker 未返回稳定 nodeId");
    }
    if (!Boolean.TRUE.equals(response.getOfflineOnly())) {
      throw new IllegalStateException("目标节点不是离线专用 Link-Up Worker");
    }
  }

  private String normalizeSchedulingStatus(String value) {
    if (!StringUtils.hasText(value)) {
      throw new IllegalArgumentException("调度状态不能为空");
    }
    String normalized = value.trim().toUpperCase(Locale.ROOT);
    if (!"ENABLED".equals(normalized)
        && !"DRAINING".equals(normalized)
        && !"DISABLED".equals(normalized)) {
      throw new IllegalArgumentException("不支持的调度状态：" + value);
    }
    return normalized;
  }

  private String writeLabels(Map<String, String> labels) {
    Map<String, String> normalized = labels == null
        ? Collections.emptyMap()
        : labels.entrySet().stream()
            .filter(entry -> StringUtils.hasText(entry.getKey()))
            .collect(Collectors.toMap(
                entry -> entry.getKey().trim(),
                entry -> entry.getValue() == null ? "" : entry.getValue().trim(),
                (left, right) -> right,
                LinkedHashMap::new));
    try {
      return objectMapper.writeValueAsString(normalized);
    } catch (JsonProcessingException exception) {
      throw new IllegalArgumentException("Worker 标签无法序列化", exception);
    }
  }

  private Map<String, String> readLabels(String labelsJson) {
    if (!StringUtils.hasText(labelsJson)) {
      return Collections.emptyMap();
    }
    try {
      return objectMapper.readValue(labelsJson, LABELS_TYPE);
    } catch (JsonProcessingException exception) {
      return Collections.emptyMap();
    }
  }

  private int weight(Integer value) {
    return value == null ? 100 : Math.min(1000, Math.max(1, value));
  }

  private int value(Integer value, int fallback) {
    return value == null ? fallback : Math.max(0, value);
  }

  private String first(String value, String fallback) {
    return StringUtils.hasText(value) ? value.trim() : fallback;
  }
}
