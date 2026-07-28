package io.yak.ops.common.bean.entity.workflow;

import io.yak.ops.common.enums.workflow.MisfirePolicy;
import io.yak.ops.common.enums.workflow.ScheduleConcurrencyPolicy;
import java.util.Date;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 工作流调度领域对象。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowSchedule {
  private Long id;
  private Long workflowId;
  private String cronExpression;
  private String timezone;
  private boolean enabled;
  private MisfirePolicy misfirePolicy;
  private ScheduleConcurrencyPolicy concurrencyPolicy;
  private Date updatedAt;
}
