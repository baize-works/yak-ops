package io.yak.ops.business.workflow.common.vo.workflow;

import io.yak.ops.business.workflow.common.enums.AttemptState;
import java.util.Date;
import lombok.Data;

/** 工作流任务执行尝试视图对象。 */
@Data
public class WorkflowTaskAttemptVO {
  private Long id;
  private Long taskInstanceId;
  private int attemptNo;
  private AttemptState state;
  private String executorType;
  private String externalId;
  private Date startTime;
  private Date endTime;
  private String errorMessage;
}
