package io.yak.ops.business.workflow.dag;

import io.yak.ops.common.bean.entity.workflow.WorkflowNode;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.Getter;

/** 已校验的工作流执行图。 */
@Getter
public class CompiledWorkflowDag {

  private final Map<String, WorkflowNode> nodes;
  private final Map<String, Set<String>> predecessors;
  private final Map<String, Set<String>> successors;
  private final List<String> topologicalOrder;

  public CompiledWorkflowDag(
      Map<String, WorkflowNode> nodes,
      Map<String, Set<String>> predecessors,
      Map<String, Set<String>> successors,
      List<String> topologicalOrder) {
    this.nodes = Collections.unmodifiableMap(nodes);
    this.predecessors = Collections.unmodifiableMap(predecessors);
    this.successors = Collections.unmodifiableMap(successors);
    this.topologicalOrder = List.copyOf(topologicalOrder);
  }

  public List<String> startNodes() {
    return topologicalOrder.stream()
        .filter(nodeKey -> predecessors.getOrDefault(nodeKey, Set.of()).isEmpty())
        .collect(Collectors.toList());
  }
}
