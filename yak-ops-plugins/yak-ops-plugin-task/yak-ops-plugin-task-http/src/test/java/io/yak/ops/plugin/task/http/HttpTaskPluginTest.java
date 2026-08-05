package io.yak.ops.plugin.task.http;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpServer;
import io.yak.ops.plugin.task.api.TaskExecutionContext;
import io.yak.ops.plugin.task.api.TaskExecutionResult;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class HttpTaskPluginTest {

  private HttpServer server;

  @AfterEach
  void stopServer() {
    if (server != null) {
      server.stop(0);
    }
  }

  @Test
  void normalizesTypedTaskParameters() {
    Map<String, Object> definition = new HttpTaskPluginFactory().normalizeDefinition(Map.of(
        "config", Map.of(
            "url", "https://example.com/orders/${orderId}",
            "method", "post",
            "successCodes", List.of(),
            "localParams", List.of(Map.of(
                "prop", "orderId",
                "direct", "IN",
                "type", "VARCHAR",
                "value", "")))));

    @SuppressWarnings("unchecked")
    Map<String, Object> normalized = (Map<String, Object>) definition.get("config");
    assertThat(normalized)
        .containsEntry("method", "POST")
        .containsEntry("requestTimeoutSeconds", 60)
        .containsEntry("maxResponseBodyCharacters", 1_000_000);
    assertThat(normalized.get("successCodes")).isEqualTo(List.of());
  }

  @Test
  void rejectsMissingUrl() {
    assertThatThrownBy(() -> new HttpTaskPluginFactory().normalizeDefinition(Map.of()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("请求地址不能为空");
  }

  @Test
  void resolvesParametersAndReturnsResponseOutputs() throws Exception {
    AtomicReference<String> requestBody = new AtomicReference<>();
    AtomicReference<String> requestToken = new AtomicReference<>();
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/echo", exchange -> {
      requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
      requestToken.set(exchange.getRequestHeaders().getFirst("X-Token"));
      byte[] response = "ok".getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(200, response.length);
      exchange.getResponseBody().write(response);
      exchange.close();
    });
    server.start();

    List<String> logs = new CopyOnWriteArrayList<>();
    TaskExecutionContext context = new TaskExecutionContext(
        1L,
        2L,
        3L,
        4,
        "http-task",
        "HTTP",
        Map.of(
            "url", "http://127.0.0.1:${global.port}/echo",
            "method", "POST",
            "headers", Map.of("X-Token", "${global.token}"),
            "body", "{\"name\":\"${name}\",\"attempt\":${system.attemptNo}}"),
        Map.of(
            "port", server.getAddress().getPort(),
            "token", "task-secret",
            "name", "yak-ops"),
        () -> false,
        logs::add);

    TaskExecutionResult result = new HttpTaskExecutor().execute(context);

    assertThat(result.isSuccess()).isTrue();
    assertThat(result.getOutputs())
        .containsEntry("statusCode", 200)
        .containsEntry("body", "ok")
        .containsEntry("bodyTruncated", false);
    assertThat(requestToken.get()).isEqualTo("task-secret");
    assertThat(requestBody.get()).isEqualTo("{\"name\":\"yak-ops\",\"attempt\":4}");
    assertThat(logs).anyMatch(line -> line.contains("HTTP status: 200"));
  }
}
