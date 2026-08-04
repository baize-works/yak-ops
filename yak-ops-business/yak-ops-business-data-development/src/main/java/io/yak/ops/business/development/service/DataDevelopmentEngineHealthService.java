package io.yak.ops.business.development.service;

import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.config.DataDevelopmentProperties;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.EngineEndpoint;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.HealthStatus;
import io.yak.ops.business.development.repository.DataDevelopmentPlatformRepository;
import io.yak.ops.plugin.task.api.TaskPluginCatalog;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Health probes for local plugins and configured external engine endpoints. */
@ConditionalOnDataDevelopmentEnabled
@Service
public final class DataDevelopmentEngineHealthService {

  private final DataDevelopmentPlatformRepository repository;
  private final TaskPluginCatalog plugins;
  private final Duration timeout;
  private final HttpClient httpClient;

  public DataDevelopmentEngineHealthService(
      DataDevelopmentPlatformRepository repository,
      TaskPluginCatalog plugins,
      DataDevelopmentProperties properties) {
    this.repository = repository;
    this.plugins = plugins;
    this.timeout = Duration.ofSeconds(Math.max(1,
        properties.getPlatform().getHealthCheckTimeoutSeconds()));
    this.httpClient = HttpClient.newBuilder().connectTimeout(timeout).build();
  }

  public EngineEndpoint check(long id) {
    EngineEndpoint endpoint = repository.findEngineEndpoint(id)
        .orElseThrow(() -> new IllegalArgumentException("引擎端点不存在：" + id));
    HealthResult result = probe(endpoint);
    repository.updateEngineHealth(id, result.status(), result.message(), LocalDateTime.now());
    return repository.findEngineEndpoint(id).orElseThrow();
  }

  public List<EngineEndpoint> checkAll() {
    repository.listEngineEndpoints().stream()
        .filter(EngineEndpoint::enabled)
        .forEach(item -> check(item.id()));
    return repository.listEngineEndpoints();
  }

  private HealthResult probe(EngineEndpoint endpoint) {
    if (!endpoint.enabled()) return new HealthResult(HealthStatus.DISABLED, "端点已停用");
    try {
      return switch (endpoint.probeType()) {
        case LOCAL_PLUGIN -> localPlugin(endpoint.taskType());
        case HTTP -> http(endpoint.endpoint());
        case TCP -> tcp(endpoint.endpoint());
      };
    } catch (Exception error) {
      return new HealthResult(HealthStatus.UNHEALTHY,
          error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage());
    }
  }

  private HealthResult localPlugin(String taskType) {
    try {
      var descriptor = plugins.descriptor(taskType);
      return new HealthResult(HealthStatus.HEALTHY,
          "插件已加载 · " + descriptor.pluginVersion());
    } catch (Exception error) {
      return new HealthResult(HealthStatus.UNHEALTHY, "插件未加载：" + taskType);
    }
  }

  private HealthResult http(String endpoint) throws Exception {
    URI uri = URI.create(requireEndpoint(endpoint));
    HttpRequest request = HttpRequest.newBuilder(uri).timeout(timeout).GET().build();
    int status = httpClient.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    if (status >= 200 && status < 400) {
      return new HealthResult(HealthStatus.HEALTHY, "HTTP " + status);
    }
    return new HealthResult(HealthStatus.DEGRADED, "HTTP " + status);
  }

  private HealthResult tcp(String endpoint) throws Exception {
    String value = requireEndpoint(endpoint);
    URI uri = value.contains("://") ? URI.create(value) : URI.create("tcp://" + value);
    int port = uri.getPort();
    if (port <= 0) throw new IllegalArgumentException("TCP 端点必须包含端口");
    try (Socket socket = new Socket()) {
      socket.connect(new InetSocketAddress(uri.getHost(), port), (int) timeout.toMillis());
    }
    return new HealthResult(HealthStatus.HEALTHY, "TCP 连接成功");
  }

  private static String requireEndpoint(String value) {
    if (!StringUtils.hasText(value)) throw new IllegalArgumentException("引擎端点不能为空");
    return value.trim();
  }

  private record HealthResult(HealthStatus status, String message) {
  }
}
