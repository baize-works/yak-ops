package io.yak.ops.business.quality.execution;

import io.yak.ops.business.datasource.service.DataSourceCatalogService;
import io.yak.ops.business.quality.api.QualityApi.ComparisonOperator;
import io.yak.ops.business.quality.api.QualityApi.RuleType;
import io.yak.ops.business.quality.execution.QualityMetricEvaluator.MetricMeasurement;
import io.yak.ops.business.quality.execution.QualityRuntime.MonitorSnapshot;
import io.yak.ops.business.quality.execution.QualityRuntime.RuleSnapshot;
import io.yak.ops.common.bean.vo.datasource.DataSourceQueryResultVO;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class QualitySqlCompiler {

  private static final Pattern SELECT_TEMPLATE = Pattern.compile(
      "(?is)^\\s*SELECT\\s+(.+?)\\s+FROM\\s+(.+?)\\s*$");
  private static final Pattern READ_ONLY_SELECT = Pattern.compile("(?is)^\\s*SELECT\\b.*");
  private static final Pattern UNSAFE_FILTER = Pattern.compile(
      "(?is)(;|--|/\\*|\\*/|\\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\\b)");

  private final DataSourceCatalogService catalogService;
  private final QualityMetricEvaluator evaluator;

  public QualitySqlCompiler(
      DataSourceCatalogService catalogService,
      QualityMetricEvaluator evaluator) {
    this.catalogService = catalogService;
    this.evaluator = evaluator;
  }

  public CompiledRule compile(MonitorSnapshot monitor, RuleSnapshot rule) {
    TableContext context = tableContext(monitor, rule.columnName());
    String where = whereClause(monitor.whereClause());
    String column = context.columnReference();
    String table = context.tableReference();

    return switch (rule.ruleType()) {
      case TABLE_ROW_COUNT -> scalar(
          "SELECT COUNT(*) AS metric_value FROM " + table + where,
          rule.operator(),
          rule.threshold(),
          rule.thresholdEnd(),
          "行");
      case COLUMN_NOT_NULL -> scalar(
          "SELECT CASE WHEN COUNT(*) = 0 THEN 100 ELSE "
              + "ROUND(SUM(CASE WHEN " + requiredColumn(column)
              + " IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 6) "
              + "END AS metric_value FROM " + table + where,
          rule.operator(),
          rule.threshold(),
          rule.thresholdEnd(),
          "%");
      case COLUMN_UNIQUE -> scalar(
          "SELECT CASE WHEN COUNT(" + requiredColumn(column) + ") = 0 THEN 100 ELSE "
              + "ROUND(COUNT(DISTINCT " + column + ") * 100.0 / COUNT("
              + column + "), 6) END AS metric_value FROM " + table + where,
          rule.operator(),
          rule.threshold(),
          rule.thresholdEnd(),
          "%");
      case COLUMN_RANGE -> rangeRule(table, where, requiredColumn(column), rule);
      case COLUMN_ENUM -> enumRule(table, where, requiredColumn(column), rule);
      case CUSTOM_SQL -> customSql(monitor, context, rule);
    };
  }

  public MetricMeasurement measure(DataSourceQueryResultVO result) {
    if (result == null || result.getData() == null || result.getData().isEmpty()) {
      throw new IllegalArgumentException("质量检查 SQL 没有返回指标数据");
    }
    Map<String, Object> row = result.getData().get(0);
    if (row == null || row.isEmpty()) {
      throw new IllegalArgumentException("质量检查 SQL 返回了空指标行");
    }
    Object raw = firstValue(row, "metric_value");
    BigDecimal value = decimal(raw);
    return new MetricMeasurement(value, null, QualityMetricEvaluator.format(value));
  }

  private CompiledRule rangeRule(
      String table,
      String where,
      String column,
      RuleSnapshot rule) {
    BigDecimal minimum = required(rule.threshold(), "字段数值范围缺少最小值");
    BigDecimal maximum = required(rule.thresholdEnd(), "字段数值范围缺少最大值");
    if (minimum.compareTo(maximum) > 0) {
      throw new IllegalArgumentException("字段数值范围最小值不能大于最大值");
    }
    String condition = column + " < " + literal(minimum)
        + " OR " + column + " > " + literal(maximum);
    String sql = "SELECT COALESCE(SUM(CASE WHEN " + condition
        + " THEN 1 ELSE 0 END), 0) AS metric_value FROM " + table + where;
    return new CompiledRule(
        sql,
        ComparisonOperator.EQ,
        BigDecimal.ZERO,
        null,
        "字段值位于 " + QualityMetricEvaluator.format(minimum)
            + " ~ " + QualityMetricEvaluator.format(maximum),
        "条");
  }

  private CompiledRule enumRule(
      String table,
      String where,
      String column,
      RuleSnapshot rule) {
    List<String> values = rule.enumValues() == null
        ? List.of()
        : rule.enumValues().stream()
            .map(QualitySqlCompiler::trimToNull)
            .filter(value -> value != null)
            .distinct()
            .toList();
    if (values.isEmpty()) {
      throw new IllegalArgumentException("字段枚举值规则至少需要一个允许值");
    }
    String allowed = values.stream()
        .map(QualitySqlCompiler::stringLiteral)
        .reduce((left, right) -> left + ", " + right)
        .orElseThrow();
    String sql = "SELECT COALESCE(SUM(CASE WHEN " + column
        + " IS NOT NULL AND " + column + " NOT IN (" + allowed + ")"
        + " THEN 1 ELSE 0 END), 0) AS metric_value FROM " + table + where;
    return new CompiledRule(
        sql,
        ComparisonOperator.EQ,
        BigDecimal.ZERO,
        null,
        "字段值属于 [" + String.join(", ", values) + "]",
        "条");
  }

  private CompiledRule customSql(
      MonitorSnapshot monitor,
      TableContext context,
      RuleSnapshot rule) {
    String sql = trimToNull(rule.customSql());
    if (sql == null) {
      throw new IllegalArgumentException("自定义 SQL 规则没有可执行 SQL");
    }
    String filter = trimToNull(monitor.whereClause());
    sql = sql
        .replace("${table}", context.tableReference())
        .replace("${where}", filter == null ? "1 = 1" : filter)
        .replace("${column}", context.columnReference() == null ? "" : context.columnReference())
        .trim();
    if (sql.endsWith(";")) {
      sql = sql.substring(0, sql.length() - 1).trim();
    }
    if (!READ_ONLY_SELECT.matcher(sql).matches() || sql.indexOf(';') >= 0) {
      throw new IllegalArgumentException("自定义 SQL 仅允许执行单条 SELECT 查询");
    }
    return scalar(
        sql,
        rule.operator(),
        rule.threshold(),
        rule.thresholdEnd(),
        null);
  }

  private CompiledRule scalar(
      String sql,
      ComparisonOperator operator,
      BigDecimal threshold,
      BigDecimal thresholdEnd,
      String unit) {
    ComparisonOperator normalized = operator == null ? ComparisonOperator.EQ : operator;
    BigDecimal expected = required(threshold, "规则阈值不能为空");
    return new CompiledRule(
        sql,
        normalized,
        expected,
        thresholdEnd,
        evaluator.expectedValue(normalized, expected, thresholdEnd, unit),
        unit);
  }

  private TableContext tableContext(MonitorSnapshot monitor, String columnName) {
    String template = catalogService.buildSqlTemplate(
        monitor.dataSourceId(),
        Map.of("table_path", tablePath(monitor)));
    Matcher matcher = SELECT_TEMPLATE.matcher(template == null ? "" : template);
    if (!matcher.matches()) {
      throw new IllegalArgumentException("数据源插件返回了无法识别的 SQL 模板");
    }
    String selectedColumns = matcher.group(1).trim();
    String tableReference = matcher.group(2).trim();
    String columnReference = null;
    if (columnName != null && !columnName.isBlank()) {
      columnReference = quoteIdentifier(columnName, quoteCharacter(selectedColumns));
    }
    return new TableContext(tableReference, columnReference);
  }

  private String tablePath(MonitorSnapshot monitor) {
    List<String> parts = new ArrayList<>();
    if (hasText(monitor.databaseName())) {
      parts.add(monitor.databaseName().trim());
    }
    if (hasText(monitor.schemaName())
        && !monitor.schemaName().trim().equals(monitor.databaseName())) {
      parts.add(monitor.schemaName().trim());
    }
    parts.add(monitor.tableName());
    return String.join(".", parts);
  }

  private String whereClause(String filter) {
    String normalized = trimToNull(filter);
    if (normalized == null) {
      return "";
    }
    if (UNSAFE_FILTER.matcher(normalized).find()) {
      throw new IllegalArgumentException("数据范围仅允许填写安全的 WHERE 条件片段");
    }
    return " WHERE (" + normalized + ")";
  }

  private Character quoteCharacter(String selectedColumns) {
    String trimmed = selectedColumns == null ? "" : selectedColumns.trim();
    if (!trimmed.isEmpty()
        && (trimmed.charAt(0) == '`' || trimmed.charAt(0) == '"')) {
      return trimmed.charAt(0);
    }
    return null;
  }

  private String quoteIdentifier(String identifier, Character quote) {
    if (identifier == null || identifier.isBlank()) {
      throw new IllegalArgumentException("字段名称不能为空");
    }
    if (quote == null) {
      if (!identifier.matches("[A-Za-z_][A-Za-z0-9_$]*")) {
        throw new IllegalArgumentException("字段名称包含不安全字符：" + identifier);
      }
      return identifier;
    }
    String marker = String.valueOf(quote);
    return marker + identifier.replace(marker, marker + marker) + marker;
  }

  private Object firstValue(Map<String, Object> row, String preferredKey) {
    for (Map.Entry<String, Object> entry : row.entrySet()) {
      if (entry.getKey() != null && entry.getKey().equalsIgnoreCase(preferredKey)) {
        return entry.getValue();
      }
    }
    return row.values().iterator().next();
  }

  private BigDecimal decimal(Object value) {
    if (value == null) {
      throw new IllegalArgumentException("质量指标为空，可能是检查对象没有有效数据");
    }
    if (value instanceof BigDecimal decimal) {
      return decimal.stripTrailingZeros();
    }
    if (value instanceof Number number) {
      return new BigDecimal(number.toString()).stripTrailingZeros();
    }
    try {
      return new BigDecimal(String.valueOf(value).trim()).stripTrailingZeros();
    } catch (NumberFormatException exception) {
      throw new IllegalArgumentException("质量检查结果不是可比较的数值：" + value, exception);
    }
  }

  private static String requiredColumn(String column) {
    if (column == null || column.isBlank()) {
      throw new IllegalArgumentException("当前规则必须选择字段");
    }
    return column;
  }

  private static BigDecimal required(BigDecimal value, String message) {
    if (value == null) {
      throw new IllegalArgumentException(message);
    }
    return value;
  }

  private static String literal(BigDecimal value) {
    return value.stripTrailingZeros().toPlainString();
  }

  private static String stringLiteral(String value) {
    return "'" + value.replace("'", "''") + "'";
  }

  private static boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  private static String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  public record CompiledRule(
      String sql,
      ComparisonOperator operator,
      BigDecimal threshold,
      BigDecimal thresholdEnd,
      String expectedValue,
      String unit) {
  }

  private record TableContext(
      String tableReference,
      String columnReference) {
  }
}
