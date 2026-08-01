package io.yak.ops.business.sync.offline.form;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Yak Ops 对 Connector Schema 的产品展示覆盖，不参与执行合法性判断。 */
public final class ConnectorPresentationProfile {

  private final String connectorId;
  private final String role;
  private final String profileVersion;
  private final List<GroupProfile> groups;
  private final Map<String, FieldProfile> fields;

  public ConnectorPresentationProfile(String connectorId, String role, String profileVersion,
      List<GroupProfile> groups, Map<String, FieldProfile> fields) {
    this.connectorId = connectorId;
    this.role = role;
    this.profileVersion = profileVersion;
    this.groups = Collections.unmodifiableList(new ArrayList<>(groups));
    this.fields = Collections.unmodifiableMap(new LinkedHashMap<>(fields));
  }

  public String getConnectorId() { return connectorId; }
  public String getRole() { return role; }
  public String getProfileVersion() { return profileVersion; }
  public List<GroupProfile> getGroups() { return groups; }
  public Map<String, FieldProfile> getFields() { return fields; }

  public static final class GroupProfile {
    private final String id;
    private final String title;
    private final int order;
    private final boolean collapsed;
    private final boolean hidden;

    public GroupProfile(String id, String title, int order, boolean collapsed, boolean hidden) {
      this.id = id;
      this.title = title;
      this.order = order;
      this.collapsed = collapsed;
      this.hidden = hidden;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public int getOrder() { return order; }
    public boolean isCollapsed() { return collapsed; }
    public boolean isHidden() { return hidden; }
  }

  public static final class FieldProfile {
    private final String label;
    private final String groupId;
    private final Integer order;
    private final String importance;
    private final String widget;
    private final Boolean hidden;
    private final Boolean readOnly;
    private final String valueSource;
    private final String help;
    private final String placeholder;
    private final List<String> dependsOn;
    private final Boolean clearWhenHidden;
    private final OptionSourceProfile optionSource;

    private FieldProfile(Builder builder) {
      this.label = builder.label;
      this.groupId = builder.groupId;
      this.order = builder.order;
      this.importance = builder.importance;
      this.widget = builder.widget;
      this.hidden = builder.hidden;
      this.readOnly = builder.readOnly;
      this.valueSource = builder.valueSource;
      this.help = builder.help;
      this.placeholder = builder.placeholder;
      this.dependsOn = Collections.unmodifiableList(new ArrayList<>(builder.dependsOn));
      this.clearWhenHidden = builder.clearWhenHidden;
      this.optionSource = builder.optionSource;
    }

    public static Builder builder() { return new Builder(); }
    public String getLabel() { return label; }
    public String getGroupId() { return groupId; }
    public Integer getOrder() { return order; }
    public String getImportance() { return importance; }
    public String getWidget() { return widget; }
    public Boolean getHidden() { return hidden; }
    public Boolean getReadOnly() { return readOnly; }
    public String getValueSource() { return valueSource; }
    public String getHelp() { return help; }
    public String getPlaceholder() { return placeholder; }
    public List<String> getDependsOn() { return dependsOn; }
    public Boolean getClearWhenHidden() { return clearWhenHidden; }
    public OptionSourceProfile getOptionSource() { return optionSource; }

    public static final class Builder {
      private String label;
      private String groupId;
      private Integer order;
      private String importance;
      private String widget;
      private Boolean hidden;
      private Boolean readOnly;
      private String valueSource;
      private String help;
      private String placeholder;
      private List<String> dependsOn = new ArrayList<>();
      private Boolean clearWhenHidden;
      private OptionSourceProfile optionSource;

      public Builder label(String value) { this.label = value; return this; }
      public Builder group(String value) { this.groupId = value; return this; }
      public Builder order(int value) { this.order = value; return this; }
      public Builder importance(String value) { this.importance = value; return this; }
      public Builder widget(String value) { this.widget = value; return this; }
      public Builder hidden(boolean value) { this.hidden = value; return this; }
      public Builder readOnly(boolean value) { this.readOnly = value; return this; }
      public Builder valueSource(String value) { this.valueSource = value; return this; }
      public Builder help(String value) { this.help = value; return this; }
      public Builder placeholder(String value) { this.placeholder = value; return this; }
      public Builder dependsOn(String... values) {
        this.dependsOn = values == null ? new ArrayList<>() : new ArrayList<>(Arrays.asList(values));
        return this;
      }
      public Builder clearWhenHidden(boolean value) { this.clearWhenHidden = value; return this; }
      public Builder optionSource(String action, boolean searchable, boolean multiple,
          long cacheTtlMillis, String... requestValueKeys) {
        this.optionSource = new OptionSourceProfile(action, searchable, multiple, cacheTtlMillis,
            requestValueKeys == null ? List.of() : Arrays.asList(requestValueKeys));
        return this;
      }
      public FieldProfile build() { return new FieldProfile(this); }
    }
  }

  public static final class OptionSourceProfile {
    private final String action;
    private final boolean searchable;
    private final boolean multiple;
    private final long cacheTtlMillis;
    private final List<String> requestValueKeys;

    public OptionSourceProfile(String action, boolean searchable, boolean multiple,
        long cacheTtlMillis, List<String> requestValueKeys) {
      this.action = action;
      this.searchable = searchable;
      this.multiple = multiple;
      this.cacheTtlMillis = cacheTtlMillis;
      this.requestValueKeys = Collections.unmodifiableList(new ArrayList<>(requestValueKeys));
    }

    public String getAction() { return action; }
    public boolean isSearchable() { return searchable; }
    public boolean isMultiple() { return multiple; }
    public long getCacheTtlMillis() { return cacheTtlMillis; }
    public List<String> getRequestValueKeys() { return requestValueKeys; }
  }
}
