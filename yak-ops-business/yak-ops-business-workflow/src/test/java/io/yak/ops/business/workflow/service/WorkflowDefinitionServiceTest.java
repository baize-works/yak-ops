package io.yak.ops.business.workflow.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.yak.ops.business.job.task.TaskDefinition;
import io.yak.ops.business.job.task.TaskRegistry;
import io.yak.ops.business.workflow.model.WorkflowDefinitionCreateRequest;
import io.yak.ops.business.workflow.model.WorkflowDefinitionUpdateRequest;
import io.yak.ops.business.workflow.model.WorkflowDefinitionUpdateRequest.EdgeRequest;
import io.yak.ops.business.workflow.model.WorkflowDefinitionUpdateRequest.NodeRequest;
import io.yak.ops.business.workflow.model.WorkflowDefinitionVO;
import io.yak.ops.business.workflow.model.WorkflowInstanceVO;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WorkflowDefinitionServiceTest {

  @Mock private WorkflowRuntimeService runtimeService;
  @Mock private TaskRegistry taskRegistry;

  private WorkflowDefinitionService service;

  @BeforeEach
  void setUp() {
    service = new WorkflowDefinitionService(runtimeService, taskRegistry);
  }

  @Test
  void shouldCreateConfigureOnlineRunPauseAndResumeDefinition() {
    WorkflowDefinitionVO created = service.create(
        new WorkflowDefinitionCreateRequest("订单同步工作流", "测试定义"));

    assertThat(created.status()).isEqualTo("DRAFT");
    assertThat(created.nodeCount()).isZero();

    NodeRequest first = node("node-a", "sync-1", 120D, 80D);
    NodeRequest second = node("node-b", "sync-2", 380D, 80D);
    WorkflowDefinitionVO configured = service.update(
        created.id(),
        new WorkflowDefinitionUpdateRequest(
            "订单同步工作流",
            "测试定义",
            List.of(first, second),
            List.of(new EdgeRequest("node-a", "node-b")),
            Map.of("bizDate", "2026-08-08"),
            600L,
            "CONTINUE_INDEPENDENT_BRANCHES"));

    assertThat(configured.nodeCount()).isEqualTo(2);
    assertThat(configured.edges()).hasSize(1);
    assertThat(configured.nodes().get(0).positionX()).isEqualTo(120D);

    when(taskRegistry.get("sync-1"))
        .thenReturn(new TaskDefinition("sync-1", "同步订单", "SYNC"));
    when(taskRegistry.get("sync-2"))
        .thenReturn(new TaskDefinition("sync-2", "同步明细", "SYNC"));

    WorkflowDefinitionVO online = service.online(created.id());
    assertThat(online.status()).isEqualTo("ONLINE");
    assertThatThrownBy(() -> service.update(created.id(), new WorkflowDefinitionUpdateRequest(
        "不能直接改", null, List.of(first), List.of(), Map.of(), 0L,
        "CONTINUE_INDEPENDENT_BRANCHES")))
        .isInstanceOf(IllegalStateException.class);

    WorkflowInstanceVO prepared = instance("exec-1", "CREATED");
    WorkflowInstanceVO running = instance("exec-1", "RUNNING");
    WorkflowInstanceVO paused = instance("exec-1", "PAUSED");
    when(runtimeService.run(any())).thenReturn(prepared);
    when(runtimeService.activate("exec-1")).thenReturn(running);
    when(runtimeService.getInstance("exec-1"))
        .thenReturn(running, running, paused, paused, running);
    when(runtimeService.pause("exec-1")).thenReturn(paused);
    when(runtimeService.resume("exec-1")).thenReturn(running);

    WorkflowDefinitionVO executed = service.run(created.id());
    assertThat(executed.latestExecutionId()).isEqualTo("exec-1");
    assertThat(executed.latestExecutionStatus()).isEqualTo("RUNNING");

    WorkflowDefinitionVO pausedDefinition = service.pause(created.id());
    assertThat(pausedDefinition.latestExecutionStatus()).isEqualTo("PAUSED");

    WorkflowDefinitionVO resumedDefinition = service.resume(created.id());
    assertThat(resumedDefinition.latestExecutionStatus()).isEqualTo("RUNNING");

    verify(runtimeService).run(any());
    verify(runtimeService).pause("exec-1");
    verify(runtimeService).resume("exec-1");
  }

  @Test
  void shouldRejectCycleWhenGoingOnline() {
    WorkflowDefinitionVO created = service.create(
        new WorkflowDefinitionCreateRequest("循环工作流", null));
    service.update(
        created.id(),
        new WorkflowDefinitionUpdateRequest(
            "循环工作流",
            null,
            List.of(node("a", "sync-1", 0D, 0D), node("b", "sync-2", 0D, 0D)),
            List.of(new EdgeRequest("a", "b"), new EdgeRequest("b", "a")),
            Map.of(),
            0L,
            "CONTINUE_INDEPENDENT_BRANCHES"));
    when(taskRegistry.get("sync-1"))
        .thenReturn(new TaskDefinition("sync-1", "同步 1", "SYNC"));
    when(taskRegistry.get("sync-2"))
        .thenReturn(new TaskDefinition("sync-2", "同步 2", "SYNC"));

    assertThatThrownBy(() -> service.online(created.id()))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("循环依赖");
  }

  private NodeRequest node(String id, String taskId, double x, double y) {
    return new NodeRequest(
        id,
        taskId,
        x,
        y,
        1,
        0L,
        0L,
        0L,
        Map.of(),
        "ALL_SUCCESS",
        "FAIL_WORKFLOW");
  }

  private WorkflowInstanceVO instance(String id, String status) {
    return new WorkflowInstanceVO(
        id,
        "runtime-definition",
        null,
        "订单同步工作流",
        status,
        "CONTINUE_INDEPENDENT_BRANCHES",
        Instant.now(),
        null,
        null,
        0L,
        Map.of(),
        2,
        1,
        List.of());
  }
}
