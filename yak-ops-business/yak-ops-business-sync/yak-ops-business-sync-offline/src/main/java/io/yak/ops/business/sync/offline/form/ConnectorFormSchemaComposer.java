package io.yak.ops.business.sync.offline.form;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 将 Link-Up Connector Schema 与 Yak Ops Presentation Profile 合成为 Form Schema。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Component
public class ConnectorFormSchemaComposer {

  private final ConnectorPresentationRegistry presentationRegistry;
  private final ObjectMapper objectMapper;
  private final ConnectorInteractionNormalizer interactionNormalizer;

  public ConnectorFormSchemaComposer(
      ConnectorPresentationRegistry presentationRegistry,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.presentationRegistry = presentationRegistry;
    this.objectMapper = objectMapper;
    this.interactionNormalizer = new ConnectorInteractionNormalizer(objectMapper);
  }

  public ConnectorFormSchema compose(ConnectorSchemaSnapshot snapshot) {
    JsonNode schema = snapshot.getSchema();
    String connectorId = schema.path("connectorId").asText();
    String role = schema.path("role").asText();
    ConnectorPresentationProfile profile = presentationRegistry.find(connectorId, role);

    ConnectorFormSchema result = new ConnectorFormSchema();
    result.setConnectorId(connectorId);
    result.setRole(role);
    result.setSchemaVersion(schema.path("schemaVersion").asText(null));
    result.setSchemaFingerprint(schema.path("schemaFingerprint").asText(null));
    result.setProfileVersion(profile == null ? "auto" : profile.getProfileVersion());
    result.setSource(snapshot.getSource());
    result.setStale(snapshot.isStale());
    result.setSyncedAt(snapshot.getSyncedAt());
    result.setRules(schema.path("rules").deepCopy());
    result.setInteractions(interactionNormalizer.normalize(schema.path("rules")));
    copyStrings(schema.path("capabilities"), result.getCapabilities());

    Map<String, ConnectorFormSchema.Group> groups = defaultGroups();
    if (profile != null) {
      for (ConnectorPresentationProfile.GroupProfile source : profile.getGroups()) {
        ConnectorFormSchema.Group group = new ConnectorFormSchema.Group();
        group.setId(source.getId());
        group.setTitle(source.getTitle());
        group.setOrder(source.getOrder());
        group.setCollapsed(source.isCollapsed());
        group.setHidden(source.isHidden());
        groups.put(group.getId(), group);
      }
    } else {
      result.getWarnings().add("当前 Connector 没有专属 Presentation Profile，已使用通用表单推导");
    }

    int fallbackOrder = 1000;
    for (JsonNode option : schema.path("options")) {
      ConnectorFormSchema.Field field = composeField(option,
          profile == null ? null : profile.getFields().get(option.path("key").asText()),
          fallbackOrder++);
      result.getFields().add(field);
      groups.computeIfAbsent(field.getGroupId(), this::fallbackGroup);
    }

    if (profile != null) {
      for (String profileKey : profile.getFields().keySet()) {
        boolean found = result.getFields().stream()
            .anyMatch(field -> profileKey.equals(field.getKey()));
        if (!found) {
          result.getWarnings().add("Presentation Profile 字段在 Link-Up Schema 中不存在：" + profileKey);
        }
      }
    }

    result.getFields().sort(Comparator
        .comparingInt((ConnectorFormSchema.Field field) -> groups.get(field.getGroupId()).getOrder())
        .thenComparingInt(ConnectorFormSchema.Field::getOrder)
        .thenComparing(ConnectorFormSchema.Field::getKey));
    Set<String> usedGroups = new HashSet<>();
    for (ConnectorFormSchema.Field field : result.getFields()) {
      usedGroups.add(field.getGroupId());
    }
    for (ConnectorFormSchema.Group group : groups.values()) {
      if (usedGroups.contains(group.getId())) {
        result.getGroups().add(group);
      }
    }
    result.getGroups().sort(Comparator.comparingInt(ConnectorFormSchema.Group::getOrder));
    result.setFormFingerprint(fingerprint(result));
    return result;
  }

  private ConnectorFormSchema.Field composeField(JsonNode option,
      ConnectorPresentationProfile.FieldProfile profile, int fallbackOrder) {
    ConnectorFormSchema.Field field = new ConnectorFormSchema.Field();
    String key = option.path("key").asText();
    String valueType = option.path("valueType").asText("OBJECT").toUpperCase(Locale.ROOT);
    String semanticType = option.path("semanticType").asText("").toUpperCase(Locale.ROOT);
    String scope = option.path("scope").asText("TASK").toUpperCase(Locale.ROOT);
    boolean required = option.path("required").asBoolean(false);
    boolean sensitive = option.path("sensitive").asBoolean(false);
    boolean hasDefault = option.has("defaultValue") && !option.get("defaultValue").isNull();

    field.setKey(key);
    field.setLabel(profile != null && StringUtils.hasText(profile.getLabel())
        ? profile.getLabel() : humanize(key));
    field.setDescription(option.path("description").asText(null));
    field.setHelp(profile == null ? null : profile.getHelp());
    field.setPlaceholder(profile == null ? null : profile.getPlaceholder());
    field.setValueType(valueType);
    field.setJavaType(option.path("javaType").asText(null));
    field.setElementType(option.path("elementType")
        .asText(option.path("elementJavaType").asText(null)));
    field.setDefaultValue(hasDefault
        ? objectMapper.convertValue(option.get("defaultValue"), Object.class) : null);
    copyObjects(option.path("allowedValues"), field.getAllowedValues());
    copyStrings(option.path("fallbackKeys"), field.getFallbackKeys());
    field.setRequired(required);
    field.setSensitive(sensitive);
    field.setSemanticType(semanticType);
    field.setScope(scope);

    String inferredImportance = inferImportance(scope, required, hasDefault);
    field.setImportance(profile != null && StringUtils.hasText(profile.getImportance())
        ? profile.getImportance() : inferredImportance);
    field.setWidget(profile != null && StringUtils.hasText(profile.getWidget())
        ? profile.getWidget() : inferWidget(valueType, semanticType, sensitive,
            !field.getAllowedValues().isEmpty()));
    field.setGroupId(profile != null && StringUtils.hasText(profile.getGroupId())
        ? profile.getGroupId() : inferGroup(field.getImportance(), scope));
    field.setOrder(profile != null && profile.getOrder() != null
        ? profile.getOrder() : fallbackOrder);

    boolean inferredHidden = "DATASOURCE".equals(scope) || "SYSTEM".equals(scope)
        || "HIDDEN".equals(field.getImportance());
    field.setHidden(profile != null && profile.getHidden() != null
        ? profile.getHidden() : inferredHidden);
    field.setValueSource(profile != null && StringUtils.hasText(profile.getValueSource())
        ? profile.getValueSource() : inferValueSource(scope));
    field.setReadOnly(profile != null && profile.getReadOnly() != null
        ? profile.getReadOnly() : field.isHidden() || !"USER".equals(field.getValueSource()));
    field.setDependsOn(profile == null ? inferDependsOn(field.getWidget())
        : new ArrayList<>(profile.getDependsOn()));
    field.setClearWhenHidden(profile != null && profile.getClearWhenHidden() != null
        ? profile.getClearWhenHidden() : false);
    field.setOptionSource(profile != null && profile.getOptionSource() != null
        ? optionSource(profile.getOptionSource())
        : inferOptionSource(field.getWidget(), field.getValueType()));
    return field;
  }

  private ConnectorFormSchema.OptionSource optionSource(
      ConnectorPresentationProfile.OptionSourceProfile profile) {
    ConnectorFormSchema.OptionSource result = new ConnectorFormSchema.OptionSource();
    result.setAction(profile.getAction());
    result.setSearchable(profile.isSearchable());
    result.setMultiple(profile.isMultiple());
    result.setCacheTtlMillis(profile.getCacheTtlMillis());
    result.setRequestValueKeys(new ArrayList<>(profile.getRequestValueKeys()));
    return result;
  }

  private ConnectorFormSchema.OptionSource inferOptionSource(String widget, String valueType) {
    String normalized = widget == null ? "" : widget.toLowerCase(Locale.ROOT);
    if (!List.of("table-picker", "multi-table-picker", "field-selector").contains(normalized)) {
      return null;
    }
    ConnectorFormSchema.OptionSource result = new ConnectorFormSchema.OptionSource();
    result.setAction("field-selector".equals(normalized) ? "LIST_COLUMNS" : "LIST_TABLES");
    result.setSearchable(true);
    result.setMultiple("multi-table-picker".equals(normalized)
        || ("field-selector".equals(normalized) && "LIST".equalsIgnoreCase(valueType)));
    result.setCacheTtlMillis(30_000L);
    if ("field-selector".equals(normalized)) {
      result.setRequestValueKeys(List.of("table_path", "query"));
    }
    return result;
  }

  private List<String> inferDependsOn(String widget) {
    if ("field-selector".equalsIgnoreCase(widget)) {
      return new ArrayList<>(List.of("table_path", "query"));
    }
    return new ArrayList<>();
  }

  private Map<String, ConnectorFormSchema.Group> defaultGroups() {
    Map<String, ConnectorFormSchema.Group> groups = new LinkedHashMap<>();
    groups.put("basic", group("basic", "基础配置", 10, false, false));
    groups.put("common", group("common", "常用配置", 20, false, false));
    groups.put("advanced", group("advanced", "高级配置", 70, true, false));
    groups.put("expert", group("expert", "专家配置", 80, true, false));
    groups.put("hidden", group("hidden", "系统注入", 100, true, true));
    return groups;
  }

  private ConnectorFormSchema.Group fallbackGroup(String id) {
    return group(id, humanize(id), 60, true, false);
  }

  private ConnectorFormSchema.Group group(String id, String title, int order,
      boolean collapsed, boolean hidden) {
    ConnectorFormSchema.Group group = new ConnectorFormSchema.Group();
    group.setId(id);
    group.setTitle(title);
    group.setOrder(order);
    group.setCollapsed(collapsed);
    group.setHidden(hidden);
    return group;
  }

  private String inferImportance(String scope, boolean required, boolean hasDefault) {
    if ("DATASOURCE".equals(scope) || "SYSTEM".equals(scope)) { return "HIDDEN"; }
    if (required && !hasDefault) { return "PRIMARY"; }
    if ("RUNTIME".equals(scope)) { return "ADVANCED"; }
    if (required) { return "COMMON"; }
    return hasDefault ? "ADVANCED" : "COMMON";
  }

  private String inferGroup(String importance, String scope) {
    if ("DATASOURCE".equals(scope) || "SYSTEM".equals(scope)
        || "HIDDEN".equals(importance)) {
      return "hidden";
    }
    if ("PRIMARY".equals(importance)) { return "basic"; }
    if ("COMMON".equals(importance)) { return "common"; }
    if ("EXPERT".equals(importance)) { return "expert"; }
    return "advanced";
  }

  private String inferWidget(String valueType, String semanticType, boolean sensitive,
      boolean hasChoices) {
    if (sensitive || "PASSWORD".equals(semanticType)) { return "password"; }
    if ("SQL".equals(semanticType)) { return "sql-editor"; }
    if ("TABLE_PATH".equals(semanticType)) { return "table-picker"; }
    if ("TABLE_LIST".equals(semanticType)) { return "multi-table-picker"; }
    if (List.of("COLUMN_NAME", "FIELD_NAME", "COLUMN_LIST", "PRIMARY_KEY").contains(semanticType)) {
      return "field-selector";
    }
    if ("FILE_PATH".equals(semanticType)) { return "file-path"; }
    if (hasChoices || "ENUM".equals(valueType)) { return "select"; }
    if ("BOOLEAN".equals(valueType)) { return "switch"; }
    if ("INTEGER".equals(valueType) || "LONG".equals(valueType)
        || "DECIMAL".equals(valueType) || "FLOAT".equals(valueType)
        || "DOUBLE".equals(valueType)) { return "number"; }
    if ("MAP".equals(valueType)) { return "key-value"; }
    if ("LIST".equals(valueType)) { return "list-editor"; }
    if ("OBJECT".equals(valueType)) { return "json-editor"; }
    return "text";
  }

  private String inferValueSource(String scope) {
    if ("DATASOURCE".equals(scope)) { return "DATASOURCE"; }
    if ("SYSTEM".equals(scope)) { return "SYSTEM"; }
    if ("RUNTIME".equals(scope)) { return "RUNTIME"; }
    return "USER";
  }

  private String humanize(String value) {
    if (!StringUtils.hasText(value)) { return "配置项"; }
    String[] words = value.trim().split("[_-]");
    StringBuilder result = new StringBuilder();
    for (String word : words) {
      if (word.isEmpty()) { continue; }
      if (result.length() > 0) { result.append(' '); }
      result.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
    }
    return result.toString();
  }

  private void copyStrings(JsonNode source, List<String> target) {
    if (!source.isArray()) { return; }
    for (JsonNode value : source) { target.add(value.asText()); }
  }

  private void copyObjects(JsonNode source, List<Object> target) {
    if (!source.isArray()) { return; }
    for (JsonNode value : source) {
      target.add(objectMapper.convertValue(value, Object.class));
    }
  }

  private String fingerprint(ConnectorFormSchema schema) {
    try {
      ObjectNode canonical = objectMapper.createObjectNode();
      canonical.put("connectorId", schema.getConnectorId());
      canonical.put("role", schema.getRole());
      canonical.put("schemaFingerprint", schema.getSchemaFingerprint());
      canonical.put("profileVersion", schema.getProfileVersion());
      canonical.set("capabilities", objectMapper.valueToTree(schema.getCapabilities()));
      canonical.set("groups", objectMapper.valueToTree(schema.getGroups()));
      canonical.set("fields", objectMapper.valueToTree(schema.getFields()));
      canonical.set("interactions", objectMapper.valueToTree(schema.getInteractions()));
      canonical.set("rules", schema.getRules());
      byte[] payload = objectMapper.writeValueAsString(canonical)
          .getBytes(StandardCharsets.UTF_8);
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(payload);
      StringBuilder result = new StringBuilder("sha256:");
      for (byte value : digest) { result.append(String.format("%02x", value & 0xff)); }
      return result.toString();
    } catch (JsonProcessingException | NoSuchAlgorithmException exception) {
      throw new IllegalStateException("生成 Form Schema 指纹失败", exception);
    }
  }
}
