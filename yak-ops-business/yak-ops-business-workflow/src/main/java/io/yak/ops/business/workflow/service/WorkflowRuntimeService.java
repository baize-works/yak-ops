package io.yak.ops.business.workflow.service;

import io.yak.framework.workflow.engine.api.DefaultWorkflowEngine;
import io.yak.framework.workflow.engine.definition.EdgeDefinition;
import io.yak.framework.workflow.engine.definition.NodeDefinition;
import io.yak.framework.workflow.engine.definition.NodeFailurePolicy;
import io.yak.framework.workflow.engine.definition.NodeInputMapping;
import io.yak.framework.workflow.engine.definition.NodeTimeoutPolicy;
import io.yak.framework.workflow.engine.definition.RetryPolicy;
import io.yak.framework.workflow.engine.definition.TriggerRule;
import io.yak.framework.workflow.engine.definition.WorkflowDefinition;
import io.yak.framework.workflow.engine.definition.WorkflowFailureStrategy;
import io.yak.framework.workflow.engine.definition.WorkflowTimeoutPolicy;
import io.yak.framework.workflow.engine.execution.NodeAttempt;
import io.yak.framework.workflow.engine.execution.NodeExecution;
import io.yak.framework.workflow.engine.execution.WorkflowExecution;
import io.yak.framework.workflow.engine.spi.NodeCancellation;
import io.yak.framework.workflow.engine.spi.NodeControlResult;
import io.yak.framework.workflow.engine.spi.NodeDispatch;
import io.yak.framework.workflow.engine.spi.NodeExecutor;
import io.yak.framework.workflow.engine.spi.NodePauseRequest;
import io.yak.framework.workflow.engine.spi.NodeResumeRequest;
import io.yak.ops.business.job.task.SyncTaskExecution;
import io.yak.ops.business.job.task.SyncTaskRunner;
import io.yak.ops.business.job.task.TaskDefinition;
import io.yak.ops.business.job.task.TaskRegistry;
import io.yak.ops.business.workflow.model.WorkflowInstanceVO;
import io.yak.ops.business.workflow.model.WorkflowInstanceVO.AttemptVO;
import io.yak.ops.business.workflow.model.WorkflowInstanceVO.NodeInstanceVO;
import io.yak.ops.business.workflow.model.WorkflowRunRequest;
import io.yak.ops.business.workflow.model.WorkflowRunRequest.EdgeRequest;
import io.yak.ops.business.workflow.model.WorkflowRunRequest.NodeRequest;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Yak Framework 工作流引擎的轻量内存适配层。 */
@Service
public class WorkflowRuntimeService {

  private static final Logger log = LoggerFactory.getLogger(WorkflowRuntimeService.class);
  private static final long TASK_POLL_INTERVAL_MILLIS = 500L;

  private final ExecutorService workerPool;
  private final ScheduledExecutorService runtimeScheduler;
  private final DefaultWorkflowEngine engine;
  private final WorkflowEventStreamService eventStreamService;
  private final TaskRegistry taskRegistry;
  private final SyncTaskRunner syncTaskRunner;
  private final long taskPollIntervalMillis;
  private final ConcurrentMap<String, ConcurrentLinkedQueue<NodeDispatch>> pendingDispatches =
      new ConcurrentHashMap<>();
  private final ConcurrentMap<String, Object> publishLocks = new ConcurrentHashMap<>();
  private final ConcurrentMap<String, NodeTaskControl> taskControls = new ConcurrentHashMap<>();
  private final ConcurrentMap<String, ConcurrentMap<String, NodeDispatch>> latestDispatches =
      new ConcurrentHashMap<>();
  private final Set<String> activeExecutions = ConcurrentHashMap.newKeySet();
  private final Map<String, RunMetadata> metadata = new ConcurrentHashMap<>();
  private final ConcurrentLinkedDeque<String> executionOrder = new ConcurrentLinkedDeque<>();

  @Autowired
  public WorkflowRuntimeService(
      WorkflowEventStreamService eventStreamService,
      TaskRegistry taskRegistry,
      SyncTaskRunner syncTaskRunner) {
    this(eventStreamService, taskRegistry, syncTaskRunner, TASK_POLL_INTERVAL_MILLIS);
  }

  WorkflowRuntimeService(
      WorkflowEventStreamService eventStreamService,
      TaskRegistry taskRegistry,
      SyncTaskRunner syncTaskRunner,
      long taskPollIntervalMillis) {
    this.eventStreamService = eventStreamService;
    this.taskRegistry = taskRegistry;
    this.syncTaskRunner = syncTaskRunner;
    this.taskPollIntervalMillis = Math.max(1L, taskPollIntervalMillis);
    AtomicInteger workerIndex = new AtomicInteger();
    this.workerPool = Executors.newFixedThreadPool(
        Math.max(2, Runtime.getRuntime().availableProcessors()),
        runnable -> {
          Thread thread = new Thread(runnable);
          thread.setName("yak-workflow-worker-" + workerIndex.incrementAndGet());
          thread.setDaemon(true);
          return thread;
        });
    AtomicInteger schedulerIndex = new AtomicInteger();
    this.runtimeScheduler = Executors.newScheduledThreadPool(
        2,
        runnable -> {
          Thread thread = new Thread(runnable);
          thread.setName("yak-workflow-runtime-" + schedulerIndex.incrementAndGet());
          thread.setDaemon(true);
          return thread;
        });
    this.engine = DefaultWorkflowEngine.inMemory(new RuntimeNodeExecutor());
    this.runtimeScheduler.scheduleAtFixedRate(
        this::scanTimeouts,
        250L,
        250L,
        TimeUnit.MILLISECONDS);
  }

  public WorkflowInstanceVO run(WorkflowRunRequest request) {
    String definitionId = "workflow-" + UUID.randomUUID();
    Map<String, TaskDefinition> tasksByNode = resolveTasks(request.nodes());
    List<NodeDefinition> nodes = request.nodes().stream()
        .map(node -> toNodeDefinition(node, tasksByNode.get(node.id())))
        .toList();
    List<EdgeDefinition> edges = request.edges().stream()
        .map(this::toEdgeDefinition)
        .toList();

    WorkflowDefinition definition = new WorkflowDefinition(
        definitionId,
        request.name(),
        WorkflowFailureStrategy.valueOf(request.failureStrategy()),
        request.workflowTimeoutSeconds() > 0
            ? WorkflowTimeoutPolicy.of(Duration.ofSeconds(request.workflowTimeoutSeconds()))
            : WorkflowTimeoutPolicy.none(),
        nodes,
        edges);
    engine.registerDefinition(definition);

    WorkflowExecution execution = engine.start(definitionId, request.input());
    RunMetadata runMetadata = new RunMetadata(
        request.name(),
        request.edges().size(),
        request.workflowTimeoutSeconds(),
        request.failureStrategy(),
        nodeMetadata(request.nodes(), tasksByNode));
    registerExecution(execution, runMetadata);

    WorkflowInstanceVO started = toView(execution, runMetadata);
    log.info(
        "[workflow] prepared execution={}, definition={}, name={}, nodes={}, edges={}, timeoutSeconds={}, failureStrategy={}",
        execution.id(),
        definitionId,
        request.name(),
        request.nodes().size(),
        request.edges().size(),
        request.workflowTimeoutSeconds(),
        request.failureStrategy());
    return started;
  }

  public WorkflowInstanceVO activate(String executionId) {
    activateExecution(executionId);
    return getInstance(executionId);
  }

  public WorkflowInstanceVO pause(String executionId) {
    WorkflowExecution execution = engine.pause(executionId, "Paused from Yak Ops");
    return publishAndView(execution);
  }

  public WorkflowInstanceVO resume(String executionId) {
    WorkflowExecution execution = engine.resume(executionId);
    activeExecutions.add(executionId);
    WorkflowInstanceVO snapshot = publishAndView(execution);
    drainDispatches(executionId);
    return snapshot;
  }

  public WorkflowInstanceVO cancel(String executionId) {
    WorkflowExecution execution = engine.cancel(executionId, "Canceled from Yak Ops");
    return publishAndView(execution);
  }

  public WorkflowInstanceVO continueAfterFailure(String executionId, String nodeId) {
    WorkflowExecution execution = engine.continueAfterFailure(executionId, nodeId);
    WorkflowInstanceVO snapshot = publishAndView(execution);
    reactivateExecution(executionId);
    log.info(
        "[workflow] manual continue execution={}, failedNode={}, status={}",
        executionId,
        nodeId,
        snapshot.status());
    return snapshot;
  }

  public WorkflowInstanceVO retryFailedNode(String executionId, String nodeId) {
    requireMetadata(executionId);
    WorkflowExecution execution = engine.retryFailedNode(executionId, nodeId);
    WorkflowInstanceVO snapshot = publishAndView(execution);
    reactivateExecution(executionId);
    return snapshot;
  }

  public WorkflowInstanceVO retryFailedNodes(String executionId) {
    requireExecution(executionId);
    WorkflowExecution execution = engine.retryFailedNodes(executionId);
    WorkflowInstanceVO snapshot = publishAndView(execution);
    reactivateExecution(executionId);
    return snapshot;
  }

  public WorkflowInstanceVO restart(String executionId) {
    RunMetadata sourceMetadata = requireMetadata(executionId);
    WorkflowExecution execution = engine.restart(executionId);
    registerExecution(execution, sourceMetadata);
    return toView(execution, sourceMetadata);
  }

  public WorkflowInstanceVO rerunFromNode(String executionId, String nodeId) {
    RunMetadata sourceMetadata = requireMetadata(executionId);
    WorkflowExecution execution = engine.rerunFromNode(executionId, nodeId);
    registerExecution(execution, sourceMetadata);
    return toView(execution, sourceMetadata);
  }

  public List<WorkflowInstanceVO> listInstances() {
    List<WorkflowInstanceVO> instances = new ArrayList<>();
    for (String executionId : executionOrder) {
      RunMetadata runMetadata = metadata.get(executionId);
      if (runMetadata == null) {
        continue;
      }
      engine.findExecution(executionId)
          .map(execution -> toView(execution, runMetadata))
          .ifPresent(instances::add);
    }
    return instances;
  }

  public WorkflowInstanceVO getInstance(String executionId) {
    return toView(requireExecution(executionId), requireMetadata(executionId));
  }

  public SseEmitter subscribe(String executionId) {
    WorkflowInstanceVO snapshot = getInstance(executionId);
    SseEmitter emitter = eventStreamService.subscribe(executionId, snapshot);
    activateExecution(executionId);
    publishCurrent(executionId);
    return emitter;
  }

  void activateExecution(String executionId) {
    getInstance(executionId);
    if (activeExecutions.add(executionId)) {
      log.info("[workflow] activated execution={}", executionId);
    }
    drainDispatches(executionId);
  }

  private void registerExecution(WorkflowExecution execution, RunMetadata runMetadata) {
    metadata.put(execution.id(), runMetadata);
    executionOrder.remove(execution.id());
    executionOrder.addFirst(execution.id());
  }

  private void reactivateExecution(String executionId) {
    if (activeExecutions.add(executionId)) {
      log.info("[workflow] reactivated execution={}", executionId);
    }
    drainDispatches(executionId);
  }

  private RunMetadata requireMetadata(String executionId) {
    RunMetadata runMetadata = metadata.get(executionId);
    if (runMetadata == null) {
      throw new IllegalArgumentException("Workflow execution metadata not found: " + executionId);
    }
    return runMetadata;
  }

  private WorkflowExecution requireExecution(String executionId) {
    return engine.findExecution(executionId)
        .orElseThrow(() -> new IllegalArgumentException(
            "Workflow execution not found: " + executionId));
  }

  private Map<String, TaskDefinition> resolveTasks(List<NodeRequest> nodes) {
    Map<String, TaskDefinition> result = new LinkedHashMap<>();
    for (NodeRequest node : nodes) {
      TaskDefinition task = taskRegistry.get(node.taskId());
      if (!"SYNC".equalsIgnoreCase(task.type())) {
        throw new IllegalArgumentException(
            "第一阶段工作流仅支持 SYNC 任务：" + task.id());
      }
      result.put(node.id(), task);
    }
    return Map.copyOf(result);
  }

  private NodeDefinition toNodeDefinition(NodeRequest node, TaskDefinition task) {
    RetryPolicy retryPolicy = node.maxAttempts() > 1
        ? RetryPolicy.fixed(node.maxAttempts(), Duration.ofSeconds(node.retryDelaySeconds()))
        : RetryPolicy.none();
    NodeTimeoutPolicy timeoutPolicy = NodeTimeoutPolicy.of(
        Duration.ofSeconds(node.dispatchTimeoutSeconds()),
        Duration.ofSeconds(node.executionTimeoutSeconds()));
    return new NodeDefinition(
        node.id(),
        task.name(),
        TriggerRule.valueOf(node.triggerRule()),
        retryPolicy,
        NodeFailurePolicy.valueOf(node.failurePolicy()),
        timeoutPolicy,
        NodeInputMapping.of(node.inputMapping()),
        Map.of("taskId", task.id()));
  }

  private EdgeDefinition toEdgeDefinition(EdgeRequest edge) {
    return new EdgeDefinition(edge.source(), edge.target());
  }

  private Map<String, NodeMetadata> nodeMetadata(
      List<NodeRequest> nodes,
      Map<String, TaskDefinition> tasksByNode) {
    Map<String, NodeMetadata> result = new LinkedHashMap<>();
    for (NodeRequest node : nodes) {
      TaskDefinition task = tasksByNode.get(node.id());
      result.put(node.id(), new NodeMetadata(
          task.id(),
          task.name(),
          task.type(),
          node.triggerRule(),
          node.failurePolicy(),
          node.maxAttempts(),
          node.retryDelaySeconds(),
          node.dispatchTimeoutSeconds(),
          node.executionTimeoutSeconds(),
          node.inputMapping()));
    }
    return Map.copyOf(result);
  }

  private void enqueueDispatch(NodeDispatch dispatch) {
    latestDispatches
        .computeIfAbsent(dispatch.workflowExecutionId(), ignored -> new ConcurrentHashMap<>())
        .put(dispatch.nodeId(), dispatch);
    pendingDispatches
        .computeIfAbsent(
            dispatch.workflowExecutionId(),
            ignored -> new ConcurrentLinkedQueue<>())
        .offer(dispatch);

    if (activeExecutions.contains(dispatch.workflowExecutionId())) {
      drainDispatches(dispatch.workflowExecutionId());
    }
  }

  private void drainDispatches(String executionId) {
    ConcurrentLinkedQueue<NodeDispatch> queue = pendingDispatches.get(executionId);
    if (queue == null) {
      return;
    }
    NodeDispatch dispatch;
    while ((dispatch = queue.poll()) != null) {
      NodeDispatch current = dispatch;
      workerPool.execute(() -> executeNode(current));
    }
  }

  private void executeNode(NodeDispatch dispatch) {
    NodeTaskControl control = taskControls.computeIfAbsent(
        dispatch.attemptId(), ignored -> new NodeTaskControl());
    control.bind(dispatch.workflowExecutionId());
    control.attach(Thread.currentThread());
    try {
      if (!awaitRunnable(control)) {
        return;
      }
      acknowledgeStarted(dispatch);

      String taskId = String.valueOf(dispatch.nodeConfiguration().get("taskId"));
      TaskDefinition task = taskRegistry.get(taskId);
      if (!"SYNC".equalsIgnoreCase(task.type())) {
        throw new IllegalStateException("当前仅支持 SYNC 任务：" + task.id());
      }

      SyncTaskExecution taskExecution = syncTaskRunner.start(task.id());
      control.bindTaskExecution(taskExecution.executionId());
      log.info(
          "[workflow] sync task started workflowExecution={}, node={}, attempt={}, task={}, taskExecution={}",
          dispatch.workflowExecutionId(),
          dispatch.nodeId(),
          dispatch.attemptId(),
          task.id(),
          taskExecution.executionId());

      while (!taskExecution.terminal()) {
        if (!awaitRunnable(control)) {
          return;
        }
        Thread.sleep(taskPollIntervalMillis);
        if (!awaitRunnable(control)) {
          return;
        }
        taskExecution = syncTaskRunner.status(taskExecution.executionId());
      }

      if (taskExecution.successful()) {
        Map<String, Object> output = new LinkedHashMap<>();
        output.put("taskId", task.id());
        output.put("taskName", task.name());
        output.put("taskType", task.type());
        output.put("syncExecutionId", taskExecution.executionId());
        output.put("syncStatus", taskExecution.status());
        output.put("receivedInput", dispatch.nodeInput());
        output.put("taskOutput", taskExecution.output());
        engine.completeNode(
            dispatch.workflowExecutionId(),
            dispatch.nodeId(),
            dispatch.attemptId(),
            output);
        publishCurrent(dispatch.workflowExecutionId());
        return;
      }

      String errorMessage = taskExecution.errorMessage();
      if (errorMessage == null || errorMessage.isBlank()) {
        errorMessage = "同步任务执行失败，状态：" + taskExecution.status();
      }
      engine.failNode(
          dispatch.workflowExecutionId(),
          dispatch.nodeId(),
          dispatch.attemptId(),
          errorMessage);
      publishCurrent(dispatch.workflowExecutionId());
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      if (!control.canceled()) {
        failNode(dispatch, "Node execution interrupted", exception);
      }
    } catch (RuntimeException exception) {
      if (!control.canceled()) {
        failNode(
            dispatch,
            exception.getMessage() == null
                ? exception.getClass().getSimpleName()
                : exception.getMessage(),
            exception);
      }
    } finally {
      control.detach(Thread.currentThread());
      taskControls.remove(dispatch.attemptId(), control);
      drainDispatches(dispatch.workflowExecutionId());
    }
  }

  private void acknowledgeStarted(NodeDispatch dispatch) {
    engine.acknowledgeNodeStarted(
        dispatch.workflowExecutionId(), dispatch.nodeId(), dispatch.attemptId());
    publishCurrent(dispatch.workflowExecutionId());
  }

  private boolean awaitRunnable(NodeTaskControl control) throws InterruptedException {
    NodePauseRequest pauseRequest = control.claimPauseAcknowledgement();
    if (pauseRequest != null) {
      acknowledgePaused(pauseRequest);
    }
    control.awaitResume();
    return !control.canceled();
  }

  private void acknowledgePaused(NodePauseRequest request) {
    try {
      engine.acknowledgeNodePaused(
          request.workflowExecutionId(), request.nodeId(), request.attemptId());
      publishCurrent(request.workflowExecutionId());
    } catch (RuntimeException exception) {
      log.debug(
          "[workflow] pause acknowledgement ignored execution={}, node={}, attempt={}, message={}",
          request.workflowExecutionId(), request.nodeId(), request.attemptId(), exception.getMessage());
    }
  }

  private void failNode(NodeDispatch dispatch, String errorMessage, Exception exception) {
    log.error(
        "[workflow] node failed execution={}, node={}, attempt={}, message={}",
        dispatch.workflowExecutionId(), dispatch.nodeId(), dispatch.attemptId(), errorMessage, exception);
    try {
      engine.failNode(
          dispatch.workflowExecutionId(), dispatch.nodeId(), dispatch.attemptId(), errorMessage);
      publishCurrent(dispatch.workflowExecutionId());
    } catch (RuntimeException callbackException) {
      log.warn(
          "[workflow] failure callback skipped execution={}, node={}, attempt={}, message={}",
          dispatch.workflowExecutionId(), dispatch.nodeId(), dispatch.attemptId(), callbackException.getMessage());
    }
  }

  private void scanTimeouts() {
    for (String executionId : List.copyOf(activeExecutions)) {
      try {
        WorkflowExecution before = requireExecution(executionId);
        String beforeSignature = runtimeSignature(before);
        WorkflowExecution after = engine.checkTimeouts(executionId);
        if (!beforeSignature.equals(runtimeSignature(after))) {
          publishCurrent(executionId);
        }
      } catch (RuntimeException exception) {
        log.debug(
            "[workflow] timeout scan skipped execution={}, message={}",
            executionId, exception.getMessage());
      }
    }
  }

  private String runtimeSignature(WorkflowExecution execution) {
    StringBuilder signature = new StringBuilder(execution.status().name());
    execution.nodes().values().forEach(node -> {
      signature.append('|').append(node.nodeId()).append(':').append(node.status().name());
      if (!node.attempts().isEmpty()) {
        NodeAttempt attempt = node.attempts().get(node.attempts().size() - 1);
        signature.append(':').append(attempt.id()).append(':').append(attempt.status().name());
      }
    });
    return signature.toString();
  }

  private WorkflowInstanceVO publishAndView(WorkflowExecution execution) {
    RunMetadata runMetadata = requireMetadata(execution.id());
    WorkflowInstanceVO snapshot = toView(execution, runMetadata);
    eventStreamService.publish(snapshot);
    if (isTerminal(snapshot.status())) {
      cleanupTerminalRuntime(execution.id());
    }
    return snapshot;
  }

  private void publishCurrent(String executionId) {
    Object publishLock = publishLocks.computeIfAbsent(executionId, ignored -> new Object());
    synchronized (publishLock) {
      RunMetadata runMetadata = metadata.get(executionId);
      if (runMetadata == null) {
        return;
      }
      engine.findExecution(executionId)
          .map(execution -> toView(execution, runMetadata))
          .ifPresent(snapshot -> {
            eventStreamService.publish(snapshot);
            if (isTerminal(snapshot.status())) {
              cleanupTerminalRuntime(executionId);
              publishLocks.remove(executionId, publishLock);
            }
          });
    }
  }

  private void cleanupTerminalRuntime(String executionId) {
    activeExecutions.remove(executionId);
    pendingDispatches.remove(executionId);
    latestDispatches.remove(executionId);
    taskControls.entrySet().removeIf(
        entry -> executionId.equals(entry.getValue().workflowExecutionId()));
  }

  private boolean isTerminal(String status) {
    return "SUCCESS".equals(status)
        || "SUCCESS_WITH_WARNINGS".equals(status)
        || "FAILED".equals(status)
        || "WARNING".equals(status)
        || "CANCELED".equals(status)
        || "TIMED_OUT".equals(status);
  }

  private WorkflowInstanceVO toView(WorkflowExecution execution, RunMetadata runMetadata) {
    List<NodeInstanceVO> nodes = execution.nodes().values().stream()
        .map(node -> toNodeView(execution.id(), node, runMetadata.nodes().get(node.nodeId())))
        .toList();
    return new WorkflowInstanceVO(
        execution.id(),
        execution.definitionId(),
        execution.sourceExecutionId(),
        runMetadata.name(),
        execution.status().name(),
        runMetadata.failureStrategy(),
        execution.createdAt(),
        execution.runStartedAt(),
        execution.endedAt(),
        runMetadata.workflowTimeoutSeconds(),
        execution.input(),
        nodes.size(),
        runMetadata.edgeCount(),
        nodes);
  }

  private NodeInstanceVO toNodeView(
      String executionId,
      NodeExecution node,
      NodeMetadata nodeMetadata) {
    String taskId = nodeMetadata == null ? null : nodeMetadata.taskId();
    String name = nodeMetadata == null ? node.nodeId() : nodeMetadata.name();
    String type = nodeMetadata == null ? "SYNC" : nodeMetadata.type();
    List<AttemptVO> attempts = node.attempts().stream().map(this::toAttemptView).toList();
    NodeAttempt currentAttempt = node.attempts().isEmpty()
        ? null
        : node.attempts().get(node.attempts().size() - 1);
    String failureReason = currentAttempt == null || currentAttempt.failureReason() == null
        ? null
        : currentAttempt.failureReason().name();
    ConcurrentMap<String, NodeDispatch> executionDispatches = latestDispatches.get(executionId);
    NodeDispatch dispatch = executionDispatches == null
        ? null
        : executionDispatches.get(node.nodeId());

    return new NodeInstanceVO(
        node.nodeId(),
        taskId,
        name,
        type,
        node.status().name(),
        nodeMetadata == null ? TriggerRule.ALL_SUCCESS.name() : nodeMetadata.triggerRule(),
        nodeMetadata == null ? NodeFailurePolicy.FAIL_WORKFLOW.name() : nodeMetadata.failurePolicy(),
        node.errorMessage(),
        failureReason,
        node.downstreamContinuationAllowed(),
        attempts.size(),
        currentAttempt == null ? null : currentAttempt.id(),
        currentAttempt == null ? null : currentAttempt.attemptNumber(),
        nodeMetadata == null ? 1 : nodeMetadata.maxAttempts(),
        nodeMetadata == null ? 0L : nodeMetadata.retryDelaySeconds(),
        nodeMetadata == null ? 0L : nodeMetadata.dispatchTimeoutSeconds(),
        nodeMetadata == null ? 0L : nodeMetadata.executionTimeoutSeconds(),
        nodeMetadata == null ? Map.of() : nodeMetadata.inputMapping(),
        dispatch == null ? Map.of() : dispatch.nodeInput(),
        dispatch == null ? Map.of() : dispatch.predecessorOutputs(),
        node.output(),
        attempts);
  }

  private AttemptVO toAttemptView(NodeAttempt attempt) {
    return new AttemptVO(
        attempt.id(),
        attempt.attemptNumber(),
        attempt.status().name(),
        attempt.failureReason() == null ? null : attempt.failureReason().name(),
        attempt.errorMessage(),
        attempt.availableAt(),
        attempt.startedAt(),
        attempt.pausedAt(),
        attempt.pausedDuration().toMillis(),
        attempt.endedAt());
  }

  @PreDestroy
  void shutdown() {
    runtimeScheduler.shutdownNow();
    workerPool.shutdownNow();
  }

  private record RunMetadata(
      String name,
      int edgeCount,
      long workflowTimeoutSeconds,
      String failureStrategy,
      Map<String, NodeMetadata> nodes) {}

  private record NodeMetadata(
      String taskId,
      String name,
      String type,
      String triggerRule,
      String failurePolicy,
      int maxAttempts,
      long retryDelaySeconds,
      long dispatchTimeoutSeconds,
      long executionTimeoutSeconds,
      Map<String, String> inputMapping) {}

  private final class RuntimeNodeExecutor implements NodeExecutor {

    @Override
    public void submit(NodeDispatch dispatch) {
      NodeTaskControl control = taskControls.computeIfAbsent(
          dispatch.attemptId(), ignored -> new NodeTaskControl());
      control.bind(dispatch.workflowExecutionId());
      enqueueDispatch(dispatch);
    }

    @Override
    public void cancel(NodeCancellation cancellation) {
      NodeTaskControl control = taskControls.get(cancellation.attemptId());
      if (control == null) {
        return;
      }
      String taskExecutionId = control.taskExecutionId();
      if (taskExecutionId != null) {
        try {
          syncTaskRunner.cancel(taskExecutionId);
        } catch (RuntimeException exception) {
          log.warn(
              "[workflow] sync task cancel ignored execution={}, node={}, attempt={}, taskExecution={}, message={}",
              cancellation.workflowExecutionId(),
              cancellation.nodeId(),
              cancellation.attemptId(),
              taskExecutionId,
              exception.getMessage());
        }
      }
      control.cancel();
    }

    @Override
    public NodeControlResult pause(NodePauseRequest request) {
      NodeTaskControl control = taskControls.get(request.attemptId());
      if (control == null) {
        return NodeControlResult.UNSUPPORTED;
      }
      boolean notStarted = control.requestPause(request);
      if (notStarted) {
        runtimeScheduler.execute(() -> {
          NodePauseRequest pending = control.claimPauseAcknowledgement();
          if (pending != null) {
            acknowledgePaused(pending);
          }
        });
      }
      return NodeControlResult.ACCEPTED;
    }

    @Override
    public void resume(NodeResumeRequest request) {
      NodeTaskControl control = taskControls.get(request.attemptId());
      if (control == null) {
        return;
      }
      runtimeScheduler.execute(() -> {
        try {
          engine.acknowledgeNodeResumed(
              request.workflowExecutionId(), request.nodeId(), request.attemptId());
          control.resume();
          publishCurrent(request.workflowExecutionId());
        } catch (RuntimeException exception) {
          log.debug(
              "[workflow] resume acknowledgement ignored execution={}, node={}, attempt={}, message={}",
              request.workflowExecutionId(), request.nodeId(), request.attemptId(), exception.getMessage());
        }
      });
    }
  }

  private static final class NodeTaskControl {

    private final Object monitor = new Object();
    private volatile String workflowExecutionId;
    private volatile String taskExecutionId;
    private volatile Thread thread;
    private volatile boolean pauseRequested;
    private volatile boolean pauseAcknowledged;
    private volatile boolean canceled;
    private NodePauseRequest pauseRequest;

    void bind(String workflowExecutionId) {
      this.workflowExecutionId = workflowExecutionId;
    }

    String workflowExecutionId() {
      return workflowExecutionId;
    }

    void bindTaskExecution(String taskExecutionId) {
      this.taskExecutionId = taskExecutionId;
    }

    String taskExecutionId() {
      return taskExecutionId;
    }

    void attach(Thread thread) {
      this.thread = thread;
    }

    void detach(Thread thread) {
      if (this.thread == thread) {
        this.thread = null;
      }
    }

    boolean requestPause(NodePauseRequest request) {
      synchronized (monitor) {
        pauseRequested = true;
        pauseAcknowledged = false;
        pauseRequest = request;
        return thread == null;
      }
    }

    NodePauseRequest claimPauseAcknowledgement() {
      synchronized (monitor) {
        if (!pauseRequested || pauseAcknowledged || canceled) {
          return null;
        }
        pauseAcknowledged = true;
        return pauseRequest;
      }
    }

    void awaitResume() throws InterruptedException {
      synchronized (monitor) {
        while (pauseRequested && !canceled) {
          monitor.wait();
        }
      }
    }

    void resume() {
      synchronized (monitor) {
        pauseRequested = false;
        pauseRequest = null;
        monitor.notifyAll();
      }
    }

    void cancel() {
      synchronized (monitor) {
        canceled = true;
        pauseRequested = false;
        monitor.notifyAll();
      }
      Thread runningThread = thread;
      if (runningThread != null) {
        runningThread.interrupt();
      }
    }

    boolean canceled() {
      return canceled;
    }
  }
}
