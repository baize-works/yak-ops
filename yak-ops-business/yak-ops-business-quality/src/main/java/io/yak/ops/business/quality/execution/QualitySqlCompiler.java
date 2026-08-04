package io.yak.ops.business.quality.execution;

import io.yak.ops.business.datasource.service.DataSourceCatalogService;
import io.yak.ops.business.quality.api.QualityRuleApi.ComparisonOperator;
import io.yak.ops.business.quality.execution.QualityMetricEvaluator.MetricMeasurement;
import io.yak.ops.business.quality.repository.QualityExecutionRepository.ExecutionRuntime;
import io.yak.ops.common.bean.vo.datasource.DataSourceQueryResultVO;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class QualitySqlCompiler {

  private static final Pattern SELECT_TEMPLATE = Pattern.compile(
      "(?is)^\\s*SELECT\\s+(.+?)\\s+FROM\\s+(.+?)\\s*$");
  private static final List<DateTimeFormatter> DATE_TIME_FORMATTERS = List.of(
      DateTimeFormatter.ISO_LOCAL_DATE_TIME,
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"),
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

  private final DataSourceCatalogService catalogService;

  public QualitySqlCompiler(DataSourceCatalogService catalogService) {
    this.catalogService = catalogService;
  }

  public CompiledQuery compile(ExecutionRuntime runtime) {
    if (runtime.ruleType()
        == io.yak.ops.business.quality.api.QualityRuleApi.RuleType.CUSTOM_SQL) {
      String sql = trimToNull(runtime.customSql());
      if (sql == null) {
        throw new IllegalArgumentException("自定义 SQL 规则没有可执行 SQL");
      }
      return new CompiledQuery(
          sql,
          MetricMode.SCALAR,
          runtime.expectedDisplay(),
          runtime.unit());
    }

    TableContext context = tableContext(runtime);
    String column = context.columnReference();
    String table = context.tableReference();
    return switch (runtime.ruleType()) {
      case TABLE_ROW_COUNT -> new CompiledQuery(
          "SELECT COUNT(*) AS metric_value FROM " + table,
          MetricMode.SCALAR,
          runtime.expectedDisplay(),
          runtime.unit());
      case COLUMN_NOT_NULL -> new CompiledQuery(
          "SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE "
              + "ROUND(SUM(CASE WHEN " + column + " IS NOT NULL THEN 1 ELSE 0 END) "
              + "* 100.0 / COUNT(*), 6) END AS metric_value FROM " + table,
          MetricMode.SCALAR,
          runtime.expectedDisplay(),
          runtime.unit());
      case COLUMN_UNIQUE -> new CompiledQuery(
          "SELECT CASE WHEN COUNT(" + column + ") = 0 THEN 0 ELSE "
              + "ROUND(COUNT(DISTINCT " + column + ") * 100.0 / COUNT("
              + column + "), 6) END AS metric_value FROM " + table,
          MetricMode.SCALAR,
          runtime.expectedDisplay(),
          runtime.unit());
      case COLUMN_RANGE -> compileRange(
          runtime.operator(),
          column,
          table,
          runtime.expectedDisplay(),
          runtime.unit());
      case DATA_FRESHNESS -> new CompiledQuery(
          "SELECT MAX(" + column + ") AS metric_timestamp FROM " + table,
          MetricMode.TIMESTAMP,
          runtime.expectedDisplay(),
          runtime.unit());
      case CUSTOM_SQL -> throw new IllegalStateException("CUSTOM_SQL 已在前置分支处理");
    };
  }

  public MetricMeasurement measure(
      CompiledQuery query,
      DataSourceQueryResultVO result) {
    if (result == null || result.getData() == null || result.getData().isEmpty()) {
      throw new IllegalArgumentException("质量检查 SQL 没有返回指标数据");
    }
    Map<String, Object> row = result.getData().get(0);
    if (row == null || row.isEmpty()) {
      throw new IllegalArgumentException("质量检查 SQL 返回了空指标行");
    }
    return switch (query.mode()) {
      case SCALAR -> scalar(row, query.unit());
      case RANGE -> range(row, query.unit());
      case TIMESTAMP -> freshness(row, query.unit());
    };
  }

  private CompiledQuery compileRange(
      ComparisonOperator operator,
      String column,
      String table,
      String expectedDisplay,
      String unit) {
    if (operator == ComparisonOperator.BETWEEN || operator == ComparisonOperator.EQ) {
      return new CompiledQuery(
          "SELECT MIN(" + column + ") AS metric_min, MAX(" + column
              + ") AS metric_max FROM " + table,
          MetricMode.RANGE,
          expectedDisplay,
          unit);
    }
    String aggregate = operator == ComparisonOperator.GT
            || operator == ComparisonOperator.GTE
        ? "MIN"
        : "MAX";
    return new CompiledQuery(
        "SELECT " + aggregate + "(" + column + ") AS metric_value FROM " + table,
        MetricMode.SCALAR,
        expectedDisplay,
        unit);
  }

  private TableContext tableContext(ExecutionRuntime runtime) {
    long dataSourceId = dataSourceId(runtime.dataSourceId());
    String tablePath = tablePath(runtime);
    String template = catalogService.buildSqlTemplate(
        dataSourceId,
        Map.of("table_path", tablePath));
    Matcher matcher = SELECT_TEMPLATE.matcher(template == null ? "" : template);
    if (!matcher.matches()) {
      throw new IllegalArgumentException("数据源插件返回了无法识别的 SQL 模板");
    }
    String selectedColumns = matcher.group(1).trim();
    String tableReference = matcher.group(2).trim();
    String columnReference = null;
    if (runtime.columnName() != null && !runtime.columnName().isBlank()) {
      columnReference = quoteIdentifier(
          runtime.columnName(),
          quoteCharacter(selectedColumns));
    }
    return new TableContext(tableReference, columnReference);
  }

  private MetricMeasurement scalar(Map<String, Object> row, String unit) {
    BigDecimal value = decimal(firstValue(row, "metric_value"));
    return new MetricMeasurement(value, null, format(value) + suffix(unit));
  }

  private MetricMeasurement range(Map<String, Object> row, String unit) {
    BigDecimal minimum = decimal(firstValue(row, "metric_min"));
    BigDecimal maximum = decimal(firstValue(row, "metric_max"));
    return new MetricMeasurement(
        minimum,
        maximum,
        format(minimum) + " ~ " + format(maximum) + suffix(unit));
  }

  private MetricMeasurement freshness(Map<String, Object> row, String unit) {
    Object raw = firstValue(row, "metric_timestamp");
    LocalDateTime timestamp = dateTime(raw);
    long millis = Math.max(
        0L,
        Duration.between(timestamp, LocalDateTime.now()).toMillis());
    BigDecimal hours = BigDecimal.valueOf(millis)
        .divide(BigDecimal.valueOf(3_600_000L), 6, RoundingMode.HALF_UP)
        .stripTrailingZeros();
    return new MetricMeasurement(hours, null, format(hours) + suffix(unit));
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

  private LocalDateTime dateTime(Object value) {
    if (value == null) {
      throw new IllegalArgumentException("数据新鲜度检查没有返回有效时间");
    }
    if (value instanceof LocalDateTime localDateTime) {
      return localDateTime;
    }
    if (value instanceof Timestamp timestamp) {
      return timestamp.toLocalDateTime();
    }
    if (value instanceof OffsetDateTime offsetDateTime) {
      return offsetDateTime.toLocalDateTime();
    }
    if (value instanceof ZonedDateTime zonedDateTime) {
      return zonedDateTime.toLocalDateTime();
    }
    if (value instanceof Instant instant) {
      return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
    }
    if (value instanceof Date date) {
      return LocalDateTime.ofInstant(date.toInstant(), ZoneId.systemDefault());
    }
    String text = String.valueOf(value).trim();
    try {
      return OffsetDateTime.parse(text).toLocalDateTime();
    } catch (DateTimeParseException ignored) {
      // Continue with database-friendly local date-time formats.
    }
    for (DateTimeFormatter formatter : DATE_TIME_FORMATTERS) {
      try {
        return LocalDateTime.parse(text, formatter);
      } catch (DateTimeParseException ignored) {
        // Try the next formatter.
      }
    }
    throw new IllegalArgumentException("无法解析数据新鲜度时间：" + text);
  }

  private String tablePath(ExecutionRuntime runtime) {
    List<String> parts = new ArrayList<>();
    String catalog = trimToNull(runtime.catalogName());
    String schema = trimToNull(runtime.schemaName());
    if (catalog != null) {
      parts.add(catalog);
    }
    if (schema != null) {
      parts.add(schema);
    }
    if (parts.isEmpty()) {
      String database = trimToNull(runtime.databaseName());
      if (database != null) {
        parts.add(database);
      }
    }
    parts.add(runtime.tableName());
    return String.join(".", parts);
  }

  private long dataSourceId(String value) {
    try {
      long parsed = Long.parseLong(value);
      if (parsed <= 0) {
        throw new NumberFormatException("non-positive");
      }
      return parsed;
    } catch (NumberFormatException exception) {
      throw new IllegalArgumentException("数据源编号无效：" + value, exception);
    }
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

  private static String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private static String suffix(String unit) {
    return unit == null ? "" : unit;
  }

  private static String format(BigDecimal value) {
    if (value == null) {
      return "--";
    }
    BigDecimal normalized = value.stripTrailingZeros();
    return normalized.scale() < 0
        ? normalized.setScale(0).toPlainString()
        : normalized.toPlainString();
  }

  public enum MetricMode {
    SCALAR,
    RANGE,
    TIMESTAMP
  }

  public record CompiledQuery(
      String sql,
      MetricMode mode,
      String expectedDisplay,
      String unit) {
  }

  private record TableContext(
      String tableReference,
      String columnReference) {
  }
}
