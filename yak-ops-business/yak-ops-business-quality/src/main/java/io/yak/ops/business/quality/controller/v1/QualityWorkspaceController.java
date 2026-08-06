package io.yak.ops.business.quality.controller.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.yak.framework.common.Result;
import io.yak.framework.security.web.RequiresPermission;
import io.yak.ops.business.quality.QualityPermissionCode;
import io.yak.ops.business.quality.api.QualityWorkspaceApi.MonitorReportView;
import io.yak.ops.business.quality.api.QualityWorkspaceApi.MonitorWorkspaceView;
import io.yak.ops.business.quality.api.QualityWorkspaceApi.OperationLogPageView;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.service.QualityWorkspaceService;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "数据质量监控工作台")
@RestController
@ConditionalOnQualityEnabled
@RequestMapping("/api/v1/data-quality/monitor")
@RequiresPermission(QualityPermissionCode.MONITOR_READ)
public class QualityWorkspaceController {

  private final QualityWorkspaceService service;

  public QualityWorkspaceController(QualityWorkspaceService service) {
    this.service = service;
  }

  @Operation(summary = "查询质量监控工作台")
  @GetMapping("/{id}/workspace")
  public Result<MonitorWorkspaceView> workspace(@PathVariable long id) {
    return Result.success(service.workspace(id));
  }

  @Operation(summary = "查询质量监控报告")
  @GetMapping("/{id}/report")
  public Result<MonitorReportView> report(
      @PathVariable long id,
      @RequestParam(value = "date", required = false)
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
    return Result.success(service.report(id, date));
  }

  @Operation(summary = "查询质量监控操作日志")
  @GetMapping("/{id}/operation-log")
  public Result<OperationLogPageView> operationLog(
      @PathVariable long id,
      @RequestParam(value = "current", required = false) Integer current,
      @RequestParam(value = "pageSize", required = false) Integer pageSize) {
    return Result.success(service.operationLogs(id, current, pageSize));
  }
}
