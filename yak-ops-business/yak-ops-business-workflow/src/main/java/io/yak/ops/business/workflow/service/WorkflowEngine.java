package io.yak.ops.business.workflow.service;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.dag.CompiledWorkflowDag;
import io.yak.ops.business.workflow.dag.WorkflowDagCompiler;
import io.yak.ops.business.workflow.model.WorkflowEnums.AttemptState;
import io.yak.ops.business.workflow.model.WorkflowEnums.FailureStrategy;
import io.yak.ops.business.workflow.model.WorkflowEnums.TaskState;
import io.yak.ops.business.workflow.model.WorkflowEnums.WorkflowState;
import io.yak.ops.business.workflow.model.WorkflowRecords.Instance;
import io.yak.ops.business.workflow.model.WorkflowRecords.TaskInstance;
import io.yak.ops.business.workflow.model.WorkflowRecords.Version;
import io.yak.ops.business.workflow.repository.JdbcWorkflowRepository;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Single-process DAG runtime. Database state remains authoritative; memory only coordinates active work. */
@ConditionalOnWorkflowEnabled
@Service
public final class WorkflowEngine {

  private static final Logger LOGGER = LoggerFactory.getLogger(WorkflowEngine.class);

  private final JdbcWorkflowRepository repository;
  private final WorkflowDagCompiler compiler;
  private final WorkflowTaskExecutorRegistry executorRegistry;
  private final LocalWorkflowTaskDispatcher dispatcher;
  private final ConcurrentMap<Long, RuntimeState> runtimes = new ConcurrentHashMap<>();

  public WorkflowEngine(
      JdbcWorkflowRepository repository,
      WorkflowDagCompiler compiler,
      WorkflowTaskExecutorRegistry executorRegistry,
      LocalWorkflowTaskDispatcher dispatcher) {
    this.repository = repository;
    this.compiler = compiler;
    this.executorRegistry = executorRegistry;
    this.dispatcher = dispatcher;
  }

  public void start(long workflowInstanceId) {
    RuntimeState runtime = runtimes.computeIfAbsent(workflowInstanceId, this::loadRuntime);
    dispatch(runtime);
  }

  public void stop(long workflowInstanceId) {
    RuntimeState runtime = runtimes.get(workflowInstanceId);
    if (runtime == null) {
      start(workflowInstanceId);
      runtime = runtimes.get(workflowInstanceId);
    }
    if (runtime == null) {
      return;
    }
    synchronized (runtime.monitor) {
      cancelRunning(runtime, "Workflow stop requested");
    }
    dispatch(runtime);
  }

  public void recover() {
    for (Long instanceId : repository.findRecoverableInstanceIds(100)) {
      try {
        start(instanceId);
      } catch (Exception error) {
        LOGGER.error("Failed to recover workflow instance {}", instanceId, error);
      }
    }
  }

  public boolean isActive(long workflowInstanceId) {
    return runtimes.containsKey(workflowInstanceId);
  }

  private RuntimeState loadRuntime(long instanceId) {
    Instance instance = requireInstance(instanceId);
    Version version = repository.findVersion(instance.workflowId(), instance.workflowVersion())
        .orElseThrow(() -> new IllegalStateException(
            "Workflow version does not exist: " + instance.workflowId() + "/" + instance.workflowVersion()));
    CompiledWorkflowDag graph = compiler.compile(version.dag());

    if (instance.state() == WorkflowState.RUNNING || instance.state() == WorkflowState.STOPPING) {
      for (TaskInstance task : repository.findTasks(instanceId)) {
        if (task.state() == TaskState.RUNNING) {
          repository.interruptRunningTask(task);
        }
      }
    }
    repository.markInstanceRunning(instanceId);
    return new RuntimeState(instanceId, graph);
  }

  private void dispatch(RuntimeState runtime) {
    synchronized (runtime.monitor) {
      try {
        Instance instance = requireInstance(runtime.instanceId);
        if (instance.state().isTerminal()) {
          runtimes.remove(runtime.instanceId, runtime);
          return;
        }

        List<TaskInstance> tasks = repository.findTasks(runtime.instanceId);
        Map<String, TaskInstance> byNode = indexByNode(tasks);

        if (instance.stopRequested() || instance.state() == WorkflowState.STOPPING) {
          cancelRunning(runtime, "Workflow stop requested");
          for (TaskInstance task : tasks) {
            if (!task.state().isTerminal() && task.state() != TaskState.RUNNING) {
              repository.markTaskStopped(task.id(), "Workflow stop requested");
            }
          }
          finalizeIfComplete(runtime, requireInstance(runtime.instanceId), repository.findTasks(runtime.instanceId));
          return;
        }

        applyFailurePropagation(runtime, instance, byNode);
        tasks = repository.findTasks(runtime.instanceId);
        byNode = indexByNode(tasks);

        int available = Math.max(0, instance.maxParallelism() - runtime.running.size());
        if (available > 0 && !hasFinalFailure(instance, tasks)) {
          for (String nodeKey : runtime.graph.topologicalOrder()) {
            if (available == 0) {
              break;
            }
            TaskInstance task = byNode.get(nodeKey);
            if (task == null || !isClaimCandidate(task)) {
              continue;
            }
            if (hasBlockingPredecessor(runtime.graph, task.nodeKey(), byNode)) {
              repository.markTasksSkipped(
                  runtime.instanceId,
                  Set.of(task.nodeKey()),
                  "A predecessor did not complete successfully");
              continue;
            }
            if (!allPredecessorsSatisfied(runtime.graph, task.nodeKey(), byNode)) {
              continue;
            }
            if (submit(runtime, instance, task)) {
              available--;
            }
          }
        }

        finalizeIfComplete(runtime, requireInstance(runtime.instanceId), repository.findTasks(runtime.instanceId));
      } catch (Exception error) {
        LOGGER.error("Workflow dispatch failed for instance {}", runtime.instanceId, error);
        repository.markAllPendingTasksSkipped(runtime.instanceId, "Workflow engine dispatch failed");
        repository.finishInstance(runtime.instanceId, WorkflowState.FAILED);
        cancelRunning(runtime, "Workflow engine dispatch failed");
        runtimes.remove(runtime.instanceId, runtime);
      }
    }
  }

  private boolean submit(RuntimeState runtime, Instance instance, TaskInstance candidate) {
    if (!repository.claimTask(candidate.id())) {
      return false;
    }
    TaskInstance task = repository.findTask(candidate.id())
        .orElseThrow(() -> new IllegalStateException("Claimed task disappeared: " + candidate.id()));
    long attemptId = repository.createAttempt(task);
    int attemptNo = task.retryCount() + 1;
    WorkflowTaskExecutor executor = executorRegistry.require(task.taskType());
    AtomicBoolean cancelled = new AtomicBoolean(false);
    WorkflowTaskContext context = new WorkflowTaskContext(
        instance.id(),
        task.id(),
        attemptId,
        attemptNo,
        task.nodeKey(),
        task.taskType(),
        task.configuration(),
        instance.globalParameters(),
        cancelled::get,
        line -> appendLogSafely(attemptId, line));

    DispatchHandle<WorkflowTaskResult> handle = dispatcher.submit(() -> executor.execute(context));
    RunningTask running = new RunningTask(task, attemptId, executor, context, cancelled, handle);
    runtime.running.put(task.id(), running);

    if (task.timeoutSeconds() > 0) {
      running.timeoutFuture = dispatcher.schedule(
          () -> timeout(runtime, running),
          Duration.ofSeconds(task.timeoutSeconds()));
    }
    handle.completion().whenComplete((result, error) -> complete(runtime, running, result, error));
    return true;
  }

  private void timeout(RuntimeState runtime, RunningTask running) {
    if (!runtime.running.containsKey(running.task.id())) {
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
    runtime.running.remove(running.task.id(), running);
    if (running.timeoutFuture != null) {
      running.timeoutFuture.cancel(false);
    }

    try {
      Instance instance = requireInstance(runtime.instanceId);
      Throwable failure = unwrap(error);
      if (instance.stopRequested() || instance.state() == WorkflowState.STOPPING) {
        repository.finishAttempt(
            running.attemptId,
            AttemptState.STOPPED,
            result == null ? null : result.externalId(),
            "Workflow stop requested");
        repository.markTaskStopped(running.task.id(), "Workflow stop requested");
      } else if (running.timedOut.get()) {
        String message = "Task timed out after " + running.task.timeoutSeconds() + " seconds";
        repository.finishAttempt(running.attemptId, AttemptState.FAILED, null, message);
        retryOrFail(running.task, message);
      } else if (failure != null) {
        String message = failureMessage(failure);
        AttemptState attemptState = failure instanceof CancellationException
            ? AttemptState.STOPPED
            : AttemptState.FAILED;
        repository.finishAttempt(running.attemptId, attemptState, null, message);
        if (attemptState == AttemptState.STOPPED) {
          repository.markTaskStopped(running.task.id(), message);
        } else {
          retryOrFail(running.task, message);
        }
      } else if (result == null || !result.success()) {
        String message = result == null ? "Task executor returned no result" : result.message();
        repository.finishAttempt(
            running.attemptId,
            AttemptState.FAILED,
            result == null ? null : result.externalId(),
            message);
        retryOrFail(running.task, message);
      } else {
        repository.finishAttempt(
            running.attemptId,
            AttemptState.SUCCESS,
            result.externalId(),
            null);
        repository.markTaskSuccess(running.task.id(), result.outputs());
      }
    } catch (Exception completionError) {
      LOGGER.error(
          "Failed to persist task completion for workflow instance {}, task {}",
          runtime.instanceId,
          running.task.id(),
          completionError);
      repository.markTaskFailed(
          running.task.id(),
          running.task.retryCount(),
          failureMessage(completionError));
    }
    dispatch(runtime);
  }

  private void retryOrFail(TaskInstance task, String message) {
    if (task.retryCount() < task.maxRetryTimes()) {
      int retryCount = task.retryCount() + 1;
      Instant nextRetryTime = Instant.now().plusSeconds(task.retryIntervalSeconds());
      repository.markTaskRetryWaiting(task.id(), retryCount, nextRetryTime, message);
      dispatcher.schedule(
          () -> runtimes.values().stream()
              .filter(runtime -> runtime.instanceId == task.workflowInstanceId())
              .findFirst()
              .ifPresent(this::dispatch),
          Duration.ofSeconds(task.retryIntervalSeconds()));
    } else {
      repository.markTaskFailed(task.id(), task.retryCount(), message);
    }
  }

  private void applyFailurePropagation(
      RuntimeState runtime,
      Instance instance,
      Map<String, TaskInstance> byNode) {
    List<TaskInstance> failed = byNode.values().stream()
        .filter(task -> task.state() == TaskState.FAILED)
        .toList();
    if (failed.isEmpty()) {
      return;
    }
    if (instance.failureStrategy() == FailureStrategy.FAIL_FAST) {
      repository.markAllPendingTasksSkipped(runtime.instanceId, "Skipped after workflow failure");
      return;
    }
    Set<String> descendants = new LinkedHashSet<>();
    for (TaskInstance task : failed) {
      descendants.addAll(descendants(runtime.graph, task.nodeKey()));
    }
    repository.markTasksSkipped(
        runtime.instanceId,
        descendants,
        "Skipped because an upstream task failed");
  }

  private void finalizeIfComplete(
      RuntimeState runtime,
      Instance instance,
      List<TaskInstance> tasks) {
    if (!runtime.running.isEmpty() || tasks.stream().anyMatch(task -> !task.state().isTerminal())) {
      return;
    }
    WorkflowState finalState;
    if (instance.stopRequested() || tasks.stream().anyMatch(task -> task.state() == TaskState.STOPPED)) {
      finalState = WorkflowState.STOPPED;
    } else if (tasks.stream().anyMatch(task -> task.state() == TaskState.FAILED)) {
      finalState = WorkflowState.FAILED;
    } else {
      finalState = WorkflowState.SUCCESS;
    }
    repository.finishInstance(runtime.instanceId, finalState);
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
      LOGGER.warn("Task plugin cancellation failed for task {}", running.task.id(), error);
    }
  }

  private void appendLogSafely(long attemptId, String line) {
    try {
      repository.appendLog(attemptId, line);
    } catch (Exception error) {
      LOGGER.warn("Cannot persist workflow task log for attempt {}", attemptId, error);
    }
  }

  private Instance requireInstance(long instanceId) {
    return repository.findInstance(instanceId)
        .orElseThrow(() -> new IllegalArgumentException(
            "Workflow instance does not exist: " + instanceId));
  }

  private static boolean isClaimCandidate(TaskInstance task) {
    if (task.state() == TaskState.WAITING || task.state() == TaskState.READY) {
      return true;
    }
    return task.state() == TaskState.RETRY_WAITING
        && (task.nextRetryTime() == null || !task.nextRetryTime().isAfter(Instant.now()));
  }

  private static boolean hasFinalFailure(Instance instance, List<TaskInstance> tasks) {
    return instance.failureStrategy() == FailureStrategy.FAIL_FAST
        && tasks.stream().anyMatch(task -> task.state() == TaskState.FAILED);
  }

  private static Map<String, TaskInstance> indexByNode(List<TaskInstance> tasks) {
    Map<String, TaskInstance> result = new HashMap<>();
    tasks.forEach(task -> result.put(task.nodeKey(), task));
    return result;
  }

  private static boolean allPredecessorsSatisfied(
      CompiledWorkflowDag graph,
      String nodeKey,
      Map<String, TaskInstance> byNode) {
    return graph.predecessors().getOrDefault(nodeKey, Set.of()).stream()
        .map(byNode::get)
        .allMatch(task -> task != null && task.state().satisfiesDependency());
  }

  private static boolean hasBlockingPredecessor(
      CompiledWorkflowDag graph,
      String nodeKey,
      Map<String, TaskInstance> byNode) {
    return graph.predecessors().getOrDefault(nodeKey, Set.of()).stream()
        .map(byNode::get)
        .anyMatch(task -> task != null
            && (task.state() == TaskState.FAILED || task.state() == TaskState.STOPPED));
  }

  private static Set<String> descendants(CompiledWorkflowDag graph, String nodeKey) {
    Set<String> result = new HashSet<>();
    ArrayDeque<String> queue = new ArrayDeque<>(graph.successors().getOrDefault(nodeKey, Set.of()));
    while (!queue.isEmpty()) {
      String current = queue.removeFirst();
      if (result.add(current)) {
        queue.addAll(graph.successors().getOrDefault(current, Set.of()));
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
      return "Unknown workflow task failure";
    }
    return error.getMessage() == null || error.getMessage().isBlank()
        ? error.getClass().getSimpleName()
        : error.getMessage();
  }

  private static final class RuntimeState {

    private final long instanceId;
    private final CompiledWorkflowDag graph;
    private final Object monitor = new Object();
    private final ConcurrentMap<Long, RunningTask> running = new ConcurrentHashMap<>();

    private RuntimeState(long instanceId, CompiledWorkflowDag graph) {
      this.instanceId = instanceId;
      this.graph = graph;
    }
  }

  private static final class RunningTask {

    private final TaskInstance task;
    private final long attemptId;
    private final WorkflowTaskExecutor executor;
    private final WorkflowTaskContext context;
    private final AtomicBoolean cancelled;
    private final AtomicBoolean timedOut = new AtomicBoolean(false);
    private final DispatchHandle<WorkflowTaskResult> handle;
    private volatile Future<?> timeoutFuture;

    private RunningTask(
        TaskInstance task,
        long attemptId,
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
