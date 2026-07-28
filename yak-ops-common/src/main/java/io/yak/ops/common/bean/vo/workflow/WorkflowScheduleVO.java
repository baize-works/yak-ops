package io.yak.ops.common.bean.vo.workflow;

import io.yak.ops.common.enums.workflow.MisfirePolicy;
import io.yak.ops.common.enums.workflow.ScheduleConcurrencyPolicy;
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
