package io.yak.ops.business.workflow.dag;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.yak.ops.business.workflow.model.WorkflowDag;
import io.yak.ops.core.workflow.WorkflowTaskExecutorRegistry;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class WorkflowDagCompilerTest {

  private final WorkflowDagCompiler compiler = new WorkflowDagCompiler(
      new WorkflowTaskExecutorRegistry(List.of(new TestExecutor())));

  @Test
  void shouldCompileParallelDagInTopologicalOrder() {
    WorkflowDag dag = new WorkflowDag(
        List.of(node("extract"), node("transform"), node("quality"), node("publish")),
        List.of(
            new WorkflowDag.Edge("extract", "transform"),
            new WorkflowDag.Edge("extract", "quality"),
            new WorkflowDag.Edge("transform", "publish"),
            new WorkflowDag.Edge("quality", "publish")));

    CompiledWorkflowDag compiled = compiler.compile(dag);

    assertThat(compiled.startNodes()).containsExactly("extract");
    assertThat(compiled.predecessors().get("publish"))
        .containsExactlyInAnyOrder("transform", "quality");
    assertThat(compiled.topologicalOrder().indexOf("extract"))
        .isLessThan(compiled.topologicalOrder().indexOf("publish"));
  }

  @Test
  void shouldRejectCyclesBeforePublication() {
    WorkflowDag dag = new WorkflowDag(
        List.of(node("first"), node("second")),
        List.of(
            new WorkflowDag.Edge("first", "second"),
            new WorkflowDag.Edge("second", "first")));

    assertThatThrownBy(() -> compiler.compile(dag))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("cycle");
  }

  @Test
  void shouldRejectUnknownTaskExecutor() {
    WorkflowDag.Node node = new WorkflowDag.Node(
        "missing", "Missing", "UNKNOWN", Map.of(), 0, 0, 0, true, true, true);

    assertThatThrownBy(() -> compiler.compile(new WorkflowDag(List.of(node), List.of())))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("UNKNOWN");
  }

  private static WorkflowDag.Node node(String key) {
    return new WorkflowDag.Node(key, key, "TEST", Map.of(), 0, 0, 0, true, true, true);
  }

  private static final class TestExecutor implements WorkflowTaskExecutor {

    @Override
    public String type() {
      return "TEST";
    }

    @Override
    public WorkflowTaskResult execute(WorkflowTaskContext context) {
      return WorkflowTaskResult.succeeded();
    }
  }
}
