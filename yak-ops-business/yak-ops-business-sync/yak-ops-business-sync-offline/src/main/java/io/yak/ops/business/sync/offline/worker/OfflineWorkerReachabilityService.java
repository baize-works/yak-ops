package io.yak.ops.business.sync.offline.worker;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineCapabilityProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpRequestException;
import io.yak.ops.business.sync.offline.engine.LinkUpConnectorPreflightClient;
import io.yak.ops.business.sync.offline.repository.OfflineDefinitionCatalogRepository.DefinitionVersion;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerPreflightRepository;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerPreflightRepository.PreflightRecord;
import io.yak.ops.business.sync.offline.service.OfflineJobDefinitionService;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 运行前从候选 Link-Up Worker 视角预检任务 Source/Sink 外部系统可达性。
 *
 * <p>实际 Connector options 只在内存和 HTTPS/HTTP 请求中使用；数据库仅保存 SHA-256 摘要、
 * 状态、耗时和脱敏错误。远程预热必须发生在执行领取事务之前；领取事务只重算摘要并读取缓存。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Service
public class OfflineWorkerReachabilityService {

  private final OfflineJobDefinitionService definitionService;
  private final OfflineNodeRepository nodeRepository;
  private final OfflineWorkerPreflightRepository preflightRepository;
  private final OfflineCapabilityMatcher capabilityMatcher;
  private final OfflineCapabilityRequirementResolver capabilityResolver;
  private final LinkUpConnectorPreflightClient preflightClient;
  private final OfflineCapabilityProperties properties;
  private final ObjectMapper objectMapper;

  public OfflineWorkerReachabilityService(
      OfflineJobDefinitionService definitionService,
      OfflineNodeRepository nodeRepository,
      OfflineWorkerPreflightRepository preflightRepository,
      OfflineCapabilityMatcher capabilityMatcher,
      OfflineCapabilityRequirementResolver capabilityResolver,
      LinkUpConnectorPreflightClient preflightClient,
      OfflineCapabilityProperties properties,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.definitionService = definitionService;
    this.nodeRepository = nodeRepository;
    this.preflightRepository = preflightRepository;
    this.capabilityMatcher = capabilityMatcher;
    this.capabilityResolver = capabilityResolver;
    this.preflightClient = preflightClient;
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  /**
   * 远程预热候选 Worker。该方法由执行门面在进入领取事务前调用。
   *
   * @return 不包含凭据明文的预检摘要要求
   */
  public String preheat(Long definitionId) {
    if (!properties.isReachabilityEnabled()) {
      return emptyPlan("DISABLED");
    }

    OfflineJobDefinitionPO definition = definitionService.require(definitionId);
    DefinitionVersion version = definitionService.requireCurrentVersion(definition);
    PreflightPlan plan = buildPlan(definition, version);
    String capabilityRequirements = capabilityRequirements(definition, version);

    List<NodeRecord> candidates = candidateNodes(definition, capabilityRequirements);
    int limit = Math.max(1, properties.getReachabilityMaxWorkers());
    int processed = 0;
    for (NodeRecord node : candidates) {
      if (processed++ >= limit) {
        break;
      }
      for (EndpointPlan endpoint : plan.endpoints) {
        refreshIfNeeded(node, endpoint);
      }
    }

    preflightRepository.deleteExpired(
        LocalDateTime.now().minusNanos(
            Math.max(60_000L, properties.getReachabilityRetentionMillis()) * 1_000_000L));
    return plan.requirementsJson;
  }

  /**
   * 只从数据库和不可变 JobSpec 计算预检摘要，不发起远程请求，可在领取事务内调用。
   */
  public String requirements(
      OfflineJobDefinitionPO definition,
      DefinitionVersion version) {
    if (!properties.isReachabilityEnabled()) {
      return emptyPlan("DISABLED");
    }
    return buildPlan(definition, version).requirementsJson;
  }

  private PreflightPlan buildPlan(
      OfflineJobDefinitionPO definition,
      DefinitionVersion version) {
    if (definition == null || version == null) {
      throw new IllegalArgumentException("任务定义和版本不能为空");
    }
    String resolvedJobSpecJson = definitionService.resolveExecutionJobSpec(version);
    JsonNode jobSpec = read(resolvedJobSpecJson, "执行 JobSpec");
    List<EndpointPlan> endpoints = List.of(
        endpoint(jobSpec.path("source"), "SOURCE"),
        endpoint(jobSpec.path("sink"), "SINK"));
    return new PreflightPlan(endpoints, plan(endpoints, "REQUIRED"));
  }

  private String capabilityRequirements(
      OfflineJobDefinitionPO definition,
      DefinitionVersion version) {
    return StringUtils.hasText(version.getCapabilityRequirementsJson())
        ? version.getCapabilityRequirementsJson()
        : StringUtils.hasText(definition.getCapabilityRequirementsJson())
            ? definition.getCapabilityRequirementsJson()
            : capabilityResolver.resolve(definitionService.resolveLogicalJobSpec(version));
  }

  private List<NodeRecord> candidateNodes(
      OfflineJobDefinitionPO definition,
      String capabilityRequirements) {
    List<NodeRecord> result = new ArrayList<>();
    boolean manual = "MANUAL".equalsIgnoreCase(definition.getWorkerSelectMode());
    for (NodeRecord node : nodeRepository.listAll()) {
      if (manual && !node.getNodeId().equals(definition.getWorkerNodeId())) {
        continue;
      }
      if (!Boolean.TRUE.equals(node.getEnabled())
          || !"ENABLED".equalsIgnoreCase(node.getSchedulingStatus())
          || !"UP".equalsIgnoreCase(node.getStatus())
          || !Boolean.TRUE.equals(node.getOfflineOnly())) {
        continue;
      }
      if (!capabilityMatcher.match(node, capabilityRequirements).isMatched()) {
        continue;
      }
      result.add(node);
    }
    result.sort(Comparator.comparing(NodeRecord::getNodeId));
    return result;
  }

  private void refreshIfNeeded(NodeRecord node, EndpointPlan endpoint) {
    PreflightRecord existing = preflightRepository.find(
        node.getNodeId(),
        endpoint.connectorId,
        endpoint.role,
        endpoint.optionsDigest);
    if (fresh(existing)) {
      return;
    }

    LocalDateTime checkedAt = LocalDateTime.now();
    try {
      JsonNode response = preflightClient.preflight(
          node.getBaseUrl(),
          endpoint.connectorId,
          endpoint.role,
          endpoint.options);
      preflightRepository.save(PreflightRecord.builder()
          .nodeId(node.getNodeId())
          .connectorId(endpoint.connectorId)
          .role(endpoint.role)
          .optionsDigest(endpoint.optionsDigest)
          .status("REACHABLE")
          .durationMillis(response.path("durationMillis").isNumber()
              ? response.path("durationMillis").asLong() : null)
          .checkedAt(checkedAt)
          .build());
    } catch (LinkUpRequestException exception) {
      preflightRepository.save(PreflightRecord.builder()
          .nodeId(node.getNodeId())
          .connectorId(endpoint.connectorId)
          .role(endpoint.role)
          .optionsDigest(endpoint.optionsDigest)
          .status(unsupported(exception) ? "UNSUPPORTED" : "UNREACHABLE")
          .errorCode(exception.getCode())
          .errorMessage(concise(exception.getMessage()))
          .checkedAt(checkedAt)
          .build());
    } catch (RuntimeException exception) {
      preflightRepository.save(PreflightRecord.builder()
          .nodeId(node.getNodeId())
          .connectorId(endpoint.connectorId)
          .role(endpoint.role)
          .optionsDigest(endpoint.optionsDigest)
          .status("UNREACHABLE")
          .errorCode(exception.getClass().getSimpleName())
          .errorMessage(concise(exception.getMessage()))
          .checkedAt(checkedAt)
          .build());
    }
  }

  private boolean fresh(PreflightRecord record) {
    if (record == null || record.getCheckedAt() == null) {
      return false;
    }
    long age = Duration.between(record.getCheckedAt(), LocalDateTime.now()).toMillis();
    return age <= Math.max(1_000L, properties.getReachabilityMaxStaleMillis());
  }

  private boolean unsupported(LinkUpRequestException exception) {
    String code = exception.getCode() == null ? "" : exception.getCode().toUpperCase(Locale.ROOT);
    return exception.getStatusCode() == 404
        || exception.getStatusCode() == 422
        || exception.getStatusCode() == 501
        || code.contains("UNSUPPORTED")
        || code.contains("DISABLED");
  }

  private EndpointPlan endpoint(JsonNode endpoint, String role) {
    if (endpoint == null || !endpoint.isObject()) {
      throw new IllegalStateException(role + " JobSpec 不完整");
    }
    String connectorId = endpoint.path("connectorId").asText("")
        .trim().toLowerCase(Locale.ROOT);
    if (!StringUtils.hasText(connectorId)) {
      throw new IllegalStateException(role + " JobSpec 缺少 connectorId");
    }
    JsonNode options = endpoint.path("options");
    JsonNode safeOptions = options.isObject() ? options.deepCopy() : objectMapper.createObjectNode();
    String canonical = write(canonical(safeOptions));
    String optionsDigest = digest(connectorId + "|" + role + "|" + canonical);
    return new EndpointPlan(connectorId, role, safeOptions, optionsDigest);
  }

  private String plan(List<EndpointPlan> endpoints, String status) {
    ObjectNode plan = objectMapper.createObjectNode();
    plan.put("version", "1");
    plan.put("status", status);
    ArrayNode values = plan.putArray("endpoints");
    for (EndpointPlan endpoint : endpoints) {
      ObjectNode value = objectMapper.createObjectNode();
      value.put("connectorId", endpoint.connectorId);
      value.put("role", endpoint.role);
      value.put("optionsDigest", endpoint.optionsDigest);
      values.add(value);
    }
    return write(plan);
  }

  private String emptyPlan(String status) {
    ObjectNode plan = objectMapper.createObjectNode();
    plan.put("version", "1");
    plan.put("status", status);
    plan.putArray("endpoints");
    return write(plan);
  }

  private JsonNode canonical(JsonNode value) {
    if (value == null || value.isNull()) {
      return objectMapper.nullNode();
    }
    if (value.isArray()) {
      ArrayNode result = objectMapper.createArrayNode();
      for (JsonNode item : value) {
        result.add(canonical(item));
      }
      return result;
    }
    if (value.isObject()) {
      ObjectNode result = objectMapper.createObjectNode();
      Map<String, JsonNode> sorted = new TreeMap<>();
      value.fields().forEachRemaining(entry -> sorted.put(entry.getKey(), entry.getValue()));
      sorted.forEach((key, item) -> result.set(key, canonical(item)));
      return result;
    }
    return value.deepCopy();
  }

  private JsonNode read(String value, String name) {
    if (!StringUtils.hasText(value)) {
      throw new IllegalStateException(name + "为空");
    }
    try {
      JsonNode parsed = objectMapper.readTree(value);
      if (parsed == null || !parsed.isObject()) {
        throw new IllegalStateException(name + "不是 JSON 对象");
      }
      return parsed;
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException(name + "已损坏", exception);
    }
  }

  private String write(JsonNode value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化 Worker 预检计划失败", exception);
    }
  }

  private String digest(String value) {
    try {
      byte[] bytes = MessageDigest.getInstance("SHA-256")
          .digest(value.getBytes(StandardCharsets.UTF_8));
      return "sha256:" + HexFormat.of().formatHex(bytes);
    } catch (Exception exception) {
      throw new IllegalStateException("生成 Worker 预检摘要失败", exception);
    }
  }

  private String concise(String value) {
    if (!StringUtils.hasText(value)) {
      return "Connector 预检失败";
    }
    String sanitized = value.replaceAll(
        "(?i)(password|passwd|pwd)\\s*[=:]\\s*[^,;\\s]+",
        "$1=***");
    return sanitized.length() <= 2000 ? sanitized : sanitized.substring(0, 2000);
  }

  private static final class PreflightPlan {
    private final List<EndpointPlan> endpoints;
    private final String requirementsJson;

    private PreflightPlan(List<EndpointPlan> endpoints, String requirementsJson) {
      this.endpoints = endpoints;
      this.requirementsJson = requirementsJson;
    }
  }

  private static final class EndpointPlan {
    private final String connectorId;
    private final String role;
    private final JsonNode options;
    private final String optionsDigest;

    private EndpointPlan(
        String connectorId,
        String role,
        JsonNode options,
        String optionsDigest) {
      this.connectorId = connectorId;
      this.role = role;
      this.options = options;
      this.optionsDigest = optionsDigest;
    }
  }
}
