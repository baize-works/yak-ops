package io.yak.ops.common.bean.entity.workflow;

import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Dag;
import io.yak.ops.common.enums.workflow.DefinitionState;
import io.yak.ops.common.enums.workflow.FailureStrategy;
import java.util.Date;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 工作流定义领域对象。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowDefinition {

  /** Backward-compatible Workflow V1 constructor. */
  public WorkflowDefinition(
      Long id,
      String code,
      String name,
      String description,
      DefinitionState state,
      Integer currentVersion,
      FailureStrategy failureStrategy,
      int maxParallelism,
      WorkflowDag draft,
      String createdBy,
      Date createdAt,
      Date updatedAt) {
    this.id = id;
    this.code = code;
    this.name = name;
    this.description = description;
    this.state = state;
    this.currentVersion = currentVersion;
    this.failureStrategy = failureStrategy;
    this.maxParallelism = maxParallelism;
    this.schemaVersion = 1;
    this.draft = draft;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

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
