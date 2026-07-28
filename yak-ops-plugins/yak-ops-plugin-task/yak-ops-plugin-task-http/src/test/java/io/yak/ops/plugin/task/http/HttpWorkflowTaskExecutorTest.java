package io.yak.ops.plugin.task.http;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class HttpWorkflowTaskExecutorTest {

  private HttpServer server;

  @AfterEach
  void stopServer() {
    if (server != null) {
      server.stop(0);
    }
  }

  @Test
  void shouldResolveParametersAndReturnResponseOutputs() throws Exception {
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
    WorkflowTaskContext context = new WorkflowTaskContext(
        1L,
        2L,
        3L,
        1,
        "http-node",
        "HTTP",
        Map.of(
            "url", "http://127.0.0.1:${port}/echo",
            "method", "POST",
            "headers", Map.of("X-Token", "${token}"),
            "body", "{\"name\":\"${name}\"}"),
        Map.of(
            "port", server.getAddress().getPort(),
            "token", "task-secret",
            "name", "yak-ops"),
        () -> false,
        logs::add);

    WorkflowTaskResult result = new HttpWorkflowTaskExecutor().execute(context);

    assertThat(result.isSuccess()).isTrue();
    assertThat(result.getOutputs())
        .containsEntry("statusCode", 200)
        .containsEntry("body", "ok")
        .containsEntry("bodyTruncated", false);
    assertThat(requestToken.get()).isEqualTo("task-secret");
    assertThat(requestBody.get()).isEqualTo("{\"name\":\"yak-ops\"}");
    assertThat(logs).anyMatch(line -> line.contains("HTTP status: 200"));
  }
}
