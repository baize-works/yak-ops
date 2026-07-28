package io.yak.ops.business.workflow.service;

import io.yak.ops.common.enums.workflow.TriggerType;
import io.yak.ops.common.bean.vo.workflow.WorkflowInstanceDetailVO;
import io.yak.ops.common.bean.vo.workflow.WorkflowInstanceVO;
import io.yak.ops.common.bean.vo.workflow.WorkflowTaskAttemptVO;
import io.yak.ops.common.bean.vo.workflow.WorkflowTaskInstanceVO;
import java.util.List;
import java.util.Map;

/** 工作流运行实例服务接口。 */
public interface WorkflowExecutionService {

  Long triggerWorkflow(
      Long workflowId,
      TriggerType triggerType,
      Map<String, Object> globalParameters,
      String operator);

  void stopWorkflow(Long workflowInstanceId);

  WorkflowInstanceDetailVO getWorkflowInstance(Long workflowInstanceId);

  List<WorkflowTaskInstanceVO> getTaskList(Long workflowInstanceId);

  List<WorkflowTaskAttemptVO> getAttemptList(Long taskInstanceId);

  List<String> getLogList(Long taskInstanceId, int limit);

  List<WorkflowInstanceVO> getWorkflowInstanceList(Long workflowId, int limit);
}
