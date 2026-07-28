package io.yak.ops.common.bean.dto.workflow;

import io.yak.ops.common.enums.workflow.MisfirePolicy;
import io.yak.ops.common.enums.workflow.ScheduleConcurrencyPolicy;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 工作流调度配置数据传输对象。 */
@Data
public class WorkflowScheduleDTO {
  @NotBlank
  private String cronExpression;
  @NotBlank
  private String timezone = "Asia/Shanghai";
  private boolean enabled = true;
  private MisfirePolicy misfirePolicy = MisfirePolicy.DO_NOTHING;
  private ScheduleConcurrencyPolicy concurrencyPolicy = ScheduleConcurrencyPolicy.SKIP_IF_RUNNING;
}
