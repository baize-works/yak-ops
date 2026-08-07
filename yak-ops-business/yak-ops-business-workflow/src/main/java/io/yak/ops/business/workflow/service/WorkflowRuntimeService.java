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
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.LongSupplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Yak Framework 工作流引擎的轻量内存适配层。 */
@Service
public class WorkflowRuntimeService {

  private static final Logger log = LoggerFactory.getLogger(WorkflowRuntimeService.class);

  private final ExecutorService workerPool;
  private final DefaultWorkflowEngine engine;
  private final WorkflowEventStreamService eventStreamService;
  private final LongSupplier delayMillisSupplier;
  private final ConcurrentLinkedQueue<NodeDispatch> pendingDispatches =
      new ConcurrentLinkedQueue<>();
  private final Map<String, RunMetadata> metadata = new ConcurrentHashMap<>();
  private final ConcurrentLinkedDeque<String> executionOrder = new ConcurrentLinkedDeque<>();

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
    this.engine = DefaultWorkflowEngine.inMemory(pendingDispatches::add);
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
    eventStreamService.publish(started);
    log.info(
        "[workflow] started execution={}, definition={}, name={}, nodes={}, edges={}",
        execution.id(),
        definitionId,
        request.name(),
        request.nodes().size(),
        request.edges().size());
    drainDispatches();
    return started;
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
    RunMetadata runMetadata = metadata.get(executionId);
    WorkflowExecution execution = engine.findExecution(executionId)
        .orElseThrow(() -> new IllegalArgumentException("Workflow execution not found: " + executionId));
    if (runMetadata == null) {
      throw new IllegalArgumentException("Workflow execution metadata not found: " + executionId);
    }
    return toView(execution, runMetadata);
  }

  public SseEmitter subscribe(String executionId) {
    return eventStreamService.subscribe(executionId, getInstance(executionId));
  }

  private NodeDefinition toNodeDefinition(NodeRequest node) {
    return new NodeDefinition(
        node.id(),
        node.name(),
        TriggerRule.ALL_SUCCESS,
        RetryPolicy.none(),
        NodeFailurePolicy.FAIL_WORKFLOW,
        Map.of("type", node.type()));
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

  private void drainDispatches() {
    NodeDispatch dispatch;
    while ((dispatch = pendingDispatches.poll()) != null) {
      NodeDispatch current = dispatch;
      workerPool.execute(() -> executeNode(current));
    }
  }

  private void executeNode(NodeDispatch dispatch) {
    String type = String.valueOf(dispatch.nodeConfiguration().getOrDefault("type", "TASK"));
    long simulatedDurationMillis = Math.max(0L, delayMillisSupplier.getAsLong());
    log.info(
        "[workflow] node start execution={}, node={}, type={}, attempt={}, simulatedDurationMs={}",
        dispatch.workflowExecutionId(),
        dispatch.nodeId(),
        type,
        dispatch.attemptNumber(),
        simulatedDurationMillis);
    try {
      engine.acknowledgeNodeStarted(dispatch.workflowExecutionId(), dispatch.nodeId());
      publishCurrent(dispatch.workflowExecutionId());

      Thread.sleep(simulatedDurationMillis);

      engine.completeNode(
          dispatch.workflowExecutionId(),
          dispatch.nodeId(),
          Map.of(
              "type", type,
              "message", "executed in memory",
              "simulatedDurationMs", simulatedDurationMillis));
      publishCurrent(dispatch.workflowExecutionId());
      log.info(
          "[workflow] node success execution={}, node={}, type={}, simulatedDurationMs={}",
          dispatch.workflowExecutionId(),
          dispatch.nodeId(),
          type,
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
      drainDispatches();
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
    RunMetadata runMetadata = metadata.get(executionId);
    if (runMetadata == null) {
      return;
    }
    engine.findExecution(executionId)
        .map(execution -> toView(execution, runMetadata))
        .ifPresent(eventStreamService::publish);
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
