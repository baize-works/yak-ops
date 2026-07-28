package io.yak.ops.business.workflow.common.entity.workflow;

import io.yak.ops.business.workflow.common.enums.DefinitionState;
import io.yak.ops.business.workflow.common.enums.FailureStrategy;
import java.util.Date;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 工作流定义领域对象。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowDefinition {
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
