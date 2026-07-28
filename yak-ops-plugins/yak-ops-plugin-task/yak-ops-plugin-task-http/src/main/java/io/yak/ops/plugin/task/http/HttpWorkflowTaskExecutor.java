package io.yak.ops.plugin.task.http;

import io.yak.ops.plugin.task.api.TaskConfiguration;
import io.yak.ops.plugin.task.api.TaskParameterResolver;
import io.yak.ops.plugin.task.api.TaskPluginType;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.springframework.stereotype.Component;

/** 使用 JDK HttpClient 执行 HTTP 工作流任务。 */
@Component
public final class HttpWorkflowTaskExecutor implements WorkflowTaskExecutor {

  private static final Set<String> METHODS = Set.of(
      "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS");
  private static final Set<Integer> DEFAULT_SUCCESS_CODES = IntStream
      .rangeClosed(200, 299)
      .boxed()
      .collect(Collectors.toUnmodifiableSet());
  private static final int DEFAULT_CONNECT_TIMEOUT_SECONDS = 15;
  private static final int DEFAULT_REQUEST_TIMEOUT_SECONDS = 60;
  private static final int DEFAULT_MAX_RESPONSE_BODY_CHARACTERS = 1_000_000;

  private final HttpClient client;
  private final Map<Long, CompletableFuture<?>> runningRequests = new ConcurrentHashMap<>();

  public HttpWorkflowTaskExecutor() {
    this(HttpClient.newBuilder()
        .followRedirects(HttpClient.Redirect.NORMAL)
        .connectTimeout(Duration.ofSeconds(DEFAULT_CONNECT_TIMEOUT_SECONDS))
        .build());
  }

  HttpWorkflowTaskExecutor(HttpClient client) {
    this.client = client;
  }

  @Override
  public String type() {
    return TaskPluginType.HTTP;
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    String url = TaskConfiguration.requiredString(configuration, "url");
    URI.create(url.replaceAll("\\$\\{[^}]+}", "placeholder"));

    String method = TaskConfiguration.string(configuration, "method", "GET")
        .trim()
        .toUpperCase();
    if (!METHODS.contains(method)) {
      throw new IllegalArgumentException("不支持的 HTTP 请求方法：" + method);
    }

    TaskConfiguration.stringMap(configuration, "headers");
    TaskConfiguration.positiveInteger(
        configuration,
        "requestTimeoutSeconds",
        DEFAULT_REQUEST_TIMEOUT_SECONDS);
    TaskConfiguration.positiveInteger(
        configuration,
        "maxResponseBodyCharacters",
        DEFAULT_MAX_RESPONSE_BODY_CHARACTERS);
    TaskConfiguration.integerSet(
        configuration,
        "successCodes",
        DEFAULT_SUCCESS_CODES);
  }

  @Override
  public WorkflowTaskResult execute(WorkflowTaskContext context) throws Exception {
    Map<String, Object> configuration = TaskParameterResolver.resolveConfiguration(
        context.configuration(),
        context.globalParameters());
    validate(configuration);

    HttpRequest request = buildRequest(configuration);
    context.logger().log(request.method() + " " + request.uri());

    CompletableFuture<HttpResponse<String>> future = client.sendAsync(
        request,
        HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
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
      String responseBody = response.body() == null ? "" : response.body();
      context.logger().log("HTTP status: " + statusCode);

      Set<Integer> successCodes = TaskConfiguration.integerSet(
          configuration,
          "successCodes",
          DEFAULT_SUCCESS_CODES);
      if (!successCodes.contains(statusCode)) {
        return WorkflowTaskResult.failure(
            "HTTP 请求返回状态码 " + statusCode + "：" + abbreviate(responseBody, 500));
      }

      int maxBodyCharacters = TaskConfiguration.positiveInteger(
          configuration,
          "maxResponseBodyCharacters",
          DEFAULT_MAX_RESPONSE_BODY_CHARACTERS);
      boolean bodyTruncated = responseBody.length() > maxBodyCharacters;
      String storedBody = bodyTruncated
          ? responseBody.substring(0, maxBodyCharacters)
          : responseBody;

      Map<String, Object> outputs = new LinkedHashMap<>();
      outputs.put("statusCode", statusCode);
      outputs.put("body", storedBody);
      outputs.put("bodyTruncated", bodyTruncated);
      outputs.put("headers", response.headers().map());
      return WorkflowTaskResult.succeeded(null, outputs, "HTTP 请求执行完成");
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
    String url = TaskConfiguration.requiredString(configuration, "url");
    String method = TaskConfiguration.string(configuration, "method", "GET")
        .trim()
        .toUpperCase();
    String body = TaskConfiguration.string(configuration, "body", "");
    int requestTimeoutSeconds = TaskConfiguration.positiveInteger(
        configuration,
        "requestTimeoutSeconds",
        DEFAULT_REQUEST_TIMEOUT_SECONDS);

    HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
        .timeout(Duration.ofSeconds(requestTimeoutSeconds));
    TaskConfiguration.stringMap(configuration, "headers")
        .forEach(builder::header);

    HttpRequest.BodyPublisher publisher = body.isEmpty()
        ? HttpRequest.BodyPublishers.noBody()
        : HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8);
    return builder.method(method, publisher).build();
  }

  private static String abbreviate(String value, int maximumLength) {
    if (value == null || value.length() <= maximumLength) {
      return value;
    }
    return value.substring(0, maximumLength) + "...";
  }
}
