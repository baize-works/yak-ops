package io.yak.ops.business.workflow.dag;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2BindingSource;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Dag;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Edge;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2ExecutionPolicy;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2InputBinding;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Node;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2TaskReference;
import java.util.List;
import org.junit.jupiter.api.Test;

class WorkflowV2DagValidatorTest {

  private final WorkflowV2DagValidator validator = new WorkflowV2DagValidator(new ObjectMapper());

  @Test
  void normalizesTaskReferenceAndAcceptsValidDag() {
    WorkflowV2Node start = node("start", WorkflowV2Node.Kind.START);
    WorkflowV2Node task = task("taskA");
    task.getTaskRef().setTaskType(" http ");
    WorkflowV2Node end = node("end", WorkflowV2Node.Kind.END);

    WorkflowV2Dag dag = dag(
        List.of(start, task, end),
        List.of(
            new WorkflowV2Edge("start", WorkflowV2Edge.Port.SUCCESS, "taskA"),
            new WorkflowV2Edge("taskA", WorkflowV2Edge.Port.SUCCESS, "end")));

    WorkflowV2Dag normalized = validator.normalizeAndValidate(dag);

    assertEquals("HTTP", normalized.getNodes().get(1).getTaskRef().getTaskType());
    assertEquals(2, normalized.getSchemaVersion());
  }

  @Test
  void rejectsFailureRoutingWithoutFailureEdge() {
    WorkflowV2Node start = node("start", WorkflowV2Node.Kind.START);
    WorkflowV2Node task = task("taskA");
    task.getExecutionPolicy().setFailureAction(
        WorkflowV2ExecutionPolicy.FailureAction.ROUTE_FAILURE);
    WorkflowV2Node end = node("end", WorkflowV2Node.Kind.END);

    WorkflowV2Dag dag = dag(
        List.of(start, task, end),
        List.of(
            new WorkflowV2Edge("start", WorkflowV2Edge.Port.SUCCESS, "taskA"),
            new WorkflowV2Edge("taskA", WorkflowV2Edge.Port.SUCCESS, "end")));

    assertThrows(IllegalArgumentException.class, () -> validator.normalizeAndValidate(dag));
  }

  @Test
  void rejectsNodeOutputFromNonUpstreamNode() {
    WorkflowV2Node start = node("start", WorkflowV2Node.Kind.START);
    WorkflowV2Node first = task("first");
    WorkflowV2Node second = task("second");
    WorkflowV2BindingSource source = new WorkflowV2BindingSource();
    source.setType(WorkflowV2BindingSource.Type.NODE_OUTPUT);
    source.setNodeKey("second");
    source.setPath("$.value");
    first.setInputBindings(List.of(new WorkflowV2InputBinding("value", source)));
    WorkflowV2Node end = node("end", WorkflowV2Node.Kind.END);

    WorkflowV2Dag dag = dag(
        List.of(start, first, second, end),
        List.of(
            new WorkflowV2Edge("start", WorkflowV2Edge.Port.SUCCESS, "first"),
            new WorkflowV2Edge("first", WorkflowV2Edge.Port.SUCCESS, "second"),
            new WorkflowV2Edge("second", WorkflowV2Edge.Port.SUCCESS, "end")));

    assertThrows(IllegalArgumentException.class, () -> validator.normalizeAndValidate(dag));
  }

  private static WorkflowV2Dag dag(
      List<WorkflowV2Node> nodes,
      List<WorkflowV2Edge> edges) {
    return new WorkflowV2Dag(nodes, edges);
  }

  private static WorkflowV2Node node(String key, WorkflowV2Node.Kind kind) {
    WorkflowV2Node node = new WorkflowV2Node();
    node.setKey(key);
    node.setName(key);
    node.setKind(kind);
    return node;
  }

  private static WorkflowV2Node task(String key) {
    WorkflowV2Node node = node(key, WorkflowV2Node.Kind.TASK);
    node.setTaskRef(new WorkflowV2TaskReference("10", "20", 3, "HTTP"));
    return node;
  }
}
