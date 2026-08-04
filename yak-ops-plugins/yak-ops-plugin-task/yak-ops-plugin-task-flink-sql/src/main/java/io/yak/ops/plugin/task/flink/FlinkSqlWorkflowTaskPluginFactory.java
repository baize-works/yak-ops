package io.yak.ops.plugin.task.flink;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.plugin.task.api.TaskConfiguration;
import io.yak.ops.plugin.task.api.TaskParameterResolver;
import io.yak.ops.plugin.task.api.TaskPluginType;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskPluginDescriptor;
import io.yak.ops.spi.workflow.WorkflowTaskPluginFactory;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/** Runtime factory for Flink SQL Gateway tasks. */
public final class FlinkSqlWorkflowTaskPluginFactory implements WorkflowTaskPluginFactory {

  private static final WorkflowTaskPluginDescriptor DESCRIPTOR =
      new WorkflowTaskPluginDescriptor(
          TaskPluginType.FLINK_SQL,
          "Flink SQL Gateway",
          "通过 Flink SQL Gateway 提交流批 SQL，并将有限结果集返回工作台。",
          "DATA_DEVELOPMENT",
          "1.0.0",
          true,
          true,
          FlinkSqlTaskSupport.configurationSchema());

  @Override
  public WorkflowTaskPluginDescriptor descriptor() {
    return DESCRIPTOR;
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    FlinkSqlTaskSupport.normalize(configuration);
  }

  @Override
  public Map<String, Object> normalize(Map<String, Object> configuration) {
    return FlinkSqlTaskSupport.normalize(configuration);
  }

  @Override
  public WorkflowTaskExecutor create() {
    return new FlinkSqlWorkflowTaskExecutor();
  }
}

final class FlinkSqlTaskSupport {

  private FlinkSqlTaskSupport() {
  }

  static Map<String, Object> normalize(Map<String, Object> configuration) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("statement", TaskConfiguration.requiredString(configuration, "statement"));
    String gatewayUrl = TaskConfiguration.requiredString(configuration, "gatewayUrl");
    result.put("gatewayUrl", stripTrailingSlash(gatewayUrl));
    result.put("sessionName", TaskConfiguration.string(configuration, "sessionName", "yak-ops"));
    result.put(
        "sessionProperties",
        TaskConfiguration.string(configuration, "sessionProperties", ""));
    result.put(
        "requestTimeoutSeconds",
        TaskConfiguration.positiveInteger(configuration, "requestTimeoutSeconds", 60));
    result.put(
        "pollIntervalMillis",
        TaskConfiguration.positiveInteger(configuration, "pollIntervalMillis", 500));
    result.put(
        "maxRows",
        TaskConfiguration.positiveInteger(configuration, "maxRows", 1000));
    URI.create(String.valueOf(result.get("gatewayUrl")));
    return result;
  }

  static Map<String, Object> runtimeSchema() {
    return Map.of(
        "fields",
        List.of(
            field("gatewayUrl", "string", true, "Flink SQL Gateway 地址", null),
            field("sessionName", "string", false, "Gateway Session 名称", "yak-ops"),
            field(
                "sessionProperties",
                "textarea",
                false,
                "Session 属性，每行 key=value",
                ""),
            field("requestTimeoutSeconds", "integer", false, "HTTP 请求超时秒数", 60),
            field("pollIntervalMillis", "integer", false, "结果轮询间隔毫秒", 500),
            field("maxRows", "integer", false, "最大返回行数", 1000)));
  }

  static Map<String, Object> configurationSchema() {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("statement", field("statement", "string", true, "Flink SQL 语句", null));
    for (Object item : (List<?>) runtimeSchema().get("fields")) {
      Map<?, ?> field = (Map<?, ?>) item;
      fields.put(String.valueOf(field.get("key")), field);
    }
    return Map.of("fields", fields);
  }

  static Map<String, String> properties(String source) {
    Map<String, String> result = new LinkedHashMap<>();
    if (source == null || source.isBlank()) {
      return result;
    }
    for (String line : source.split("\\R")) {
      String value = line.trim();
      if (value.isEmpty() || value.startsWith("#")) {
        continue;
      }
      int separator = value.indexOf('=');
      if (separator <= 0) {
        throw new IllegalArgumentException("Flink Session 属性必须为 key=value：" + value);
      }
      result.put(value.substring(0, separator).trim(), value.substring(separator + 1).trim());
    }
    return result;
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

  private static String stripTrailingSlash(String value) {
    String result = value.trim();
    while (result.endsWith("/")) {
      result = result.substring(0, result.length() - 1);
    }
    return result;
  }
}

final class FlinkSqlWorkflowTaskExecutor implements WorkflowTaskExecutor {

  private static final ObjectMapper JSON = new ObjectMapper();
  private final HttpClient client = HttpClient.newBuilder()
      .followRedirects(HttpClient.Redirect.NORMAL)
      .connectTimeout(Duration.ofSeconds(15))
      .build();
  private final Map<Long, GatewayHandle> running = new ConcurrentHashMap<>();

  @Override
  public String type() {
    return TaskPluginType.FLINK_SQL;
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    FlinkSqlTaskSupport.normalize(configuration);
  }

  @Override
  public WorkflowTaskResult execute(WorkflowTaskContext context) throws Exception {
    Map<String, Object> configuration = FlinkSqlTaskSupport.normalize(
        TaskParameterResolver.resolveConfiguration(
            context.configuration(),
            context.parameters()));
    int timeoutSeconds = ((Number) configuration.get("requestTimeoutSeconds")).intValue();
    String gatewayUrl = String.valueOf(configuration.get("gatewayUrl"));
    String sessionHandle = openSession(gatewayUrl, configuration, timeoutSeconds);
    GatewayHandle handle = new GatewayHandle(gatewayUrl, sessionHandle, null, timeoutSeconds);
    running.put(context.attemptId(), handle);
    context.logger().log("Flink SQL session opened: " + sessionHandle);
    try {
      String operationHandle = submitStatement(
          handle,
          String.valueOf(configuration.get("statement")));
      handle = handle.withOperation(operationHandle);
      running.put(context.attemptId(), handle);
      context.logger().log("Flink SQL operation submitted: " + operationHandle);
      Map<String, Object> outputs = collectResults(
          context,
          handle,
          ((Number) configuration.get("pollIntervalMillis")).intValue(),
          ((Number) configuration.get("maxRows")).intValue());
      outputs.put("sessionHandle", sessionHandle);
      outputs.put("operationHandle", operationHandle);
      return WorkflowTaskResult.succeeded(
          operationHandle,
          outputs,
          "Flink SQL 执行完成");
    } finally {
      running.remove(context.attemptId());
      closeSession(handle);
    }
  }

  @Override
  public void cancel(WorkflowTaskContext context) {
    GatewayHandle handle = running.get(context.attemptId());
    if (handle != null) {
      cancelOperation(handle);
    }
  }

  private String openSession(
      String gatewayUrl,
      Map<String, Object> configuration,
      int timeoutSeconds) throws Exception {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("sessionName", configuration.get("sessionName"));
    body.put(
        "properties",
        FlinkSqlTaskSupport.properties(
            String.valueOf(configuration.get("sessionProperties"))));
    JsonNode response = request(
        "POST",
        gatewayUrl + "/v1/sessions",
        body,
        timeoutSeconds);
    return requiredText(response, "sessionHandle", "session_handle");
  }

  private String submitStatement(GatewayHandle handle, String statement) throws Exception {
    JsonNode response = request(
        "POST",
        handle.gatewayUrl() + "/v1/sessions/" + handle.sessionHandle() + "/statements",
        Map.of(
            "statement", statement,
            "executionTimeout", handle.timeoutSeconds() * 1000L),
        handle.timeoutSeconds());
    return requiredText(response, "operationHandle", "operation_handle");
  }

  private Map<String, Object> collectResults(
      WorkflowTaskContext context,
      GatewayHandle handle,
      int pollIntervalMillis,
      int maxRows) throws Exception {
    List<Map<String, Object>> columns = new ArrayList<>();
    List<Map<String, Object>> rows = new ArrayList<>();
    String nextUri = handle.gatewayUrl()
        + "/v1/sessions/" + handle.sessionHandle()
        + "/operations/" + handle.operationHandle()
        + "/result/0";
    boolean truncated = false;

    while (nextUri != null) {
      context.cancellationToken().throwIfCancellationRequested();
      JsonNode response = request("GET", absolute(handle.gatewayUrl(), nextUri), null, handle.timeoutSeconds());
      String resultType = response.path("resultType").asText("");
      if ("NOT_READY".equalsIgnoreCase(resultType)) {
        TimeUnit.MILLISECONDS.sleep(pollIntervalMillis);
        continue;
      }

      JsonNode results = response.path("results");
      if (columns.isEmpty()) {
        parseColumns(results.path("columns"), columns);
      }
      JsonNode data = results.path("data");
      if (data.isArray()) {
        for (JsonNode item : data) {
          if (rows.size() >= maxRows) {
            truncated = true;
            break;
          }
          rows.add(parseRow(item, columns));
        }
      }
      if (truncated || "EOS".equalsIgnoreCase(resultType)) {
        break;
      }
      String candidate = response.path("nextResultUri").asText(null);
      nextUri = candidate == null || candidate.isBlank() ? null : candidate;
      if (nextUri == null && "PAYLOAD".equalsIgnoreCase(resultType)) {
        TimeUnit.MILLISECONDS.sleep(pollIntervalMillis);
      }
    }

    Map<String, Object> output = new LinkedHashMap<>();
    output.put("columns", columns);
    output.put("rows", rows);
    output.put("rowCount", rows.size());
    output.put("affectedRows", 0);
    output.put("truncated", truncated);
    return output;
  }

  private static void parseColumns(
      JsonNode source,
      List<Map<String, Object>> columns) {
    if (!source.isArray()) {
      return;
    }
    int index = 0;
    for (JsonNode column : source) {
      String name = column.path("name").asText("column_" + (++index));
      String type = column.path("logicalType").path("type").asText(
          column.path("type").asText("UNKNOWN"));
      columns.add(Map.of(
          "key", name,
          "title", name,
          "dataType", type));
    }
  }

  private static Map<String, Object> parseRow(
      JsonNode item,
      List<Map<String, Object>> columns) {
    JsonNode fields = item.has("fields") ? item.get("fields") : item;
    Map<String, Object> row = new LinkedHashMap<>();
    if (fields != null && fields.isArray()) {
      for (int index = 0; index < fields.size(); index++) {
        String key = index < columns.size()
            ? String.valueOf(columns.get(index).get("key"))
            : "column_" + (index + 1);
        row.put(key, JSON.convertValue(fields.get(index), Object.class));
      }
    }
    return row;
  }

  private JsonNode request(
      String method,
      String url,
      Object body,
      int timeoutSeconds) throws Exception {
    HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
        .timeout(Duration.ofSeconds(Math.max(1, timeoutSeconds)))
        .header("Accept", "application/json");
    if (body == null) {
      builder.method(method, HttpRequest.BodyPublishers.noBody());
    } else {
      builder.header("Content-Type", "application/json");
      builder.method(
          method,
          HttpRequest.BodyPublishers.ofString(
              JSON.writeValueAsString(body),
              StandardCharsets.UTF_8));
    }
    HttpResponse<String> response = client.send(
        builder.build(),
        HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    if (response.statusCode() < 200 || response.statusCode() >= 300) {
      throw new IllegalStateException(
          "Flink SQL Gateway 返回 HTTP " + response.statusCode() + "：" + abbreviate(response.body()));
    }
    if (response.body() == null || response.body().isBlank()) {
      return JSON.createObjectNode();
    }
    return JSON.readTree(response.body());
  }

  private void cancelOperation(GatewayHandle handle) {
    if (handle.operationHandle() == null) {
      return;
    }
    try {
      request(
          "DELETE",
          handle.gatewayUrl() + "/v1/sessions/" + handle.sessionHandle()
              + "/operations/" + handle.operationHandle() + "/cancel",
          null,
          handle.timeoutSeconds());
    } catch (Exception ignored) {
      // Best effort; the execution worker also interrupts the local thread.
    }
  }

  private void closeSession(GatewayHandle handle) {
    try {
      request(
          "DELETE",
          handle.gatewayUrl() + "/v1/sessions/" + handle.sessionHandle(),
          null,
          handle.timeoutSeconds());
    } catch (Exception ignored) {
      // Session cleanup is best effort.
    }
  }

  private static String requiredText(JsonNode source, String... fields) {
    for (String field : fields) {
      String value = source.path(field).asText(null);
      if (value != null && !value.isBlank()) {
        return value;
      }
    }
    throw new IllegalStateException("Flink SQL Gateway 响应缺少句柄：" + source);
  }

  private static String absolute(String baseUrl, String uri) {
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      return uri;
    }
    return uri.startsWith("/") ? baseUrl + uri : baseUrl + "/" + uri;
  }

  private static String abbreviate(String value) {
    if (value == null || value.length() <= 1000) {
      return value;
    }
    return value.substring(0, 1000) + "...";
  }

  private record GatewayHandle(
      String gatewayUrl,
      String sessionHandle,
      String operationHandle,
      int timeoutSeconds) {

    GatewayHandle withOperation(String value) {
      return new GatewayHandle(gatewayUrl, sessionHandle, value, timeoutSeconds);
    }
  }
}
