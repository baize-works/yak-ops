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

  private WorkflowRunRequest simpleSerialWorkflow() {
    return new WorkflowRunRequest(
        "demo",
        List.of(
            new NodeRequest("extract", "Extract", "DATA"),
            new NodeRequest("check", "Check", "CHECK")),
        List.of(new EdgeRequest("extract", "check")),
        Map.of());
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
    for (int attempt = 0; attempt < 200; attempt++) {
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
