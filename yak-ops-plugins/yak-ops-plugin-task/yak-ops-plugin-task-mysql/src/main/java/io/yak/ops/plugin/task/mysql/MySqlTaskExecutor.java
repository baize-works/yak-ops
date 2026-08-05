package io.yak.ops.plugin.task.mysql;

import io.yak.ops.plugin.task.api.TaskExecutionContext;
import io.yak.ops.plugin.task.api.TaskExecutionResult;
import io.yak.ops.plugin.task.api.TaskExecutor;
import io.yak.ops.plugin.task.api.TaskParameterResolver;
import io.yak.ops.plugin.task.api.TaskPluginType;
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

/** Executes one MySQL task attempt through the standard JDBC driver. */
final class MySqlTaskExecutor implements TaskExecutor {

  private final Map<Long, Statement> runningStatements = new ConcurrentHashMap<>();

  @Override
  public String type() {
    return TaskPluginType.MYSQL;
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    MySqlTaskSupport.normalize(configuration);
  }

  @Override
  public TaskExecutionResult execute(TaskExecutionContext context) throws Exception {
    Map<String, Object> configuration = MySqlTaskSupport.normalize(
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
    context.logger().log(
        "Connecting MySQL: " + maskJdbcUrl(String.valueOf(configuration.get("jdbcUrl"))));
    try (Connection connection = DriverManager.getConnection(
            String.valueOf(configuration.get("jdbcUrl")),
            properties);
        Statement statement = connection.createStatement()) {
      connection.setReadOnly(Boolean.TRUE.equals(configuration.get("readOnly")));
      statement.setFetchSize(((Number) configuration.get("fetchSize")).intValue());
      statement.setQueryTimeout(
          ((Number) configuration.get("queryTimeoutSeconds")).intValue());
      statement.setMaxRows(maxRows + 1);
      runningStatements.put(context.attemptId(), statement);
      context.cancellationToken().throwIfCancellationRequested();

      context.logger().log("Executing MySQL statement");
      boolean query = statement.execute(String.valueOf(configuration.get("statement")));
      context.cancellationToken().throwIfCancellationRequested();

      Map<String, Object> outputs = query
          ? queryResult(statement.getResultSet(), maxRows)
          : updateResult(statement.getUpdateCount());
      context.logger().log(
          query
              ? "MySQL query returned " + outputs.get("rowCount") + " row(s)"
              : "MySQL statement affected " + outputs.get("affectedRows") + " row(s)");
      return TaskExecutionResult.succeeded(null, outputs, "MySQL 执行完成");
    } finally {
      runningStatements.remove(context.attemptId());
    }
  }

  @Override
  public void cancel(TaskExecutionContext context) throws Exception {
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
      String key = uniqueKey(
          keys,
          label == null || label.isBlank() ? "column_" + index : label);
      keys.add(key);
      Map<String, Object> column = new LinkedHashMap<>();
      column.put("key", key);
      column.put("title", label == null || label.isBlank() ? key : label);
      column.put("dataType", metadata.getColumnTypeName(index));
      columns.add(column);
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
