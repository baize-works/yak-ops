package io.yak.ops.business.workflow.web;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.framework.common.Result;
import io.yak.ops.business.workflow.model.WorkflowRecords.Attempt;
import io.yak.ops.business.workflow.model.WorkflowRecords.Instance;
import io.yak.ops.business.workflow.model.WorkflowRecords.TaskInstance;
import io.yak.ops.business.workflow.service.WorkflowExecutionService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Runtime control and inspection endpoints separated from definition CRUD. */
@ConditionalOnWorkflowEnabled
@RestController
@RequestMapping("/api/v1/workflow-instances")
public class WorkflowInstanceController {

  private final WorkflowExecutionService executions;

  public WorkflowInstanceController(WorkflowExecutionService executions) {
    this.executions = executions;
  }

  @GetMapping("/{instanceId}")
  public Result<Instance> get(@PathVariable long instanceId) {
    return Result.success(executions.get(instanceId));
  }

  @GetMapping("/{instanceId}/tasks")
  public Result<List<TaskInstance>> tasks(@PathVariable long instanceId) {
    return Result.success(executions.tasks(instanceId));
  }

  @PostMapping("/{instanceId}/stop")
  public Result<Boolean> stop(@PathVariable long instanceId) {
    executions.stop(instanceId);
    return Result.success(true);
  }

  @GetMapping("/tasks/{taskInstanceId}/attempts")
  public Result<List<Attempt>> attempts(@PathVariable long taskInstanceId) {
    return Result.success(executions.attempts(taskInstanceId));
  }

  @GetMapping("/tasks/{taskInstanceId}/logs")
  public Result<List<String>> logs(
      @PathVariable long taskInstanceId,
      @RequestParam(defaultValue = "2000") int limit) {
    return Result.success(executions.logs(taskInstanceId, limit));
  }
}
