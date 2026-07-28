package io.yak.ops.business.workflow.common.vo.workflow;

import io.yak.ops.business.workflow.common.entity.workflow.WorkflowDag;
import java.util.Date;
import lombok.Data;

/** 工作流发布版本视图对象。 */
@Data
public class WorkflowVersionVO {
  private Long id;
  private Long workflowId;
  private int version;
  private WorkflowDag dag;
  private String contentHash;
  private String publishedBy;
  private Date publishedAt;
}
