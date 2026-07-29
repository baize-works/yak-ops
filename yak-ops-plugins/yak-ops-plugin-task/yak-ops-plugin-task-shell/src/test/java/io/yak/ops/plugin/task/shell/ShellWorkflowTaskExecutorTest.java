package io.yak.ops.plugin.task.shell;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.Test;

class ShellWorkflowTaskExecutorTest {

  @Test
  void shouldNormalizeTypedTaskParameters() {
    Map<String, Object> normalized = new ShellWorkflowTaskPluginFactory().normalize(Map.of(
        "args", List.of("/bin/sh", "-c", "echo ${message}"),
        "environment", Map.of("LANG", "C.UTF-8"),
        "localParams", List.of(Map.of(
            "prop", "message",
            "direct", "IN",
            "type", "VARCHAR",
            "value", ""))));

    assertThat(normalized.get("args"))
        .isEqualTo(List.of("/bin/sh", "-c", "echo ${message}"));
    assertThat(normalized.get("environment"))
        .isEqualTo(Map.of("LANG", "C.UTF-8"));
    assertThat(normalized).containsEntry("command", "");
  }

  @Test
  void shouldRejectEmptyCommandAndArgs() {
    assertThatThrownBy(() -> new ShellWorkflowTaskPluginFactory().normalize(Map.of()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("command 或非空 args");
  }

  @Test
  void shouldResolveParametersAndStreamProcessOutput() throws Exception {
    boolean windows = System.getProperty("os.name", "")
        .toLowerCase()
        .contains("win");
    List<String> args = windows
        ? List.of("cmd.exe", "/c", "echo ${message}")
        : List.of("/bin/sh", "-c", "printf '%s\\n' '${message}'");
    List<String> logs = new CopyOnWriteArrayList<>();
    WorkflowTaskContext context = new WorkflowTaskContext(
        1L,
        2L,
        3L,
        1,
        "shell-node",
        "SHELL",
        Map.of("args", args),
        Map.of("message", "yak-shell"),
        () -> false,
        logs::add);

    WorkflowTaskResult result = new ShellWorkflowTaskExecutor().execute(context);

    assertThat(result.isSuccess()).isTrue();
    assertThat(result.getOutputs()).containsEntry("exitCode", 0);
    assertThat(logs).contains("yak-shell");
  }
}
