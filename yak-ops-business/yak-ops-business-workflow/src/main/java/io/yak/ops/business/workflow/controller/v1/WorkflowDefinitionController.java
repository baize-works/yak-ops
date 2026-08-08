package io.yak.ops.business.workflow.controller.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.yak.framework.common.Result;
import io.yak.ops.business.workflow.model.WorkflowDefinitionCreateRequest;
import io.yak.ops.business.workflow.model.WorkflowDefinitionUpdateRequest;
import io.yak.ops.business.workflow.model.WorkflowDefinitionVO;
import io.yak.ops.business.workflow.service.WorkflowDefinitionService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 工作流定义管理接口。 */
@Tag(name = "工作流定义接口")
@RestController
@RequestMapping("/api/v1/workflows/definitions")
public class WorkflowDefinitionController {

  private final WorkflowDefinitionService definitionService;

  public WorkflowDefinitionController(WorkflowDefinitionService definitionService) {
    this.definitionService = definitionService;
  }

  @Operation(summary = "查询工作流定义")
  @GetMapping
  public Result<List<WorkflowDefinitionVO>> list(
      @RequestParam(value = "keyword", required = false) String keyword,
      @RequestParam(value = "status", required = false) String status) {
    return Result.success(definitionService.list(keyword, status));
  }

  @Operation(summary = "创建工作流草稿")
  @PostMapping
  public Result<WorkflowDefinitionVO> create(
      @Valid @RequestBody WorkflowDefinitionCreateRequest request) {
    return Result.success(definitionService.create(request));
  }

  @Operation(summary = "查询工作流定义详情")
  @GetMapping("/{id}")
  public Result<WorkflowDefinitionVO> detail(@PathVariable("id") String id) {
    return Result.success(definitionService.get(id));
  }

  @Operation(summary = "保存工作流定义")
  @PutMapping("/{id}")
  public Result<WorkflowDefinitionVO> update(
      @PathVariable("id") String id,
      @Valid @RequestBody WorkflowDefinitionUpdateRequest request) {
    return Result.success(definitionService.update(id, request));
  }

  @Operation(summary = "删除工作流定义")
  @DeleteMapping("/{id}")
  public Result<Boolean> delete(@PathVariable("id") String id) {
    definitionService.delete(id);
    return Result.success(Boolean.TRUE);
  }

  @Operation(summary = "上线工作流定义")
  @PostMapping("/{id}/online")
  public Result<WorkflowDefinitionVO> online(@PathVariable("id") String id) {
    return Result.success(definitionService.online(id));
  }

  @Operation(summary = "下线工作流定义")
  @PostMapping("/{id}/offline")
  public Result<WorkflowDefinitionVO> offline(@PathVariable("id") String id) {
    return Result.success(definitionService.offline(id));
  }

  @Operation(summary = "执行已上线工作流")
  @PostMapping("/{id}/run")
  public Result<WorkflowDefinitionVO> run(@PathVariable("id") String id) {
    return Result.success(definitionService.run(id));
  }

  @Operation(summary = "暂停工作流最近一次执行")
  @PostMapping("/{id}/pause")
  public Result<WorkflowDefinitionVO> pause(@PathVariable("id") String id) {
    return Result.success(definitionService.pause(id));
  }

  @Operation(summary = "恢复工作流最近一次执行")
  @PostMapping("/{id}/resume")
  public Result<WorkflowDefinitionVO> resume(@PathVariable("id") String id) {
    return Result.success(definitionService.resume(id));
  }
}
