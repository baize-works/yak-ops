package io.yak.ops.business.sync.offline.form;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.ConnectorSchemaProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.engine.LinkUpConnectorSchemaClient;
import io.yak.ops.business.sync.offline.repository.OfflineConnectorSchemaRepository;
import io.yak.ops.business.sync.offline.repository.OfflineConnectorSchemaRepository.SchemaRecord;
import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.DependsOn;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** 拉取、持久化并缓存 Link-Up Connector Schema。 */
@ConditionalOnOfflineSyncEnabled
@Component
@DependsOn("offlineSyncFlyway")
public class ConnectorSchemaRegistry {

  private static final Logger LOG = LoggerFactory.getLogger(ConnectorSchemaRegistry.class);

  private final LinkUpConnectorSchemaClient schemaClient;
  private final LinkUpClient linkUpClient;
  private final OfflineConnectorSchemaRepository repository;
  private final ObjectMapper objectMapper;
  private final ConnectorSchemaProperties properties;
  private final Map<String, ConnectorSchemaSnapshot> memory = new ConcurrentHashMap<>();

  public ConnectorSchemaRegistry(
      LinkUpConnectorSchemaClient schemaClient,
      LinkUpClient linkUpClient,
      OfflineConnectorSchemaRepository repository,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper,
      ConnectorSchemaProperties properties) {
    this.schemaClient = schemaClient;
    this.linkUpClient = linkUpClient;
    this.repository = repository;
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  @PostConstruct
  public void initialize() {
    loadPersistentCache();
  }

  @Scheduled(
      initialDelayString = "${yak.sync.offline.schema.initial-delay-millis:5000}",
      fixedDelayString = "${yak.sync.offline.schema.refresh-delay-millis:300000}")
  public void scheduledRefresh() {
    if (!properties.isEnabled() || !properties.isRefreshEnabled()) {
      return;
    }
    try {
      refresh();
    } catch (RuntimeException exception) {
      LOG.warn("刷新 Link-Up Connector Schema 失败，将继续使用本地快照：{}", exception.getMessage());
    }
  }

  public synchronized int refresh() {
    if (!properties.isEnabled()) {
      return 0;
    }
    JsonNode result = schemaClient.list();
    JsonNode schemas = result.isArray() ? result : result.path("items");
    if (!schemas.isArray()) {
      throw new IllegalStateException("Link-Up Connector Schema 列表协议不正确");
    }
    LinkUpClient.LinkUpNodeResponse node = linkUpClient.node();
    LocalDateTime syncedAt = LocalDateTime.now();
    int count = 0;
    for (JsonNode schema : schemas) {
      validate(schema);
      persist(schema, node, syncedAt);
      memory.put(key(id(schema), role(schema)),
          new ConnectorSchemaSnapshot(schema.deepCopy(), "REMOTE", false, syncedAt));
      count++;
    }
    return count;
  }

  public ConnectorSchemaSnapshot get(String connectorId, String role) {
    String normalizedRole = normalizeRole(role);
    String cacheKey = key(connectorId, normalizedRole);
    ConnectorSchemaSnapshot snapshot = memory.get(cacheKey);
    if (snapshot != null) {
      return withCurrentStale(snapshot);
    }
    SchemaRecord record = repository.find(normalizeId(connectorId), normalizedRole);
    if (record != null) {
      ConnectorSchemaSnapshot loaded = fromRecord(record);
      memory.put(cacheKey, loaded);
      return withCurrentStale(loaded);
    }
    try {
      JsonNode schema = schemaClient.get(connectorId, normalizedRole);
      validate(schema);
      LinkUpClient.LinkUpNodeResponse node = linkUpClient.node();
      LocalDateTime syncedAt = LocalDateTime.now();
      persist(schema, node, syncedAt);
      ConnectorSchemaSnapshot remote =
          new ConnectorSchemaSnapshot(schema.deepCopy(), "REMOTE", false, syncedAt);
      memory.put(cacheKey, remote);
      return remote;
    } catch (RuntimeException exception) {
      throw new IllegalStateException(
          "没有可用的 Connector Schema：" + connectorId + "/" + normalizedRole, exception);
    }
  }

  public List<ConnectorSchemaSnapshot> list(String role) {
    String normalizedRole = role == null ? null : normalizeRole(role);
    if (memory.isEmpty()) {
      loadPersistentCache();
    }
    if (memory.isEmpty()) {
      try {
        refresh();
      } catch (RuntimeException ignored) {
        // 没有远程 Worker 且没有持久化快照时返回空列表。
      }
    }
    List<ConnectorSchemaSnapshot> result = new ArrayList<>();
    for (ConnectorSchemaSnapshot snapshot : memory.values()) {
      if (normalizedRole == null
          || normalizedRole.equals(role(snapshot.getSchema()))) {
        result.add(withCurrentStale(snapshot));
      }
    }
    result.sort((left, right) -> {
      int idCompare = id(left.getSchema()).compareTo(id(right.getSchema()));
      return idCompare != 0 ? idCompare : role(left.getSchema()).compareTo(role(right.getSchema()));
    });
    return result;
  }

  private void loadPersistentCache() {
    for (SchemaRecord record : repository.list(null)) {
      memory.put(key(record.getConnectorId(), record.getRole()), fromRecord(record));
    }
  }

  private void persist(JsonNode schema, LinkUpClient.LinkUpNodeResponse node,
      LocalDateTime syncedAt) {
    try {
      repository.upsert(new SchemaRecord(
          id(schema), role(schema), schema.path("schemaVersion").asText(null),
          schema.path("schemaFingerprint").asText(null),
          node == null ? null : node.getNodeId(), node == null ? null : node.getInstanceId(),
          objectMapper.writeValueAsString(schema), syncedAt));
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("保存 Connector Schema 快照失败", exception);
    }
  }

  private ConnectorSchemaSnapshot fromRecord(SchemaRecord record) {
    try {
      return new ConnectorSchemaSnapshot(
          objectMapper.readTree(record.getSchemaJson()), "CACHE", isStale(record.getSyncedAt()),
          record.getSyncedAt());
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("数据库中的 Connector Schema 无法解析", exception);
    }
  }

  private ConnectorSchemaSnapshot withCurrentStale(ConnectorSchemaSnapshot snapshot) {
    return new ConnectorSchemaSnapshot(snapshot.getSchema(), snapshot.getSource(),
        isStale(snapshot.getSyncedAt()), snapshot.getSyncedAt());
  }

  private boolean isStale(LocalDateTime syncedAt) {
    if (syncedAt == null) {
      return true;
    }
    return Duration.between(syncedAt, LocalDateTime.now()).toMillis()
        > Math.max(0L, properties.getMaxStaleMillis());
  }

  private void validate(JsonNode schema) {
    if (schema == null || !schema.isObject()
        || !StringUtils.hasText(id(schema)) || !StringUtils.hasText(role(schema))
        || !schema.path("options").isArray()) {
      throw new IllegalStateException("Link-Up Connector Schema 缺少必要字段");
    }
  }

  private String id(JsonNode schema) { return normalizeId(schema.path("connectorId").asText()); }
  private String role(JsonNode schema) { return normalizeRole(schema.path("role").asText()); }
  private String normalizeId(String value) {
    if (!StringUtils.hasText(value)) { throw new IllegalArgumentException("connectorId 不能为空"); }
    return value.trim().toLowerCase(Locale.ROOT);
  }
  private String normalizeRole(String value) {
    if (!StringUtils.hasText(value)) { throw new IllegalArgumentException("role 不能为空"); }
    String normalized = value.trim().toUpperCase(Locale.ROOT);
    if (!"SOURCE".equals(normalized) && !"SINK".equals(normalized)) {
      throw new IllegalArgumentException("role 只支持 SOURCE 或 SINK");
    }
    return normalized;
  }
  private String key(String connectorId, String role) {
    return normalizeId(connectorId) + ":" + normalizeRole(role);
  }
}
