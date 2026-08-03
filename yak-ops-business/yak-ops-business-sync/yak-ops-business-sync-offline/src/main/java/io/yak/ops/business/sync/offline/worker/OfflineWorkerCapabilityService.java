package io.yak.ops.business.sync.offline.worker;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineCapabilityProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpConnectorSchemaClient;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.CapabilityView;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.ConnectorCapabilityView;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.OptionView;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.WorkerView;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Worker Connector 能力摘要服务。
 *
 * <p>CONFIG/MANUAL 节点由 Yak Ops 拉取；DYNAMIC 节点由签名注册心跳推送。
 * 调度事务始终只读取数据库快照。
 */
@ConditionalOnOfflineSyncEnabled
@Service
public class OfflineWorkerCapabilityService {

  private static final Logger LOG = LoggerFactory.getLogger(OfflineWorkerCapabilityService.class);

  private final OfflineNodeRepository repository;
  private final LinkUpConnectorSchemaClient schemaClient;
  private final OfflineCapabilityProperties properties;
  private final ObjectMapper objectMapper;

  public OfflineWorkerCapabilityService(
      OfflineNodeRepository repository,
      LinkUpConnectorSchemaClient schemaClient,
      OfflineCapabilityProperties properties,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.repository = repository;
    this.schemaClient = schemaClient;
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  @Scheduled(
      initialDelayString = "${yak.sync.offline.capability.initial-delay-millis:10000}",
      fixedDelayString = "${yak.sync.offline.capability.refresh-delay-millis:60000}")
  public void scheduledRefresh() {
    if (!properties.isEnabled()) {
      return;
    }
    for (NodeRecord node : repository.listCapabilityRefreshTargets()) {
      try {
        refresh(node, false);
      } catch (RuntimeException exception) {
        LOG.debug("Refresh Worker capability failed, nodeId={}", node.getNodeId(), exception);
      }
    }
  }

  public NodeRecord refresh(String nodeId, boolean force) {
    NodeRecord node = repository.find(nodeId);
    if (node == null) {
      throw new IllegalArgumentException("Link-Up Worker 不存在：" + nodeId);
    }
    refresh(node, force);
    return repository.find(nodeId);
  }

  public CapabilityView refreshView(String nodeId) {
    return view(refresh(nodeId, true));
  }

  public CapabilityView get(String nodeId) {
    NodeRecord node = repository.find(nodeId);
    if (node == null) {
      throw new IllegalArgumentException("Link-Up Worker 不存在：" + nodeId);
    }
    return view(node);
  }

  public WorkerView enrich(WorkerView worker) {
    if (worker == null || !StringUtils.hasText(worker.getNodeId())) {
      return worker;
    }
    NodeRecord node = repository.find(worker.getNodeId());
    if (node == null) {
      return worker;
    }
    CapabilityView capability = view(node);
    worker.setCapabilityStatus(capability.getStatus());
    worker.setCapabilityDigest(capability.getDigest());
    worker.setCapabilitySyncedAt(capability.getSyncedAt());
    worker.setCapabilityErrorMessage(capability.getErrorMessage());
    worker.setConnectors(capability.getConnectors());
    worker.setConnectorCount(capability.getConnectors().size());
    worker.setAvailable(
        Boolean.TRUE.equals(worker.getAvailable())
            && Boolean.TRUE.equals(capability.getFresh()));
    return worker;
  }

  public OptionView enrich(OptionView option) {
    if (option == null || !StringUtils.hasText(option.getValue())) {
      return option;
    }
    NodeRecord node = repository.find(option.getValue());
    if (node == null) {
      return option;
    }
    CapabilityView capability = view(node);
    option.setCapabilityStatus(capability.getStatus());
    option.setConnectorCount(capability.getConnectors().size());
    option.setAvailable(
        Boolean.TRUE.equals(option.getAvailable())
            && Boolean.TRUE.equals(capability.getFresh()));
    return option;
  }

  public void refreshQuietly(String nodeId) {
    try {
      refresh(nodeId, true);
    } catch (RuntimeException exception) {
      LOG.warn("刷新 Worker Connector 能力失败，nodeId={}：{}", nodeId, exception.getMessage());
    }
  }

  public boolean isFresh(NodeRecord node) {
    if (!properties.isEnabled()) {
      return true;
    }
    if (node == null
        || !"READY".equalsIgnoreCase(node.getCapabilityStatus())
        || node.getCapabilitySyncedAt() == null
        || !StringUtils.hasText(node.getConnectorSchemasJson())) {
      return false;
    }
    long age = Duration.between(node.getCapabilitySyncedAt(), LocalDateTime.now()).toMillis();
    return age <= Math.max(1_000L, properties.getMaxStaleMillis());
  }

  private void refresh(NodeRecord node, boolean force) {
    if (!properties.isEnabled()
        || "DYNAMIC".equalsIgnoreCase(node.getRegistrationMode())) {
      return;
    }
    if (!force && !due(node)) {
      return;
    }
    try {
      JsonNode response = schemaClient.list(node.getBaseUrl());
      ObjectNode snapshot = snapshot(node, response);
      String json = write(snapshot);
      String capabilityDigest = digest(write(snapshot.path("connectors")));
      repository.updateCapabilitySuccess(
          node.getNodeId(), capabilityDigest, json, LocalDateTime.now());
    } catch (RuntimeException exception) {
      repository.updateCapabilityFailure(node.getNodeId(), concise(exception));
      throw exception;
    }
  }

  private boolean due(NodeRecord node) {
    if (node.getCapabilitySyncedAt() == null
        || !"READY".equalsIgnoreCase(node.getCapabilityStatus())) {
      return true;
    }
    long age = Duration.between(node.getCapabilitySyncedAt(), LocalDateTime.now()).toMillis();
    return age >= Math.max(1_000L, properties.getWorkerRefreshMillis());
  }

  private ObjectNode snapshot(NodeRecord node, JsonNode response) {
    JsonNode schemas = response != null && response.isArray()
        ? response
        : response == null ? null : response.path("items");
    if (schemas == null || !schemas.isArray()) {
      throw new IllegalStateException("Link-Up Connector Schema 列表协议不正确");
    }

    List<ObjectNode> connectors = new ArrayList<>();
    for (JsonNode schema : schemas) {
      String connectorId = text(schema, "connectorId").toLowerCase(Locale.ROOT);
      String role = text(schema, "role").toUpperCase(Locale.ROOT);
      if (!"SOURCE".equals(role) && !"SINK".equals(role)) {
        throw new IllegalStateException("Connector Schema role 不合法：" + role);
      }
      ObjectNode summary = objectMapper.createObjectNode();
      summary.put("connectorId", connectorId);
      summary.put("role", role);
      summary.put("schemaVersion", schema.path("schemaVersion").asText(""));
      summary.put("schemaFingerprint", schema.path("schemaFingerprint").asText(""));
      summary.put("implementationVersion", schema.path("implementationVersion").asText(""));
      ArrayNode capabilities = summary.putArray("capabilities");
      List<String> values = new ArrayList<>();
      JsonNode capabilityValues = schema.path("capabilities");
      if (capabilityValues.isArray()) {
        for (JsonNode value : capabilityValues) {
          if (StringUtils.hasText(value.asText())) {
            values.add(value.asText().trim().toUpperCase(Locale.ROOT));
          }
        }
      }
      values.stream().distinct().sorted().forEach(capabilities::add);
      connectors.add(summary);
    }
    connectors.sort(Comparator
        .comparing((ObjectNode value) -> value.path("connectorId").asText())
        .thenComparing(value -> value.path("role").asText()));

    ObjectNode result = objectMapper.createObjectNode();
    result.put("nodeId", node.getNodeId());
    result.put("workerInstanceId", node.getWorkerInstanceId());
    result.put("engineVersion", node.getEngineVersion());
    ArrayNode items = result.putArray("connectors");
    connectors.forEach(items::add);
    return result;
  }

  private CapabilityView view(NodeRecord node) {
    List<ConnectorCapabilityView> connectors = new ArrayList<>();
    if (node != null && StringUtils.hasText(node.getConnectorSchemasJson())) {
      try {
        JsonNode values = objectMapper.readTree(node.getConnectorSchemasJson()).path("connectors");
        if (values.isArray()) {
          for (JsonNode value : values) {
            List<String> capabilities = new ArrayList<>();
            if (value.path("capabilities").isArray()) {
              for (JsonNode item : value.path("capabilities")) {
                capabilities.add(item.asText());
              }
            }
            connectors.add(ConnectorCapabilityView.builder()
                .connectorId(value.path("connectorId").asText(null))
                .role(value.path("role").asText(null))
                .schemaVersion(value.path("schemaVersion").asText(null))
                .schemaFingerprint(value.path("schemaFingerprint").asText(null))
                .implementationVersion(value.path("implementationVersion").asText(null))
                .capabilities(capabilities)
                .build());
          }
        }
      } catch (JsonProcessingException exception) {
        LOG.warn("Worker capability snapshot is invalid, nodeId={}", node.getNodeId(), exception);
      }
    }
    return CapabilityView.builder()
        .nodeId(node == null ? null : node.getNodeId())
        .status(!properties.isEnabled()
            ? "DISABLED"
            : node == null ? "UNKNOWN" : node.getCapabilityStatus())
        .digest(node == null ? null : node.getCapabilityDigest())
        .syncedAt(node == null ? null : node.getCapabilitySyncedAt())
        .errorMessage(node == null ? null : node.getCapabilityErrorMessage())
        .fresh(isFresh(node))
        .connectors(connectors)
        .build();
  }

  private String text(JsonNode node, String field) {
    String value = node == null ? null : node.path(field).asText(null);
    if (!StringUtils.hasText(value)) {
      throw new IllegalStateException("Connector Schema 缺少 " + field);
    }
    return value.trim();
  }

  private String write(JsonNode value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化 Worker Connector 能力失败", exception);
    }
  }

  private String digest(String value) {
    try {
      byte[] bytes = MessageDigest.getInstance("SHA-256")
          .digest(value.getBytes(StandardCharsets.UTF_8));
      return "sha256:" + HexFormat.of().formatHex(bytes);
    } catch (Exception exception) {
      throw new IllegalStateException("生成 Worker 能力摘要失败", exception);
    }
  }

  private String concise(Throwable throwable) {
    String message = throwable == null ? null : throwable.getMessage();
    if (!StringUtils.hasText(message)) {
      message = throwable == null ? "未知错误" : throwable.getClass().getSimpleName();
    }
    return message.length() <= 2000 ? message : message.substring(0, 2000);
  }
}
