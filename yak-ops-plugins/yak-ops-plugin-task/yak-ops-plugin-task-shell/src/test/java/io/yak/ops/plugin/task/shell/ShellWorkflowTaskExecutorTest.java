package io.yak.ops.plugin.task.shell;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.Test;

class ShellWorkflowTaskExecutorTest {

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
