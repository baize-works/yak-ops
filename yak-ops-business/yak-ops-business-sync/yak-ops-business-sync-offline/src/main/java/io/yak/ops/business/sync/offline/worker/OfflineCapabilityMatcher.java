package io.yak.ops.business.sync.offline.worker;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineCapabilityProperties;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** 任务能力要求与 Worker Connector 能力快照匹配器。 */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineCapabilityMatcher {

  private final OfflineCapabilityProperties properties;
  private final ObjectMapper objectMapper;

  public OfflineCapabilityMatcher(
      OfflineCapabilityProperties properties,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  public MatchResult match(NodeRecord node, String requirementsJson) {
    if (node == null) {
      return MatchResult.reject("Worker 不存在");
    }
    if ("DYNAMIC".equalsIgnoreCase(node.getRegistrationMode())
        && (node.getLeaseExpiresAt() == null
            || !node.getLeaseExpiresAt().isAfter(LocalDateTime.now()))) {
      return MatchResult.reject("动态注册租约已过期");
    }
    if (!properties.isEnabled()) {
      return MatchResult.accept("能力调度已关闭", "{}");
    }
    JsonNode requirements = read(requirementsJson, "任务能力要求");
    JsonNode endpoints = requirements.path("endpoints");
    if (!endpoints.isArray() || endpoints.isEmpty()) {
      return MatchResult.accept("任务没有显式能力要求", "{}");
    }
    if (!"READY".equalsIgnoreCase(node.getCapabilityStatus())) {
      return MatchResult.reject("Connector 能力状态为 " + text(node.getCapabilityStatus(), "UNKNOWN"));
    }
    if (!StringUtils.hasText(node.getConnectorSchemasJson()) || node.getCapabilitySyncedAt() == null) {
      return MatchResult.reject("Worker 缺少 Connector 能力快照");
    }
    long age = Duration.between(node.getCapabilitySyncedAt(), LocalDateTime.now()).toMillis();
    if (age > Math.max(1_000L, properties.getMaxStaleMillis())) {
      return MatchResult.reject("Worker Connector 能力快照已过期");
    }

    JsonNode snapshot = read(node.getConnectorSchemasJson(), "Worker Connector 能力快照");
    String snapshotInstanceId = snapshot.path("workerInstanceId").asText(null);
    if (StringUtils.hasText(snapshotInstanceId)
        && StringUtils.hasText(node.getWorkerInstanceId())
        && !snapshotInstanceId.equals(node.getWorkerInstanceId())) {
      return MatchResult.reject("Connector 能力快照属于旧 Worker 进程");
    }
    String snapshotEngineVersion = snapshot.path("engineVersion").asText(null);
    if (StringUtils.hasText(snapshotEngineVersion)
        && StringUtils.hasText(node.getEngineVersion())
        && !snapshotEngineVersion.equals(node.getEngineVersion())) {
      return MatchResult.reject("Connector 能力快照属于旧引擎版本");
    }

    Map<String, JsonNode> available = index(snapshot.path("connectors"));
    ArrayNode matched = objectMapper.createArrayNode();
    List<String> descriptions = new ArrayList<>();

    for (JsonNode requirement : endpoints) {
      String connectorId = requirement.path("connectorId").asText("")
          .trim().toLowerCase(Locale.ROOT);
      String role = requirement.path("role").asText("")
          .trim().toUpperCase(Locale.ROOT);
      JsonNode connector = available.get(key(connectorId, role));
      if (connector == null) {
        return MatchResult.reject("缺少 Connector " + connectorId + "/" + role);
      }

      String requiredFingerprint = requirement.path("schemaFingerprint").asText("");
      String actualFingerprint = connector.path("schemaFingerprint").asText("");
      if (properties.isStrictSchemaFingerprint()
          && StringUtils.hasText(requiredFingerprint)
          && !requiredFingerprint.equals(actualFingerprint)) {
        return MatchResult.reject(
            connectorId + "/" + role + " Schema 指纹不一致，任务="
                + requiredFingerprint + "，Worker=" + actualFingerprint);
      }

      Set<String> actualCapabilities = values(connector.path("capabilities"));
      Set<String> requiredCapabilities = values(requirement.path("capabilities"));
      Set<String> missing = new TreeSet<>(requiredCapabilities);
      missing.removeAll(actualCapabilities);
      if (!missing.isEmpty()) {
        return MatchResult.reject(
            connectorId + "/" + role + " 缺少能力 " + String.join(",", missing));
      }

      ObjectNode item = objectMapper.createObjectNode();
      item.put("connectorId", connectorId);
      item.put("role", role);
      item.put("schemaVersion", connector.path("schemaVersion").asText(""));
      item.put("schemaFingerprint", actualFingerprint);
      item.set("requiredCapabilities", requirement.path("capabilities").deepCopy());
      item.set("workerCapabilities", connector.path("capabilities").deepCopy());
      matched.add(item);
      descriptions.add(connectorId + "/" + role);
    }

    ObjectNode assigned = objectMapper.createObjectNode();
    assigned.put("workerInstanceId", node.getWorkerInstanceId());
    assigned.put("engineVersion", node.getEngineVersion());
    assigned.put("capabilityDigest", node.getCapabilityDigest());
    assigned.put("capabilitySyncedAt", node.getCapabilitySyncedAt().toString());
    assigned.set("connectors", matched);
    return MatchResult.accept(
        "能力匹配：" + String.join("、", descriptions), write(assigned));
  }

  private Map<String, JsonNode> index(JsonNode connectors) {
    Map<String, JsonNode> result = new HashMap<>();
    if (!connectors.isArray()) {
      return result;
    }
    for (JsonNode connector : connectors) {
      String connectorId = connector.path("connectorId").asText("")
          .trim().toLowerCase(Locale.ROOT);
      String role = connector.path("role").asText("")
          .trim().toUpperCase(Locale.ROOT);
      if (StringUtils.hasText(connectorId) && StringUtils.hasText(role)) {
        result.put(key(connectorId, role), connector);
      }
    }
    return result;
  }

  private Set<String> values(JsonNode values) {
    Set<String> result = new HashSet<>();
    if (values != null && values.isArray()) {
      for (JsonNode value : values) {
        if (StringUtils.hasText(value.asText())) {
          result.add(value.asText().trim().toUpperCase(Locale.ROOT));
        }
      }
    }
    return result;
  }

  private JsonNode read(String value, String name) {
    if (!StringUtils.hasText(value)) {
      return objectMapper.createObjectNode();
    }
    try {
      return objectMapper.readTree(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException(name + "已损坏", exception);
    }
  }

  private String write(JsonNode value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化能力匹配结果失败", exception);
    }
  }

  private String key(String connectorId, String role) {
    return connectorId + ":" + role;
  }

  private String text(String value, String fallback) {
    return StringUtils.hasText(value) ? value : fallback;
  }

  public static final class MatchResult {
    private final boolean matched;
    private final String reason;
    private final String assignedCapabilitiesJson;

    private MatchResult(boolean matched, String reason, String assignedCapabilitiesJson) {
      this.matched = matched;
      this.reason = reason;
      this.assignedCapabilitiesJson = assignedCapabilitiesJson;
    }

    public static MatchResult accept(String reason, String assignedCapabilitiesJson) {
      return new MatchResult(true, reason, assignedCapabilitiesJson);
    }

    public static MatchResult reject(String reason) {
      return new MatchResult(false, reason, null);
    }

    public boolean isMatched() { return matched; }
    public String getReason() { return reason; }
    public String getAssignedCapabilitiesJson() { return assignedCapabilitiesJson; }
  }
}
