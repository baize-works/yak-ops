package io.yak.ops.business.quality.api;

import io.yak.ops.business.quality.api.QualityApi.MonitorSettingsView;
import io.yak.ops.business.quality.api.QualityApi.MonitorView;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class QualityWorkspaceApi {

  private QualityWorkspaceApi() {
  }

  public record WorkspaceStats(
      int ruleCount,
      int enabledRuleCount,
      int executionCount,
      int issueExecutionCount,
      LocalDateTime latestExecutionTime) {
  }

  public record MonitorWorkspaceView(
      MonitorView monitor,
      MonitorSettingsView settings,
      WorkspaceStats stats) {
  }

  public record ReportOverview(
      int totalRules,
      int enabledRules,
      int executedRules,
      int issueRules,
      int errorRules,
      double passRate) {
  }

  public record DimensionReport(
      String dimension,
      int total,
      int passed,
      int notPassed,
      int errors,
      double passRate) {
  }

  public record TrendPoint(
      LocalDate date,
      String dimension,
      int total,
      int passed,
      int issues,
      double passRate) {
  }

  public record ColumnReport(
      String columnName,
      String dimension,
      int total,
      int passed,
      int issues,
      double passRate) {
  }

  public record MonitorReportView(
      LocalDate reportDate,
      LocalDate trendStartDate,
      ReportOverview overview,
      List<DimensionReport> dimensions,
      List<TrendPoint> trend,
      List<ColumnReport> columns) {
  }

  public record OperationLogItem(
      String id,
      String operator,
      LocalDateTime operationTime,
      String actionType,
      String content) {
  }

  public record OperationLogPageView(
      List<OperationLogItem> records,
      long total,
      int current,
      int pageSize) {
  }
}
