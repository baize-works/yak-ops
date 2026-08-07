package io.yak.ops.business.workflow.controller.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.yak.framework.common.Result;
import io.yak.ops.business.workflow.model.WorkflowInstanceVO;
import io.yak.ops.business.workflow.model.WorkflowRunRequest;
import io.yak.ops.business.workflow.service.WorkflowRuntimeService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** 工作流内存运行接口。 */
@Tag(name = "工作流接口")
@RestController
@RequestMapping("/api/v1/workflows")
public class WorkflowController {

  private final WorkflowRuntimeService workflowRuntimeService;

  public WorkflowController(WorkflowRuntimeService workflowRuntimeService) {
    this.workflowRuntimeService = workflowRuntimeService;
  }

  @Operation(summary = "创建工作流运行实例")
  @PostMapping("/run")
  public Result<WorkflowInstanceVO> run(
      @Valid @RequestBody WorkflowRunRequest request) {
    return Result.success(workflowRuntimeService.run(request));
  }

  @Operation(summary = "激活工作流运行实例")
  @PostMapping("/instances/{executionId}/activate")
  public Result<WorkflowInstanceVO> activate(
      @PathVariable("executionId") String executionId) {
    return Result.success(workflowRuntimeService.activate(executionId));
  }

  @Operation(summary = "人工放行失败节点并继续执行后续节点")
  @PostMapping("/instances/{executionId}/nodes/{nodeId}/continue")
  public Result<WorkflowInstanceVO> continueAfterFailure(
      @PathVariable("executionId") String executionId,
      @PathVariable("nodeId") String nodeId) {
    return Result.success(workflowRuntimeService.continueAfterFailure(executionId, nodeId));
  }

  @Operation(summary = "查询工作流实例")
  @GetMapping("/instances")
  public Result<List<WorkflowInstanceVO>> instances() {
    return Result.success(workflowRuntimeService.listInstances());
  }

  @Operation(summary = "查询工作流实例详情")
  @GetMapping("/instances/{executionId}")
  public Result<WorkflowInstanceVO> instance(
      @PathVariable("executionId") String executionId) {
    return Result.success(workflowRuntimeService.getInstance(executionId));
  }

  @Operation(summary = "订阅工作流实例实时状态")
  @GetMapping(
      value = "/instances/{executionId}/events",
      produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter events(
      @PathVariable("executionId") String executionId) {
    return workflowRuntimeService.subscribe(executionId);
  }
}
