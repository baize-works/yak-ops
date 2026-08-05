package io.yak.ops.plugin.task.http;

import io.yak.ops.plugin.task.api.TaskExecutor;
import io.yak.ops.plugin.task.api.TaskPluginFactory;
import io.yak.ops.plugin.task.api.TaskPluginType;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** HTTP task authoring, validation, compilation and executor factory. */
public final class HttpTaskPluginFactory implements TaskPluginFactory {

  private static final Descriptor DESCRIPTOR = new Descriptor(
      TaskPluginType.HTTP,
      "HTTP 请求",
      "调用 HTTP 接口，并返回状态码、响应头和响应体。",
      "DATA_DEVELOPMENT",
      "1.0.0",
      1,
      new Capabilities(true, true, true, true, true, false, false),
      ResultKind.JSON,
      Map.of("renderer", "schema-form"),
      configurationSchema(),
      Map.of("type", "object"),
      Map.of("type", "object"));

  @Override
  public Descriptor descriptor() {
    return DESCRIPTOR;
  }

  @Override
  public Map<String, Object> defaultDefinition() {
    Map<String, Object> config = new LinkedHashMap<>();
    config.put("url", "");
    config.put("method", "GET");
    config.put("headers", Map.of());
    config.put("body", "");
    config.put("requestTimeoutSeconds", 60);
    config.put("successCodes", List.of());
    config.put("maxResponseBodyCharacters", 1_000_000);

    Map<String, Object> definition = new LinkedHashMap<>();
    definition.put("schemaVersion", 1);
    definition.put("taskType", TaskPluginType.HTTP);
    definition.put("pluginVersion", "1.0.0");
    definition.put("content", Map.of("kind", "form", "value", config));
    definition.put("config", config);
    definition.put("runtime", Map.of("common", Map.of(), "specific", Map.of()));
    definition.put("inputs", Map.of());
    definition.put("outputs", Map.of());
    return definition;
  }

  @Override
  public Map<String, Object> normalizeDefinition(Map<String, Object> definition) {
    Map<String, Object> envelope = TaskPluginFactory.super.normalizeDefinition(definition);
    Map<String, Object> config = new LinkedHashMap<>();
    merge(config, envelope.get("config"));

    Object content = envelope.get("content");
    if (content instanceof Map<?, ?> contentMap
        && "form".equals(String.valueOf(contentMap.get("kind")))) {
      merge(config, contentMap.get("value"));
    }
    if (envelope.get("runtime") instanceof Map<?, ?> runtime) {
      merge(config, runtime.get("specific"));
    }

    HttpTaskParameters parameters = HttpTaskParameters.from(config);
    parameters.validate();
    Map<String, Object> normalized = parameters.toConfiguration();
    envelope.put("config", normalized);
    envelope.put("content", Map.of("kind", "form", "value", normalized));
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
            "taskType", TaskPluginType.HTTP,
            "pluginVersion", descriptor().pluginVersion(),
            "configuration", normalized.get("config")),
        descriptor().inputSchema(),
        descriptor().outputSchema());
  }

  @Override
  public TaskExecutor createExecutor() {
    return new HttpTaskExecutor();
  }

  private static Map<String, Object> configurationSchema() {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("localParams", field("parameter-list", false, "任务局部输入输出参数。", List.of()));
    fields.put("url", field("string", true, "请求地址，支持 ${parameter} 参数。", null));
    fields.put(
        "method",
        field(
            "string",
            false,
            "HTTP 请求方法。",
            "GET",
            List.of("GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS")));
    fields.put("headers", field("map", false, "请求头。", Map.of()));
    fields.put("body", field("string", false, "请求体。", ""));
    fields.put("requestTimeoutSeconds", field("integer", false, "请求超时秒数。", 60));
    fields.put("successCodes", field("integer-list", false, "成功状态码，默认 200-299。", List.of()));
    fields.put(
        "maxResponseBodyCharacters",
        field("integer", false, "最多保存的响应体字符数。", 1_000_000));
    return Map.of("fields", fields);
  }

  private static Map<String, Object> field(
      String type,
      boolean required,
      String description,
      Object defaultValue) {
    return field(type, required, description, defaultValue, List.of());
  }

  private static Map<String, Object> field(
      String type,
      boolean required,
      String description,
      Object defaultValue,
      List<?> options) {
    Map<String, Object> field = new LinkedHashMap<>();
    field.put("type", type);
    field.put("required", required);
    field.put("description", description);
    if (defaultValue != null) {
      field.put("defaultValue", defaultValue);
    }
    if (options != null && !options.isEmpty()) {
      field.put("options", options);
    }
    return field;
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
