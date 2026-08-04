package io.yak.ops.common.bean.vo.workflow;

import io.yak.ops.common.bean.entity.workflow.WorkflowDag;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Dag;
import java.util.Date;
import lombok.Data;

/** 工作流发布版本视图对象。 */
@Data
public class WorkflowVersionVO {
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
