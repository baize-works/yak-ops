package io.yak.ops.business.sync.offline.worker;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.service.OfflineWorkerRegistry;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 离线任务 Worker 选择器。
 *
 * <p>先执行健康、调度状态、心跳新鲜度、标签和容量硬过滤，再按即时并发余量、
 * 总容量余量和管理权重计算可解释得分。选择过程只读取控制面快照，不在数据库事务中
 * 发起远程请求。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineWorkerScheduler {

  private static final TypeReference<Map<String, String>> LABELS_TYPE =
      new TypeReference<Map<String, String>>() { };

  private final OfflineNodeRepository repository;
  private final OfflineWorkerRegistry registry;
  private final OfflineSyncProperties properties;
  private final ObjectMapper objectMapper;

  public OfflineWorkerScheduler(
      OfflineNodeRepository repository,
      OfflineWorkerRegistry registry,
      OfflineSyncProperties properties,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.repository = repository;
    this.registry = registry;
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  public PolicyProjection normalize(JsonNode worker) {
    String mode = normalizeMode(text(worker, "mode", "AUTO"));
    String nodeId = trim(text(worker, "nodeId", null));
    Map<String, String> labels = readLabels(worker == null ? null : worker.get("requiredLabels"));
    if ("MANUAL".equals(mode) && !StringUtils.hasText(nodeId)) {
      throw new IllegalArgumentException("手动 Worker 模式必须选择执行节点");
    }
    return new PolicyProjection(mode, nodeId, writeLabels(labels), labels);
  }

  public PolicyProjection projection(OfflineJobDefinitionPO definition) {
    if (definition == null) {
      throw new IllegalArgumentException("任务定义不能为空");
    }
    String mode = normalizeMode(definition.getWorkerSelectMode());
    String nodeId = trim(definition.getWorkerNodeId());
    Map<String, String> labels = readLabels(definition.getWorkerRequiredLabelsJson());
    if ("MANUAL".equals(mode) && !StringUtils.hasText(nodeId)) {
      throw new IllegalStateException("任务配置为手动 Worker，但未指定 nodeId");
    }
    return new PolicyProjection(mode, nodeId, writeLabels(labels), labels);
  }

  /** 保存和上线前验证稳定引用；节点当前离线不阻止维护任务定义。 */
  public void validateDefinition(OfflineJobDefinitionPO definition) {
    PolicyProjection policy = projection(definition);
    if ("MANUAL".equals(policy.getMode())
        && repository.find(policy.getNodeId()) == null) {
      throw new IllegalStateException("指定的 Link-Up Worker 不存在：" + policy.getNodeId());
    }
  }

  public String nodeName(String nodeId) {
    if (!StringUtils.hasText(nodeId)) {
      return null;
    }
    NodeRecord node = repository.find(nodeId);
    return node == null ? null : node.getNodeName();
  }

  public Map<String, String> labels(String labelsJson) {
    return readLabels(labelsJson);
  }

  public Assignment select(OfflineJobDefinitionPO definition) {
    registry.ensureConfiguredWorker();
    PolicyProjection policy = projection(definition);
    List<NodeRecord> nodes = repository.listAll();
    if ("MANUAL".equals(policy.getMode())) {
      return selectManual(policy, nodes);
    }
    return selectAuto(policy, nodes);
  }

  private Assignment selectManual(PolicyProjection policy, List<NodeRecord> nodes) {
    NodeRecord selected = nodes.stream()
        .filter(node -> Objects.equals(policy.getNodeId(), node.getNodeId()))
        .findFirst()
        .orElseThrow(() -> new IllegalStateException(
            "指定的 Link-Up Worker 不存在：" + policy.getNodeId()));
    Candidate candidate = evaluate(selected, policy.getRequiredLabels());
    if (!candidate.isEligible()) {
      throw new IllegalStateException(
          "指定的 Link-Up Worker 当前不可调度：" + candidate.getRejectionReason());
    }
    List<Candidate> snapshot = nodes.stream()
        .map(node -> evaluate(node, policy.getRequiredLabels()))
        .collect(Collectors.toList());
    candidate.setSelected(true);
    return assignment(
        candidate,
        "MANUAL",
        "手动指定 Worker " + selected.getNodeName() + "（" + selected.getNodeId() + "）",
        snapshot);
  }

  private Assignment selectAuto(PolicyProjection policy, List<NodeRecord> nodes) {
    List<Candidate> candidates = nodes.stream()
        .map(node -> evaluate(node, policy.getRequiredLabels()))
        .collect(Collectors.toList());
    List<Candidate> eligible = candidates.stream()
        .filter(Candidate::isEligible)
        .sorted(candidateComparator())
        .collect(Collectors.toList());
    if (eligible.isEmpty()) {
      String rejected = candidates.stream()
          .limit(5)
          .map(candidate -> candidate.getNode().getNodeId() + "=" + candidate.getRejectionReason())
          .collect(Collectors.joining("；"));
      throw new IllegalStateException(
          "没有可调度的 Link-Up Worker" + (StringUtils.hasText(rejected) ? "：" + rejected : ""));
    }
    Candidate selected = eligible.get(0);
    selected.setSelected(true);
    String reason = String.format(
        Locale.ROOT,
        "AUTO 评分 %.3f：即时并发余量 %.1f%%，总容量余量 %.1f%%，权重 %d；候选 %d/%d",
        selected.getScore(),
        selected.getRunningHeadroom() * 100D,
        selected.getTotalHeadroom() * 100D,
        value(selected.getNode().getWeight(), 100),
        eligible.size(),
        candidates.size());
    return assignment(selected, "AUTO", reason, candidates);
  }

  private Assignment assignment(
      Candidate selected,
      String mode,
      String reason,
      List<Candidate> candidates) {
    return new Assignment(
        selected.getNode(),
        mode,
        selected.getScore(),
        reason,
        writeCandidates(candidates));
  }

  private Candidate evaluate(NodeRecord node, Map<String, String> requiredLabels) {
    Candidate candidate = new Candidate(node);
    if (!Boolean.TRUE.equals(node.getEnabled())) {
      return candidate.reject("节点已禁用");
    }
    if (!"ENABLED".equalsIgnoreCase(node.getSchedulingStatus())) {
      return candidate.reject("节点处于" + node.getSchedulingStatus() + "状态");
    }
    if (!"UP".equalsIgnoreCase(node.getStatus())) {
      return candidate.reject("节点健康状态为" + node.getStatus());
    }
    if (!Boolean.TRUE.equals(node.getOfflineOnly())) {
      return candidate.reject("节点不是离线专用 Worker");
    }
    if (heartbeatStale(node.getLastHeartbeatTime())) {
      return candidate.reject("节点心跳已过期");
    }
    Map<String, String> nodeLabels = readLabels(node.getLabelsJson());
    for (Map.Entry<String, String> required : requiredLabels.entrySet()) {
      if (!Objects.equals(required.getValue(), nodeLabels.get(required.getKey()))) {
        return candidate.reject(
            "缺少标签 " + required.getKey() + "=" + required.getValue());
      }
    }

    int maxRunning = Math.max(1, value(node.getMaxConcurrentJobs(), 1));
    int maxQueued = Math.max(0, value(node.getMaxQueuedJobs(), 0));
    int running = Math.max(0, value(node.getRunningJobs(), 0));
    int queued = Math.max(0, value(node.getQueuedJobs(), 0));
    if (running >= maxRunning && queued >= maxQueued) {
      return candidate.reject("并发和等待队列均已满");
    }

    int totalCapacity = Math.max(1, maxRunning + maxQueued);
    int active = Math.max(0, running + queued);
    double runningHeadroom = clamp((double) (maxRunning - running) / maxRunning);
    double totalHeadroom = clamp((double) (totalCapacity - active) / totalCapacity);
    double weightScore = clamp((double) value(node.getWeight(), 100) / 1000D);
    double score = runningHeadroom * 55D + totalHeadroom * 35D + weightScore * 10D;
    candidate.accept(score, runningHeadroom, totalHeadroom, nodeLabels);
    return candidate;
  }

  private Comparator<Candidate> candidateComparator() {
    return Comparator.comparingDouble(Candidate::getScore).reversed()
        .thenComparingInt(candidate -> value(candidate.getNode().getQueuedJobs(), 0))
        .thenComparingInt(candidate -> value(candidate.getNode().getRunningJobs(), 0))
        .thenComparing(
            candidate -> value(candidate.getNode().getWeight(), 100),
            Comparator.reverseOrder())
        .thenComparing(candidate -> candidate.getNode().getNodeId());
  }

  private boolean heartbeatStale(LocalDateTime heartbeat) {
    if (heartbeat == null) {
      return true;
    }
    long staleAfter = Math.max(
        30_000L,
        Math.max(
            properties.getControl().getHeartbeatDelayMillis() * 3L,
            properties.getControl().getLostAfterMillis()));
    return heartbeat.isBefore(LocalDateTime.now().minusNanos(staleAfter * 1_000_000L));
  }

  private String writeCandidates(List<Candidate> candidates) {
    List<Map<String, Object>> snapshot = new ArrayList<>();
    for (Candidate candidate : candidates) {
      NodeRecord node = candidate.getNode();
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("nodeId", node.getNodeId());
      item.put("nodeName", node.getNodeName());
      item.put("baseUrl", node.getBaseUrl());
      item.put("eligible", candidate.isEligible());
      item.put("selected", candidate.isSelected());
      item.put("score", candidate.getScore());
      item.put("reason", candidate.getRejectionReason());
      item.put("weight", value(node.getWeight(), 100));
      item.put("runningJobs", value(node.getRunningJobs(), 0));
      item.put("maxConcurrentJobs", value(node.getMaxConcurrentJobs(), 1));
      item.put("queuedJobs", value(node.getQueuedJobs(), 0));
      item.put("maxQueuedJobs", value(node.getMaxQueuedJobs(), 0));
      item.put("labels", candidate.getNodeLabels());
      snapshot.add(item);
    }
    try {
      return objectMapper.writeValueAsString(snapshot);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化 Worker 候选快照失败", exception);
    }
  }

  private Map<String, String> readLabels(JsonNode labels) {
    if (labels == null || labels.isNull() || labels.isMissingNode()) {
      return Collections.emptyMap();
    }
    if (!labels.isObject()) {
      throw new IllegalArgumentException("Worker 标签条件必须是 JSON 对象");
    }
    Map<String, String> result = new LinkedHashMap<>();
    labels.fields().forEachRemaining(entry -> {
      if (StringUtils.hasText(entry.getKey())) {
        result.put(entry.getKey().trim(), entry.getValue().asText("").trim());
      }
    });
    return result;
  }

  private Map<String, String> readLabels(String labelsJson) {
    if (!StringUtils.hasText(labelsJson)) {
      return Collections.emptyMap();
    }
    try {
      return objectMapper.readValue(labelsJson, LABELS_TYPE);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Worker 标签 JSON 已损坏", exception);
    }
  }

  private String writeLabels(Map<String, String> labels) {
    try {
      return objectMapper.writeValueAsString(labels == null ? Collections.emptyMap() : labels);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化 Worker 标签条件失败", exception);
    }
  }

  private String normalizeMode(String mode) {
    String normalized = StringUtils.hasText(mode)
        ? mode.trim().toUpperCase(Locale.ROOT)
        : "AUTO";
    if (!"AUTO".equals(normalized) && !"MANUAL".equals(normalized)) {
      throw new IllegalArgumentException("不支持的 Worker 选择模式：" + mode);
    }
    return normalized;
  }

  private String text(JsonNode node, String field, String fallback) {
    if (node == null || node.isNull() || node.isMissingNode()) {
      return fallback;
    }
    JsonNode value = node.get(field);
    return value == null || value.isNull() ? fallback : value.asText(fallback);
  }

  private String trim(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private int value(Integer value, int fallback) {
    return value == null ? fallback : value;
  }

  private double clamp(double value) {
    return Math.max(0D, Math.min(1D, value));
  }

  public static final class PolicyProjection {
    private final String mode;
    private final String nodeId;
    private final String requiredLabelsJson;
    private final Map<String, String> requiredLabels;

    public PolicyProjection(
        String mode,
        String nodeId,
        String requiredLabelsJson,
        Map<String, String> requiredLabels) {
      this.mode = mode;
      this.nodeId = nodeId;
      this.requiredLabelsJson = requiredLabelsJson;
      this.requiredLabels = requiredLabels;
    }

    public String getMode() { return mode; }
    public String getNodeId() { return nodeId; }
    public String getRequiredLabelsJson() { return requiredLabelsJson; }
    public Map<String, String> getRequiredLabels() { return requiredLabels; }
  }

  public static final class Assignment {
    private final NodeRecord node;
    private final String mode;
    private final double score;
    private final String reason;
    private final String candidatesJson;

    public Assignment(
        NodeRecord node,
        String mode,
        double score,
        String reason,
        String candidatesJson) {
      this.node = node;
      this.mode = mode;
      this.score = score;
      this.reason = reason;
      this.candidatesJson = candidatesJson;
    }

    public NodeRecord getNode() { return node; }
    public String getMode() { return mode; }
    public double getScore() { return score; }
    public String getReason() { return reason; }
    public String getCandidatesJson() { return candidatesJson; }
  }

  private static final class Candidate {
    private final NodeRecord node;
    private boolean eligible;
    private boolean selected;
    private double score;
    private double runningHeadroom;
    private double totalHeadroom;
    private String rejectionReason;
    private Map<String, String> nodeLabels = Collections.emptyMap();

    private Candidate(NodeRecord node) {
      this.node = node;
    }

    private Candidate reject(String reason) {
      this.eligible = false;
      this.rejectionReason = reason;
      return this;
    }

    private void accept(
        double score,
        double runningHeadroom,
        double totalHeadroom,
        Map<String, String> nodeLabels) {
      this.eligible = true;
      this.score = score;
      this.runningHeadroom = runningHeadroom;
      this.totalHeadroom = totalHeadroom;
      this.nodeLabels = nodeLabels;
    }

    private NodeRecord getNode() { return node; }
    private boolean isEligible() { return eligible; }
    private boolean isSelected() { return selected; }
    private void setSelected(boolean selected) { this.selected = selected; }
    private double getScore() { return score; }
    private double getRunningHeadroom() { return runningHeadroom; }
    private double getTotalHeadroom() { return totalHeadroom; }
    private String getRejectionReason() { return rejectionReason; }
    private Map<String, String> getNodeLabels() { return nodeLabels; }
  }
}
