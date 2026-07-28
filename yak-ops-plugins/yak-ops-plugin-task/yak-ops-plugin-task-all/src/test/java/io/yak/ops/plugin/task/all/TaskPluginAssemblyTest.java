package io.yak.ops.plugin.task.all;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.core.workflow.WorkflowTaskExecutorRegistry;
import java.util.List;
import org.junit.jupiter.api.Test;

class TaskPluginAssemblyTest {

  @Test
  void shouldDiscoverHttpAndShellProviders() {
    WorkflowTaskExecutorRegistry registry = new WorkflowTaskExecutorRegistry(List.of());

    assertThat(registry.types()).contains("HTTP", "SHELL");
  }
}
