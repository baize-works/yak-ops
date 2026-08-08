package io.yak.ops.business.job.controller.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.yak.framework.common.Result;
import io.yak.ops.business.job.task.TaskDefinition;
import io.yak.ops.business.job.task.TaskRegistry;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 工作流可引用任务查询接口。 */
@Tag(name = "任务接口")
@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

  private final TaskRegistry taskRegistry;

  public TaskController(TaskRegistry taskRegistry) {
    this.taskRegistry = taskRegistry;
  }

  @Operation(summary = "查询工作流可引用任务")
  @GetMapping
  public Result<List<TaskDefinition>> tasks() {
    return Result.success(taskRegistry.list());
  }
}
