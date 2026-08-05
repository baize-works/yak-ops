package io.yak.ops.plugin.task.mysql;

import io.yak.ops.plugin.task.api.TaskConfiguration;
import io.yak.ops.plugin.task.api.TaskExecutor;
import io.yak.ops.plugin.task.api.TaskPluginFactory;
import io.yak.ops.plugin.task.api.TaskPluginType;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** MySQL task authoring, validation, compilation and executor factory. */
public final class MySqlTaskPluginFactory implements TaskPluginFactory {

  private static final Descriptor DESCRIPTOR = new Descriptor(
      TaskPluginType.MYSQL,
      "MySQL",
      "执行 MySQL 查询或 DML，并返回结构化表格结果。",
      "DATABASE",
      "1.0.0",
      1,
      new Capabilities(true, true, true, true, true, true, false),
      ResultKind.TABLE,
      Map.of("renderer", "code", "language", "sql"),
      MySqlTaskSupport.runtimeSchema(),
      Map.of("parameters", "object"),
      Map.of("kind", "table"));

  @Override
  public Descriptor descriptor() {
    return DESCRIPTOR;
  }

  @Override
  public Map<String, Object> defaultDefinition() {
    String statement = "SELECT 1 AS yak_ops_ready;";
    Map<String, Object> config = MySqlTaskSupport.normalize(Map.of(
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

    Map<String, Object> normalized = MySqlTaskSupport.normalize(config);
    envelope.put("taskType", TaskPluginType.MYSQL);
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
            "taskType", TaskPluginType.MYSQL,
            "pluginVersion", descriptor().pluginVersion(),
            "configuration", normalized.get("config")),
        descriptor().inputSchema(),
        descriptor().outputSchema());
  }

  @Override
  public TaskExecutor createExecutor() {
    return new MySqlTaskExecutor();
  }

  private static Map<String, Object> definition(
      String statement,
      Map<String, Object> config) {
    Map<String, Object> definition = new LinkedHashMap<>();
    definition.put("schemaVersion", 1);
    definition.put("taskType", TaskPluginType.MYSQL);
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

final class MySqlTaskSupport {

  private MySqlTaskSupport() {
  }

  static Map<String, Object> normalize(Map<String, Object> configuration) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("statement", TaskConfiguration.requiredString(configuration, "statement"));
    String jdbcUrl = TaskConfiguration.requiredString(configuration, "jdbcUrl");
    if (!jdbcUrl.toLowerCase(Locale.ROOT).startsWith("jdbc:mysql:")) {
      throw new IllegalArgumentException("MySQL 地址必须以 jdbc:mysql: 开头");
    }
    result.put("jdbcUrl", jdbcUrl);
    result.put("username", TaskConfiguration.string(configuration, "username", ""));
    result.put("password", TaskConfiguration.string(configuration, "password", ""));
    result.put(
        "driverClassName",
        TaskConfiguration.string(
            configuration,
            "driverClassName",
            "com.mysql.cj.jdbc.Driver"));
    result.put(
        "maxRows",
        TaskConfiguration.positiveInteger(configuration, "maxRows", 1000));
    result.put(
        "fetchSize",
        TaskConfiguration.positiveInteger(configuration, "fetchSize", 200));
    result.put(
        "queryTimeoutSeconds",
        TaskConfiguration.positiveInteger(configuration, "queryTimeoutSeconds", 60));
    result.put(
        "readOnly",
        bool(configuration == null ? null : configuration.get("readOnly"), true));
    return result;
  }

  static Map<String, Object> runtimeSchema() {
    return Map.of(
        "fields",
        List.of(
            field("jdbcUrl", "string", true, "MySQL 连接地址", null),
            field("username", "string", false, "MySQL 用户名", ""),
            field("password", "password", false, "MySQL 密码", ""),
            field(
                "driverClassName",
                "string",
                false,
                "MySQL 驱动类",
                "com.mysql.cj.jdbc.Driver"),
            field("maxRows", "integer", false, "最大返回行数", 1000),
            field("fetchSize", "integer", false, "Fetch Size", 200),
            field("queryTimeoutSeconds", "integer", false, "查询超时秒数", 60),
            field("readOnly", "boolean", false, "只读连接", true)));
  }

  private static Map<String, Object> field(
      String key,
      String type,
      boolean required,
      String description,
      Object defaultValue) {
    Map<String, Object> field = new LinkedHashMap<>();
    field.put("key", key);
    field.put("type", type);
    field.put("required", required);
    field.put("description", description);
    if (defaultValue != null) {
      field.put("defaultValue", defaultValue);
    }
    return field;
  }

  private static boolean bool(Object value, boolean fallback) {
    return value == null ? fallback : Boolean.parseBoolean(String.valueOf(value));
  }
}
