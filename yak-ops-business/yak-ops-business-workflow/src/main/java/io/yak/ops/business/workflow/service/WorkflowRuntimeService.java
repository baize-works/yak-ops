package io.yak.ops.business.workflow.service;

import io.yak.framework.workflow.engine.api.DefaultWorkflowEngine;
import io.yak.framework.workflow.engine.definition.EdgeDefinition;
import io.yak.framework.workflow.engine.definition.NodeDefinition;
import io.yak.framework.workflow.engine.definition.NodeFailurePolicy;
import io.yak.framework.workflow.engine.definition.RetryPolicy;
import io.yak.framework.workflow.engine.definition.TriggerRule;
import io.yak.framework.workflow.engine.definition.WorkflowDefinition;
import io.yak.framework.workflow.engine.definition.WorkflowFailureStrategy;
import io.yak.framework.workflow.engine.execution.NodeExecution;
import io.yak.framework.workflow.engine.execution.WorkflowExecution;
import io.yak.framework.workflow.engine.spi.NodeDispatch;
import io.yak.ops.business.workflow.model.WorkflowInstanceVO;
import io.yak.ops.business.workflow.model.WorkflowInstanceVO.NodeInstanceVO;
import io.yak.ops.business.workflow.model.WorkflowRunRequest;
import io.yak.ops.business.workflow.model.WorkflowRunRequest.EdgeRequest;
import io.yak.ops.business.workflow.model.WorkflowRunRequest.NodeRequest;
import jakarta.annotation.PreDestroy;
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
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.LongSupplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Yak Framework 工作流引擎的轻量内存适配层。 */
@Service
public class WorkflowRuntimeService {

  private static final Logger log = LoggerFactory.getLogger(WorkflowRuntimeService.class);
  private static final String MOCK_SUCCESS = "SUCCESS";
  private static final String MOCK_FAILED = "FAILED";

  private final ExecutorService workerPool;
  private final DefaultWorkflowEngine engine;
  private final WorkflowEventStreamService eventStreamService;
  private final LongSupplier delayMillisSupplier;
  private final ConcurrentMap<String, ConcurrentLinkedQueue<NodeDispatch>> pendingDispatches =
      new ConcurrentHashMap<>();
  private final ConcurrentMap<String, Object> publishLocks = new ConcurrentHashMap<>();
  private final Set<String> activeExecutions = ConcurrentHashMap.newKeySet();
  private final Set<String> manualRetrySuccessNodes = ConcurrentHashMap.newKeySet();
  private final Map<String, RunMetadata> metadata = new ConcurrentHashMap<>();
  private final ConcurrentLinkedDeque<String> executionOrder = new ConcurrentLinkedDeque<>();

  @Autowired
  public WorkflowRuntimeService(WorkflowEventStreamService eventStreamService) {
    this(
        eventStreamService,
        () -> ThreadLocalRandom.current().nextLong(1_000L, 10_001L));
  }

  WorkflowRuntimeService(
      WorkflowEventStreamService eventStreamService,
      LongSupplier delayMillisSupplier) {
    this.eventStreamService = eventStreamService;
    this.delayMillisSupplier = delayMillisSupplier;
    AtomicInteger workerIndex = new AtomicInteger();
    this.workerPool = Executors.newFixedThreadPool(
        Math.max(2, Runtime.getRuntime().availableProcessors()),
        runnable -> {
          Thread thread = new Thread(runnable);
          thread.setName("yak-workflow-" + workerIndex.incrementAndGet());
          thread.setDaemon(true);
          return thread;
        });
    this.engine = DefaultWorkflowEngine.inMemory(this::enqueueDispatch);
  }

  public WorkflowInstanceVO run(WorkflowRunRequest request) {
    String definitionId = "workflow-" + UUID.randomUUID();
    List<NodeDefinition> nodes = request.nodes().stream()
        .map(this::toNodeDefinition)
        .toList();
    List<EdgeDefinition> edges = request.edges().stream()
        .map(this::toEdgeDefinition)
        .toList();

    WorkflowDefinition definition = new WorkflowDefinition(
        definitionId,
        request.name(),
        WorkflowFailureStrategy.CONTINUE_INDEPENDENT_BRANCHES,
        nodes,
        edges);
    engine.registerDefinition(definition);

    WorkflowExecution execution = engine.start(definitionId, request.input());
    RunMetadata runMetadata = new RunMetadata(
        request.name(),
        request.edges().size(),
        nodeMetadata(request.nodes()));
    metadata.put(execution.id(), runMetadata);
    executionOrder.addFirst(execution.id());

    WorkflowInstanceVO started = toView(execution, runMetadata);
    log.info(
        "[workflow] prepared execution={}, definition={}, name={}, nodes={}, edges={}",
        execution.id(),
        definitionId,
        request.name(),
        request.nodes().size(),
        request.edges().size());
    return started;
  }

  public WorkflowInstanceVO activate(String executionId) {
    activateExecution(executionId);
    return getInstance(executionId);
  }

  public WorkflowInstanceVO continueAfterFailure(String executionId, String nodeId) {
    RunMetadata runMetadata = requireMetadata(executionId);
    WorkflowExecution execution = engine.continueAfterFailure(executionId, nodeId);
    WorkflowInstanceVO snapshot = toView(execution, runMetadata);
    eventStreamService.publish(snapshot);
    reactivateExecution(executionId);
    log.info(
        "[workflow] manual continue execution={}, failedNode={}, status={}",
        executionId,
        nodeId,
        snapshot.status());
    return snapshot;
  }

  public WorkflowInstanceVO retryFailedNode(String executionId, String nodeId) {
    RunMetadata runMetadata = requireMetadata(executionId);
    String retryKey = retryKey(executionId, nodeId);
    manualRetrySuccessNodes.add(retryKey);
    try {
      WorkflowExecution execution = engine.retryFailedNode(executionId, nodeId);
      WorkflowInstanceVO snapshot = toView(execution, runMetadata);
      eventStreamService.publish(snapshot);
      reactivateExecution(executionId);
      log.info(
          "[workflow] manual retry execution={}, failedNode={}, status={}",
          executionId,
          nodeId,
          snapshot.status());
      return snapshot;
    } catch (RuntimeException exception) {
      manualRetrySuccessNodes.remove(retryKey);
      throw exception;
    }
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
    RunMetadata runMetadata = requireMetadata(executionId);
    WorkflowExecution execution = engine.findExecution(executionId)
        .orElseThrow(() -> new IllegalArgumentException("Workflow execution not found: " + executionId));
    return toView(execution, runMetadata);
  }

  public SseEmitter subscribe(String executionId) {
    WorkflowInstanceVO snapshot = getInstance(executionId);
    SseEmitter emitter = eventStreamService.subscribe(executionId, snapshot);

    // 先把 SSE 客户端挂上，再真正启动首批节点，避免前端错过 RUNNING 状态。
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

  private NodeDefinition toNodeDefinition(NodeRequest node) {
    return new NodeDefinition(
        node.id(),
        node.name(),
        TriggerRule.ALL_SUCCESS,
        RetryPolicy.none(),
        NodeFailurePolicy.FAIL_WORKFLOW,
        Map.of(
            "type", node.type(),
            "mockResult", node.mockResult()));
  }

  private EdgeDefinition toEdgeDefinition(EdgeRequest edge) {
    return new EdgeDefinition(edge.source(), edge.target());
  }

  private Map<String, NodeMetadata> nodeMetadata(List<NodeRequest> nodes) {
    Map<String, NodeMetadata> result = new LinkedHashMap<>();
    for (NodeRequest node : nodes) {
      result.put(node.id(), new NodeMetadata(node.name(), node.type()));
    }
    return Map.copyOf(result);
  }

  private void enqueueDispatch(NodeDispatch dispatch) {
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
    String type = String.valueOf(dispatch.nodeConfiguration().getOrDefault("type", "TASK"));
    String configuredMockResult = String.valueOf(
        dispatch.nodeConfiguration().getOrDefault("mockResult", MOCK_SUCCESS));
    boolean manualRetrySuccess = dispatch.attemptNumber() > 1
        && manualRetrySuccessNodes.remove(
            retryKey(dispatch.workflowExecutionId(), dispatch.nodeId()));
    String mockResult = manualRetrySuccess ? MOCK_SUCCESS : configuredMockResult;
    long simulatedDurationMillis = Math.max(0L, delayMillisSupplier.getAsLong());
    log.info(
        "[workflow] node start execution={}, node={}, type={}, attempt={}, mockResult={}, manualRetry={}, simulatedDurationMs={}",
        dispatch.workflowExecutionId(),
        dispatch.nodeId(),
        type,
        dispatch.attemptNumber(),
        mockResult,
        manualRetrySuccess,
        simulatedDurationMillis);
    try {
      engine.acknowledgeNodeStarted(dispatch.workflowExecutionId(), dispatch.nodeId());
      publishCurrent(dispatch.workflowExecutionId());

      Thread.sleep(simulatedDurationMillis);

      if (MOCK_FAILED.equalsIgnoreCase(mockResult)) {
        String errorMessage = "Simulated node failure";
        engine.failNode(
            dispatch.workflowExecutionId(),
            dispatch.nodeId(),
            errorMessage);
        publishCurrent(dispatch.workflowExecutionId());
        log.warn(
            "[workflow] node simulated failure execution={}, node={}, type={}, simulatedDurationMs={}",
            dispatch.workflowExecutionId(),
            dispatch.nodeId(),
            type,
            simulatedDurationMillis);
        return;
      }

      engine.completeNode(
          dispatch.workflowExecutionId(),
          dispatch.nodeId(),
          Map.of(
              "type", type,
              "message", manualRetrySuccess
                  ? "manually retried in memory"
                  : "executed in memory",
              "mockResult", MOCK_SUCCESS,
              "simulatedDurationMs", simulatedDurationMillis));
      publishCurrent(dispatch.workflowExecutionId());
      log.info(
          "[workflow] node success execution={}, node={}, type={}, manualRetry={}, simulatedDurationMs={}",
          dispatch.workflowExecutionId(),
          dispatch.nodeId(),
          type,
          manualRetrySuccess,
          simulatedDurationMillis);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      failNode(dispatch, "Node execution interrupted", exception);
    } catch (RuntimeException exception) {
      failNode(
          dispatch,
          exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage(),
          exception);
    } finally {
      drainDispatches(dispatch.workflowExecutionId());
    }
  }

  private void failNode(
      NodeDispatch dispatch,
      String errorMessage,
      Exception exception) {
    log.error(
        "[workflow] node failed execution={}, node={}, message={}",
        dispatch.workflowExecutionId(),
        dispatch.nodeId(),
        errorMessage,
        exception);
    try {
      engine.failNode(
          dispatch.workflowExecutionId(),
          dispatch.nodeId(),
          errorMessage);
      publishCurrent(dispatch.workflowExecutionId());
    } catch (RuntimeException callbackException) {
      log.warn(
          "[workflow] failure callback skipped execution={}, node={}, message={}",
          dispatch.workflowExecutionId(),
          dispatch.nodeId(),
          callbackException.getMessage());
    }
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
              activeExecutions.remove(executionId);
              pendingDispatches.remove(executionId);
              publishLocks.remove(executionId, publishLock);
            }
          });
    }
  }

  private boolean isTerminal(String status) {
    return "SUCCESS".equals(status)
        || "SUCCESS_WITH_WARNINGS".equals(status)
        || "FAILED".equals(status)
        || "WARNING".equals(status)
        || "CANCELED".equals(status);
  }

  private String retryKey(String executionId, String nodeId) {
    return executionId + "::" + nodeId;
  }

  private WorkflowInstanceVO toView(WorkflowExecution execution, RunMetadata runMetadata) {
    List<NodeInstanceVO> nodes = execution.nodes().values().stream()
        .map(node -> toNodeView(node, runMetadata.nodes().get(node.nodeId())))
        .toList();
    return new WorkflowInstanceVO(
        execution.id(),
        execution.definitionId(),
        runMetadata.name(),
        execution.status().name(),
        execution.createdAt(),
        execution.endedAt(),
        nodes.size(),
        runMetadata.edgeCount(),
        nodes);
  }

  private NodeInstanceVO toNodeView(NodeExecution node, NodeMetadata nodeMetadata) {
    String name = nodeMetadata == null ? node.nodeId() : nodeMetadata.name();
    String type = nodeMetadata == null ? "TASK" : nodeMetadata.type();
    return new NodeInstanceVO(
        node.nodeId(),
        name,
        type,
        node.status().name(),
        node.errorMessage());
  }

  @PreDestroy
  void shutdown() {
    workerPool.shutdownNow();
  }

  private record RunMetadata(
      String name,
      int edgeCount,
      Map<String, NodeMetadata> nodes) {}

  private record NodeMetadata(String name, String type) {}
}
