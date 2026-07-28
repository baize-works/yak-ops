package io.yak.ops.business.workflow.common.vo.workflow;

import io.yak.ops.business.workflow.common.enums.DefinitionState;
import io.yak.ops.business.workflow.common.enums.FailureStrategy;
import io.yak.ops.business.workflow.common.entity.workflow.WorkflowDag;
import java.util.Date;
import lombok.Data;

/** 工作流定义视图对象。 */
@Data
public class WorkflowDefinitionVO {
  private Long id;
  private String code;
  private String name;
  private String description;
  private DefinitionState state;
  private Integer currentVersion;
  private FailureStrategy failureStrategy;
  private int maxParallelism;
  private WorkflowDag draft;
  private String createdBy;
  private Date createdAt;
  private Date updatedAt;
}
