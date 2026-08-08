package io.yak.ops.business.workflow.service;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.business.workflow.model.WorkflowInstanceVO;
import io.yak.ops.business.workflow.model.WorkflowRunRequest;
import io.yak.ops.business.workflow.model.WorkflowRunRequest.EdgeRequest;
import io.yak.ops.business.workflow.model.WorkflowRunRequest.NodeRequest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class WorkflowRuntimeServiceTest {

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

    assertThat(failed.status()).isEqualTo("FAILED");
    assertThat(statusOf(failed, "b")).isEqualTo("FAILED");
    assertThat(statusOf(failed, "c")).isEqualTo("UPSTREAM_FAILED");
    assertThat(statusOf(failed, "f")).isEqualTo("UPSTREAM_FAILED");

    WorkflowInstanceVO retried = service.retryFailedNode(started.id(), "b");
    assertThat(retried.status()).isEqualTo("RUNNING");
    assertThat(statusOf(retried, "b")).isEqualTo("SUBMITTED");
    assertThat(statusOf(retried, "c")).isEqualTo("WAITING");
    assertThat(statusOf(retried, "f")).isEqualTo("WAITING");

    WorkflowInstanceVO retryRunning = waitForNodeStatus(started.id(), "b", "RUNNING");
    assertThat(statusOf(retryRunning, "c")).isEqualTo("WAITING");

    WorkflowInstanceVO completed = waitForTerminal(started.id());
    assertThat(completed.status()).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "b")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "c")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "f")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "d")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "e")).isEqualTo("SUCCESS");
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

    assertThat(failed.status()).isEqualTo("FAILED");
    assertThat(statusOf(failed, "b")).isEqualTo("FAILED");
    assertThat(statusOf(failed, "c")).isEqualTo("UPSTREAM_FAILED");
    assertThat(statusOf(failed, "f")).isEqualTo("UPSTREAM_FAILED");

    WorkflowInstanceVO continued = service.continueAfterFailure(started.id(), "b");
    assertThat(continued.status()).isEqualTo("RUNNING");
    assertThat(statusOf(continued, "b")).isEqualTo("FAILED");
    assertThat(statusOf(continued, "c")).isEqualTo("SUBMITTED");
    assertThat(statusOf(continued, "f")).isEqualTo("WAITING");

    WorkflowInstanceVO completed = waitForTerminal(started.id());

    assertThat(completed.status()).isEqualTo("SUCCESS_WITH_WARNINGS");
    assertThat(statusOf(completed, "b")).isEqualTo("FAILED");
    assertThat(statusOf(completed, "c")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "f")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "d")).isEqualTo("SUCCESS");
    assertThat(statusOf(completed, "e")).isEqualTo("SUCCESS");
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
    for (int attempt = 0; attempt < 100; attempt++) {
      WorkflowInstanceVO current = service.getInstance(executionId);
      if (expectedStatus.equals(statusOf(current, nodeId))) {
        return current;
      }
      Thread.sleep(10L);
    }
    return service.getInstance(executionId);
  }

  private WorkflowInstanceVO waitForTerminal(String executionId)
      throws InterruptedException {
    for (int attempt = 0; attempt < 300; attempt++) {
      WorkflowInstanceVO current = service.getInstance(executionId);
      if (!"RUNNING".equals(current.status()) && !"CREATED".equals(current.status())) {
        return current;
      }
      Thread.sleep(10L);
    }
    return service.getInstance(executionId);
  }

  private String statusOf(WorkflowInstanceVO instance, String nodeId) {
    return instance.nodes().stream()
        .filter(node -> node.id().equals(nodeId))
        .findFirst()
        .orElseThrow()
        .status();
  }
}
