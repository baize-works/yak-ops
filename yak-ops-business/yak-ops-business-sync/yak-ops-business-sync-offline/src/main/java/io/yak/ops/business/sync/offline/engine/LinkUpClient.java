package io.yak.ops.business.sync.offline.engine;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
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
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Link-Up 单节点离线 Worker 强类型客户端。
 *
 * @author weifuwan
 */
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

  public LinkUpNodeResponse node() {
    return get("/api/v1/node", LinkUpNodeResponse.class);
  }

  public LinkUpNodeResponse health() {
    return node();
  }

  public LinkUpJobResponse submit(
      String externalExecutionId,
      String idempotencyKey,
      int definitionVersion,
      JsonNode jobSpec) {
    requireEnabled();
    if (!StringUtils.hasText(externalExecutionId)
        || !StringUtils.hasText(idempotencyKey)
        || jobSpec == null
        || !jobSpec.isObject()) {
      throw new LinkUpProtocolException("Link-Up JobSpec 提交参数不完整");
    }
    LinkUpSubmitRequest body = new LinkUpSubmitRequest();
    body.setExternalExecutionId(externalExecutionId.trim());
    body.setIdempotencyKey(idempotencyKey.trim());
    body.setDefinitionVersion(definitionVersion);
    body.setJobSpec(jobSpec);
    HttpRequest request = HttpRequest.newBuilder(uri("/api/v1/jobs"))
        .timeout(properties.getEngine().getRequestTimeout())
        .header("Content-Type", "application/json;charset=UTF-8")
        .header("Accept", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(write(body), StandardCharsets.UTF_8))
        .build();
    return send(request, LinkUpJobResponse.class);
  }

  public LinkUpJobResponse getJob(String engineJobId) {
    return get("/api/v1/jobs/" + encode(engineJobId), LinkUpJobResponse.class);
  }

  public LinkUpJobResponse findByExternalExecutionId(String externalExecutionId) {
    return get(
        "/api/v1/jobs/external/" + encode(externalExecutionId),
        LinkUpJobResponse.class);
  }

  public LinkUpJobResponse cancel(String engineJobId) {
    requireEnabled();
    HttpRequest request = HttpRequest.newBuilder(uri("/api/v1/jobs/" + encode(engineJobId)))
        .timeout(properties.getEngine().getRequestTimeout())
        .header("Accept", "application/json")
        .DELETE()
        .build();
    return send(request, LinkUpJobResponse.class);
  }

  public JsonNode pipelines(String engineJobId) {
    return get("/api/v1/jobs/" + encode(engineJobId) + "/pipelines", JsonNode.class);
  }

  public JsonNode tasks(String engineJobId) {
    return get("/api/v1/jobs/" + encode(engineJobId) + "/tasks", JsonNode.class);
  }

  public JsonNode metrics(String engineJobId) {
    return get("/api/v1/jobs/" + encode(engineJobId) + "/metrics", JsonNode.class);
  }

  private <T> T get(String path, Class<T> type) {
    requireEnabled();
    HttpRequest request = HttpRequest.newBuilder(uri(path))
        .timeout(properties.getEngine().getRequestTimeout())
        .header("Accept", "application/json")
        .GET()
        .build();
    return send(request, type);
  }

  private <T> T send(HttpRequest request, Class<T> type) {
    try {
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        return read(response.body(), type);
      }
      JsonNode error = readError(response.body());
      throw new LinkUpRequestException(
          response.statusCode(),
          error.path("code").asText("LINK-UP-HTTP-" + response.statusCode()),
          errorMessage(error, response.body()));
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new LinkUpTransportException("Link-Up 请求被中断", exception, false);
    } catch (IOException exception) {
      // JDK HttpClient cannot always tell whether bytes reached the Worker. Reconcile by external ID.
      throw new LinkUpTransportException(
          "无法确认 Link-Up Worker 是否已接收请求：" + properties.getEngine().getBaseUrl(),
          exception,
          true);
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

  private <T> T read(String body, Class<T> type) {
    try {
      if (!StringUtils.hasText(body)) {
        if (JsonNode.class.equals(type)) {
          return type.cast(objectMapper.createObjectNode());
        }
        return type.getDeclaredConstructor().newInstance();
      }
      return objectMapper.readValue(body, type);
    } catch (ReflectiveOperationException | JsonProcessingException exception) {
      throw new LinkUpProtocolException("Link-Up 返回了无法解析的协议数据", exception);
    }
  }

  private String write(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new LinkUpProtocolException("序列化 Link-Up JobSpec 提交协议失败", exception);
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
      throw new LinkUpProtocolException("yak.sync.offline.engine.base-url 不能为空");
    }
    String normalized = baseUrl.endsWith("/")
        ? baseUrl.substring(0, baseUrl.length() - 1)
        : baseUrl;
    try {
      return URI.create(normalized + path);
    } catch (IllegalArgumentException exception) {
      throw new LinkUpProtocolException("Link-Up Worker 地址不合法：" + normalized, exception);
    }
  }

  private String encode(String value) {
    if (!StringUtils.hasText(value)) {
      throw new LinkUpProtocolException("Link-Up 标识不能为空");
    }
    return URLEncoder.encode(value.trim(), StandardCharsets.UTF_8).replace("+", "%20");
  }

  private void requireEnabled() {
    if (!properties.getEngine().isEnabled()) {
      throw new LinkUpProtocolException("Link-Up 引擎对接已关闭");
    }
  }

  @Data
  @NoArgsConstructor
  @JsonInclude(JsonInclude.Include.NON_NULL)
  public static class LinkUpSubmitRequest {
    private String externalExecutionId;
    private String idempotencyKey;
    private Integer definitionVersion;
    private JsonNode jobSpec;
  }

  @Data
  @NoArgsConstructor
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class LinkUpNodeResponse {
    private String nodeId;
    private String nodeName;
    private String instanceId;
    private String version;
    private String status;
    private Long startedAtMillis;
    private Boolean offlineOnly;
    private Integer maxConcurrentJobs;
    private Integer maxQueuedJobs;
    private Integer runningJobs;
    private Integer queuedJobs;
    private Integer activeJobs;
    private JsonNode lifecycle;
  }

  @Data
  @NoArgsConstructor
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class LinkUpJobResponse {
    private String jobId;
    private String externalExecutionId;
    private String idempotencyKey;
    private String jobName;
    private Integer definitionVersion;
    private String workerNodeId;
    private String workerInstanceId;
    private String status;
    private Long stateVersion;
    private Boolean cancellationRequested;
    private Long createTimeMillis;
    private Long submittedTimeMillis;
    private Long queuedTimeMillis;
    private Long startTimeMillis;
    private Long endTimeMillis;
    private Long durationMillis;
    private JsonNode metrics;
    private JsonNode commitSummary;
    private JsonNode pipelines;
    private JsonNode transitions;
    private String errorCode;
    private String errorMessage;
  }

  public static final class LinkUpRequestException extends RuntimeException {
    private final int statusCode;
    private final String code;

    public LinkUpRequestException(int statusCode, String code, String message) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
    }

    public int getStatusCode() { return statusCode; }
    public String getCode() { return code; }
  }

  public static final class LinkUpTransportException extends RuntimeException {
    private final boolean uncertain;

    public LinkUpTransportException(
        String message,
        Throwable cause,
        boolean uncertain) {
      super(message, cause);
      this.uncertain = uncertain;
    }

    public boolean isUncertain() { return uncertain; }
  }

  public static final class LinkUpProtocolException extends RuntimeException {
    public LinkUpProtocolException(String message) {
      super(message);
    }

    public LinkUpProtocolException(String message, Throwable cause) {
      super(message, cause);
    }
  }
}
