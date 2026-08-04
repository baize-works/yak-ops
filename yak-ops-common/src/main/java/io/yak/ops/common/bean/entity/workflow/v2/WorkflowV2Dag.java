package io.yak.ops.common.bean.entity.workflow.v2;

import io.yak.ops.common.bean.entity.workflow.WorkflowViewport;
import java.util.ArrayList;
import java.util.List;

/**
 * Workflow V2 durable definition.
 *
 * <p>V2 stores orchestration metadata and immutable task-version references only. Task authoring
 * content and plugin-specific configuration remain owned by data development.
 */
public class WorkflowV2Dag {

  public static final int SCHEMA_VERSION = 2;

  private int schemaVersion = SCHEMA_VERSION;
  private List<WorkflowV2Node> nodes = new ArrayList<>();
  private List<WorkflowV2Edge> edges = new ArrayList<>();
  private WorkflowViewport viewport = new WorkflowViewport(0D, 0D, 1D);

  public WorkflowV2Dag() {
  }

  public WorkflowV2Dag(List<WorkflowV2Node> nodes, List<WorkflowV2Edge> edges) {
    setNodes(nodes);
    setEdges(edges);
  }

  public int getSchemaVersion() {
    return schemaVersion;
  }

  public void setSchemaVersion(int schemaVersion) {
    if (schemaVersion != SCHEMA_VERSION) {
      throw new IllegalArgumentException("WorkflowV2Dag schemaVersion must be 2");
    }
    this.schemaVersion = schemaVersion;
  }

  public List<WorkflowV2Node> getNodes() {
    return nodes;
  }

  public void setNodes(List<WorkflowV2Node> nodes) {
    this.nodes = nodes == null ? new ArrayList<>() : new ArrayList<>(nodes);
  }

  public List<WorkflowV2Edge> getEdges() {
    return edges;
  }

  public void setEdges(List<WorkflowV2Edge> edges) {
    this.edges = edges == null ? new ArrayList<>() : new ArrayList<>(edges);
  }

  public WorkflowViewport getViewport() {
    return viewport;
  }

  public void setViewport(WorkflowViewport viewport) {
    this.viewport = viewport == null ? new WorkflowViewport(0D, 0D, 1D) : viewport;
  }
}
