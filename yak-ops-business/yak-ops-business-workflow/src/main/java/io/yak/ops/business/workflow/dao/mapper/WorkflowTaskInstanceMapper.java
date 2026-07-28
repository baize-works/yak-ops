package io.yak.ops.business.workflow.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.yak.ops.common.bean.po.workflow.WorkflowTaskInstancePO;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/** 工作流任务实例 MyBatis 映射接口。 */
@Mapper
public interface WorkflowTaskInstanceMapper extends BaseMapper<WorkflowTaskInstancePO> {

  int batchInsert(@Param("items") List<WorkflowTaskInstancePO> items);

  int claimTask(
      @Param("taskInstanceId") Long taskInstanceId,
      @Param("runningState") String runningState,
      @Param("claimableStates") List<String> claimableStates,
      @Param("now") Date now);

  int markSuccess(
      @Param("taskInstanceId") Long taskInstanceId,
      @Param("runningState") String runningState,
      @Param("successState") String successState,
      @Param("resultJson") String resultJson,
      @Param("endTime") Date endTime);

  int markRetryWaiting(
      @Param("taskInstanceId") Long taskInstanceId,
      @Param("runningState") String runningState,
      @Param("retryWaitingState") String retryWaitingState,
      @Param("retryCount") int retryCount,
      @Param("nextRetryTime") Date nextRetryTime,
      @Param("errorMessage") String errorMessage);

  int markFailed(
      @Param("taskInstanceId") Long taskInstanceId,
      @Param("activeStates") List<String> activeStates,
      @Param("failedState") String failedState,
      @Param("retryCount") int retryCount,
      @Param("errorMessage") String errorMessage,
      @Param("endTime") Date endTime);

  int markStopped(
      @Param("taskInstanceId") Long taskInstanceId,
      @Param("terminalStates") List<String> terminalStates,
      @Param("stoppedState") String stoppedState,
      @Param("message") String message,
      @Param("endTime") Date endTime);

  int markSkipped(
      @Param("workflowInstanceId") Long workflowInstanceId,
      @Param("nodeKeys") Collection<String> nodeKeys,
      @Param("terminalStates") List<String> terminalStates,
      @Param("skippedState") String skippedState,
      @Param("reason") String reason,
      @Param("endTime") Date endTime);

  int markAllPendingSkipped(
      @Param("workflowInstanceId") Long workflowInstanceId,
      @Param("pendingStates") List<String> pendingStates,
      @Param("skippedState") String skippedState,
      @Param("reason") String reason,
      @Param("endTime") Date endTime);

  int recoverForRetry(
      @Param("taskInstanceId") Long taskInstanceId,
      @Param("runningState") String runningState,
      @Param("retryWaitingState") String retryWaitingState,
      @Param("nextRetryTime") Date nextRetryTime,
      @Param("message") String message);
}
