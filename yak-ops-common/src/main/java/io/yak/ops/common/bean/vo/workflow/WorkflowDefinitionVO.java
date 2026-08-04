package io.yak.ops.common.bean.vo.workflow;

import io.yak.ops.common.bean.entity.workflow.WorkflowDag;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Dag;
import io.yak.ops.common.enums.workflow.DefinitionState;
import io.yak.ops.common.enums.workflow.FailureStrategy;
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
  private int schemaVersion = 1;
  private WorkflowDag draft;
  private WorkflowV2Dag draftV2;
  private String createdBy;
  private Date createdAt;
  private Date updatedAt;
}
