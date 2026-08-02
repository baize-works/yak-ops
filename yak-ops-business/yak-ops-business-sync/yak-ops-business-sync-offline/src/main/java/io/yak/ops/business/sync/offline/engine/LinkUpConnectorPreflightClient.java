package io.yak.ops.business.sync.offline.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpRequestException;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** Worker 视角的 Connector 只读可达性预检客户端。 */
@ConditionalOnOfflineSyncEnabled
@Component
public class LinkUpConnectorPreflightClient {

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final OfflineSyncProperties properties;

  public LinkUpConnectorPreflightClient(
      @Qualifier("offlineSyncHttpClient") HttpClient httpClient,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper,
      OfflineSyncProperties properties) {
    this.httpClient = httpClient;
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  public JsonNode preflight(
      String baseUrl,
      String connectorId,
      String role,
      JsonNode options) {
    requireEnabled();
    String normalizedBaseUrl = normalizeBaseUrl(baseUrl);
    String normalizedConnectorId = required(connectorId, "connectorId").toLowerCase(Locale.ROOT);
    String normalizedRole = required(role, "role").toUpperCase(Locale.ROOT);
    if (!"SOURCE".equals(normalizedRole) && !"SINK".equals(normalizedRole)) {
      throw new IllegalArgumentException("role 只支持 SOURCE 或 SINK");
    }

    ObjectNode requestBody = objectMapper.createObjectNode();
    requestBody.set(
        "options",
        options == null || !options.isObject()
            ? objectMapper.createObjectNode()
            : options.deepCopy());
    URI uri = URI.create(
        normalizedBaseUrl
            + "/api/v1/connectors/"
            + encode(normalizedConnectorId)
            + "/preflight?role="
            + encode(normalizedRole));
    HttpRequest request = HttpRequest.newBuilder(uri)
        .timeout(properties.getEngine().getRequestTimeout())
        .header("Content-Type", "application/json;charset=UTF-8")
        .header("Accept", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(write(requestBody), StandardCharsets.UTF_8))
        .build();
    try {
      HttpResponse<String> response = httpClient.send(
          request,
          HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      JsonNode body = read(response.body());
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        return body;
      }
      throw new LinkUpRequestException(
          response.statusCode(),
          body.path("code").asText("LINK-UP-HTTP-" + response.statusCode()),
          errorMessage(body, response.body()));
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Link-Up Connector 预检被中断", exception);
    } catch (IOException exception) {
      throw new IllegalStateException(
          "无法从 Worker 执行 Connector 预检：" + normalizedBaseUrl,
          exception);
    }
  }

  private JsonNode read(String body) {
    if (!StringUtils.hasText(body)) {
      return objectMapper.createObjectNode();
    }
    try {
      return objectMapper.readTree(body);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Link-Up 返回了无法解析的预检结果", exception);
    }
  }

  private String write(JsonNode body) {
    try {
      return objectMapper.writeValueAsString(body);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化 Connector 预检请求失败", exception);
    }
  }

  private String errorMessage(JsonNode body, String fallback) {
    String message = body.path("message").asText(null);
    if (!StringUtils.hasText(message)) {
      message = body.path("error").asText(null);
    }
    return StringUtils.hasText(message) ? message : fallback;
  }

  private String normalizeBaseUrl(String value) {
    String normalized = required(value, "Worker 地址");
    while (normalized.endsWith("/")) {
      normalized = normalized.substring(0, normalized.length() - 1);
    }
    URI uri;
    try {
      uri = URI.create(normalized);
    } catch (IllegalArgumentException exception) {
      throw new IllegalArgumentException("Worker 地址不合法：" + value, exception);
    }
    if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
        || !StringUtils.hasText(uri.getHost())) {
      throw new IllegalArgumentException("Worker 地址必须是有效的 HTTP/HTTPS 地址");
    }
    return normalized;
  }

  private String required(String value, String name) {
    if (!StringUtils.hasText(value)) {
      throw new IllegalArgumentException(name + "不能为空");
    }
    return value.trim();
  }

  private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
  }

  private void requireEnabled() {
    if (!properties.getEngine().isEnabled()) {
      throw new IllegalStateException("Link-Up 引擎对接已关闭");
    }
  }
}
