package io.yak.ops.business.quality.api;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.yak.ops.business.quality.api.QualityApi.CheckResult;
import io.yak.ops.business.quality.api.QualityApi.ExecutionStatus;
import io.yak.ops.business.quality.api.QualityApi.RuleScope;
import io.yak.ops.business.quality.api.QualityApi.RuleType;
import io.yak.ops.business.quality.api.QualityApi.TriggerType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDateTime;
import java.util.List;

/** Read-only contracts used by the execution list and execution workspace. */
public final class QualityExecutionWorkspaceApi {

  private QualityExecutionWorkspaceApi() {
  }

  public enum LogLevel { INFO, WARN, ERROR }

  public record ExecutionPageRequest(
      @Min(1) Integer current,
      @Min(1) @Max(100) Integer pageSize,
      String keyword,
      String objectKeyword,
      Long dataSourceId,
      Long monitorId,
      ExecutionStatus executionStatus,
      CheckResult checkResult,
      TriggerType triggerType,
      Boolean hasIssues,
      String dimension,
      RuleScope scope,
      @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime queuedAfter,
      @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime queuedBefore) {

    public int normalizedCurrent() {
      return current == null ? 1 : current;
    }

    public int normalizedPageSize() {
      return pageSize == null ? 20 : pageSize;
    }
  }

  public record ExecutionListItem(
      String executionNo,
      Long monitorId,
      String monitorName,
      Long dataSourceId,
      String dataSourceName,
      String objectName,
      TriggerType triggerType,
      ExecutionStatus executionStatus,
      CheckResult checkResult,
      int totalRules,
      int passedRules,
      int failedRules,
      int errorRules,
      String operator,
      @QualityDateTimeFormat LocalDateTime queuedAt,
      @QualityDateTimeFormat LocalDateTime startedAt,
      @QualityDateTimeFormat LocalDateTime finishedAt,
      Long durationMs,
      String errorMessage) {
  }

  public record RuleExecutionListItem(
      Long id,
      Long ruleId,
      String executionNo,
      Long monitorId,
      String monitorName,
      Long dataSourceId,
      String dataSourceName,
      String databaseName,
      String schemaName,
      String tableName,
      String objectName,
      String ruleName,
      String templateCode,
      RuleType ruleType,
      RuleScope scope,
      String dimension,
      String columnName,
      TriggerType triggerType,
      ExecutionStatus executionStatus,
      CheckResult checkResult,
      String metricValue,
      String expectedValue,
      String operator,
      @QualityDateTimeFormat LocalDateTime queuedAt,
      @QualityDateTimeFormat LocalDateTime startedAt,
      @QualityDateTimeFormat LocalDateTime finishedAt,
      Long durationMs,
      String errorMessage) {
  }

  public record RuleExecutionView(
      Long id,
      Long ruleId,
      String ruleName,
      String templateCode,
      RuleType ruleType,
      RuleScope scope,
      String dimension,
      String columnName,
      CheckResult checkResult,
      String metricValue,
      String expectedValue,
      String executedSql,
      String errorMessage,
      Long durationMs,
      @QualityDateTimeFormat LocalDateTime createdAt) {
  }

  public record ExecutionView(
      String executionNo,
      Long monitorId,
      String monitorName,
      Long dataSourceId,
      String dataSourceName,
      String databaseName,
      String schemaName,
      String tableName,
      String objectName,
      TriggerType triggerType,
      ExecutionStatus executionStatus,
      CheckResult checkResult,
      int totalRules,
      int passedRules,
      int failedRules,
      int errorRules,
      String operator,
      @QualityDateTimeFormat LocalDateTime queuedAt,
      @QualityDateTimeFormat LocalDateTime startedAt,
      @QualityDateTimeFormat LocalDateTime finishedAt,
      Long durationMs,
      String errorMessage,
      List<RuleExecutionView> rules) {
  }

  public record ExecutionPageView(
      List<ExecutionListItem> records,
      long total,
      int current,
      int pageSize) {
  }

  public record RuleExecutionPageView(
      List<RuleExecutionListItem> records,
      long total,
      int current,
      int pageSize) {
  }

  public record ExecutionLogLine(
      @QualityDateTimeFormat LocalDateTime timestamp,
      LogLevel level,
      String stage,
      String message) {
  }

  public record ExecutionLogView(
      String executionNo,
      List<ExecutionLogLine> lines) {
  }
}
