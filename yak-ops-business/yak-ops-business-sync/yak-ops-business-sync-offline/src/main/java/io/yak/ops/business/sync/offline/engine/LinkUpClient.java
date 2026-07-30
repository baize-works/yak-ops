package io.yak.ops.business.sync.offline.engine;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** Link-Up REST HTTP 客户端。 */
@ConditionalOnOfflineSyncEnabled
@Component
public class LinkUpClient {

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final OfflineSyncProperties properties;

  public LinkUpClient(
      @Qualifier("offlineSyncHttpClient") HttpClient httpClient,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper,
      OfflineSyncProperties properties) {
    this.httpClient = httpClient;
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  public JsonNode health() {
    return get("/api/v1/health");
  }

  public JsonNode submit(String hocon) {
    requireEnabled();
    if (!StringUtils.hasText(hocon)) {
      throw new IllegalArgumentException("Link-Up 作业配置不能为空");
    }
    HttpRequest request = HttpRequest.newBuilder(uri("/api/v1/jobs"))
        .timeout(properties.getEngine().getRequestTimeout())
        .header("Content-Type", "application/hocon;charset=UTF-8")
        .header("Accept", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(hocon, StandardCharsets.UTF_8))
        .build();
    return send(request);
  }

  public JsonNode getJob(String engineJobId) {
    return get("/api/v1/jobs/" + encode(engineJobId));
  }

  public JsonNode pipelines(String engineJobId) {
    return get("/api/v1/jobs/" + encode(engineJobId) + "/pipelines");
  }

  public JsonNode tasks(String engineJobId) {
    return get("/api/v1/jobs/" + encode(engineJobId) + "/tasks");
  }

  public JsonNode metrics(String engineJobId) {
    return get("/api/v1/jobs/" + encode(engineJobId) + "/metrics");
  }

  public JsonNode cancel(String engineJobId) {
    requireEnabled();
    HttpRequest request = HttpRequest.newBuilder(uri("/api/v1/jobs/" + encode(engineJobId)))
        .timeout(properties.getEngine().getRequestTimeout())
        .header("Accept", "application/json")
        .DELETE()
        .build();
    return send(request);
  }

  private JsonNode get(String path) {
    requireEnabled();
    HttpRequest request = HttpRequest.newBuilder(uri(path))
        .timeout(properties.getEngine().getRequestTimeout())
        .header("Accept", "application/json")
        .GET()
        .build();
    return send(request);
  }

  private JsonNode send(HttpRequest request) {
    try {
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      JsonNode body = parse(response.body());
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        return body;
      }
      throw new IllegalStateException(
          "Link-Up 请求失败(" + response.statusCode() + ")：" + errorMessage(body, response.body()));
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Link-Up 请求被中断", exception);
    } catch (IOException exception) {
      throw new IllegalStateException(
          "无法连接 Link-Up 引擎：" + properties.getEngine().getBaseUrl(), exception);
    }
  }

  private JsonNode parse(String body) {
    if (!StringUtils.hasText(body)) {
      return objectMapper.createObjectNode();
    }
    try {
      return objectMapper.readTree(body);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Link-Up 返回了无法解析的 JSON", exception);
    }
  }

  private String errorMessage(JsonNode body, String fallback) {
    String message = body.path("message").asText(null);
    if (!StringUtils.hasText(message)) {
      message = body.path("error").asText(null);
    }
    return StringUtils.hasText(message) ? message : fallback;
  }

  private URI uri(String path) {
    String baseUrl = properties.getEngine().getBaseUrl();
    if (!StringUtils.hasText(baseUrl)) {
      throw new IllegalStateException("yak.sync.offline.engine.base-url 不能为空");
    }
    String normalized = baseUrl.endsWith("/")
        ? baseUrl.substring(0, baseUrl.length() - 1)
        : baseUrl;
    return URI.create(normalized + path);
  }

  private String encode(String value) {
    if (!StringUtils.hasText(value)) {
      throw new IllegalArgumentException("Link-Up jobId 不能为空");
    }
    return URLEncoder.encode(value.trim(), StandardCharsets.UTF_8).replace("+", "%20");
  }

  private void requireEnabled() {
    if (!properties.getEngine().isEnabled()) {
      throw new IllegalStateException("Link-Up 引擎对接已关闭");
    }
  }
}
