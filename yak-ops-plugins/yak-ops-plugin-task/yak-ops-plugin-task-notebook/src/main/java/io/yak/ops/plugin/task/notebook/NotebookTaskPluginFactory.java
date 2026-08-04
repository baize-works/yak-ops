package io.yak.ops.plugin.task.notebook;

import io.yak.ops.plugin.task.api.TaskPluginFactory;
import io.yak.ops.plugin.task.api.TaskPluginType;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Authoring contract for local notebook tasks. */
public final class NotebookTaskPluginFactory implements TaskPluginFactory {

  private static final Descriptor DESCRIPTOR = new Descriptor(
      TaskPluginType.NOTEBOOK,
      "Notebook",
      "顺序执行 Python、Shell 和 Markdown Cell，并返回每个 Cell 的状态与输出。",
      "DATA_ANALYSIS",
      "1.0.0",
      1,
      new Capabilities(true, true, true, true, true, false, false),
      ResultKind.NOTEBOOK,
      Map.of("renderer", "notebook"),
      NotebookTaskSupport.runtimeSchema(),
      Map.of("parameters", "object"),
      Map.of("kind", "notebook"));

  @Override
  public Descriptor descriptor() {
    return DESCRIPTOR;
  }

  @Override
  public Map<String, Object> defaultDefinition() {
    List<Map<String, Object>> cells = List.of(
        Map.of(
            "id", "cell-1",
            "language", "markdown",
            "source", "# Yak Ops Notebook"),
        Map.of(
            "id", "cell-2",
            "language", "python",
            "source", "print('hello yak-ops notebook')"));
    Map<String, Object> config = NotebookTaskSupport.normalize(Map.of(
        "cells", cells,
        "pythonExecutable", "python3",
        "workingDirectory", "",
        "environment", "",
        "continueOnError", false,
        "cellTimeoutSeconds", 300,
        "maxOutputLines", 5000));
    return definition(cells, config);
  }

  @Override
  public Map<String, Object> normalizeDefinition(Map<String, Object> definition) {
    Map<String, Object> envelope = TaskPluginFactory.super.normalizeDefinition(definition);
    Map<String, Object> config = new LinkedHashMap<>();
    merge(config, envelope.get("config"));
    Object content = envelope.get("content");
    if (content instanceof Map<?, ?> contentMap
        && "notebook".equals(String.valueOf(contentMap.get("kind")))) {
      config.put("cells", contentMap.get("cells"));
    }
    if (envelope.get("runtime") instanceof Map<?, ?> runtime) {
      merge(config, runtime.get("specific"));
    }
    Map<String, Object> normalized = NotebookTaskSupport.normalize(config);
    envelope.put("config", normalized);
    envelope.put("content", Map.of(
        "kind", "notebook",
        "cells", normalized.get("cells")));
    envelope.put("runtime", Map.of(
        "common", commonRuntime(envelope),
        "specific", runtimeSpecific(normalized)));
    return envelope;
  }

  @Override
  public void validateDefinition(Map<String, Object> definition) {
    normalizeDefinition(definition);
  }

  @Override
  public CompiledDefinition compile(Map<String, Object> definition) {
    Map<String, Object> normalized = normalizeDefinition(definition);
    return new CompiledDefinition(
        normalized,
        Map.of(
            "taskType", TaskPluginType.NOTEBOOK,
            "pluginVersion", descriptor().pluginVersion(),
            "configuration", normalized.get("config")),
        descriptor().inputSchema(),
        descriptor().outputSchema());
  }

  private static Map<String, Object> definition(
      List<Map<String, Object>> cells,
      Map<String, Object> config) {
    Map<String, Object> definition = new LinkedHashMap<>();
    definition.put("schemaVersion", 1);
    definition.put("taskType", TaskPluginType.NOTEBOOK);
    definition.put("pluginVersion", "1.0.0");
    definition.put("content", Map.of(
        "kind", "notebook",
        "cells", cells));
    definition.put("config", config);
    definition.put("runtime", Map.of(
        "common", Map.of(),
        "specific", runtimeSpecific(config)));
    definition.put("inputs", Map.of());
    definition.put("outputs", Map.of());
    return definition;
  }

  private static Map<String, Object> commonRuntime(Map<String, Object> envelope) {
    Object runtime = envelope.get("runtime");
    if (runtime instanceof Map<?, ?> runtimeMap
        && runtimeMap.get("common") instanceof Map<?, ?> common) {
      Map<String, Object> result = new LinkedHashMap<>();
      merge(result, common);
      return result;
    }
    return Map.of();
  }

  private static Map<String, Object> runtimeSpecific(Map<String, Object> config) {
    Map<String, Object> result = new LinkedHashMap<>(config);
    result.remove("cells");
    return result;
  }

  private static void merge(Map<String, Object> target, Object source) {
    if (!(source instanceof Map<?, ?> map)) {
      return;
    }
    map.forEach((key, value) -> {
      if (key != null) {
        target.put(String.valueOf(key), value);
      }
    });
  }
}
