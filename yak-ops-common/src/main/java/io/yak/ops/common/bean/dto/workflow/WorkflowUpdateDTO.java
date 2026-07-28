package io.yak.ops.common.bean.dto.workflow;

import io.yak.ops.common.bean.entity.workflow.WorkflowDag;
import io.yak.ops.common.enums.workflow.FailureStrategy;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 工作流草稿编辑数据传输对象。 */
@Data
public class WorkflowUpdateDTO {
  @NotBlank
  private String name;
  private String description;
  private FailureStrategy failureStrategy = FailureStrategy.FAIL_FAST;
  @Min(1)
  @Max(256)
  private int maxParallelism = 4;
  @Valid
  private WorkflowDag dag = new WorkflowDag();
}
