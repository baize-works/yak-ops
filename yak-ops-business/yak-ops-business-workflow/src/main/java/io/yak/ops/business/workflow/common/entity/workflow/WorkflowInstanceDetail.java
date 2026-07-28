package io.yak.ops.business.workflow.common.entity.workflow;

import io.yak.ops.business.workflow.common.enums.FailureStrategy;
import io.yak.ops.business.workflow.common.enums.TriggerType;
import io.yak.ops.business.workflow.common.enums.WorkflowState;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 工作流运行实例详情领域对象。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowInstanceDetail {
  private Long id;
  private Long workflowId;
  private String workflowCode;
  private String workflowName;
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
