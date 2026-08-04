package io.yak.ops.business.quality.controller.v1;

import io.yak.framework.common.Result;
import io.yak.framework.security.web.RequiresPermission;
import io.yak.ops.business.quality.api.QualityExecutionApi.ExecutionPageRequest;
import io.yak.ops.business.quality.api.QualityExecutionApi.ExecutionPageView;
import io.yak.ops.business.quality.api.QualityExecutionApi.ExecutionView;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.service.QualityExecutionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@ConditionalOnQualityEnabled
@RestController
@RequestMapping("/api/v1/data-quality/execution")
@RequiresPermission("quality:report:read")
public class QualityExecutionController {

  private final QualityExecutionService service;

  public QualityExecutionController(QualityExecutionService service) {
    this.service = service;
  }

  @PostMapping("/page")
  public Result<ExecutionPageView> page(
      @Valid @RequestBody ExecutionPageRequest request) {
    return Result.success(service.page(request));
  }

  @GetMapping("/{executionNo}")
  public Result<ExecutionView> detail(@PathVariable String executionNo) {
    return Result.success(service.get(executionNo));
  }
}
