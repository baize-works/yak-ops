package io.yak.ops.business.workflow.dao.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.common.constant.WorkflowConstant;
import io.yak.ops.business.workflow.common.entity.workflow.WorkflowInstance;
import io.yak.ops.business.workflow.common.entity.workflow.WorkflowInstanceDetail;
import io.yak.ops.business.workflow.common.entity.workflow.WorkflowTaskAttempt;
import io.yak.ops.business.workflow.common.entity.workflow.WorkflowTaskInstance;
import io.yak.ops.business.workflow.common.enums.AttemptState;
import io.yak.ops.business.workflow.common.enums.TaskState;
import io.yak.ops.business.workflow.common.enums.WorkflowState;
import io.yak.ops.business.workflow.common.po.WorkflowInstancePO;
import io.yak.ops.business.workflow.common.po.WorkflowTaskAttemptPO;
import io.yak.ops.business.workflow.common.po.WorkflowTaskInstancePO;
import io.yak.ops.business.workflow.common.po.WorkflowTaskLogPO;
import io.yak.ops.business.workflow.dao.WorkflowExecutionDao;
import io.yak.ops.business.workflow.dao.mapper.WorkflowInstanceMapper;
import io.yak.ops.business.workflow.dao.mapper.WorkflowTaskAttemptMapper;
import io.yak.ops.business.workflow.dao.mapper.WorkflowTaskInstanceMapper;
import io.yak.ops.business.workflow.dao.mapper.WorkflowTaskLogMapper;
import io.yak.ops.business.workflow.util.WorkflowConvertUtils;
import io.yak.ops.business.workflow.util.WorkflowJsonCodec;
import java.time.Instant;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** 工作流运行实例数据访问实现。 */
@ConditionalOnWorkflowEnabled
@Repository
@RequiredArgsConstructor
public class WorkflowExecutionDaoImpl implements WorkflowExecutionDao {

  private static final List<String> RECOVERABLE_STATES = List.of(
      WorkflowState.PENDING.name(),
      WorkflowState.RUNNING.name(),
      WorkflowState.STOPPING.name());
  private static final List<String> TERMINAL_WORKFLOW_STATES = List.of(
      WorkflowState.SUCCESS.name(),
      WorkflowState.FAILED.name(),
      WorkflowState.STOPPED.name());
  private static final List<String> TERMINAL_TASK_STATES = List.of(
      TaskState.SUCCESS.name(),
      TaskState.FAILED.name(),
      TaskState.SKIPPED.name(),
      TaskState.STOPPED.name());
  private static final List<String> PENDING_TASK_STATES = List.of(
      TaskState.WAITING.name(),
      TaskState.READY.name(),
      TaskState.RETRY_WAITING.name());

  private final WorkflowInstanceMapper instanceMapper;
  private final WorkflowTaskInstanceMapper taskInstanceMapper;
  private final WorkflowTaskAttemptMapper taskAttemptMapper;
  private final WorkflowTaskLogMapper taskLogMapper;
  private final WorkflowJsonCodec jsonCodec;
  private final AtomicLong logSequence = new AtomicLong();

  @Override
  public long addInstance(
      WorkflowInstancePO instancePO,
      List<WorkflowTaskInstancePO> taskPOList) {
    instanceMapper.insert(instancePO);
    if (instancePO.getId() == null) {
      throw new IllegalStateException("数据库未返回工作流实例主键");
    }
    if (taskPOList != null && !taskPOList.isEmpty()) {
      taskPOList.forEach(item -> item.setWorkflowInstanceId(instancePO.getId()));
      taskInstanceMapper.batchInsert(taskPOList);
    }
    return instancePO.getId();
  }

  @Override
  public WorkflowInstance selectInstanceById(Long instanceId) {
    return WorkflowConvertUtils.toInstance(instanceMapper.selectById(instanceId), jsonCodec);
  }

  @Override
  public WorkflowInstanceDetail selectInstanceDetailById(Long instanceId) {
    return WorkflowConvertUtils.toInstanceDetail(
        instanceMapper.selectDetailById(instanceId),
        jsonCodec);
  }

  @Override
  public List<WorkflowInstance> selectInstanceListByWorkflowId(Long workflowId, int limit) {
    int normalizedLimit = Math.max(
        1,
        Math.min(limit, WorkflowConstant.MAX_INSTANCE_QUERY_LIMIT));
    return instanceMapper.selectListByWorkflowId(workflowId, normalizedLimit)
        .stream()
        .map(item -> WorkflowConvertUtils.toInstance(item, jsonCodec))
        .collect(Collectors.toList());
  }

  @Override
  public List<Long> selectRecoverableInstanceIdList(int limit) {
    return instanceMapper.selectRecoverableInstanceIds(
        RECOVERABLE_STATES,
        Math.max(1, limit));
  }

  @Override
  public boolean existsRunningInstance(Long workflowId) {
    return instanceMapper.countRunningByWorkflowId(workflowId, RECOVERABLE_STATES) > 0;
  }

  @Override
  public void markInstanceRunning(Long instanceId) {
    instanceMapper.markRunning(
        instanceId,
        WorkflowState.PENDING.name(),
        WorkflowState.RUNNING.name(),
        new Date());
  }

  @Override
  public boolean requestStop(Long instanceId) {
    return instanceMapper.requestStop(
        instanceId,
        List.of(WorkflowState.PENDING.name(), WorkflowState.RUNNING.name()),
        TERMINAL_WORKFLOW_STATES,
        WorkflowState.STOPPING.name()) == 1;
  }

  @Override
  public void finishInstance(Long instanceId, WorkflowState state) {
    if (state == null || !state.isTerminal()) {
      throw new IllegalArgumentException("必须传入工作流终态");
    }
    instanceMapper.finishInstance(
        instanceId,
        state.name(),
        TERMINAL_WORKFLOW_STATES,
        new Date());
  }

  @Override
  public List<WorkflowTaskInstance> selectTaskListByInstanceId(Long instanceId) {
    return taskInstanceMapper.selectList(
            Wrappers.<WorkflowTaskInstancePO>lambdaQuery()
                .eq(WorkflowTaskInstancePO::getWorkflowInstanceId, instanceId)
                .orderByAsc(WorkflowTaskInstancePO::getId))
        .stream()
        .map(item -> WorkflowConvertUtils.toTaskInstance(item, jsonCodec))
        .collect(Collectors.toList());
  }

  @Override
  public WorkflowTaskInstance selectTaskById(Long taskInstanceId) {
    return WorkflowConvertUtils.toTaskInstance(
        taskInstanceMapper.selectById(taskInstanceId),
        jsonCodec);
  }

  @Override
  public boolean claimTask(Long taskInstanceId) {
    return taskInstanceMapper.claimTask(
        taskInstanceId,
        TaskState.RUNNING.name(),
        PENDING_TASK_STATES,
        new Date()) == 1;
  }

  @Override
  public long addAttempt(WorkflowTaskAttemptPO attemptPO) {
    taskAttemptMapper.insert(attemptPO);
    if (attemptPO.getId() == null) {
      throw new IllegalStateException("数据库未返回任务执行尝试主键");
    }
    return attemptPO.getId();
  }

  @Override
  public void finishAttempt(
      Long attemptId,
      AttemptState state,
      String externalId,
      String errorMessage) {
    taskAttemptMapper.finishAttempt(
        attemptId,
        AttemptState.RUNNING.name(),
        state.name(),
        externalId,
        errorMessage,
        new Date());
  }

  @Override
  public void addLog(WorkflowTaskLogPO logPO) {
    if (logPO == null || logPO.getContent() == null) {
      return;
    }
    long generatedLineNo = Math.max(
        Instant.now().toEpochMilli() * 1_000L,
        logSequence.incrementAndGet());
    logPO.setLineNo(generatedLineNo);
    logPO.setCreatedAt(new Date());
    taskLogMapper.insert(logPO);
  }

  @Override
  public List<String> selectLogContentList(Long taskInstanceId, int limit) {
    int normalizedLimit = Math.max(1, Math.min(limit, WorkflowConstant.MAX_LOG_QUERY_LIMIT));
    return taskLogMapper.selectContentListByTaskId(taskInstanceId, normalizedLimit);
  }

  @Override
  public List<WorkflowTaskAttempt> selectAttemptListByTaskId(Long taskInstanceId) {
    return taskAttemptMapper.selectList(
            Wrappers.<WorkflowTaskAttemptPO>lambdaQuery()
                .eq(WorkflowTaskAttemptPO::getTaskInstanceId, taskInstanceId)
                .orderByAsc(WorkflowTaskAttemptPO::getAttemptNo))
        .stream()
        .map(WorkflowConvertUtils::toAttempt)
        .collect(Collectors.toList());
  }

  @Override
  public void markTaskSuccess(Long taskInstanceId, Map<String, Object> resultData) {
    taskInstanceMapper.markSuccess(
        taskInstanceId,
        TaskState.RUNNING.name(),
        TaskState.SUCCESS.name(),
        jsonCodec.write(resultData),
        new Date());
  }

  @Override
  public void markTaskRetryWaiting(
      Long taskInstanceId,
      int retryCount,
      Date nextRetryTime,
      String errorMessage) {
    taskInstanceMapper.markRetryWaiting(
        taskInstanceId,
        TaskState.RUNNING.name(),
        TaskState.RETRY_WAITING.name(),
        retryCount,
        nextRetryTime,
        errorMessage);
  }

  @Override
  public void markTaskFailed(Long taskInstanceId, int retryCount, String errorMessage) {
    taskInstanceMapper.markFailed(
        taskInstanceId,
        List.of(TaskState.RUNNING.name(), TaskState.RETRY_WAITING.name()),
        TaskState.FAILED.name(),
        retryCount,
        errorMessage,
        new Date());
  }

  @Override
  public void markTaskStopped(Long taskInstanceId, String message) {
    taskInstanceMapper.markStopped(
        taskInstanceId,
        TERMINAL_TASK_STATES,
        TaskState.STOPPED.name(),
        message,
        new Date());
  }

  @Override
  public int markTaskSkipped(
      Long instanceId,
      Collection<String> nodeKeys,
      String reason) {
    if (nodeKeys == null || nodeKeys.isEmpty()) {
      return 0;
    }
    return taskInstanceMapper.markSkipped(
        instanceId,
        nodeKeys,
        TERMINAL_TASK_STATES,
        TaskState.SKIPPED.name(),
        reason,
        new Date());
  }

  @Override
  public int markAllPendingTaskSkipped(Long instanceId, String reason) {
    return taskInstanceMapper.markAllPendingSkipped(
        instanceId,
        PENDING_TASK_STATES,
        TaskState.SKIPPED.name(),
        reason,
        new Date());
  }

  @Override
  public void interruptRunningTask(WorkflowTaskInstance taskInstance) {
    taskAttemptMapper.interruptRunningAttempts(
        taskInstance.getId(),
        AttemptState.RUNNING.name(),
        AttemptState.INTERRUPTED.name(),
        "Yak Ops 重启时任务仍处于运行状态",
        new Date());

    boolean canRetry = taskInstance.isRetryOnRestart()
        && taskInstance.isIdempotent()
        && taskInstance.getRetryCount() < taskInstance.getMaxRetryTimes();
    if (canRetry) {
      taskInstanceMapper.recoverForRetry(
          taskInstance.getId(),
          TaskState.RUNNING.name(),
          TaskState.RETRY_WAITING.name(),
          new Date(),
          "Yak Ops 重启后恢复任务");
      return;
    }
    markTaskFailed(
        taskInstance.getId(),
        taskInstance.getRetryCount(),
        "任务因 Yak Ops 重启被中断，且未配置安全重试");
  }
}
