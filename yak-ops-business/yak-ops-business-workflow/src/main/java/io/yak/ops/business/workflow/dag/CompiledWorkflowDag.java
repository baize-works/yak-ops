package io.yak.ops.business.workflow.dag;

import io.yak.ops.business.workflow.model.WorkflowDag;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Immutable, validated execution graph derived from a published DAG snapshot. */
public final class CompiledWorkflowDag {

  private final Map<String, WorkflowDag.Node> nodes;
  private final Map<String, Set<String>> predecessors;
  private final Map<String, Set<String>> successors;
  private final List<String> topologicalOrder;

  public CompiledWorkflowDag(
      Map<String, WorkflowDag.Node> nodes,
      Map<String, Set<String>> predecessors,
      Map<String, Set<String>> successors,
      List<String> topologicalOrder) {
    this.nodes = Objects.requireNonNull(nodes, "nodes");
    this.predecessors = Objects.requireNonNull(predecessors, "predecessors");
    this.successors = Objects.requireNonNull(successors, "successors");
    this.topologicalOrder = Objects.requireNonNull(topologicalOrder, "topologicalOrder");
  }

  public Map<String, WorkflowDag.Node> nodes() {
    return nodes;
  }

  public Map<String, WorkflowDag.Node> getNodes() {
    return nodes;
  }

  public Map<String, Set<String>> predecessors() {
    return predecessors;
  }

  public Map<String, Set<String>> getPredecessors() {
    return predecessors;
  }

  public Map<String, Set<String>> successors() {
    return successors;
  }

  public Map<String, Set<String>> getSuccessors() {
    return successors;
  }

  public List<String> topologicalOrder() {
    return topologicalOrder;
  }

  public List<String> getTopologicalOrder() {
    return topologicalOrder;
  }

  public List<String> startNodes() {
    return topologicalOrder.stream()
        .filter(nodeKey -> predecessors.getOrDefault(nodeKey, Set.of()).isEmpty())
        .toList();
  }
}
