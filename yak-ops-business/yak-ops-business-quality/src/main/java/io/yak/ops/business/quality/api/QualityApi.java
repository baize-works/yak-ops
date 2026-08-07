package io.yak.ops.business.quality.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class QualityApi {

  private QualityApi() {
  }

  public enum RuleScope { TABLE, COLUMN }

  public enum RuleType {
    TABLE_ROW_COUNT(RuleScope.TABLE, "完整性", "行"),
    COLUMN_NOT_NULL(RuleScope.COLUMN, "完整性", "%"),
    COLUMN_UNIQUE(RuleScope.COLUMN, "唯一性", "%"),
    COLUMN_RANGE(RuleScope.COLUMN, "有效性", "条"),
    COLUMN_ENUM(RuleScope.COLUMN, "准确性", "条"),
    CUSTOM_SQL(RuleScope.TABLE, "自定义", null);

    private final RuleScope scope;
    private final String dimension;
    private final String unit;

    RuleType(RuleScope scope, String dimension, String unit) {
      this.scope = scope;
      this.dimension = dimension;
      this.unit = unit;
    }

    public RuleScope scope() { return scope; }
    public String dimension() { return dimension; }
    public String unit() { return unit; }
  }

  public enum ComparisonOperator {
    GT(">"), GTE(">="), EQ("="), LTE("<="), LT("<"), BETWEEN("BETWEEN");

    private final String symbol;

    ComparisonOperator(String symbol) { this.symbol = symbol; }
    public String symbol() { return symbol; }

    public static ComparisonOperator fromValue(String value) {
      if (value == null || value.isBlank()) {
        throw new IllegalArgumentException("比较方式不能为空");
      }
      for (ComparisonOperator operator : values()) {
        if (operator.name().equalsIgnoreCase(value)
            || operator.symbol.equalsIgnoreCase(value)) {
          return operator;
        }
      }
      throw new IllegalArgumentException("不支持的比较方式：" + value);
    }
  }

  public enum ExecutionStatus { WAITING, RUNNING, SUCCESS, FAILED }
  public enum CheckResult { PASSED, NOT_PASSED, ERROR, RUNNING, NOT_RUN }
  public enum TriggerType { MANUAL, SCHEDULE }
  public enum RunMode { MANUAL, SCHEDULE }
  public enum ScheduleFrequency { DAILY, WEEKLY, CRON }
  public enum ScheduleWeekday { MON, TUE, WED, THU, FRI, SAT, SUN }
  public enum RuleFailureAction { CONTINUE, STOP }
  public enum NotifyChannel { MESSAGE, EMAIL, WEBHOOK }
  public enum AlertLevel { WARNING, CRITICAL }

  public record TemplateQuery(String keyword, String dimension, RuleScope scope) {}

  public record TemplateView(
      Long id,
      String code,
      String name,
      String description,
      RuleType ruleType,
      RuleScope scope,
      String dimension,
      String parameterSchema,
      boolean builtin,
      boolean enabled,
      long ruleCount,
      int sortOrder) {}

  public record TemplateSummary(long total, Map<String, Long> dimensions) {}
  public record TemplateListView(List<TemplateView> records, TemplateSummary summary) {}

  public record MonitorPageRequest(
      @Min(1) Integer current,
      @Min(1) @Max(100) Integer pageSize,
      String keyword,
      Long dataSourceId,
      String databaseName,
      String schemaName,
      String tableName,
      Boolean enabled,
      CheckResult lastResult) {
    public int normalizedCurrent() { return current == null ? 1 : current; }
    public int normalizedPageSize() { return pageSize == null ? 20 : pageSize; }
  }

  public record SaveRuleRequest(
      @NotNull Long templateId,
      @NotBlank @Size(max = 100) String name,
      @Size(max = 256) String columnName,
      String operator,
      BigDecimal threshold,
      BigDecimal thresholdEnd,
      List<@Size(max = 256) String> enumValues,
      @Size(max = 20000) String customSql,
      Boolean enabled) {}

  public record MonitorSettingsRequest(
      RunMode runMode,
      ScheduleFrequency scheduleFrequency,
      @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "执行时间格式必须为 HH:mm")
      String scheduleTime,
      ScheduleWeekday scheduleWeekday,
      @Size(max = 128) String cronExpression,
      RuleFailureAction ruleFailureAction,
      Boolean notifyEnabled,
      NotifyChannel notifyChannel,
      @Size(max = 1000) String notifyTarget,
      AlertLevel alertLevel) {}

  public record MonitorSettingsView(
      RunMode runMode,
      ScheduleFrequency scheduleFrequency,
      String scheduleTime,
      ScheduleWeekday scheduleWeekday,
      String cronExpression,
      @QualityDateTimeFormat LocalDateTime nextRunTime,
      RuleFailureAction ruleFailureAction,
      boolean notifyEnabled,
      NotifyChannel notifyChannel,
      String notifyTarget,
      AlertLevel alertLevel) {}

  public record SaveMonitorRequest(
      @NotBlank @Size(max = 100) String name,
      @Size(max = 500) String description,
      @NotNull Long dataSourceId,
      @NotBlank @Size(max = 128) String dataSourceName,
      @Size(max = 128) String databaseName,
      @Size(max = 128) String schemaName,
      @NotBlank @Size(max = 256) String tableName,
      @Size(max = 4000) String whereClause,
      @NotBlank @Size(max = 128) String owner,
      Boolean enabled,
      @Valid MonitorSettingsRequest settings,
      @NotEmpty List<@Valid SaveRuleRequest> rules) {}

  public record RuleView(
      Long id,
      Long monitorId,
      Long templateId,
      String templateCode,
      String name,
      RuleType ruleType,
      RuleScope scope,
      String dimension,
      String columnName,
      String operator,
      BigDecimal threshold,
      BigDecimal thresholdEnd,
      List<String> enumValues,
      String customSql,
      boolean enabled,
      int sortOrder) {}

  public record MonitorListItem(
      Long id,
      String name,
      String description,
      Long dataSourceId,
      String dataSourceName,
      String databaseName,
      String schemaName,
      String tableName,
      String owner,
      boolean enabled,
      int ruleCount,
      CheckResult lastResult,
      String lastExecutionNo,
      @QualityDateTimeFormat LocalDateTime lastRunTime,
      @QualityDateTimeFormat LocalDateTime createTime,
      @QualityDateTimeFormat LocalDateTime updateTime) {}

  public record MonitorView(
      Long id,
      String name,
      String description,
      Long dataSourceId,
      String dataSourceName,
      String databaseName,
      String schemaName,
      String tableName,
      String whereClause,
      String owner,
      boolean enabled,
      CheckResult lastResult,
      String lastExecutionNo,
      @QualityDateTimeFormat LocalDateTime lastRunTime,
      @QualityDateTimeFormat LocalDateTime createTime,
      @QualityDateTimeFormat LocalDateTime updateTime,
      List<RuleView> rules) {}

  public record MonitorPageView(
      List<MonitorListItem> records,
      long total,
      int current,
      int pageSize) {}

  public record TableMonitorSummary(
      String tableName,
      Long monitorId,
      String monitorName,
      int monitorCount,
      int ruleCount,
      CheckResult lastResult,
      @QualityDateTimeFormat LocalDateTime lastRunTime) {}

  public record TableAssetPageRequest(
      @Min(1) Integer current,
      @Min(1) @Max(100) Integer pageSize,
      @NotNull Long dataSourceId,
      String databaseName,
      String schemaName,
      String keyword) {
    public int normalizedCurrent() { return current == null ? 1 : current; }
    public int normalizedPageSize() { return pageSize == null ? 20 : pageSize; }
  }

  public record TableAssetView(
      Long id,
      Long dataSourceId,
      String dataSourceName,
      String databaseName,
      String schemaName,
      String tableName,
      String tableType,
      String remarks,
      Long monitorId,
      String monitorName,
      int monitorCount,
      int ruleCount,
      CheckResult lastResult,
      @QualityDateTimeFormat LocalDateTime lastRunTime,
      String registeredBy,
      @QualityDateTimeFormat LocalDateTime registeredAt) {}

  public record TableAssetPageView(
      List<TableAssetView> records,
      long total,
      int current,
      int pageSize) {}

  public record TableCandidateView(
      String databaseName,
      String schemaName,
      String tableName,
      String tableType,
      String remarks) {}

  public record TableCandidatePageView(
      List<TableCandidateView> records,
      long total,
      int current,
      int pageSize) {}

  public record RegisterTableItem(
      @Size(max = 128) String databaseName,
      @Size(max = 128) String schemaName,
      @NotBlank @Size(max = 256) String tableName,
      @Size(max = 40) String tableType,
      @Size(max = 1000) String remarks) {}

  public record RegisterTablesRequest(
      @NotNull Long dataSourceId,
      @NotBlank @Size(max = 128) String dataSourceName,
      @Size(max = 128) String databaseName,
      @NotEmpty List<@Valid RegisterTableItem> tables) {}

  public record RegisterTablesView(int requested, int registered) {}

  public record RunView(
      String executionNo,
      ExecutionStatus executionStatus,
      CheckResult checkResult) {}

  public record ExecutionPageRequest(
      @Min(1) Integer current,
      @Min(1) @Max(100) Integer pageSize,
      String keyword,
      Long monitorId,
      ExecutionStatus executionStatus,
      CheckResult checkResult) {
    public int normalizedCurrent() { return current == null ? 1 : current; }
    public int normalizedPageSize() { return pageSize == null ? 20 : pageSize; }
  }

  public record RuleExecutionView(
      Long id,
      Long ruleId,
      String ruleName,
      String templateCode,
      RuleType ruleType,
      String columnName,
      CheckResult checkResult,
      String metricValue,
      String expectedValue,
      String executedSql,
      String errorMessage,
      Long durationMs) {}

  public record ExecutionListItem(
      String executionNo,
      Long monitorId,
      String monitorName,
      String dataSourceName,
      String objectName,
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
      String errorMessage) {}

  public record ExecutionView(
      String executionNo,
      Long monitorId,
      String monitorName,
      String dataSourceName,
      String databaseName,
      String schemaName,
      String tableName,
      String objectName,
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
      List<RuleExecutionView> rules) {}

  public record ExecutionPageView(
      List<ExecutionListItem> records,
      long total,
      int current,
      int pageSize) {}
}
