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

  private final WorkflowRuntimeService service = new WorkflowRuntimeService();

  @AfterEach
  void tearDown() {
    service.shutdown();
  }

  @Test
  void shouldExecuteSimpleDagInMemory() throws InterruptedException {
    WorkflowRunRequest request = new WorkflowRunRequest(
        "demo",
        List.of(
            new NodeRequest("extract", "Extract", "DATA"),
            new NodeRequest("check", "Check", "CHECK")),
        List.of(new EdgeRequest("extract", "check")),
        Map.of());

    WorkflowInstanceVO started = service.run(request);
    WorkflowInstanceVO completed = waitForTerminal(started.id());

    assertThat(completed.status()).isEqualTo("SUCCESS");
    assertThat(completed.nodes())
        .extracting(WorkflowInstanceVO.NodeInstanceVO::status)
        .containsOnly("SUCCESS");
  }

  private WorkflowInstanceVO waitForTerminal(String executionId)
      throws InterruptedException {
    for (int attempt = 0; attempt < 100; attempt++) {
      WorkflowInstanceVO current = service.getInstance(executionId);
      if (!"RUNNING".equals(current.status()) && !"CREATED".equals(current.status())) {
        return current;
      }
      Thread.sleep(20L);
    }
    return service.getInstance(executionId);
  }
}
