package io.yak.ops.plugin.task.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TaskParameterResolverTest {

  @Test
  void shouldResolveNestedConfigurationAndTypedValue() {
    Map<String, Object> configuration = Map.of(
        "url", "http://${server.host}:${server.port}/jobs/${jobId}",
        "headers", Map.of("X-Token", "${token}"),
        "retryTimes", "${retryTimes}",
        "args", List.of("--name", "${job.name}"));
    Map<String, Object> parameters = Map.of(
        "server", Map.of("host", "127.0.0.1", "port", 8080),
        "jobId", 12,
        "token", "secret",
        "retryTimes", 3,
        "job", Map.of("name", "daily-sync"));

    Map<String, Object> resolved =
        TaskParameterResolver.resolveConfiguration(configuration, parameters);

    assertThat(resolved.get("url")).isEqualTo("http://127.0.0.1:8080/jobs/12");
    assertThat(resolved.get("retryTimes")).isEqualTo(3);
    assertThat(resolved.get("headers")).isEqualTo(Map.of("X-Token", "secret"));
    assertThat(resolved.get("args")).isEqualTo(List.of("--name", "daily-sync"));
  }

  @Test
  void shouldRejectMissingParameter() {
    assertThatThrownBy(() -> TaskParameterResolver.resolveConfiguration(
        Map.of("url", "http://${missing}/health"),
        Map.of()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("missing");
  }
}
