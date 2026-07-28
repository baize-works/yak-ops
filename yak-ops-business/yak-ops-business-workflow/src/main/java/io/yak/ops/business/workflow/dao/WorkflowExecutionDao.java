package io.yak.ops.business.workflow.dao;

import io.yak.ops.common.bean.entity.workflow.WorkflowInstance;
import io.yak.ops.common.bean.entity.workflow.WorkflowInstanceDetail;
import io.yak.ops.common.bean.entity.workflow.WorkflowTaskAttempt;
import io.yak.ops.common.bean.entity.workflow.WorkflowTaskInstance;
import io.yak.ops.common.enums.workflow.AttemptState;
import io.yak.ops.common.enums.workflow.WorkflowState;
import io.yak.ops.common.bean.po.workflow.WorkflowInstancePO;
import io.yak.ops.common.bean.po.workflow.WorkflowTaskAttemptPO;
import io.yak.ops.common.bean.po.workflow.WorkflowTaskInstancePO;
import io.yak.ops.common.bean.po.workflow.WorkflowTaskLogPO;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;

/** 工作流运行实例数据访问接口。 */
public interface WorkflowExecutionDao {

  long addInstance(WorkflowInstancePO instancePO, List<WorkflowTaskInstancePO> taskPOList);

  WorkflowInstance selectInstanceById(Long instanceId);

  WorkflowInstanceDetail selectInstanceDetailById(Long instanceId);

  List<WorkflowInstance> selectInstanceListByWorkflowId(Long workflowId, int limit);

  List<Long> selectRecoverableInstanceIdList(int limit);

  boolean existsRunningInstance(Long workflowId);

  void markInstanceRunning(Long instanceId);

  boolean requestStop(Long instanceId);

  void finishInstance(Long instanceId, WorkflowState state);

  List<WorkflowTaskInstance> selectTaskListByInstanceId(Long instanceId);

  WorkflowTaskInstance selectTaskById(Long taskInstanceId);

  boolean claimTask(Long taskInstanceId);

  long addAttempt(WorkflowTaskAttemptPO attemptPO);

  void finishAttempt(Long attemptId, AttemptState state, String externalId, String errorMessage);

  void addLog(WorkflowTaskLogPO logPO);

  List<String> selectLogContentList(Long taskInstanceId, int limit);

  List<WorkflowTaskAttempt> selectAttemptListByTaskId(Long taskInstanceId);

  void markTaskSuccess(Long taskInstanceId, Map<String, Object> resultData);

  void markTaskRetryWaiting(
      Long taskInstanceId,
      int retryCount,
      Date nextRetryTime,
      String errorMessage);

  void markTaskFailed(Long taskInstanceId, int retryCount, String errorMessage);

  void markTaskStopped(Long taskInstanceId, String message);

  int markTaskSkipped(Long instanceId, Collection<String> nodeKeys, String reason);

  int markAllPendingTaskSkipped(Long instanceId, String reason);

  void interruptRunningTask(WorkflowTaskInstance taskInstance);
}
