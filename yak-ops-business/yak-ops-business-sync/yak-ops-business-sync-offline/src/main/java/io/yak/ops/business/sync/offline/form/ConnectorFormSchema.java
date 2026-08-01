package io.yak.ops.business.sync.offline.form;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Yak Ops 前端可直接消费的 Connector Form Schema。 */
public class ConnectorFormSchema {
  private String connectorId;
  private String role;
  private String schemaVersion;
  private String schemaFingerprint;
  private String profileVersion;
  private String formFingerprint;
  private String source;
  private boolean stale;
  private LocalDateTime syncedAt;
  private List<String> capabilities = new ArrayList<>();
  private List<Group> groups = new ArrayList<>();
  private List<Field> fields = new ArrayList<>();
  private List<Interaction> interactions = new ArrayList<>();
  private JsonNode rules;
  private List<String> warnings = new ArrayList<>();

  public String getConnectorId() { return connectorId; }
  public void setConnectorId(String connectorId) { this.connectorId = connectorId; }
  public String getRole() { return role; }
  public void setRole(String role) { this.role = role; }
  public String getSchemaVersion() { return schemaVersion; }
  public void setSchemaVersion(String schemaVersion) { this.schemaVersion = schemaVersion; }
  public String getSchemaFingerprint() { return schemaFingerprint; }
  public void setSchemaFingerprint(String schemaFingerprint) { this.schemaFingerprint = schemaFingerprint; }
  public String getProfileVersion() { return profileVersion; }
  public void setProfileVersion(String profileVersion) { this.profileVersion = profileVersion; }
  public String getFormFingerprint() { return formFingerprint; }
  public void setFormFingerprint(String formFingerprint) { this.formFingerprint = formFingerprint; }
  public String getSource() { return source; }
  public void setSource(String source) { this.source = source; }
  public boolean isStale() { return stale; }
  public void setStale(boolean stale) { this.stale = stale; }
  public LocalDateTime getSyncedAt() { return syncedAt; }
  public void setSyncedAt(LocalDateTime syncedAt) { this.syncedAt = syncedAt; }
  public List<String> getCapabilities() { return capabilities; }
  public void setCapabilities(List<String> capabilities) { this.capabilities = capabilities; }
  public List<Group> getGroups() { return groups; }
  public void setGroups(List<Group> groups) { this.groups = groups; }
  public List<Field> getFields() { return fields; }
  public void setFields(List<Field> fields) { this.fields = fields; }
  public List<Interaction> getInteractions() { return interactions; }
  public void setInteractions(List<Interaction> interactions) { this.interactions = interactions; }
  public JsonNode getRules() { return rules; }
  public void setRules(JsonNode rules) { this.rules = rules; }
  public List<String> getWarnings() { return warnings; }
  public void setWarnings(List<String> warnings) { this.warnings = warnings; }

  public static class Group {
    private String id;
    private String title;
    private int order;
    private boolean collapsed;
    private boolean hidden;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public int getOrder() { return order; }
    public void setOrder(int order) { this.order = order; }
    public boolean isCollapsed() { return collapsed; }
    public void setCollapsed(boolean collapsed) { this.collapsed = collapsed; }
    public boolean isHidden() { return hidden; }
    public void setHidden(boolean hidden) { this.hidden = hidden; }
  }

  public static class Field {
    private String key;
    private String label;
    private String description;
    private String help;
    private String placeholder;
    private String valueType;
    private String javaType;
    private String elementType;
    private Object defaultValue;
    private List<Object> allowedValues = new ArrayList<>();
    private List<String> fallbackKeys = new ArrayList<>();
    private boolean required;
    private boolean sensitive;
    private String semanticType;
    private String scope;
    private String groupId;
    private int order;
    private String importance;
    private String widget;
    private boolean hidden;
    private boolean readOnly;
    private String valueSource;
    private List<String> dependsOn = new ArrayList<>();
    private boolean clearWhenHidden;
    private OptionSource optionSource;

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getHelp() { return help; }
    public void setHelp(String help) { this.help = help; }
    public String getPlaceholder() { return placeholder; }
    public void setPlaceholder(String placeholder) { this.placeholder = placeholder; }
    public String getValueType() { return valueType; }
    public void setValueType(String valueType) { this.valueType = valueType; }
    public String getJavaType() { return javaType; }
    public void setJavaType(String javaType) { this.javaType = javaType; }
    public String getElementType() { return elementType; }
    public void setElementType(String elementType) { this.elementType = elementType; }
    public Object getDefaultValue() { return defaultValue; }
    public void setDefaultValue(Object defaultValue) { this.defaultValue = defaultValue; }
    public List<Object> getAllowedValues() { return allowedValues; }
    public void setAllowedValues(List<Object> allowedValues) { this.allowedValues = allowedValues; }
    public List<String> getFallbackKeys() { return fallbackKeys; }
    public void setFallbackKeys(List<String> fallbackKeys) { this.fallbackKeys = fallbackKeys; }
    public boolean isRequired() { return required; }
    public void setRequired(boolean required) { this.required = required; }
    public boolean isSensitive() { return sensitive; }
    public void setSensitive(boolean sensitive) { this.sensitive = sensitive; }
    public String getSemanticType() { return semanticType; }
    public void setSemanticType(String semanticType) { this.semanticType = semanticType; }
    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }
    public String getGroupId() { return groupId; }
    public void setGroupId(String groupId) { this.groupId = groupId; }
    public int getOrder() { return order; }
    public void setOrder(int order) { this.order = order; }
    public String getImportance() { return importance; }
    public void setImportance(String importance) { this.importance = importance; }
    public String getWidget() { return widget; }
    public void setWidget(String widget) { this.widget = widget; }
    public boolean isHidden() { return hidden; }
    public void setHidden(boolean hidden) { this.hidden = hidden; }
    public boolean isReadOnly() { return readOnly; }
    public void setReadOnly(boolean readOnly) { this.readOnly = readOnly; }
    public String getValueSource() { return valueSource; }
    public void setValueSource(String valueSource) { this.valueSource = valueSource; }
    public List<String> getDependsOn() { return dependsOn; }
    public void setDependsOn(List<String> dependsOn) { this.dependsOn = dependsOn; }
    public boolean isClearWhenHidden() { return clearWhenHidden; }
    public void setClearWhenHidden(boolean clearWhenHidden) { this.clearWhenHidden = clearWhenHidden; }
    public OptionSource getOptionSource() { return optionSource; }
    public void setOptionSource(OptionSource optionSource) { this.optionSource = optionSource; }
  }

  /** 远程下拉、表和字段选择器的数据来源。 */
  public static class OptionSource {
    private String action;
    private boolean searchable;
    private boolean multiple;
    private long cacheTtlMillis = 30_000L;
    private List<String> requestValueKeys = new ArrayList<>();

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public boolean isSearchable() { return searchable; }
    public void setSearchable(boolean searchable) { this.searchable = searchable; }
    public boolean isMultiple() { return multiple; }
    public void setMultiple(boolean multiple) { this.multiple = multiple; }
    public long getCacheTtlMillis() { return cacheTtlMillis; }
    public void setCacheTtlMillis(long cacheTtlMillis) { this.cacheTtlMillis = cacheTtlMillis; }
    public List<String> getRequestValueKeys() { return requestValueKeys; }
    public void setRequestValueKeys(List<String> requestValueKeys) { this.requestValueKeys = requestValueKeys; }
  }

  /** Link-Up 规则归一化后的前端交互。 */
  public static class Interaction {
    private String id;
    private String effect;
    private List<String> optionKeys = new ArrayList<>();
    private Condition condition;
    private String message;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEffect() { return effect; }
    public void setEffect(String effect) { this.effect = effect; }
    public List<String> getOptionKeys() { return optionKeys; }
    public void setOptionKeys(List<String> optionKeys) { this.optionKeys = optionKeys; }
    public Condition getCondition() { return condition; }
    public void setCondition(Condition condition) { this.condition = condition; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
  }

  /** 跨语言条件表达式，支持链式 AND/OR。 */
  public static class Condition {
    private String optionKey;
    private String operator;
    private Object expectedValue;
    private String compareOptionKey;
    private String extensionDescription;
    private String logicalOperator;
    private Condition next;

    public String getOptionKey() { return optionKey; }
    public void setOptionKey(String optionKey) { this.optionKey = optionKey; }
    public String getOperator() { return operator; }
    public void setOperator(String operator) { this.operator = operator; }
    public Object getExpectedValue() { return expectedValue; }
    public void setExpectedValue(Object expectedValue) { this.expectedValue = expectedValue; }
    public String getCompareOptionKey() { return compareOptionKey; }
    public void setCompareOptionKey(String compareOptionKey) { this.compareOptionKey = compareOptionKey; }
    public String getExtensionDescription() { return extensionDescription; }
    public void setExtensionDescription(String extensionDescription) { this.extensionDescription = extensionDescription; }
    public String getLogicalOperator() { return logicalOperator; }
    public void setLogicalOperator(String logicalOperator) { this.logicalOperator = logicalOperator; }
    public Condition getNext() { return next; }
    public void setNext(Condition next) { this.next = next; }
  }
}
