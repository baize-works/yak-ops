package io.yak.ops.common.bean.vo.workflow;

import io.yak.ops.common.enums.workflow.FailureStrategy;
import io.yak.ops.common.enums.workflow.TriggerType;
import io.yak.ops.common.enums.workflow.WorkflowState;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Data;

/** 工作流实例视图对象。 */
@Data
public class WorkflowInstanceVO {
  private Long id;
  private Long workflowId;
  private int workflowVersion;
  private TriggerType triggerType;
  private WorkflowState state;
  private Map<String, Object> globalParameters = new LinkedHashMap<>();
  private FailureStrategy failureStrategy;
  private int maxParallelism;
  private boolean stopRequested;
  private Date startTime;
  private Date endTime;
  private String createdBy;
  private Date createdAt;
}
