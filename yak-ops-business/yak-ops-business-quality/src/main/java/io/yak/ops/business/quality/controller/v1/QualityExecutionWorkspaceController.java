package io.yak.ops.business.quality.controller.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.yak.framework.common.Result;
import io.yak.framework.security.web.RequiresPermission;
import io.yak.ops.business.quality.QualityPermissionCode;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.ExecutionLogView;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.ExecutionPageRequest;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.ExecutionPageView;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.ExecutionView;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.RuleExecutionPageView;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.service.QualityExecutionWorkspaceService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "数据质量执行工作台")
@RestController
@ConditionalOnQualityEnabled
@RequestMapping("/api/v1/data-quality/execution/workspace")
@RequiresPermission(QualityPermissionCode.EXECUTION_READ)
public class QualityExecutionWorkspaceController {

  private final QualityExecutionWorkspaceService service;

  public QualityExecutionWorkspaceController(QualityExecutionWorkspaceService service) {
    this.service = service;
  }

  @Operation(summary = "分页查询监控执行记录")
  @PostMapping("/page")
  public Result<ExecutionPageView> page(
      @Valid @RequestBody(required = false) ExecutionPageRequest request) {
    return Result.success(service.page(request));
  }

  @Operation(summary = "分页查询规则执行记录")
  @PostMapping("/rule/page")
  public Result<RuleExecutionPageView> pageRules(
      @Valid @RequestBody(required = false) ExecutionPageRequest request) {
    return Result.success(service.pageRules(request));
  }

  @Operation(summary = "查询执行工作台详情")
  @GetMapping("/{executionNo}")
  public Result<ExecutionView> detail(@PathVariable String executionNo) {
    return Result.success(service.get(executionNo));
  }

  @Operation(summary = "查询执行结构化日志")
  @GetMapping("/{executionNo}/logs")
  public Result<ExecutionLogView> logs(@PathVariable String executionNo) {
    return Result.success(service.logs(executionNo));
  }
}
