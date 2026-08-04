package io.yak.ops.plugin.task.api;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Generic task-plugin contract shared by data development and future orchestration runtimes.
 *
 * <p>The plugin owns definition normalization, validation and compilation. Execution remains a
 * separate concern so the data-development control plane can persist immutable runnable snapshots
 * without depending on a concrete worker implementation.
 */
public interface TaskPluginFactory {

  Descriptor descriptor();

  /** Creates the canonical initial definition used by the data-development editor. */
  default Map<String, Object> defaultDefinition() {
    Descriptor descriptor = descriptor();
    Map<String, Object> definition = new LinkedHashMap<>();
    definition.put("schemaVersion", descriptor.schemaVersion());
    definition.put("taskType", descriptor.taskType());
    definition.put("pluginVersion", descriptor.pluginVersion());
    definition.put("content", Map.of("kind", "form", "value", Map.of()));
    definition.put("config", Map.of());
    definition.put("runtime", Map.of("common", Map.of(), "specific", Map.of()));
    definition.put("inputs", Map.of());
    definition.put("outputs", Map.of());
    return definition;
  }

  /** Normalizes editor JSON into the canonical durable definition envelope. */
  default Map<String, Object> normalizeDefinition(Map<String, Object> definition) {
    Map<String, Object> normalized = definition == null
        ? new LinkedHashMap<>()
        : new LinkedHashMap<>(definition);
    Descriptor descriptor = descriptor();
    normalized.put("schemaVersion", descriptor.schemaVersion());
    normalized.put("taskType", descriptor.taskType());
    normalized.put("pluginVersion", descriptor.pluginVersion());
    normalized.putIfAbsent("content", Map.of("kind", "form", "value", Map.of()));
    normalized.putIfAbsent("config", Map.of());
    normalized.putIfAbsent("runtime", Map.of("common", Map.of(), "specific", Map.of()));
    normalized.putIfAbsent("inputs", Map.of());
    normalized.putIfAbsent("outputs", Map.of());
    return normalized;
  }

  /** Validates one normalized task definition. */
  default void validateDefinition(Map<String, Object> definition) {
    normalizeDefinition(definition);
  }

  /** Compiles the editable definition into an immutable execution specification. */
  default CompiledDefinition compile(Map<String, Object> definition) {
    Map<String, Object> normalized = normalizeDefinition(definition);
    validateDefinition(normalized);
    return new CompiledDefinition(
        normalized,
        normalized,
        descriptor().inputSchema(),
        descriptor().outputSchema());
  }

  enum ResultKind {
    TABLE,
    JSON,
    TERMINAL,
    NOTEBOOK,
    PIPELINE,
    TEXT
  }

  record Capabilities(
      boolean editable,
      boolean runnable,
      boolean cancellable,
      boolean publishable,
      boolean outputCapable,
      boolean statementRunnable,
      boolean streaming) {

    public static Capabilities runnable(boolean cancellable, boolean outputCapable) {
      return new Capabilities(true, true, cancellable, true, outputCapable, false, false);
    }
  }

  record Descriptor(
      String taskType,
      String name,
      String description,
      String category,
      String pluginVersion,
      int schemaVersion,
      Capabilities capabilities,
      ResultKind resultKind,
      Map<String, Object> authoringSchema,
      Map<String, Object> runtimeSchema,
      Map<String, Object> inputSchema,
      Map<String, Object> outputSchema) {

    public Descriptor {
      taskType = requireText(taskType, "taskType").toUpperCase();
      name = requireText(name, "name");
      description = description == null ? "" : description;
      category = requireText(category, "category");
      pluginVersion = requireText(pluginVersion, "pluginVersion");
      if (schemaVersion <= 0) {
        throw new IllegalArgumentException("Task plugin schemaVersion must be positive");
      }
      capabilities = Objects.requireNonNull(capabilities, "capabilities");
      resultKind = Objects.requireNonNull(resultKind, "resultKind");
      authoringSchema = immutableCopy(authoringSchema);
      runtimeSchema = immutableCopy(runtimeSchema);
      inputSchema = immutableCopy(inputSchema);
      outputSchema = immutableCopy(outputSchema);
    }
  }

  record CompiledDefinition(
      Map<String, Object> definition,
      Map<String, Object> compiledSpec,
      Map<String, Object> inputSchema,
      Map<String, Object> outputSchema) {

    public CompiledDefinition {
      definition = immutableCopy(definition);
      compiledSpec = immutableCopy(compiledSpec);
      inputSchema = immutableCopy(inputSchema);
      outputSchema = immutableCopy(outputSchema);
    }
  }

  private static String requireText(String value, String field) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException("Task plugin " + field + " must not be blank");
    }
    return value.trim();
  }

  private static Map<String, Object> immutableCopy(Map<String, Object> source) {
    if (source == null || source.isEmpty()) {
      return Map.of();
    }
    Map<String, Object> copy = new LinkedHashMap<>();
    source.forEach((key, value) -> copy.put(Objects.requireNonNull(key, "map key"), value));
    return Collections.unmodifiableMap(copy);
  }
}
