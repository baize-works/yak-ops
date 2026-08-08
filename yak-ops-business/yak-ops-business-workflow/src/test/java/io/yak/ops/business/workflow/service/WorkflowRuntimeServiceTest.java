package io.yak.ops.business.workflow.service;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.business.workflow.model.WorkflowInstanceVO;
import io.yak.ops.business.workflow.model.WorkflowInstanceVO.NodeInstanceVO;
import io.yak.ops.business.workflow.model.WorkflowRunRequest;
import io.yak.ops.business.workflow.model.WorkflowRunRequest.EdgeRequest;
import io.yak.ops.business.workflow.model.WorkflowRunRequest.NodeRequest;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class WorkflowRuntimeServiceTest {

  private static final Set<String> TERMINAL_STATUSES = Set.of(
      "SUCCESS", "SUCCESS_WITH_WARNINGS", "FAILED", "CANCELED", "TIMED_OUT");

  private WorkflowRuntimeService service;

  @AfterEach
  void tearDown() {
    if (service != null) {
      service.shutdown();
    }
  }

  @Test
  void shouldExecuteSimpleDagInMemory() throws InterruptedException {
    service = new WorkflowRuntimeService(
        new WorkflowEventStreamService(),
        () -> 5L);

    WorkflowRunRequest request = simpleSerialWorkflow();

    WorkflowInstanceVO started = service.run(request);
    assertThat(statusOf(started, "extract")).isEqualTo("SUBMITTED");
    assertThat(statusOf(started, "check")).isEqualTo("WAITING");

    service.activate(started.id());
    WorkflowInstanceVO completed = waitForTerminal(started.id());

    assertThat(completed.status()).isEqualTo("SUCCESS");
    assertThat(completed.nodes())
        .extracting(WorkflowInstanceVO.NodeInstanceVO::status)
        .containsOnly("SUCCESS");
    assertThat(nodeOf(completed, "extract").attemptCount()).isEqualTo(1);
    assertThat(nodeOf(completed, "extract").currentAttemptId()).isNotBlank();
  }

  @Test
  void shouldExposeRunningThenSuccessBeforeStartingNextNode()
      throws InterruptedException {
    service = new WorkflowRuntimeService(
        new WorkflowEventStreamService(),
        () -> 120L);

    WorkflowInstanceVO started = service.run(simpleSerialWorkflow());
    service.activate(started.id());

    WorkflowInstanceVO firstRunning = waitForNodeStatus(started.id(), "extract", "RUNNING");
    assertThat(statusOf(firstRunning, "check")).isEqualTo("WAITING");

    WorkflowInstanceVO secondRunning = waitForNodeStatus(started.id(), "check", "RUNNING");
    assertThat(statusOf(secondRunning, "extract")).isEqualTo("SUCCESS");

    WorkflowInstanceVO completed = waitForTerminal(started.id());
    assertThat(completed.status()).isEqualTo("SUCCESS");
  }

  @Test
  void shouldBlockFailedBranchAndContinueIndependentBranch()
      throws InterruptedException {
    service = new WorkflowRuntimeService(
        new WorkflowEventStreamService(),
        () -> 20L);

    WorkflowRunRequest request = failureBranchWorkflow();

    WorkflowInstanceVO started = service.run(request);
    service.activate(started.id());
    WorkflowInstanceVO completed = waitForTerminal(started.id());

    assertThat(completed.status()).isEqualTo("FAILED");
    assertThat(statusOf(completed, "a")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "b")).isEqualTo("FAILED");
    assertThat(statusOf(completed, "c")).isEqualTo("UPSTREAM_FAILED");
    assertThat(statusOf(completed, "f")).isEqualTo("UPSTREAM_FAILED");
    assertThat(statusOf(completed, "d")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "e")).isEqualTo("SUCCESS");
    assertThat(nodeOf(completed, "b").failureReason()).isEqualTo("EXECUTOR_FAILURE");
  }

  @Test
  void shouldRetryCurrentFailedNodeThenContinueItsDescendants()
      throws InterruptedException {
    service = new WorkflowRuntimeService(
        new WorkflowEventStreamService(),
        () -> 40L);

    WorkflowInstanceVO started = service.run(failureBranchWorkflow());
    service.activate(started.id());
    WorkflowInstanceVO failed = waitForTerminal(started.id());

    String firstAttemptId = nodeOf(failed, "b").currentAttemptId();
    WorkflowInstanceVO retried = service.retryFailedNode(started.id(), "b");
    assertThat(retried.status()).isEqualTo("RUNNING");
    assertThat(statusOf(retried, "b")).isEqualTo("SUBMITTED");
    assertThat(statusOf(retried, "c")).isEqualTo("WAITING");

    WorkflowInstanceVO completed = waitForTerminal(started.id());
    assertThat(completed.status()).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "b")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "c")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "f")).isEqualTo("SUCCESS");
    assertThat(nodeOf(completed, "b").attemptCount()).isEqualTo(2);
    assertThat(nodeOf(completed, "b").currentAttemptId()).isNotEqualTo(firstAttemptId);
  }

  @Test
  void shouldContinueBlockedDescendantsWithoutRetryingFailedNode()
      throws InterruptedException {
    service = new WorkflowRuntimeService(
        new WorkflowEventStreamService(),
        () -> 20L);

    WorkflowInstanceVO started = service.run(failureBranchWorkflow());
    service.activate(started.id());
    WorkflowInstanceVO failed = waitForTerminal(started.id());
    String failedAttemptId = nodeOf(failed, "b").currentAttemptId();

    WorkflowInstanceVO continued = service.continueAfterFailure(started.id(), "b");
    assertThat(continued.status()).isEqualTo("RUNNING");
    assertThat(statusOf(continued, "b")).isEqualTo("FAILED");
    assertThat(nodeOf(continued, "b").continuedAfterFailure()).isTrue();
    assertThat(statusOf(continued, "c")).isEqualTo("SUBMITTED");

    WorkflowInstanceVO completed = waitForTerminal(started.id());
    assertThat(completed.status()).isEqualTo("SUCCESS_WITH_WARNINGS");
    assertThat(statusOf(completed, "b")).isEqualTo("FAILED");
    assertThat(nodeOf(completed, "b").currentAttemptId()).isEqualTo(failedAttemptId);
    assertThat(nodeOf(completed, "b").attemptCount()).isEqualTo(1);
    assertThat(statusOf(completed, "c")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "f")).isEqualTo("SUCCESS");
  }

  @Test
  void shouldBlockJoinWhenOneRequiredPredecessorFails()
      throws InterruptedException {
    service = new WorkflowRuntimeService(
        new WorkflowEventStreamService(),
        () -> 20L);

    WorkflowRunRequest request = new WorkflowRunRequest(
        "failed-join-demo",
        List.of(
            successNode("a"),
            failedNode("b"),
            successNode("d"),
            successNode("e"),
            successNode("join")),
        List.of(
            new EdgeRequest("a", "b"),
            new EdgeRequest("a", "d"),
            new EdgeRequest("d", "e"),
            new EdgeRequest("b", "join"),
            new EdgeRequest("e", "join")),
        Map.of());

    WorkflowInstanceVO started = service.run(request);
    service.activate(started.id());
    WorkflowInstanceVO completed = waitForTerminal(started.id());

    assertThat(completed.status()).isEqualTo("FAILED");
    assertThat(statusOf(completed, "b")).isEqualTo("FAILED");
    assertThat(statusOf(completed, "d")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "e")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "join")).isEqualTo("UPSTREAM_FAILED");
  }

  @Test
  void shouldPauseAndResumeTheSameAttempt() throws InterruptedException {
    service = new WorkflowRuntimeService(
        new WorkflowEventStreamService(),
        () -> 600L);

    WorkflowInstanceVO started = service.run(new WorkflowRunRequest(
        "pause-demo",
        List.of(successNode("a")),
        List.of(),
        Map.of()));
    service.activate(started.id());

    WorkflowInstanceVO running = waitForNodeStatus(started.id(), "a", "RUNNING");
    String attemptId = nodeOf(running, "a").currentAttemptId();

    service.pause(started.id());
    WorkflowInstanceVO paused = waitForWorkflowStatus(started.id(), "PAUSED");
    assertThat(statusOf(paused, "a")).isEqualTo("PAUSED");
    assertThat(nodeOf(paused, "a").currentAttemptId()).isEqualTo(attemptId);
    assertThat(nodeOf(paused, "a").attemptCount()).isEqualTo(1);

    Thread.sleep(120L);
    assertThat(service.getInstance(started.id()).status()).isEqualTo("PAUSED");

    service.resume(started.id());
    WorkflowInstanceVO resumed = waitForNodeStatus(started.id(), "a", "RUNNING");
    assertThat(nodeOf(resumed, "a").currentAttemptId()).isEqualTo(attemptId);
    assertThat(nodeOf(resumed, "a").attemptCount()).isEqualTo(1);

    assertThat(waitForTerminal(started.id()).status()).isEqualTo("SUCCESS");
  }

  @Test
  void shouldTriggerWorkflowTimeoutFromRuntimeScanner() throws InterruptedException {
    service = new WorkflowRuntimeService(
        new WorkflowEventStreamService(),
        () -> 2_000L);

    WorkflowInstanceVO started = service.run(new WorkflowRunRequest(
        "timeout-demo",
        List.of(successNode("a")),
        List.of(),
        Map.of(),
        1L));
    service.activate(started.id());

    WorkflowInstanceVO timedOut = waitForTerminal(started.id());
    assertThat(timedOut.status()).isEqualTo("TIMED_OUT");
    assertThat(timedOut.workflowTimeoutSeconds()).isEqualTo(1L);
    assertThat(statusOf(timedOut, "a")).isEqualTo("CANCELED");
    assertThat(nodeOf(timedOut, "a").attempts()).hasSize(1);
    assertThat(nodeOf(timedOut, "a").attempts().get(0).status()).isEqualTo("CANCELED");
  }

  @Test
  void shouldExposeAutomaticRetryAttemptHistory() throws InterruptedException {
    service = new WorkflowRuntimeService(
        new WorkflowEventStreamService(),
        () -> 10L);

    NodeRequest retryingFailure = new NodeRequest(
        "a",
        "A",
        "TASK",
        "FAILED",
        2,
        0L,
        0L,
        0L,
        Map.of());
    WorkflowInstanceVO started = service.run(new WorkflowRunRequest(
        "retry-demo",
        List.of(retryingFailure),
        List.of(),
        Map.of()));
    service.activate(started.id());

    WorkflowInstanceVO failed = waitForTerminal(started.id());
    NodeInstanceVO node = nodeOf(failed, "a");
    assertThat(failed.status()).isEqualTo("FAILED");
    assertThat(node.attemptCount()).isEqualTo(2);
    assertThat(node.attempts())
        .extracting(WorkflowInstanceVO.AttemptVO::status)
        .containsExactly("FAILED", "FAILED");
    assertThat(node.attempts())
        .extracting(WorkflowInstanceVO.AttemptVO::failureReason)
        .containsOnly("EXECUTOR_FAILURE");
  }

  @Test
  void shouldPropagateWorkflowInputAndPredecessorOutputToNodeInput()
      throws InterruptedException {
    service = new WorkflowRuntimeService(
        new WorkflowEventStreamService(),
        () -> 10L);

    NodeRequest first = new NodeRequest(
        "load",
        "Load",
        "DATA",
        "SUCCESS",
        1,
        0L,
        0L,
        0L,
        Map.of("requestId", "$workflow.requestId"));
    NodeRequest second = new NodeRequest(
        "consume",
        "Consume",
        "TASK",
        "SUCCESS",
        1,
        0L,
        0L,
        0L,
        Map.of("requestId", "load.receivedInput.requestId"));

    WorkflowInstanceVO started = service.run(new WorkflowRunRequest(
        "context-demo",
        List.of(first, second),
        List.of(new EdgeRequest("load", "consume")),
        Map.of("requestId", "REQ-001")));
    service.activate(started.id());

    WorkflowInstanceVO completed = waitForTerminal(started.id());
    NodeInstanceVO load = nodeOf(completed, "load");
    NodeInstanceVO consume = nodeOf(completed, "consume");

    assertThat(completed.status()).isEqualTo("SUCCESS");
    assertThat(load.input()).containsEntry("requestId", "REQ-001");
    assertThat(consume.input()).containsEntry("requestId", "REQ-001");
    assertThat(consume.predecessorOutputs()).containsKey("load");
    assertThat(consume.output()).containsKey("receivedInput");
  }

  private WorkflowRunRequest simpleSerialWorkflow() {
    return new WorkflowRunRequest(
        "demo",
        List.of(
            new NodeRequest("extract", "Extract", "DATA"),
            new NodeRequest("check", "Check", "CHECK")),
        List.of(new EdgeRequest("extract", "check")),
        Map.of());
  }

  private WorkflowRunRequest failureBranchWorkflow() {
    return new WorkflowRunRequest(
        "failure-branch-demo",
        List.of(
            successNode("a"),
            failedNode("b"),
            successNode("c"),
            successNode("d"),
            successNode("e"),
            successNode("f")),
        List.of(
            new EdgeRequest("a", "b"),
            new EdgeRequest("b", "c"),
            new EdgeRequest("c", "f"),
            new EdgeRequest("a", "d"),
            new EdgeRequest("d", "e")),
        Map.of());
  }

  private NodeRequest successNode(String id) {
    return new NodeRequest(id, id.toUpperCase(), "TASK", "SUCCESS");
  }

  private NodeRequest failedNode(String id) {
    return new NodeRequest(id, id.toUpperCase(), "TASK", "FAILED");
  }

  private WorkflowInstanceVO waitForNodeStatus(
      String executionId,
      String nodeId,
      String expectedStatus) throws InterruptedException {
    for (int attempt = 0; attempt < 300; attempt++) {
      WorkflowInstanceVO current = service.getInstance(executionId);
      if (expectedStatus.equals(statusOf(current, nodeId))) {
        return current;
      }
      Thread.sleep(10L);
    }
    return service.getInstance(executionId);
  }

  private WorkflowInstanceVO waitForWorkflowStatus(
      String executionId,
      String expectedStatus) throws InterruptedException {
    for (int attempt = 0; attempt < 300; attempt++) {
      WorkflowInstanceVO current = service.getInstance(executionId);
      if (expectedStatus.equals(current.status())) {
        return current;
      }
      Thread.sleep(10L);
    }
    return service.getInstance(executionId);
  }

  private WorkflowInstanceVO waitForTerminal(String executionId)
      throws InterruptedException {
    for (int attempt = 0; attempt < 500; attempt++) {
      WorkflowInstanceVO current = service.getInstance(executionId);
      if (TERMINAL_STATUSES.contains(current.status())) {
        return current;
      }
      Thread.sleep(10L);
    }
    return service.getInstance(executionId);
  }

  private NodeInstanceVO nodeOf(WorkflowInstanceVO instance, String nodeId) {
    return instance.nodes().stream()
        .filter(node -> node.id().equals(nodeId))
        .findFirst()
        .orElseThrow();
  }

  private String statusOf(WorkflowInstanceVO instance, String nodeId) {
    return nodeOf(instance, nodeId).status();
  }
}
