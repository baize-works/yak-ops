package io.yak.ops.common.bean.entity.workflow.v2;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class WorkflowV2ContractTest {

  @Test
  void defaultsToPinnedVersionOrchestrationContract() {
    WorkflowV2Dag dag = new WorkflowV2Dag();
    WorkflowV2ExecutionPolicy policy = new WorkflowV2ExecutionPolicy();
    WorkflowV2Edge edge = new WorkflowV2Edge();

    assertEquals(2, dag.getSchemaVersion());
    assertEquals(WorkflowV2ExecutionPolicy.FailureAction.FAIL_WORKFLOW,
        policy.getFailureAction());
    assertEquals(WorkflowV2Edge.Port.SUCCESS, edge.getFromPort());
  }

  @Test
  void copiesMutableCollectionsAtTheContractBoundary() {
    WorkflowV2Node node = new WorkflowV2Node();
    List<WorkflowV2InputBinding> bindings = new ArrayList<>();
    bindings.add(new WorkflowV2InputBinding());

    node.setInputBindings(bindings);
    bindings.clear();

    assertFalse(node.getInputBindings().isEmpty());
  }

  @Test
  void rejectsNonV2SchemaVersion() {
    WorkflowV2Dag dag = new WorkflowV2Dag();
    assertThrows(IllegalArgumentException.class, () -> dag.setSchemaVersion(1));
  }
}
