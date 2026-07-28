package io.yak.ops.business.workflow.common.entity.workflow;

import java.util.Date;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 工作流发布版本领域对象。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowVersion {
  private Long id;
  private Long workflowId;
  private int version;
  private WorkflowDag dag;
  private String contentHash;
  private String publishedBy;
  private Date publishedAt;
}
