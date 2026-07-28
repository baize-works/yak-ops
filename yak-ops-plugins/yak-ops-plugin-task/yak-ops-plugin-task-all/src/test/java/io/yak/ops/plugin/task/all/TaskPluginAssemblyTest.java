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
    assertThat(registry.descriptor("HTTP").getName()).isEqualTo("HTTP 请求");
    assertThat(registry.descriptor("SHELL").getConfigurationSchema()).containsKey("fields");
  }

  @Test
  void shouldCreateAttemptScopedExecutors() {
    WorkflowTaskExecutorRegistry registry = new WorkflowTaskExecutorRegistry(List.of());

    assertThat(registry.require("HTTP")).isNotSameAs(registry.require("HTTP"));
    assertThat(registry.require("SHELL")).isNotSameAs(registry.require("SHELL"));
  }
}
