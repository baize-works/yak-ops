package io.yak.ops.core.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.util.List;
import org.junit.jupiter.api.Test;

class WorkflowTaskExecutorRegistryTest {

  @Test
  void shouldNormalizeExecutorTypes() {
    WorkflowTaskExecutorRegistry registry = new WorkflowTaskExecutorRegistry(List.of(new Stub("http")));

    assertThat(registry.require(" HTTP ").type()).isEqualTo("http");
    assertThat(registry.types()).containsExactly("HTTP");
  }

  @Test
  void shouldRejectDuplicateTypes() {
    assertThatThrownBy(() -> new WorkflowTaskExecutorRegistry(
        List.of(new Stub("shell"), new Stub("SHELL"))))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("SHELL");
  }

  private static final class Stub implements WorkflowTaskExecutor {

    private final String type;

    private Stub(String type) {
      this.type = type;
    }

    @Override
    public String type() {
      return type;
    }

    @Override
    public WorkflowTaskResult execute(WorkflowTaskContext context) {
      return WorkflowTaskResult.succeeded();
    }
  }
}
