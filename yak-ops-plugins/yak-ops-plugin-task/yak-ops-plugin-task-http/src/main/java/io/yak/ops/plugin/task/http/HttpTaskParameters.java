package io.yak.ops.plugin.task.http;

import io.yak.ops.plugin.task.api.AbstractTaskParameters;
import io.yak.ops.plugin.task.api.TaskConfiguration;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Typed parameters persisted for an HTTP workflow task. */
public final class HttpTaskParameters extends AbstractTaskParameters {

  public static final int DEFAULT_REQUEST_TIMEOUT_SECONDS = 60;
  public static final int DEFAULT_MAX_RESPONSE_BODY_CHARACTERS = 1_000_000;
  private static final Set<String> METHODS = Set.of(
      "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS");

  private final String url;
  private final String method;
  private final Map<String, String> headers;
  private final String body;
  private final int requestTimeoutSeconds;
  private final List<Integer> successCodes;
  private final int maxResponseBodyCharacters;

  private HttpTaskParameters(Map<String, Object> configuration) {
    super(configuration);
    this.url = TaskConfiguration.string(configuration, "url", "");
    this.method = TaskConfiguration.string(configuration, "method", "GET")
        .trim()
        .toUpperCase(Locale.ROOT);
    this.headers = new LinkedHashMap<>(TaskConfiguration.stringMap(configuration, "headers"));
    this.body = TaskConfiguration.string(configuration, "body", "");
    this.requestTimeoutSeconds = TaskConfiguration.positiveInteger(
        configuration,
        "requestTimeoutSeconds",
        DEFAULT_REQUEST_TIMEOUT_SECONDS);
    this.successCodes = List.copyOf(TaskConfiguration.integerList(configuration, "successCodes"));
    this.maxResponseBodyCharacters = TaskConfiguration.positiveInteger(
        configuration,
        "maxResponseBodyCharacters",
        DEFAULT_MAX_RESPONSE_BODY_CHARACTERS);
  }

  public static HttpTaskParameters from(Map<String, Object> configuration) {
    return new HttpTaskParameters(configuration);
  }

  @Override
  public void validate() {
    validateCommonParameters();
    if (!TaskConfiguration.hasText(url)) {
      throw new IllegalArgumentException("HTTP 任务请求地址不能为空");
    }
    URI.create(url.replaceAll("\\$\\{[^}]+}", "placeholder"));
    if (!METHODS.contains(method)) {
      throw new IllegalArgumentException("不支持的 HTTP 请求方法：" + method);
    }
    for (Integer successCode : successCodes) {
      if (successCode == null || successCode < 100 || successCode > 599) {
        throw new IllegalArgumentException("HTTP 成功状态码必须在 100 到 599 之间");
      }
    }
  }

  @Override
  public Map<String, Object> toConfiguration() {
    Map<String, Object> configuration = newConfiguration();
    configuration.put("url", url.trim());
    configuration.put("method", method);
    configuration.put("headers", new LinkedHashMap<>(headers));
    configuration.put("body", body);
    configuration.put("requestTimeoutSeconds", requestTimeoutSeconds);
    configuration.put("successCodes", successCodes);
    configuration.put("maxResponseBodyCharacters", maxResponseBodyCharacters);
    return configuration;
  }

  public String getUrl() {
    return url;
  }

  public String getMethod() {
    return method;
  }

  public Map<String, String> getHeaders() {
    return Map.copyOf(headers);
  }

  public String getBody() {
    return body;
  }

  public int getRequestTimeoutSeconds() {
    return requestTimeoutSeconds;
  }

  public List<Integer> getSuccessCodes() {
    return successCodes;
  }

  public int getMaxResponseBodyCharacters() {
    return maxResponseBodyCharacters;
  }
}
