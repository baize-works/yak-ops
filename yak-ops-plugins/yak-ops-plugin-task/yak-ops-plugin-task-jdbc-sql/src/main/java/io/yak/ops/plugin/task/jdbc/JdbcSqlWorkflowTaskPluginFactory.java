package io.yak.ops.plugin.task.jdbc;

import io.yak.ops.plugin.task.api.TaskConfiguration;
import io.yak.ops.plugin.task.api.TaskParameterResolver;
import io.yak.ops.plugin.task.api.TaskPluginType;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskPluginDescriptor;
import io.yak.ops.spi.workflow.WorkflowTaskPluginFactory;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.time.temporal.TemporalAccessor;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;

/** Runtime factory for JDBC SQL tasks. */
public final class JdbcSqlWorkflowTaskPluginFactory implements WorkflowTaskPluginFactory {

  private static final WorkflowTaskPluginDescriptor DESCRIPTOR =
      new WorkflowTaskPluginDescriptor(
          TaskPluginType.SQL,
          "JDBC SQL",
          "通过标准 JDBC 执行查询或 DML，并返回结构化表格结果。",
          "DATA_DEVELOPMENT",
          "1.0.0",
          true,
          true,
          JdbcSqlTaskSupport.configurationSchema());

  @Override
  public WorkflowTaskPluginDescriptor descriptor() {
    return DESCRIPTOR;
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    JdbcSqlTaskSupport.normalize(configuration);
  }

  @Override
  public Map<String, Object> normalize(Map<String, Object> configuration) {
    return JdbcSqlTaskSupport.normalize(configuration);
  }

  @Override
  public WorkflowTaskExecutor create() {
    return new JdbcSqlWorkflowTaskExecutor();
  }
}

final class JdbcSqlTaskSupport {

  private JdbcSqlTaskSupport() {
  }

  static Map<String, Object> normalize(Map<String, Object> configuration) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("statement", TaskConfiguration.requiredString(configuration, "statement"));
    result.put("jdbcUrl", TaskConfiguration.requiredString(configuration, "jdbcUrl"));
    result.put("username", TaskConfiguration.string(configuration, "username", ""));
    result.put("password", TaskConfiguration.string(configuration, "password", ""));
    result.put(
        "driverClassName",
        TaskConfiguration.string(configuration, "driverClassName", ""));
    result.put(
        "maxRows",
        TaskConfiguration.positiveInteger(configuration, "maxRows", 1000));
    result.put(
        "fetchSize",
        TaskConfiguration.positiveInteger(configuration, "fetchSize", 200));
    result.put(
        "queryTimeoutSeconds",
        TaskConfiguration.positiveInteger(configuration, "queryTimeoutSeconds", 60));
    result.put("readOnly", bool(configuration == null ? null : configuration.get("readOnly"), true));
    return result;
  }

  static Map<String, Object> runtimeSchema() {
    return Map.of(
        "fields",
        List.of(
            field("jdbcUrl", "string", true, "JDBC 连接地址", null),
            field("username", "string", false, "数据库用户名", ""),
            field("password", "password", false, "数据库密码", ""),
            field("driverClassName", "string", false, "JDBC 驱动类", ""),
            field("maxRows", "integer", false, "最大返回行数", 1000),
            field("fetchSize", "integer", false, "JDBC Fetch Size", 200),
            field("queryTimeoutSeconds", "integer", false, "查询超时秒数", 60),
            field("readOnly", "boolean", false, "只读连接", true)));
  }

  static Map<String, Object> configurationSchema() {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("statement", field("statement", "string", true, "SQL 语句", null));
    for (Object item : (List<?>) runtimeSchema().get("fields")) {
      Map<?, ?> field = (Map<?, ?>) item;
      fields.put(String.valueOf(field.get("key")), field);
    }
    return Map.of("fields", fields);
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

final class JdbcSqlWorkflowTaskExecutor implements WorkflowTaskExecutor {

  private final Map<Long, Statement> runningStatements = new ConcurrentHashMap<>();

  @Override
  public String type() {
    return TaskPluginType.SQL;
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    JdbcSqlTaskSupport.normalize(configuration);
  }

  @Override
  public WorkflowTaskResult execute(WorkflowTaskContext context) throws Exception {
    Map<String, Object> configuration = JdbcSqlTaskSupport.normalize(
        TaskParameterResolver.resolveConfiguration(
            context.configuration(),
            context.parameters()));
    String driver = String.valueOf(configuration.get("driverClassName"));
    if (!driver.isBlank()) {
      Class.forName(driver);
    }

    Properties properties = new Properties();
    String username = String.valueOf(configuration.get("username"));
    String password = String.valueOf(configuration.get("password"));
    if (!username.isBlank()) {
      properties.setProperty("user", username);
    }
    if (!password.isBlank()) {
      properties.setProperty("password", password);
    }

    int maxRows = ((Number) configuration.get("maxRows")).intValue();
    context.logger().log("Connecting JDBC: " + maskJdbcUrl(String.valueOf(configuration.get("jdbcUrl"))));
    try (Connection connection = DriverManager.getConnection(
            String.valueOf(configuration.get("jdbcUrl")),
            properties);
        Statement statement = connection.createStatement()) {
      connection.setReadOnly(Boolean.TRUE.equals(configuration.get("readOnly")));
      statement.setFetchSize(((Number) configuration.get("fetchSize")).intValue());
      statement.setQueryTimeout(((Number) configuration.get("queryTimeoutSeconds")).intValue());
      statement.setMaxRows(maxRows + 1);
      runningStatements.put(context.attemptId(), statement);
      context.cancellationToken().throwIfCancellationRequested();

      String sql = String.valueOf(configuration.get("statement"));
      context.logger().log("Executing JDBC SQL");
      boolean query = statement.execute(sql);
      context.cancellationToken().throwIfCancellationRequested();

      Map<String, Object> outputs = query
          ? queryResult(statement.getResultSet(), maxRows)
          : updateResult(statement.getUpdateCount());
      context.logger().log(
          query
              ? "JDBC query returned " + outputs.get("rowCount") + " row(s)"
              : "JDBC statement affected " + outputs.get("affectedRows") + " row(s)");
      return WorkflowTaskResult.succeeded(null, outputs, "JDBC SQL 执行完成");
    } finally {
      runningStatements.remove(context.attemptId());
    }
  }

  @Override
  public void cancel(WorkflowTaskContext context) throws Exception {
    Statement statement = runningStatements.get(context.attemptId());
    if (statement != null) {
      statement.cancel();
    }
  }

  private static Map<String, Object> queryResult(ResultSet resultSet, int maxRows)
      throws Exception {
    List<Map<String, Object>> columns = new ArrayList<>();
    List<Map<String, Object>> rows = new ArrayList<>();
    ResultSetMetaData metadata = resultSet.getMetaData();
    List<String> keys = new ArrayList<>();
    for (int index = 1; index <= metadata.getColumnCount(); index++) {
      String label = metadata.getColumnLabel(index);
      String key = uniqueKey(keys, label == null || label.isBlank() ? "column_" + index : label);
      keys.add(key);
      columns.add(Map.of(
          "key", key,
          "title", label == null || label.isBlank() ? key : label,
          "dataType", metadata.getColumnTypeName(index)));
    }

    boolean truncated = false;
    while (resultSet.next()) {
      if (rows.size() >= maxRows) {
        truncated = true;
        break;
      }
      Map<String, Object> row = new LinkedHashMap<>();
      for (int index = 1; index <= metadata.getColumnCount(); index++) {
        row.put(keys.get(index - 1), normalizeValue(resultSet.getObject(index)));
      }
      rows.add(row);
    }

    Map<String, Object> output = new LinkedHashMap<>();
    output.put("columns", columns);
    output.put("rows", rows);
    output.put("rowCount", rows.size());
    output.put("affectedRows", 0);
    output.put("truncated", truncated);
    return output;
  }

  private static Map<String, Object> updateResult(int affectedRows) {
    Map<String, Object> output = new LinkedHashMap<>();
    output.put("columns", List.of());
    output.put("rows", List.of());
    output.put("rowCount", 0);
    output.put("affectedRows", Math.max(affectedRows, 0));
    output.put("truncated", false);
    return output;
  }

  private static Object normalizeValue(Object value) {
    if (value == null
        || value instanceof Number
        || value instanceof Boolean
        || value instanceof String) {
      return value;
    }
    if (value instanceof byte[] bytes) {
      return Base64.getEncoder().encodeToString(bytes);
    }
    if (value instanceof TemporalAccessor) {
      return value.toString();
    }
    return String.valueOf(value);
  }

  private static String uniqueKey(List<String> existing, String candidate) {
    String value = candidate;
    int suffix = 2;
    while (existing.contains(value)) {
      value = candidate + "_" + suffix++;
    }
    return value;
  }

  private static String maskJdbcUrl(String jdbcUrl) {
    return jdbcUrl.replaceAll("(?i)(password=)[^&;]+", "$1***");
  }
}
