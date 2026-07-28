package io.yak.ops.plugin.task.http;

import io.yak.ops.plugin.task.api.TaskPluginType;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskPluginDescriptor;
import io.yak.ops.spi.workflow.WorkflowTaskPluginFactory;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Factory and discoverable metadata for the HTTP workflow task plugin. */
public final class HttpWorkflowTaskPluginFactory implements WorkflowTaskPluginFactory {

  private static final WorkflowTaskPluginDescriptor DESCRIPTOR =
      new WorkflowTaskPluginDescriptor(
          TaskPluginType.HTTP,
          "HTTP 请求",
          "调用 HTTP 接口，并将状态码、响应头和响应体写入任务输出。",
          "GENERAL",
          "1.0.0",
          true,
          true,
          configurationSchema());

  @Override
  public WorkflowTaskPluginDescriptor descriptor() {
    return DESCRIPTOR;
  }

  @Override
  public WorkflowTaskExecutor create() {
    return new HttpWorkflowTaskExecutor();
  }

  private static Map<String, Object> configurationSchema() {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("url", field("string", true, "请求地址，支持 ${parameter} 参数。", null));
    fields.put("method", field(
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
}
