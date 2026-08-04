package io.yak.ops.business.quality.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class QualityRuleApi {

  private QualityRuleApi() {
  }

  public enum RuleScope {
    TABLE,
    COLUMN
  }

  public enum Importance {
    NORMAL,
    IMPORTANT
  }

  public enum RuleResult {
    PASSED,
    NOT_PASSED,
    ERROR,
    RUNNING,
    NOT_RUN
  }

  public enum ScheduleMode {
    MANUAL,
    SCHEDULE
  }

  public enum ComparisonOperator {
    GT(">"),
    GTE(">="),
    EQ("="),
    LTE("<="),
    LT("<"),
    BETWEEN("BETWEEN");

    private final String symbol;

    ComparisonOperator(String symbol) {
      this.symbol = symbol;
    }

    public String symbol() {
      return symbol;
    }

    public static ComparisonOperator fromSymbol(String value) {
      for (ComparisonOperator operator : values()) {
        if (operator.symbol.equals(value) || operator.name().equalsIgnoreCase(value)) {
          return operator;
        }
      }
      throw new IllegalArgumentException("不支持的比较方式：" + value);
    }
  }

  public enum RuleType {
    TABLE_ROW_COUNT(RuleScope.TABLE, "完整性", "行"),
    COLUMN_NOT_NULL(RuleScope.COLUMN, "完整性", "%"),
    COLUMN_UNIQUE(RuleScope.COLUMN, "唯一性", "%"),
    COLUMN_RANGE(RuleScope.COLUMN, "有效性", null),
    DATA_FRESHNESS(RuleScope.COLUMN, "及时性", "小时"),
    CUSTOM_SQL(RuleScope.TABLE, "自定义", null);

    private final RuleScope scope;
    private final String dimension;
    private final String unit;

    RuleType(RuleScope scope, String dimension, String unit) {
      this.scope = scope;
      this.dimension = dimension;
      this.unit = unit;
    }

    public RuleScope scope() {
      return scope;
    }

    public String dimension() {
      return dimension;
    }

    public String unit() {
      return unit;
    }
  }

  public record RulePageRequest(
      @Min(1) Integer current,
      @Min(1) @Max(100) Integer pageSize,
      String keyword,
      String dataSourceId,
      RuleType ruleType,
      RuleResult result,
      Boolean enabled) {

    public int normalizedCurrent() {
      return current == null ? 1 : current;
    }

    public int normalizedPageSize() {
      return pageSize == null ? 10 : pageSize;
    }
  }

  public record SaveRuleRequest(
      @NotBlank @Size(max = 80) String name,
      @Size(max = 300) String description,
      @NotNull Importance importance,
      @NotBlank String dataSourceId,
      @NotBlank @Size(max = 128) String dataSourceName,
      @Size(max = 128) String catalogName,
      @Size(max = 128) String schemaName,
      @NotBlank @Size(max = 128) String databaseName,
      @NotBlank @Size(max = 256) String tableName,
      @Size(max = 256) String columnName,
      @NotNull RuleType ruleType,
      @NotBlank String operator,
      @NotNull BigDecimal threshold,
      BigDecimal thresholdEnd,
      @NotNull ScheduleMode scheduleMode,
      @Size(max = 40) String schedulePreset,
      @Size(max = 128) String cronExpression,
      Boolean enabled,
      String customSql) {
  }

  public record RuleSummary(
      long total,
      long enabled,
      long todayRuns,
      long attention) {
  }

  public record RuleView(
      String id,
      String name,
      String description,
      String dataSourceId,
      String dataSourceName,
      String catalogName,
      String schemaName,
      String databaseName,
      String tableName,
      String columnName,
      RuleScope scope,
      RuleType ruleType,
      String dimension,
      String operator,
      BigDecimal threshold,
      BigDecimal thresholdEnd,
      String unit,
      ScheduleMode scheduleMode,
      String schedulePreset,
      String scheduleLabel,
      String cronExpression,
      boolean enabled,
      Importance importance,
      RuleResult lastResult,
      String lastMetric,
      LocalDateTime lastRunTime,
      Long duration,
      String owner,
      String customSql,
      LocalDateTime createTime,
      LocalDateTime updateTime) {
  }

  public record RulePageView(
      List<RuleView> records,
      long total,
      int current,
      int pageSize,
      RuleSummary summary) {
  }
}
