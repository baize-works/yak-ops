package io.yak.ops.business.quality.controller.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.yak.framework.common.Result;
import io.yak.framework.security.web.RequiresPermission;
import io.yak.ops.business.quality.QualityPermissionCode;
import io.yak.ops.business.quality.api.QualityApi.MonitorPageRequest;
import io.yak.ops.business.quality.api.QualityApi.MonitorPageView;
import io.yak.ops.business.quality.api.QualityApi.MonitorSettingsView;
import io.yak.ops.business.quality.api.QualityApi.MonitorView;
import io.yak.ops.business.quality.api.QualityApi.RunView;
import io.yak.ops.business.quality.api.QualityApi.SaveMonitorRequest;
import io.yak.ops.business.quality.api.QualityApi.TableMonitorSummary;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.service.QualityMonitorService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "数据质量监控")
@RestController
@ConditionalOnQualityEnabled
@RequiredArgsConstructor
@RequestMapping("/api/v1/data-quality/monitor")
@RequiresPermission(QualityPermissionCode.MONITOR_READ)
public class QualityMonitorController {

  private final QualityMonitorService service;

  @Operation(summary = "分页查询质量监控")
  @PostMapping("/page")
  public Result<MonitorPageView> page(
      @Valid @RequestBody(required = false) MonitorPageRequest request) {
    return Result.success(service.page(request));
  }

  @Operation(summary = "按数据表查询监控摘要")
  @GetMapping("/table-summary")
  public Result<List<TableMonitorSummary>> tableSummary(
      @RequestParam long dataSourceId,
      @RequestParam(value = "databaseName", required = false) String databaseName,
      @RequestParam(value = "schemaName", required = false) String schemaName) {
    return Result.success(service.tableSummaries(dataSourceId, databaseName, schemaName));
  }

  @Operation(summary = "查询质量监控详情")
  @GetMapping("/{id}")
  public Result<MonitorView> detail(@PathVariable long id) {
    return Result.success(service.get(id));
  }

  @Operation(summary = "查询质量监控运行设置")
  @GetMapping("/{id}/settings")
  public Result<MonitorSettingsView> settings(@PathVariable long id) {
    return Result.success(service.getSettings(id));
  }

  @Operation(summary = "创建质量监控")
  @PostMapping
  @RequiresPermission(QualityPermissionCode.MONITOR_CREATE)
  public Result<MonitorView> create(@Valid @RequestBody SaveMonitorRequest request) {
    return Result.success(service.create(request));
  }

  @Operation(summary = "更新质量监控")
  @PutMapping("/{id}")
  @RequiresPermission(QualityPermissionCode.MONITOR_UPDATE)
  public Result<MonitorView> update(
      @PathVariable long id,
      @Valid @RequestBody SaveMonitorRequest request) {
    return Result.success(service.update(id, request));
  }

  @Operation(summary = "删除质量监控")
  @DeleteMapping("/{id}")
  @RequiresPermission(QualityPermissionCode.MONITOR_DELETE)
  public Result<Boolean> delete(@PathVariable long id) {
    return Result.success(service.delete(id));
  }

  @Operation(summary = "手动运行质量监控")
  @PostMapping("/{id}/run")
  @RequiresPermission(QualityPermissionCode.MONITOR_RUN)
  public Result<RunView> run(@PathVariable long id, Principal principal) {
    return Result.success(service.run(id, operator(principal)));
  }

  private static String operator(Principal principal) {
    return principal == null || principal.getName() == null || principal.getName().isBlank()
        ? "system"
        : principal.getName();
  }
}
