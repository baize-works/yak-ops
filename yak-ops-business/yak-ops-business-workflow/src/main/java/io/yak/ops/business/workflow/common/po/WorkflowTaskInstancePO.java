package io.yak.ops.business.workflow.common.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

/** 工作流任务实例持久化对象。 */
@Data
@TableName("yak_wf_task_instance")
public class WorkflowTaskInstancePO {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long workflowInstanceId;
  private String nodeKey;
  private String nodeName;
  private String taskType;
  private String state;
  private String configJson;
  private Integer maxRetryTimes;
  private Integer retryCount;
  private Integer retryIntervalSeconds;
  private Integer timeoutSeconds;
  private Boolean idempotent;
  private Boolean retryOnRestart;
  private Date nextRetryTime;
  private Date startTime;
  private Date endTime;
  private String resultJson;
  private String errorMessage;
  private Integer lockVersion;
}
