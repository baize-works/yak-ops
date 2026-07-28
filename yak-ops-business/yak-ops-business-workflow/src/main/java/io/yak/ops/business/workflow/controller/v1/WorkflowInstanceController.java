package io.yak.ops.business.workflow.controller.v1;

import io.yak.framework.common.Result;
import io.yak.ops.business.workflow.common.vo.workflow.WorkflowInstanceDetailVO;
import io.yak.ops.business.workflow.common.vo.workflow.WorkflowTaskAttemptVO;
import io.yak.ops.business.workflow.common.vo.workflow.WorkflowTaskInstanceVO;
import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.service.WorkflowExecutionService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 工作流实例运行控制与详情接口。 */
@ConditionalOnWorkflowEnabled
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/workflow-instances")
public class WorkflowInstanceController {

  private final WorkflowExecutionService executionService;

  @GetMapping("/{instanceId}")
  public Result<WorkflowInstanceDetailVO> getWorkflowInstance(
      @PathVariable Long instanceId) {
    return Result.success(executionService.getWorkflowInstance(instanceId));
  }

  @GetMapping("/{instanceId}/tasks")
  public Result<List<WorkflowTaskInstanceVO>> getTaskList(
      @PathVariable Long instanceId) {
    return Result.success(executionService.getTaskList(instanceId));
  }

  @PostMapping("/{instanceId}/stop")
  public Result<Boolean> stopWorkflow(@PathVariable Long instanceId) {
    executionService.stopWorkflow(instanceId);
    return Result.success(true);
  }

  @GetMapping("/tasks/{taskInstanceId}/attempts")
  public Result<List<WorkflowTaskAttemptVO>> getAttemptList(
      @PathVariable Long taskInstanceId) {
    return Result.success(executionService.getAttemptList(taskInstanceId));
  }

  @GetMapping("/tasks/{taskInstanceId}/logs")
  public Result<List<String>> getLogList(
      @PathVariable Long taskInstanceId,
      @RequestParam(defaultValue = "2000") int limit) {
    return Result.success(executionService.getLogList(taskInstanceId, limit));
  }
}
