package io.yak.ops.spi.workflow;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/** Immutable metadata exposed by one workflow task plugin. */
public final class WorkflowTaskPluginDescriptor {

  private final String type;
  private final String name;
  private final String description;
  private final String category;
  private final String version;
  private final boolean cancellable;
  private final boolean outputCapable;
  private final Map<String, Object> configurationSchema;

  public WorkflowTaskPluginDescriptor(
      String type,
      String name,
      String description,
      String category,
      String version,
      boolean cancellable,
      boolean outputCapable,
      Map<String, Object> configurationSchema) {
    this.type = requireText(type, "type");
    this.name = requireText(name, "name");
    this.description = description == null ? "" : description;
    this.category = requireText(category, "category");
    this.version = requireText(version, "version");
    this.cancellable = cancellable;
    this.outputCapable = outputCapable;
    this.configurationSchema = immutableCopy(configurationSchema);
  }

  public String getType() {
    return type;
  }

  public String getName() {
    return name;
  }

  public String getDescription() {
    return description;
  }

  public String getCategory() {
    return category;
  }

  public String getVersion() {
    return version;
  }

  public boolean isCancellable() {
    return cancellable;
  }

  public boolean isOutputCapable() {
    return outputCapable;
  }

  public Map<String, Object> getConfigurationSchema() {
    return configurationSchema;
  }

  private static String requireText(String value, String field) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException("Workflow task plugin " + field + " must not be blank");
    }
    return value.trim();
  }

  private static Map<String, Object> immutableCopy(Map<String, Object> source) {
    if (source == null || source.isEmpty()) {
      return Map.of();
    }
    Map<String, Object> copy = new LinkedHashMap<>();
    source.forEach((key, value) -> copy.put(Objects.requireNonNull(key, "schema key"), value));
    return Collections.unmodifiableMap(copy);
  }
}
