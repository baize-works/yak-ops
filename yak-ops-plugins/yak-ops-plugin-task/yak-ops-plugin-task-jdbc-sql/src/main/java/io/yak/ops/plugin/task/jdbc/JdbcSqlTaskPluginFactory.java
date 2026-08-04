package io.yak.ops.plugin.task.jdbc;

import io.yak.ops.plugin.task.api.TaskPluginFactory;
import io.yak.ops.plugin.task.api.TaskPluginType;
import java.util.LinkedHashMap;
import java.util.Map;

/** Authoring contract for JDBC SQL tasks. */
public final class JdbcSqlTaskPluginFactory implements TaskPluginFactory {

  private static final Descriptor DESCRIPTOR = new Descriptor(
      TaskPluginType.SQL,
      "JDBC SQL",
      "通过标准 JDBC 执行查询或 DML，并返回结构化表格结果。",
      "DATA_DEVELOPMENT",
      "1.0.0",
      1,
      new Capabilities(true, true, true, true, true, true, false),
      ResultKind.TABLE,
      Map.of("renderer", "code", "language", "sql"),
      JdbcSqlTaskSupport.runtimeSchema(),
      Map.of("parameters", "object"),
      Map.of("kind", "table"));

  @Override
  public Descriptor descriptor() {
    return DESCRIPTOR;
  }

  @Override
  public Map<String, Object> defaultDefinition() {
    String statement = "SELECT 1 AS yak_ops_ready;";
    Map<String, Object> config = JdbcSqlTaskSupport.normalize(Map.of(
        "statement", statement,
        "jdbcUrl", "jdbc:mysql://127.0.0.1:3306/yak_security",
        "username", "root",
        "password", "",
        "driverClassName", "com.mysql.cj.jdbc.Driver",
        "maxRows", 1000,
        "fetchSize", 200,
        "queryTimeoutSeconds", 60,
        "readOnly", true));
    return definition(statement, config);
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
      config.put("statement", value == null ? "" : String.valueOf(value));
    }
    if (envelope.get("runtime") instanceof Map<?, ?> runtime) {
      merge(config, runtime.get("specific"));
    }
    Map<String, Object> normalized = JdbcSqlTaskSupport.normalize(config);
    envelope.put("config", normalized);
    envelope.put("content", Map.of(
        "kind", "text",
        "language", "sql",
        "value", normalized.get("statement")));
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
            "taskType", TaskPluginType.SQL,
            "pluginVersion", descriptor().pluginVersion(),
            "configuration", normalized.get("config")),
        descriptor().inputSchema(),
        descriptor().outputSchema());
  }

  private static Map<String, Object> definition(
      String statement,
      Map<String, Object> config) {
    Map<String, Object> definition = new LinkedHashMap<>();
    definition.put("schemaVersion", 1);
    definition.put("taskType", TaskPluginType.SQL);
    definition.put("pluginVersion", "1.0.0");
    definition.put("content", Map.of(
        "kind", "text",
        "language", "sql",
        "value", statement));
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
    result.remove("statement");
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
