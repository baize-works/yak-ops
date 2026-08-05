package io.yak.ops.plugin.task.http;

import io.yak.ops.plugin.task.api.TaskExecutionContext;
import io.yak.ops.plugin.task.api.TaskExecutionResult;
import io.yak.ops.plugin.task.api.TaskExecutor;
import io.yak.ops.plugin.task.api.TaskParameterResolver;
import io.yak.ops.plugin.task.api.TaskPluginType;
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

/** Executes one HTTP task attempt with the JDK HTTP client. */
public final class HttpTaskExecutor implements TaskExecutor {

  private static final Set<Integer> DEFAULT_SUCCESS_CODES = IntStream
      .rangeClosed(200, 299)
      .boxed()
      .collect(Collectors.toUnmodifiableSet());
  private static final int DEFAULT_CONNECT_TIMEOUT_SECONDS = 15;

  private final HttpClient client;
  private final Map<Long, CompletableFuture<?>> runningRequests = new ConcurrentHashMap<>();

  public HttpTaskExecutor() {
    this(HttpClient.newBuilder()
        .followRedirects(HttpClient.Redirect.NORMAL)
        .connectTimeout(Duration.ofSeconds(DEFAULT_CONNECT_TIMEOUT_SECONDS))
        .build());
  }

  HttpTaskExecutor(HttpClient client) {
    this.client = client;
  }

  @Override
  public String type() {
    return TaskPluginType.HTTP;
  }

  @Override
  public void validate(Map<String, Object> configuration) {
    HttpTaskParameters parameters = HttpTaskParameters.from(configuration);
    parameters.validate();
  }

  @Override
  public TaskExecutionResult execute(TaskExecutionContext context) throws Exception {
    Map<String, Object> resolved = TaskParameterResolver.resolveConfiguration(
        context.configuration(),
        context.parameters());
    HttpTaskParameters parameters = HttpTaskParameters.from(resolved);
    parameters.validate();

    HttpRequest request = buildRequest(parameters);
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

      Set<Integer> successCodes = parameters.getSuccessCodes().isEmpty()
          ? DEFAULT_SUCCESS_CODES
          : Set.copyOf(parameters.getSuccessCodes());
      if (!successCodes.contains(statusCode)) {
        return TaskExecutionResult.failure(
            "HTTP 请求返回状态码 " + statusCode + "：" + abbreviate(responseBody, 500));
      }

      int maximum = parameters.getMaxResponseBodyCharacters();
      boolean truncated = responseBody.length() > maximum;
      Map<String, Object> outputs = new LinkedHashMap<>();
      outputs.put("statusCode", statusCode);
      outputs.put("body", truncated ? responseBody.substring(0, maximum) : responseBody);
      outputs.put("bodyTruncated", truncated);
      outputs.put("headers", response.headers().map());
      return TaskExecutionResult.succeeded(null, outputs, "HTTP 请求执行完成");
    } finally {
      runningRequests.remove(context.attemptId());
    }
  }

  @Override
  public void cancel(TaskExecutionContext context) {
    CompletableFuture<?> future = runningRequests.get(context.attemptId());
    if (future != null) {
      future.cancel(true);
    }
  }

  private static HttpRequest buildRequest(HttpTaskParameters parameters) {
    HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(parameters.getUrl()))
        .timeout(Duration.ofSeconds(parameters.getRequestTimeoutSeconds()));
    parameters.getHeaders().forEach(builder::header);

    HttpRequest.BodyPublisher publisher = parameters.getBody().isEmpty()
        ? HttpRequest.BodyPublishers.noBody()
        : HttpRequest.BodyPublishers.ofString(parameters.getBody(), StandardCharsets.UTF_8);
    return builder.method(parameters.getMethod(), publisher).build();
  }

  private static String abbreviate(String value, int maximumLength) {
    if (value == null || value.length() <= maximumLength) {
      return value;
    }
    return value.substring(0, maximumLength) + "...";
  }
}
