package io.yak.ops.business.sync.offline.worker;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.repository.OfflineConnectorSchemaRepository;
import io.yak.ops.business.sync.offline.repository.OfflineConnectorSchemaRepository.SchemaRecord;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 从不可变 JobSpec 派生 Worker Connector 能力要求。
 *
 * <p>要求包含 Connector、角色、保存时使用的 Schema 指纹以及任务实际启用的执行特性。
 * Schema 只读取 Yak Ops 已持久化的本地快照，不在任务保存或执行领取事务中回源 Worker。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineCapabilityRequirementResolver {

  private final OfflineConnectorSchemaRepository schemaRepository;
  private final ObjectMapper objectMapper;

  public OfflineCapabilityRequirementResolver(
      OfflineConnectorSchemaRepository schemaRepository,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.schemaRepository = schemaRepository;
    this.objectMapper = objectMapper;
  }

  public String resolve(String jobSpecJson) {
    if (!StringUtils.hasText(jobSpecJson)) {
      throw new IllegalArgumentException("JobSpec 不能为空");
    }
    try {
      return resolve(objectMapper.readTree(jobSpecJson));
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("JobSpec JSON 已损坏", exception);
    }
  }

  public String resolve(JsonNode jobSpec) {
    if (jobSpec == null || !jobSpec.isObject()) {
      throw new IllegalArgumentException("JobSpec 必须是 JSON 对象");
    }
    ObjectNode result = emptyRequirements();
    ArrayNode endpoints = (ArrayNode) result.path("endpoints");
    endpoints.add(endpoint(jobSpec.path("source"), "SOURCE"));
    endpoints.add(endpoint(jobSpec.path("sink"), "SINK"));
    return write(result);
  }

  public JsonNode read(String value) {
    if (!StringUtils.hasText(value)) {
      return emptyRequirements();
    }
    try {
      JsonNode parsed = objectMapper.readTree(value);
      if (parsed == null || !parsed.isObject() || !parsed.path("endpoints").isArray()) {
        throw new IllegalStateException("能力要求 JSON 格式不正确");
      }
      return parsed;
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("能力要求 JSON 已损坏", exception);
    }
  }

  private ObjectNode emptyRequirements() {
    ObjectNode result = objectMapper.createObjectNode();
    result.put("version", "1");
    result.putArray("endpoints");
    return result;
  }

  private ObjectNode endpoint(JsonNode endpoint, String role) {
    if (endpoint == null || !endpoint.isObject()) {
      throw new IllegalArgumentException(role + " JobSpec 不完整");
    }
    String connectorId = endpoint.path("connectorId").asText("").trim().toLowerCase(Locale.ROOT);
    if (!StringUtils.hasText(connectorId)) {
      throw new IllegalArgumentException(role + " JobSpec 缺少 connectorId");
    }

    ObjectNode requirement = objectMapper.createObjectNode();
    requirement.put("connectorId", connectorId);
    requirement.put("role", role);
    JsonNode schema = localSchema(connectorId, role);
    requirement.put("schemaVersion", schema.path("schemaVersion").asText(""));
    requirement.put("schemaFingerprint", schema.path("schemaFingerprint").asText(""));

    ArrayNode capabilities = requirement.putArray("capabilities");
    requiredCapabilities(endpoint.path("options"), role).forEach(capabilities::add);
    return requirement;
  }

  private JsonNode localSchema(String connectorId, String role) {
    SchemaRecord record = schemaRepository.find(connectorId, role);
    if (record == null || !StringUtils.hasText(record.getSchemaJson())) {
      return objectMapper.createObjectNode();
    }
    try {
      JsonNode schema = objectMapper.readTree(record.getSchemaJson());
      return schema == null || !schema.isObject()
          ? objectMapper.createObjectNode()
          : schema;
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException(
          "本地 Connector Schema 已损坏：" + connectorId + "/" + role,
          exception);
    }
  }

  private Set<String> requiredCapabilities(JsonNode options, String role) {
    Set<String> required = new TreeSet<>();
    JsonNode value = options == null || !options.isObject()
        ? objectMapper.createObjectNode() : options;
    if ("SOURCE".equals(role)) {
      if (text(value, "query") || text(value, "sql")) {
        required.add("CUSTOM_SQL");
      }
      if (value.path("table_list").isArray() && !value.path("table_list").isEmpty()) {
        required.add("MULTI_TABLE");
      }
      if (text(value, "partition_column")
          || number(value, "partition_num")
          || number(value, "partition_size")) {
        required.add("PARTITION_SPLIT");
      }
    } else {
      if ("UPSERT".equalsIgnoreCase(value.path("write_mode").asText())) {
        required.add("UPSERT");
      }
      if ("CREATE_SCHEMA_WHEN_NOT_EXIST".equalsIgnoreCase(
          value.path("schema_save_mode").asText())) {
        required.add("AUTO_CREATE_TABLE");
      }
      if (text(value, "custom_sql")) {
        required.add("CUSTOM_SQL");
      }
      String dirtyPolicy = value.path("dirty_data_policy").asText("");
      if ("SKIP".equalsIgnoreCase(dirtyPolicy) || value.has("dirty_data_max_count")) {
        required.add("DIRTY_DATA_HANDLING");
      }
    }
    return required;
  }

  private boolean text(JsonNode node, String field) {
    return StringUtils.hasText(node.path(field).asText(null));
  }

  private boolean number(JsonNode node, String field) {
    JsonNode value = node.get(field);
    return value != null && value.isNumber() && value.asLong() > 0L;
  }

  private String write(JsonNode value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化能力要求失败", exception);
    }
  }
}
