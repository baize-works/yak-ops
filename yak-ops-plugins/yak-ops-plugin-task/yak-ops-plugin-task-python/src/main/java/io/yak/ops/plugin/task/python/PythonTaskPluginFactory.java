package io.yak.ops.plugin.task.python;

import io.yak.ops.plugin.task.api.TaskPluginFactory;
import io.yak.ops.plugin.task.api.TaskPluginType;
import java.util.LinkedHashMap;
import java.util.Map;

/** Authoring contract for local Python tasks. */
public final class PythonTaskPluginFactory implements TaskPluginFactory {

  private static final Descriptor DESCRIPTOR = new Descriptor(
      TaskPluginType.PYTHON,
      "Python",
      "在受控本地进程中执行 Python 脚本，并返回标准输出和错误输出。",
      "DATA_DEVELOPMENT",
      "1.0.0",
      1,
      new Capabilities(true, true, true, true, true, false, false),
      ResultKind.TERMINAL,
      Map.of("renderer", "code", "language", "python"),
      PythonTaskSupport.runtimeSchema(),
      Map.of("parameters", "object"),
      Map.of("kind", "terminal"));

  @Override
  public Descriptor descriptor() {
    return DESCRIPTOR;
  }

  @Override
  public Map<String, Object> defaultDefinition() {
    String script = """
        \"\"\"Yak Ops Python task.\"\"\"

        def main() -> None:
            print("hello yak-ops")

        if __name__ == "__main__":
            main()
        """;
    Map<String, Object> config = PythonTaskSupport.normalize(Map.of(
        "script", script,
        "pythonExecutable", "python3",
        "arguments", "",
        "workingDirectory", "",
        "environment", "",
        "maxOutputLines", 5000));
    return definition(script, config);
  }

  @Override
  public Map<String, Object> normalizeDefinition(Map<String, Object> definition) {
    Map<String, Object> envelope = TaskPluginFactory.super.normalizeDefinition(definition);
    Map<String, Object> config = new LinkedHashMap<>();
    merge(config, envelope.get("config"));
    Object content = envelope.get("content");
    if (content instanceof Map<?, ?> contentMap
        && "text".equals(String.valueOf(contentMap.get("kind")))) {
      Object value = contentMap.get("value");
      config.put("script", value == null ? "" : String.valueOf(value));
    }
    if (envelope.get("runtime") instanceof Map<?, ?> runtime) {
      merge(config, runtime.get("specific"));
    }
    Map<String, Object> normalized = PythonTaskSupport.normalize(config);
    envelope.put("config", normalized);
    envelope.put("content", Map.of(
        "kind", "text",
        "language", "python",
        "value", normalized.get("script")));
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
            "taskType", TaskPluginType.PYTHON,
            "pluginVersion", descriptor().pluginVersion(),
            "configuration", normalized.get("config")),
        descriptor().inputSchema(),
        descriptor().outputSchema());
  }

  private static Map<String, Object> definition(
      String script,
      Map<String, Object> config) {
    Map<String, Object> definition = new LinkedHashMap<>();
    definition.put("schemaVersion", 1);
    definition.put("taskType", TaskPluginType.PYTHON);
    definition.put("pluginVersion", "1.0.0");
    definition.put("content", Map.of(
        "kind", "text",
        "language", "python",
        "value", script));
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
    result.remove("script");
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
