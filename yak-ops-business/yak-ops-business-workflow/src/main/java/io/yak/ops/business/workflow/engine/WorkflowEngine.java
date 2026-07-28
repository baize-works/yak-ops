package io.yak.ops.business.workflow.engine;

import io.yak.ops.business.workflow.common.entity.workflow.WorkflowInstance;
import io.yak.ops.business.workflow.common.entity.workflow.WorkflowTaskInstance;
import io.yak.ops.business.workflow.common.entity.workflow.WorkflowVersion;
import io.yak.ops.business.workflow.common.enums.AttemptState;
import io.yak.ops.business.workflow.common.enums.FailureStrategy;
import io.yak.ops.business.workflow.common.enums.TaskState;
import io.yak.ops.business.workflow.common.enums.WorkflowState;
import io.yak.ops.business.workflow.common.po.WorkflowTaskAttemptPO;
import io.yak.ops.business.workflow.common.po.WorkflowTaskLogPO;
import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.dag.CompiledWorkflowDag;
import io.yak.ops.business.workflow.dag.WorkflowDagCompiler;
import io.yak.ops.business.workflow.dao.WorkflowDefinitionDao;
import io.yak.ops.business.workflow.dao.WorkflowExecutionDao;
import io.yak.ops.core.workflow.LocalWorkflowTaskDispatcher;
import io.yak.ops.core.workflow.LocalWorkflowTaskDispatcher.DispatchHandle;
import io.yak.ops.core.workflow.WorkflowTaskExecutorRegistry;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** 单进程工作流 DAG 执行引擎。数据库状态是最终事实来源。 */
@ConditionalOnWorkflowEnabled
@Service
public class WorkflowEngine {

  private static final Logger LOGGER = LoggerFactory.getLogger(WorkflowEngine.class);

  private final WorkflowDefinitionDao definitionDao;
  private final WorkflowExecutionDao executionDao;
  private final WorkflowDagCompiler dagCompiler;
  private final WorkflowTaskExecutorRegistry executorRegistry;
  private final LocalWorkflowTaskDispatcher dispatcher;
  private final ConcurrentMap<Long, RuntimeState> runtimes = new ConcurrentHashMap<>();

  public WorkflowEngine(
      WorkflowDefinitionDao definitionDao,
      WorkflowExecutionDao executionDao,
      WorkflowDagCompiler dagCompiler,
      WorkflowTaskExecutorRegistry executorRegistry,
      LocalWorkflowTaskDispatcher dispatcher) {
    this.definitionDao = definitionDao;
    this.executionDao = executionDao;
    this.dagCompiler = dagCompiler;
    this.executorRegistry = executorRegistry;
    this.dispatcher = dispatcher;
  }

  public void start(Long workflowInstanceId) {
    RuntimeState runtime = runtimes.computeIfAbsent(workflowInstanceId, this::loadRuntime);
    dispatch(runtime);
  }

  public void stop(Long workflowInstanceId) {
    RuntimeState runtime = runtimes.get(workflowInstanceId);
    if (runtime == null) {
      start(workflowInstanceId);
      runtime = runtimes.get(workflowInstanceId);
    }
    if (runtime == null) {
      return;
    }
    synchronized (runtime.monitor) {
      cancelRunning(runtime, "工作流已请求停止");
    }
    dispatch(runtime);
  }

  public void recover() {
    for (Long instanceId : executionDao.selectRecoverableInstanceIdList(100)) {
      try {
        start(instanceId);
      } catch (Exception error) {
        LOGGER.error("恢复工作流实例失败，instanceId={}", instanceId, error);
      }
    }
  }

  public boolean isActive(Long workflowInstanceId) {
    return runtimes.containsKey(workflowInstanceId);
  }

  private RuntimeState loadRuntime(Long instanceId) {
    WorkflowInstance instance = requireInstance(instanceId);
    WorkflowVersion version = definitionDao.selectVersion(
        instance.getWorkflowId(),
        instance.getWorkflowVersion());
    if (version == null) {
      throw new IllegalStateException(
          "工作流版本不存在："
              + instance.getWorkflowId()
              + "/"
              + instance.getWorkflowVersion());
    }
    CompiledWorkflowDag graph = dagCompiler.compile(version.getDag());

    if (instance.getState() == WorkflowState.RUNNING
        || instance.getState() == WorkflowState.STOPPING) {
      for (WorkflowTaskInstance task : executionDao.selectTaskListByInstanceId(instanceId)) {
        if (task.getState() == TaskState.RUNNING) {
          executionDao.interruptRunningTask(task);
        }
      }
    }
    executionDao.markInstanceRunning(instanceId);
    return new RuntimeState(instanceId, graph);
  }

  private void dispatch(RuntimeState runtime) {
    synchronized (runtime.monitor) {
      try {
        WorkflowInstance instance = requireInstance(runtime.instanceId);
        if (instance.getState().isTerminal()) {
          runtimes.remove(runtime.instanceId, runtime);
          return;
        }

        List<WorkflowTaskInstance> tasks = executionDao.selectTaskListByInstanceId(runtime.instanceId);
        Map<String, WorkflowTaskInstance> byNode = indexByNode(tasks);

        if (instance.isStopRequested() || instance.getState() == WorkflowState.STOPPING) {
          cancelRunning(runtime, "工作流已请求停止");
          for (WorkflowTaskInstance task : tasks) {
            if (!task.getState().isTerminal() && task.getState() != TaskState.RUNNING) {
              executionDao.markTaskStopped(task.getId(), "工作流已请求停止");
            }
          }
          finalizeIfComplete(
              runtime,
              requireInstance(runtime.instanceId),
              executionDao.selectTaskListByInstanceId(runtime.instanceId));
          return;
        }

        applyFailurePropagation(runtime, instance, byNode);
        tasks = executionDao.selectTaskListByInstanceId(runtime.instanceId);
        byNode = indexByNode(tasks);

        int available = Math.max(0, instance.getMaxParallelism() - runtime.running.size());
        if (available > 0 && !hasFinalFailure(instance, tasks)) {
          for (String nodeKey : runtime.graph.getTopologicalOrder()) {
            if (available == 0) {
              break;
            }
            WorkflowTaskInstance task = byNode.get(nodeKey);
            if (task == null || !isClaimCandidate(task)) {
              continue;
            }
            if (hasBlockingPredecessor(runtime.graph, task.getNodeKey(), byNode)) {
              executionDao.markTaskSkipped(
                  runtime.instanceId,
                  Set.of(task.getNodeKey()),
                  "前驱任务未成功完成");
              continue;
            }
            if (!allPredecessorsSatisfied(runtime.graph, task.getNodeKey(), byNode)) {
              continue;
            }
            if (submit(runtime, instance, task)) {
              available--;
            }
          }
        }

        finalizeIfComplete(
            runtime,
            requireInstance(runtime.instanceId),
            executionDao.selectTaskListByInstanceId(runtime.instanceId));
      } catch (Exception error) {
        LOGGER.error("工作流调度失败，instanceId={}", runtime.instanceId, error);
        executionDao.markAllPendingTaskSkipped(runtime.instanceId, "工作流引擎调度失败");
        executionDao.finishInstance(runtime.instanceId, WorkflowState.FAILED);
        cancelRunning(runtime, "工作流引擎调度失败");
        runtimes.remove(runtime.instanceId, runtime);
      }
    }
  }

  private boolean submit(
      RuntimeState runtime,
      WorkflowInstance instance,
      WorkflowTaskInstance candidate) {
    if (!executionDao.claimTask(candidate.getId())) {
      return false;
    }
    WorkflowTaskInstance task = executionDao.selectTaskById(candidate.getId());
    if (task == null) {
      throw new IllegalStateException("已领取的任务不存在：" + candidate.getId());
    }

    WorkflowTaskAttemptPO attemptPO = new WorkflowTaskAttemptPO();
    attemptPO.setTaskInstanceId(task.getId());
    attemptPO.setAttemptNo(task.getRetryCount() + 1);
    attemptPO.setState(AttemptState.RUNNING.name());
    attemptPO.setExecutorType(task.getTaskType());
    attemptPO.setStartTime(new Date());
    long attemptId = executionDao.addAttempt(attemptPO);

    WorkflowTaskExecutor executor = executorRegistry.require(task.getTaskType());
    AtomicBoolean cancelled = new AtomicBoolean(false);
    WorkflowTaskContext context = new WorkflowTaskContext(
        instance.getId(),
        task.getId(),
        attemptId,
        task.getRetryCount() + 1,
        task.getNodeKey(),
        task.getTaskType(),
        task.getConfiguration(),
        instance.getGlobalParameters(),
        cancelled::get,
        line -> appendLogSafely(attemptId, line));

    DispatchHandle<WorkflowTaskResult> handle = dispatcher.submit(() -> executor.execute(context));
    RunningTask running = new RunningTask(
        task,
        attemptId,
        executor,
        context,
        cancelled,
        handle);
    runtime.running.put(task.getId(), running);

    if (task.getTimeoutSeconds() > 0) {
      running.timeoutFuture = dispatcher.schedule(
          () -> timeout(runtime, running),
          Duration.ofSeconds(task.getTimeoutSeconds()));
    }
    handle.getCompletion().whenComplete(
        (result, error) -> complete(runtime, running, result, error));
    return true;
  }

  private void timeout(RuntimeState runtime, RunningTask running) {
    if (!runtime.running.containsKey(running.task.getId())) {
      return;
    }
    running.timedOut.set(true);
    running.cancelled.set(true);
    cancelPlugin(running);
    running.handle.cancel(true);
  }

  private void complete(
      RuntimeState runtime,
      RunningTask running,
      WorkflowTaskResult result,
      Throwable error) {
    runtime.running.remove(running.task.getId(), running);
    if (running.timeoutFuture != null) {
      running.timeoutFuture.cancel(false);
    }

    try {
      WorkflowInstance instance = requireInstance(runtime.instanceId);
      Throwable failure = unwrap(error);
      if (instance.isStopRequested() || instance.getState() == WorkflowState.STOPPING) {
        executionDao.finishAttempt(
            running.attemptId,
            AttemptState.STOPPED,
            result == null ? null : result.getExternalId(),
            "工作流已请求停止");
        executionDao.markTaskStopped(running.task.getId(), "工作流已请求停止");
      } else if (running.timedOut.get()) {
        String message = "任务执行超过 " + running.task.getTimeoutSeconds() + " 秒";
        executionDao.finishAttempt(running.attemptId, AttemptState.FAILED, null, message);
        retryOrFail(running.task, message);
      } else if (failure != null) {
        String message = failureMessage(failure);
        AttemptState attemptState = failure instanceof CancellationException
            ? AttemptState.STOPPED
            : AttemptState.FAILED;
        executionDao.finishAttempt(running.attemptId, attemptState, null, message);
        if (attemptState == AttemptState.STOPPED) {
          executionDao.markTaskStopped(running.task.getId(), message);
        } else {
          retryOrFail(running.task, message);
        }
      } else if (result == null || !result.isSuccess()) {
        String message = result == null ? "任务执行器未返回结果" : result.getMessage();
        executionDao.finishAttempt(
            running.attemptId,
            AttemptState.FAILED,
            result == null ? null : result.getExternalId(),
            message);
        retryOrFail(running.task, message);
      } else {
        executionDao.finishAttempt(
            running.attemptId,
            AttemptState.SUCCESS,
            result.getExternalId(),
            null);
        executionDao.markTaskSuccess(running.task.getId(), result.getOutputs());
      }
    } catch (Exception completionError) {
      LOGGER.error(
          "保存任务完成状态失败，instanceId={}，taskId={}",
          runtime.instanceId,
          running.task.getId(),
          completionError);
      executionDao.markTaskFailed(
          running.task.getId(),
          running.task.getRetryCount(),
          failureMessage(completionError));
    }
    dispatch(runtime);
  }

  private void retryOrFail(WorkflowTaskInstance task, String message) {
    if (task.getRetryCount() < task.getMaxRetryTimes()) {
      int retryCount = task.getRetryCount() + 1;
      Date nextRetryTime = Date.from(
          Instant.now().plusSeconds(task.getRetryIntervalSeconds()));
      executionDao.markTaskRetryWaiting(
          task.getId(),
          retryCount,
          nextRetryTime,
          message);
      dispatcher.schedule(
          () -> {
            RuntimeState runtime = runtimes.get(task.getWorkflowInstanceId());
            if (runtime != null) {
              dispatch(runtime);
            }
          },
          Duration.ofSeconds(task.getRetryIntervalSeconds()));
    } else {
      executionDao.markTaskFailed(task.getId(), task.getRetryCount(), message);
    }
  }

  private void applyFailurePropagation(
      RuntimeState runtime,
      WorkflowInstance instance,
      Map<String, WorkflowTaskInstance> byNode) {
    List<WorkflowTaskInstance> failed = byNode.values().stream()
        .filter(task -> task.getState() == TaskState.FAILED)
        .collect(Collectors.toList());
    if (failed.isEmpty()) {
      return;
    }
    if (instance.getFailureStrategy() == FailureStrategy.FAIL_FAST) {
      executionDao.markAllPendingTaskSkipped(runtime.instanceId, "工作流失败后跳过");
      return;
    }
    Set<String> descendants = new LinkedHashSet<>();
    for (WorkflowTaskInstance task : failed) {
      descendants.addAll(descendants(runtime.graph, task.getNodeKey()));
    }
    executionDao.markTaskSkipped(
        runtime.instanceId,
        descendants,
        "上游任务失败后跳过");
  }

  private void finalizeIfComplete(
      RuntimeState runtime,
      WorkflowInstance instance,
      List<WorkflowTaskInstance> tasks) {
    if (!runtime.running.isEmpty()
        || tasks.stream().anyMatch(task -> !task.getState().isTerminal())) {
      return;
    }
    WorkflowState finalState;
    if (instance.isStopRequested()
        || tasks.stream().anyMatch(task -> task.getState() == TaskState.STOPPED)) {
      finalState = WorkflowState.STOPPED;
    } else if (tasks.stream().anyMatch(task -> task.getState() == TaskState.FAILED)) {
      finalState = WorkflowState.FAILED;
    } else {
      finalState = WorkflowState.SUCCESS;
    }
    executionDao.finishInstance(runtime.instanceId, finalState);
    runtimes.remove(runtime.instanceId, runtime);
  }

  private void cancelRunning(RuntimeState runtime, String reason) {
    for (RunningTask running : new ArrayList<>(runtime.running.values())) {
      running.cancelled.set(true);
      appendLogSafely(running.attemptId, reason);
      cancelPlugin(running);
      running.handle.cancel(true);
    }
  }

  private void cancelPlugin(RunningTask running) {
    try {
      running.executor.cancel(running.context);
    } catch (Exception error) {
      LOGGER.warn("取消工作流任务插件失败，taskId={}", running.task.getId(), error);
    }
  }

  private void appendLogSafely(Long attemptId, String line) {
    try {
      WorkflowTaskLogPO logPO = new WorkflowTaskLogPO();
      logPO.setTaskAttemptId(attemptId);
      logPO.setContent(line);
      executionDao.addLog(logPO);
    } catch (Exception error) {
      LOGGER.warn("保存工作流任务日志失败，attemptId={}", attemptId, error);
    }
  }

  private WorkflowInstance requireInstance(Long instanceId) {
    WorkflowInstance instance = executionDao.selectInstanceById(instanceId);
    if (instance == null) {
      throw new IllegalArgumentException("工作流实例不存在：" + instanceId);
    }
    return instance;
  }

  private static boolean isClaimCandidate(WorkflowTaskInstance task) {
    if (task.getState() == TaskState.WAITING || task.getState() == TaskState.READY) {
      return true;
    }
    return task.getState() == TaskState.RETRY_WAITING
        && (task.getNextRetryTime() == null
            || !task.getNextRetryTime().after(new Date()));
  }

  private static boolean hasFinalFailure(
      WorkflowInstance instance,
      List<WorkflowTaskInstance> tasks) {
    return instance.getFailureStrategy() == FailureStrategy.FAIL_FAST
        && tasks.stream().anyMatch(task -> task.getState() == TaskState.FAILED);
  }

  private static Map<String, WorkflowTaskInstance> indexByNode(
      List<WorkflowTaskInstance> tasks) {
    Map<String, WorkflowTaskInstance> result = new HashMap<>();
    tasks.forEach(task -> result.put(task.getNodeKey(), task));
    return result;
  }

  private static boolean allPredecessorsSatisfied(
      CompiledWorkflowDag graph,
      String nodeKey,
      Map<String, WorkflowTaskInstance> byNode) {
    return graph.getPredecessors().getOrDefault(nodeKey, Set.of()).stream()
        .map(byNode::get)
        .allMatch(task -> task != null && task.getState().satisfiesDependency());
  }

  private static boolean hasBlockingPredecessor(
      CompiledWorkflowDag graph,
      String nodeKey,
      Map<String, WorkflowTaskInstance> byNode) {
    return graph.getPredecessors().getOrDefault(nodeKey, Set.of()).stream()
        .map(byNode::get)
        .anyMatch(task -> task != null
            && (task.getState() == TaskState.FAILED
                || task.getState() == TaskState.STOPPED));
  }

  private static Set<String> descendants(CompiledWorkflowDag graph, String nodeKey) {
    Set<String> result = new HashSet<>();
    ArrayDeque<String> queue = new ArrayDeque<>(
        graph.getSuccessors().getOrDefault(nodeKey, Set.of()));
    while (!queue.isEmpty()) {
      String current = queue.removeFirst();
      if (result.add(current)) {
        queue.addAll(graph.getSuccessors().getOrDefault(current, Set.of()));
      }
    }
    return result;
  }

  private static Throwable unwrap(Throwable error) {
    Throwable current = error;
    while (current instanceof CompletionException && current.getCause() != null) {
      current = current.getCause();
    }
    return current;
  }

  private static String failureMessage(Throwable error) {
    if (error == null) {
      return "未知工作流任务异常";
    }
    return error.getMessage() == null || error.getMessage().isBlank()
        ? error.getClass().getSimpleName()
        : error.getMessage();
  }

  private static final class RuntimeState {
    private final Long instanceId;
    private final CompiledWorkflowDag graph;
    private final Object monitor = new Object();
    private final ConcurrentMap<Long, RunningTask> running = new ConcurrentHashMap<>();

    private RuntimeState(Long instanceId, CompiledWorkflowDag graph) {
      this.instanceId = instanceId;
      this.graph = graph;
    }
  }

  private static final class RunningTask {
    private final WorkflowTaskInstance task;
    private final Long attemptId;
    private final WorkflowTaskExecutor executor;
    private final WorkflowTaskContext context;
    private final AtomicBoolean cancelled;
    private final AtomicBoolean timedOut = new AtomicBoolean(false);
    private final DispatchHandle<WorkflowTaskResult> handle;
    private volatile Future<?> timeoutFuture;

    private RunningTask(
        WorkflowTaskInstance task,
        Long attemptId,
        WorkflowTaskExecutor executor,
        WorkflowTaskContext context,
        AtomicBoolean cancelled,
        DispatchHandle<WorkflowTaskResult> handle) {
      this.task = task;
      this.attemptId = attemptId;
      this.executor = executor;
      this.context = context;
      this.cancelled = cancelled;
      this.handle = handle;
    }
  }
}
