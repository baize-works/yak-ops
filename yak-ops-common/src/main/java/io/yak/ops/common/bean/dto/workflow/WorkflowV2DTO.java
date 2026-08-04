package io.yak.ops.common.bean.dto.workflow;

import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Dag;
import io.yak.ops.common.enums.workflow.FailureStrategy;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Workflow V2 create request. */
@Data
public class WorkflowV2DTO {
  @NotBlank
  private String code;
  @NotBlank
  private String name;
  private String description;
  private FailureStrategy failureStrategy = FailureStrategy.FAIL_FAST;
  @Min(1)
  @Max(256)
  private int maxParallelism = 4;
  @Valid
  private WorkflowV2Dag dag = new WorkflowV2Dag();
}
