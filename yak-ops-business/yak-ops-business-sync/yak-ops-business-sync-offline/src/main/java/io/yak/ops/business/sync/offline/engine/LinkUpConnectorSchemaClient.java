package io.yak.ops.business.sync.offline.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
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

/**
 * Link-Up Connector Schema 只读客户端。
 *
 * <p>既支持默认 Worker，也支持按已登记 Worker 地址查询，用于多 Worker 能力快照。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Component
public class LinkUpConnectorSchemaClient {

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final OfflineSyncProperties properties;

  public LinkUpConnectorSchemaClient(
      @Qualifier("offlineSyncHttpClient") HttpClient httpClient,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper,
      OfflineSyncProperties properties) {
    this.httpClient = httpClient;
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  public JsonNode list() {
    return list(properties.getEngine().getBaseUrl());
  }

  public JsonNode list(String baseUrl) {
    return request(baseUrl, "/api/v1/connectors");
  }

  public JsonNode listByRole(String role) {
    return listByRole(properties.getEngine().getBaseUrl(), role);
  }

  public JsonNode listByRole(String baseUrl, String role) {
    return request(baseUrl, "/api/v1/connectors?role=" + encodeRole(role));
  }

  public JsonNode get(String connectorId, String role) {
    return get(properties.getEngine().getBaseUrl(), connectorId, role);
  }

  public JsonNode get(String baseUrl, String connectorId, String role) {
    if (!StringUtils.hasText(connectorId)) {
      throw new IllegalArgumentException("connectorId 不能为空");
    }
    return request(
        baseUrl,
        "/api/v1/connectors/" + encode(connectorId) + "/schema?role=" + encodeRole(role));
  }

  private JsonNode request(String baseUrl, String path) {
    requireEnabled();
    String normalized = normalizeBaseUrl(baseUrl);
    HttpRequest request = HttpRequest.newBuilder(URI.create(normalized + path))
        .timeout(properties.getEngine().getRequestTimeout())
        .header("Accept", "application/json")
        .GET()
        .build();
    try {
      HttpResponse<String> response = httpClient.send(
          request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      JsonNode body = read(response.body());
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        return body;
      }
      throw new LinkUpClient.LinkUpRequestException(
          response.statusCode(),
          body.path("code").asText("LINK-UP-HTTP-" + response.statusCode()),
          errorMessage(body, response.body()));
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Link-Up Connector Schema 请求被中断", exception);
    } catch (IOException exception) {
      throw new IllegalStateException("无法连接 Link-Up Worker：" + normalized, exception);
    }
  }

  private JsonNode read(String body) {
    if (!StringUtils.hasText(body)) {
      return objectMapper.createArrayNode();
    }
    try {
      return objectMapper.readTree(body);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Link-Up 返回了无法解析的 Connector Schema", exception);
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
    if (!StringUtils.hasText(value)) {
      throw new IllegalStateException("Link-Up Worker 地址不能为空");
    }
    String normalized = value.trim();
    while (normalized.endsWith("/")) {
      normalized = normalized.substring(0, normalized.length() - 1);
    }
    URI uri;
    try {
      uri = URI.create(normalized);
    } catch (IllegalArgumentException exception) {
      throw new IllegalArgumentException("Link-Up Worker 地址不合法：" + value, exception);
    }
    if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
        || !StringUtils.hasText(uri.getHost())) {
      throw new IllegalArgumentException("Link-Up Worker 地址必须是有效的 HTTP/HTTPS 地址");
    }
    return normalized;
  }

  private String encode(String value) {
    return URLEncoder.encode(value.trim(), StandardCharsets.UTF_8).replace("+", "%20");
  }

  private String encodeRole(String role) {
    if (!StringUtils.hasText(role)) {
      throw new IllegalArgumentException("role 不能为空");
    }
    String normalized = role.trim().toUpperCase(java.util.Locale.ROOT);
    if (!"SOURCE".equals(normalized) && !"SINK".equals(normalized)) {
      throw new IllegalArgumentException("role 只支持 SOURCE 或 SINK");
    }
    return encode(normalized);
  }

  private void requireEnabled() {
    if (!properties.getEngine().isEnabled()) {
      throw new IllegalStateException("Link-Up 引擎对接已关闭");
    }
  }
}
