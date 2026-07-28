package io.yak.ops.business.workflow.executor;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;

/** Executes an HTTP request using the JDK client. */
@ConditionalOnWorkflowEnabled
@Component
public final class HttpWorkflowTaskExecutor implements WorkflowTaskExecutor {

  private final HttpClient client = HttpClient.newBuilder()
      .followRedirects(HttpClient.Redirect.NORMAL)
      .connectTimeout(Duration.ofSeconds(15))
      .build();
  private final Map<Long, CompletableFuture<?>> runningRequests = new ConcurrentHashMap<>();

  @Override
  public String type() {
    return "HTTP";
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    Object url = configuration == null ? null : configuration.get("url");
    if (url == null || String.valueOf(url).isBlank()) {
      throw new IllegalArgumentException("HTTP task requires a non-blank url");
    }
    URI.create(String.valueOf(url));
  }

  @Override
  public WorkflowTaskResult execute(WorkflowTaskContext context) throws Exception {
    HttpRequest request = buildRequest(context.configuration());
    context.logger().log(request.method() + " " + request.uri());
    CompletableFuture<HttpResponse<String>> future = client.sendAsync(
        request,
        HttpResponse.BodyHandlers.ofString());
    runningRequests.put(context.attemptId(), future);
    try {
      while (!future.isDone()) {
        if (context.cancellationToken().isCancellationRequested()) {
          future.cancel(true);
          context.cancellationToken().throwIfCancellationRequested();
        }
        TimeUnit.MILLISECONDS.sleep(100L);
      }
      HttpResponse<String> response = future.join();
      int statusCode = response.statusCode();
      context.logger().log("HTTP status: " + statusCode);
      if (!successCodes(context.configuration()).contains(statusCode)) {
        return WorkflowTaskResult.failure(
            "HTTP request returned status " + statusCode + ": " + abbreviate(response.body()));
      }
      Map<String, Object> outputs = new LinkedHashMap<>();
      outputs.put("statusCode", statusCode);
      outputs.put("body", response.body());
      return WorkflowTaskResult.succeeded(null, outputs, "HTTP request completed");
    } finally {
      runningRequests.remove(context.attemptId());
    }
  }

  @Override
  public void cancel(WorkflowTaskContext context) {
    CompletableFuture<?> future = runningRequests.get(context.attemptId());
    if (future != null) {
      future.cancel(true);
    }
  }

  private static HttpRequest buildRequest(Map<String, Object> configuration) {
    String method = String.valueOf(configuration.getOrDefault("method", "GET")).toUpperCase();
    String body = String.valueOf(configuration.getOrDefault("body", ""));
    int requestTimeoutSeconds = integer(configuration.get("requestTimeoutSeconds"), 60);
    HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(String.valueOf(configuration.get("url"))))
        .timeout(Duration.ofSeconds(Math.max(1, requestTimeoutSeconds)));
    Object headers = configuration.get("headers");
    if (headers instanceof Map<?, ?> values) {
      values.forEach((key, value) -> builder.header(String.valueOf(key), String.valueOf(value)));
    }
    HttpRequest.BodyPublisher publisher = body.isEmpty()
        ? HttpRequest.BodyPublishers.noBody()
        : HttpRequest.BodyPublishers.ofString(body);
    return builder.method(method, publisher).build();
  }

  private static Set<Integer> successCodes(Map<String, Object> configuration) {
    Object configured = configuration.get("successCodes");
    if (configured instanceof List<?> values && !values.isEmpty()) {
      return values.stream().map(value -> Integer.parseInt(String.valueOf(value))).collect(java.util.stream.Collectors.toSet());
    }
    return java.util.stream.IntStream.rangeClosed(200, 299).boxed().collect(java.util.stream.Collectors.toSet());
  }

  private static int integer(Object value, int fallback) {
    return value == null ? fallback : Integer.parseInt(String.valueOf(value));
  }

  private static String abbreviate(String value) {
    if (value == null || value.length() <= 500) {
      return value;
    }
    return value.substring(0, 500) + "...";
  }
}
