package io.yak.ops.business.sync.offline.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpNodeResponse;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 按指定地址访问 Link-Up Worker 的轻量探测客户端。
 *
 * <p>任务执行仍由 {@link LinkUpClient} 使用默认节点；本客户端只负责 Worker 管理、连接验证和心跳。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Component
public class LinkUpWorkerProbeClient {

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final OfflineSyncProperties properties;

  public LinkUpWorkerProbeClient(
      @Qualifier("offlineSyncHttpClient") HttpClient httpClient,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper,
      OfflineSyncProperties properties) {
    this.httpClient = httpClient;
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  public LinkUpNodeResponse node(String baseUrl) {
    String normalized = normalizeBaseUrl(baseUrl);
    HttpRequest request = HttpRequest.newBuilder(uri(normalized, "/api/v1/node"))
        .timeout(properties.getEngine().getRequestTimeout())
        .header("Accept", "application/json")
        .GET()
        .build();
    try {
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        return read(response.body());
      }
      JsonNode error = readError(response.body());
      String message = error.path("message").asText(null);
      if (!StringUtils.hasText(message)) {
        message = error.path("error").asText(response.body());
      }
      throw new IllegalStateException(
          "Link-Up Worker 请求失败(" + response.statusCode() + ")：" + message);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Link-Up Worker 探测被中断", exception);
    } catch (IOException exception) {
      throw new IllegalStateException("无法连接 Link-Up Worker：" + normalized, exception);
    }
  }

  public String normalizeBaseUrl(String baseUrl) {
    if (!StringUtils.hasText(baseUrl)) {
      throw new IllegalArgumentException("Worker 地址不能为空");
    }
    String normalized = baseUrl.trim();
    while (normalized.endsWith("/")) {
      normalized = normalized.substring(0, normalized.length() - 1);
    }
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      throw new IllegalArgumentException("Worker 地址必须以 http:// 或 https:// 开头");
    }
    try {
      URI uri = URI.create(normalized);
      if (!StringUtils.hasText(uri.getHost())) {
        throw new IllegalArgumentException("Worker 地址缺少主机名");
      }
      return normalized;
    } catch (IllegalArgumentException exception) {
      throw new IllegalArgumentException("Worker 地址不合法：" + baseUrl, exception);
    }
  }

  private URI uri(String baseUrl, String path) {
    return URI.create(baseUrl + path);
  }

  private LinkUpNodeResponse read(String body) {
    try {
      if (!StringUtils.hasText(body)) {
        throw new IllegalStateException("Link-Up Worker 返回了空响应");
      }
      return objectMapper.readValue(body, LinkUpNodeResponse.class);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Link-Up Worker 返回了无法解析的节点信息", exception);
    }
  }

  private JsonNode readError(String body) {
    if (!StringUtils.hasText(body)) {
      return objectMapper.createObjectNode();
    }
    try {
      return objectMapper.readTree(body);
    } catch (JsonProcessingException exception) {
      return objectMapper.createObjectNode().put("message", body);
    }
  }
}
