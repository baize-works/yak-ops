package io.yak.ops.common.bean.entity.workflow;

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
  private WorkflowViewport viewport = new WorkflowViewport(0D, 0D, 1D);

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

  public void setViewport(WorkflowViewport viewport) {
    this.viewport = viewport == null ? new WorkflowViewport(0D, 0D, 1D) : viewport;
  }
}
