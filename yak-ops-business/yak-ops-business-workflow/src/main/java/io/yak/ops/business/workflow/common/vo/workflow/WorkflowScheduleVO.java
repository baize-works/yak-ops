package io.yak.ops.business.workflow.common.vo.workflow;

import io.yak.ops.business.workflow.common.enums.MisfirePolicy;
import io.yak.ops.business.workflow.common.enums.ScheduleConcurrencyPolicy;
import java.util.Date;
import lombok.Data;

/** 工作流调度视图对象。 */
@Data
public class WorkflowScheduleVO {
  private Long id;
  private Long workflowId;
  private String cronExpression;
  private String timezone;
  private boolean enabled;
  private MisfirePolicy misfirePolicy;
  private ScheduleConcurrencyPolicy concurrencyPolicy;
  private Date updatedAt;
}
