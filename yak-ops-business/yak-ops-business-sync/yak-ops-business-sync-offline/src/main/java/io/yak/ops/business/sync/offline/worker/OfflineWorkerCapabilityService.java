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
 * 按 Worker 拉取并持久化 Connector Schema 能力摘要。
 *
 * <p>远程调用在后台刷新或管理操作中完成，调度事务只读取数据库快照。
 *
 * @author weifuwan
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

  public void refreshQuietly(String nodeId) {
    try {
      refresh(nodeId, true);
    } catch (RuntimeException exception) {
      LOG.warn("刷新 Worker Connector 能力失败，nodeId={}：{}", nodeId, exception.getMessage());
    }
  }

  public boolean isFresh(NodeRecord node) {
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
    if (!properties.isEnabled()) {
      return;
    }
    if (!force && !due(node)) {
      return;
    }
    try {
      JsonNode response = schemaClient.list(node.getBaseUrl());
      ObjectNode snapshot = snapshot(node, response);
      String json = write(snapshot);
      repository.updateCapabilitySuccess(
          node.getNodeId(), digest(json), json, LocalDateTime.now());
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
