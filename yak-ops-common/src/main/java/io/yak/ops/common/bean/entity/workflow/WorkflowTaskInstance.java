package io.yak.ops.common.bean.entity.workflow;

import io.yak.ops.common.enums.workflow.TaskState;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 工作流任务实例领域对象。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowTaskInstance {
  private Long id;
  private Long workflowInstanceId;
  private String nodeKey;
  private String nodeName;
  private String taskType;
  private TaskState state;
  private Map<String, Object> configuration = new LinkedHashMap<>();
  private int maxRetryTimes;
  private int retryCount;
  private int retryIntervalSeconds;
  private int timeoutSeconds;
  private boolean idempotent;
  private boolean retryOnRestart;
  private Date nextRetryTime;
  private Date startTime;
  private Date endTime;
  private Map<String, Object> resultData = new LinkedHashMap<>();
  private String errorMessage;
}
