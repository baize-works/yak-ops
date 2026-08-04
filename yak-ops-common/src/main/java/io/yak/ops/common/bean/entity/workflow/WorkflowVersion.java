package io.yak.ops.common.bean.entity.workflow;

import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Dag;
import java.util.Date;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 工作流发布版本领域对象。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowVersion {

  /** Backward-compatible Workflow V1 constructor. */
  public WorkflowVersion(
      Long id,
      Long workflowId,
      int version,
      WorkflowDag dag,
      String contentHash,
      String publishedBy,
      Date publishedAt) {
    this.id = id;
    this.workflowId = workflowId;
    this.version = version;
    this.schemaVersion = 1;
    this.dag = dag;
    this.contentHash = contentHash;
    this.publishedBy = publishedBy;
    this.publishedAt = publishedAt;
  }

  private Long id;
  private Long workflowId;
  private int version;
  private int schemaVersion = 1;
  private WorkflowDag dag;
  private WorkflowV2Dag dagV2;
  private String contentHash;
  private String publishedBy;
  private Date publishedAt;
}
