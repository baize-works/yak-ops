package io.yak.ops.common.bean.po.workflow;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

/** 工作流任务执行尝试持久化对象。 */
@Data
@TableName("yak_wf_task_attempt")
public class WorkflowTaskAttemptPO {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long taskInstanceId;
  private Integer attemptNo;
  private String state;
  private String executorType;
  private String externalId;
  private Date startTime;
  private Date endTime;
  private String errorMessage;
}
