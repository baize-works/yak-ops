package io.yak.ops.business.workflow.common.entity.workflow;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 发布版本中保存的工作流 DAG 快照。 */
@Data
@NoArgsConstructor
public class WorkflowDag {

  private List<WorkflowNode> nodes = new ArrayList<>();
  private List<WorkflowEdge> edges = new ArrayList<>();

  public WorkflowDag(List<WorkflowNode> nodes, List<WorkflowEdge> edges) {
    setNodes(nodes);
    setEdges(edges);
  }

  public void setNodes(List<WorkflowNode> nodes) {
    this.nodes = nodes == null ? new ArrayList<>() : new ArrayList<>(nodes);
  }

  public void setEdges(List<WorkflowEdge> edges) {
    this.edges = edges == null ? new ArrayList<>() : new ArrayList<>(edges);
  }
}
