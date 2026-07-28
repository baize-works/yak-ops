package io.yak.ops.common.bean.entity.workflow;

import io.yak.ops.common.enums.workflow.AttemptState;
import java.util.Date;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 工作流任务执行尝试领域对象。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowTaskAttempt {
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
