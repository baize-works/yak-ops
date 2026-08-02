package io.yak.ops.business.sync.offline.worker;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineCapabilityProperties;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerPreflightRepository;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerPreflightRepository.PreflightRecord;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** 调度事务内只读 Worker 预检短缓存，不发起远程请求。 */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineReachabilityMatcher {

  private final OfflineWorkerPreflightRepository repository;
  private final OfflineCapabilityProperties properties;
  private final ObjectMapper objectMapper;

  public OfflineReachabilityMatcher(
      OfflineWorkerPreflightRepository repository,
      OfflineCapabilityProperties properties,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.repository = repository;
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  public MatchResult match(String nodeId, String requirementsJson) {
    if (!properties.isReachabilityEnabled()) {
      return MatchResult.accept("Worker 可达性预检已关闭", "{}");
    }
    JsonNode requirements = read(requirementsJson);
    JsonNode endpoints = requirements.path("endpoints");
    if (!endpoints.isArray() || endpoints.isEmpty()) {
      return MatchResult.accept("任务没有可达性预检要求", "{}");
    }

    boolean required = properties.isReachabilityRequired();
    ArrayNode assigned = objectMapper.createArrayNode();
    List<String> messages = new ArrayList<>();
    for (JsonNode endpoint : endpoints) {
      String connectorId = endpoint.path("connectorId").asText("")
          .trim().toLowerCase(Locale.ROOT);
      String role = endpoint.path("role").asText("")
          .trim().toUpperCase(Locale.ROOT);
      String optionsDigest = endpoint.path("optionsDigest").asText("").trim();
      PreflightRecord record = repository.find(nodeId, connectorId, role, optionsDigest);
      String failure = failure(record);
      if (failure != null && required) {
        return MatchResult.reject(connectorId + "/" + role + " " + failure);
      }

      ObjectNode evidence = objectMapper.createObjectNode();
      evidence.put("connectorId", connectorId);
      evidence.put("role", role);
      evidence.put("optionsDigest", optionsDigest);
      evidence.put("status", record == null ? "MISSING" : record.getStatus());
      if (record != null) {
        evidence.put("durationMillis", record.getDurationMillis());
        evidence.put(
            "checkedAt",
            record.getCheckedAt() == null ? null : record.getCheckedAt().toString());
        evidence.put("errorCode", record.getErrorCode());
        evidence.put("errorMessage", record.getErrorMessage());
      }
      assigned.add(evidence);
      messages.add(
          connectorId + "/" + role + "="
              + (failure == null ? "REACHABLE" : "BEST_EFFORT(" + failure + ")"));
    }

    ObjectNode result = objectMapper.createObjectNode();
    result.put("nodeId", nodeId);
    result.put("required", required);
    result.set("endpoints", assigned);
    return MatchResult.accept(
        "可达性预检：" + String.join("、", messages),
        write(result));
  }

  private String failure(PreflightRecord record) {
    if (record == null) {
      return "缺少预检结果";
    }
    if (record.getCheckedAt() == null) {
      return "预检结果缺少时间";
    }
    long age = Duration.between(record.getCheckedAt(), LocalDateTime.now()).toMillis();
    if (age > Math.max(1_000L, properties.getReachabilityMaxStaleMillis())) {
      return "预检结果已过期";
    }
    if (!"REACHABLE".equalsIgnoreCase(record.getStatus())) {
      return "预检状态为 " + record.getStatus()
          + (StringUtils.hasText(record.getErrorMessage())
              ? "：" + record.getErrorMessage() : "");
    }
    return null;
  }

  private JsonNode read(String value) {
    if (!StringUtils.hasText(value)) {
      return objectMapper.createObjectNode();
    }
    try {
      JsonNode parsed = objectMapper.readTree(value);
      return parsed == null ? objectMapper.createObjectNode() : parsed;
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Worker 可达性要求 JSON 已损坏", exception);
    }
  }

  private String write(JsonNode value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化 Worker 可达性证据失败", exception);
    }
  }

  public static final class MatchResult {
    private final boolean matched;
    private final String reason;
    private final String assignedReachabilityJson;

    private MatchResult(boolean matched, String reason, String assignedReachabilityJson) {
      this.matched = matched;
      this.reason = reason;
      this.assignedReachabilityJson = assignedReachabilityJson;
    }

    public static MatchResult accept(String reason, String assignedReachabilityJson) {
      return new MatchResult(true, reason, assignedReachabilityJson);
    }

    public static MatchResult reject(String reason) {
      return new MatchResult(false, reason, null);
    }

    public boolean isMatched() {
      return matched;
    }

    public String getReason() {
      return reason;
    }

    public String getAssignedReachabilityJson() {
      return assignedReachabilityJson;
    }
  }
}
