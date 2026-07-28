package io.yak.ops.business.workflow.dag;

import io.yak.ops.business.workflow.model.WorkflowDag;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Immutable, validated execution graph derived from a published DAG snapshot. */
public record CompiledWorkflowDag(
    Map<String, WorkflowDag.Node> nodes,
    Map<String, Set<String>> predecessors,
    Map<String, Set<String>> successors,
    List<String> topologicalOrder) {

  public List<String> startNodes() {
    return topologicalOrder.stream()
        .filter(nodeKey -> predecessors.getOrDefault(nodeKey, Set.of()).isEmpty())
        .toList();
  }
}
