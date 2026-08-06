package io.yak.ops.business.quality.controller.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.yak.framework.common.Result;
import io.yak.framework.security.web.RequiresPermission;
import io.yak.ops.business.quality.QualityPermissionCode;
import io.yak.ops.business.quality.api.QualityApi.ExecutionPageRequest;
import io.yak.ops.business.quality.api.QualityApi.ExecutionPageView;
import io.yak.ops.business.quality.api.QualityApi.ExecutionView;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.service.QualityExecutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "数据质量执行记录")
@RestController
@ConditionalOnQualityEnabled
@RequiredArgsConstructor
@RequestMapping("/api/v1/data-quality/execution")
@RequiresPermission(QualityPermissionCode.EXECUTION_READ)
public class QualityExecutionController {

  private final QualityExecutionService service;

  @Operation(summary = "分页查询执行记录")
  @PostMapping("/page")
  public Result<ExecutionPageView> page(
      @Valid @RequestBody(required = false) ExecutionPageRequest request) {
    return Result.success(service.page(request));
  }

  @Operation(summary = "查询执行详情")
  @GetMapping("/{executionNo}")
  public Result<ExecutionView> detail(@PathVariable String executionNo) {
    return Result.success(service.get(executionNo));
  }
}
