package io.yak.ops.business.sync.realtime.deployment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import io.yak.ops.business.sync.realtime.model.enums.DeploymentState;
import io.yak.ops.business.sync.realtime.model.response.DeploymentStatus;
import io.yak.ops.business.sync.realtime.model.response.SavepointResult;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/** Flink REST 状态和 Savepoint 客户端。 */
@ConditionalOnRealtimeSyncEnabled
@Component
public class FlinkRestClient {

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;

  public FlinkRestClient(
      @Qualifier("realtimeSyncHttpClient") HttpClient httpClient,
      @Qualifier("realtimeSyncJsonMapper") ObjectMapper objectMapper) {
    this.httpClient = httpClient;
    this.objectMapper = objectMapper;
  }

  public DeploymentStatus status(String restAddress, String jobId) {
    JsonNode body = request("GET", endpoint(restAddress, "/jobs/" + jobId), null);
    String rawState = body.path("state").asText("UNKNOWN");
    return new DeploymentStatus(mapState(rawState), rawState, body.toString());
  }

  public SavepointResult triggerSavepoint(
      String restAddress, String jobId, String targetDirectory) {
    Map<String, Object> request = new LinkedHashMap<>();
    request.put("cancel-job", false);
    if (targetDirectory != null && !targetDirectory.isBlank()) {
      request.put("target-directory", targetDirectory.trim());
    }
    String payload = write(request);
    JsonNode body = request(
        "POST", endpoint(restAddress, "/jobs/" + jobId + "/savepoints"), payload);
    return new SavepointResult(body.path("request-id").asText(null), null, body.toString());
  }

  private JsonNode request(String method, URI uri, String payload) {
    try {
      HttpRequest.Builder builder = HttpRequest.newBuilder(uri)
          .timeout(Duration.ofSeconds(30))
          .header("Content-Type", "application/json");
      if ("POST".equals(method)) {
        builder.POST(HttpRequest.BodyPublishers.ofString(payload));
      } else {
        builder.GET();
      }
      HttpResponse<String> response = httpClient.send(
          builder.build(), HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new IllegalStateException(
            "Flink REST 调用失败，HTTP " + response.statusCode() + "：" + response.body());
      }
      return objectMapper.readTree(response.body());
    } catch (Exception exception) {
      if (exception instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      throw new IllegalStateException("Flink REST 调用失败：" + exception.getMessage(), exception);
    }
  }

  private String write(Map<String, Object> value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (Exception exception) {
      throw new IllegalArgumentException("Flink REST 请求序列化失败", exception);
    }
  }

  private static URI endpoint(String restAddress, String path) {
    if (restAddress == null || restAddress.isBlank()) {
      throw new IllegalStateException("运行环境未配置 Flink REST 地址");
    }
    String normalized = restAddress.endsWith("/")
        ? restAddress.substring(0, restAddress.length() - 1)
        : restAddress;
    return URI.create(normalized + path);
  }

  private static DeploymentState mapState(String state) {
    return switch (state) {
      case "RUNNING", "RESTARTING", "INITIALIZING", "CREATED" -> DeploymentState.RUNNING;
      case "CANCELED", "CANCELLED" -> DeploymentState.CANCELLED;
      case "FINISHED" -> DeploymentState.FINISHED;
      case "FAILED", "FAILING" -> DeploymentState.FAILED;
      default -> DeploymentState.UNKNOWN;
    };
  }
}
