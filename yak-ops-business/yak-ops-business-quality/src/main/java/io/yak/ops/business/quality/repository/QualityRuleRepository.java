package io.yak.ops.business.quality.repository;

import io.yak.ops.business.quality.api.QualityRuleApi.ComparisonOperator;
import io.yak.ops.business.quality.api.QualityRuleApi.Importance;
import io.yak.ops.business.quality.api.QualityRuleApi.RulePageRequest;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleResult;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleScope;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleSummary;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleType;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleView;
import io.yak.ops.business.quality.api.QualityRuleApi.ScheduleMode;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

public class QualityRuleRepository {

  private static final String SELECT_COLUMNS = """
      id, rule_name, description, importance, data_source_id, data_source_name,
      catalog_name, schema_name, database_name, table_name, column_name,
      rule_scope, rule_type, quality_dimension, comparison_operator,
      threshold_value, threshold_end, unit, schedule_mode, schedule_preset,
      cron_expression, enabled, custom_sql, last_result, last_metric,
      last_run_time, last_duration_ms, owner, created_at, updated_at
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final RowMapper<RuleView> rowMapper = this::mapRule;

  public QualityRuleRepository(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public PageResult page(RulePageRequest request) {
    StringBuilder where = new StringBuilder(" WHERE deleted = 0");
    MapSqlParameterSource params = new MapSqlParameterSource();
    if (hasText(request.keyword())) {
      where.append("""
           AND (
             LOWER(rule_name) LIKE :keyword
             OR LOWER(COALESCE(description, '')) LIKE :keyword
             OR LOWER(data_source_name) LIKE :keyword
             OR LOWER(database_name) LIKE :keyword
             OR LOWER(table_name) LIKE :keyword
             OR LOWER(COALESCE(column_name, '')) LIKE :keyword
           )
          """);
      params.addValue("keyword", "%" + request.keyword().trim().toLowerCase() + "%");
    }
    if (hasText(request.dataSourceId())) {
      where.append(" AND data_source_id = :dataSourceId");
      params.addValue("dataSourceId", request.dataSourceId().trim());
    }
    if (request.ruleType() != null) {
      where.append(" AND rule_type = :ruleType");
      params.addValue("ruleType", request.ruleType().name());
    }
    if (request.result() != null) {
      where.append(" AND last_result = :lastResult");
      params.addValue("lastResult", request.result().name());
    }
    if (request.enabled() != null) {
      where.append(" AND enabled = :enabled");
      params.addValue("enabled", request.enabled());
    }

    Long total = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM yak_quality_rule" + where,
        params,
        Long.class);
    params.addValue("limit", request.normalizedPageSize());
    params.addValue(
        "offset",
        (request.normalizedCurrent() - 1L) * request.normalizedPageSize());
    List<RuleView> records = jdbcTemplate.query(
        "SELECT " + SELECT_COLUMNS
            + " FROM yak_quality_rule"
            + where
            + " ORDER BY updated_at DESC, id DESC LIMIT :limit OFFSET :offset",
        params,
        rowMapper);
    return new PageResult(records, total == null ? 0L : total);
  }

  public RuleSummary summary() {
    return jdbcTemplate.queryForObject(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) AS enabled_count,
               SUM(CASE WHEN last_result IN ('NOT_PASSED', 'ERROR') THEN 1 ELSE 0 END)
                 AS attention_count
        FROM yak_quality_rule
        WHERE deleted = 0
        """,
        new MapSqlParameterSource(),
        (rs, rowNum) -> new RuleSummary(
            rs.getLong("total"),
            rs.getLong("enabled_count"),
            0L,
            rs.getLong("attention_count")));
  }

  public Optional<RuleView> findById(long id) {
    try {
      return Optional.ofNullable(jdbcTemplate.queryForObject(
          "SELECT " + SELECT_COLUMNS
              + " FROM yak_quality_rule WHERE id = :id AND deleted = 0",
          new MapSqlParameterSource("id", id),
          rowMapper));
    } catch (EmptyResultDataAccessException ignored) {
      return Optional.empty();
    }
  }

  public long insert(RuleWrite write) {
    String sql = """
        INSERT INTO yak_quality_rule (
          rule_name, description, importance, data_source_id, data_source_name,
          catalog_name, schema_name, database_name, table_name, column_name,
          rule_scope, rule_type, quality_dimension, comparison_operator,
          threshold_value, threshold_end, unit, schedule_mode, schedule_preset,
          cron_expression, enabled, custom_sql, last_result, owner
        ) VALUES (
          :name, :description, :importance, :dataSourceId, :dataSourceName,
          :catalogName, :schemaName, :databaseName, :tableName, :columnName,
          :scope, :ruleType, :dimension, :operator,
          :threshold, :thresholdEnd, :unit, :scheduleMode, :schedulePreset,
          :cronExpression, :enabled, :customSql, 'NOT_RUN', :owner
        )
        """;
    KeyHolder keyHolder = new GeneratedKeyHolder();
    jdbcTemplate.update(sql, parameters(write), keyHolder, new String[] {"id"});
    Number key = keyHolder.getKey();
    if (key == null) {
      throw new IllegalStateException("质量规则创建成功，但未返回规则编号");
    }
    return key.longValue();
  }

  public boolean update(long id, RuleWrite write) {
    String sql = """
        UPDATE yak_quality_rule
        SET rule_name = :name,
            description = :description,
            importance = :importance,
            data_source_id = :dataSourceId,
            data_source_name = :dataSourceName,
            catalog_name = :catalogName,
            schema_name = :schemaName,
            database_name = :databaseName,
            table_name = :tableName,
            column_name = :columnName,
            rule_scope = :scope,
            rule_type = :ruleType,
            quality_dimension = :dimension,
            comparison_operator = :operator,
            threshold_value = :threshold,
            threshold_end = :thresholdEnd,
            unit = :unit,
            schedule_mode = :scheduleMode,
            schedule_preset = :schedulePreset,
            cron_expression = :cronExpression,
            enabled = :enabled,
            custom_sql = :customSql,
            owner = :owner
        WHERE id = :id AND deleted = 0
        """;
    MapSqlParameterSource params = parameters(write).addValue("id", id);
    return jdbcTemplate.update(sql, params) == 1;
  }

  public boolean setEnabled(long id, boolean enabled) {
    return jdbcTemplate.update(
        "UPDATE yak_quality_rule SET enabled = :enabled"
            + " WHERE id = :id AND deleted = 0",
        new MapSqlParameterSource()
            .addValue("id", id)
            .addValue("enabled", enabled)) == 1;
  }

  public boolean delete(long id) {
    return jdbcTemplate.update(
        "UPDATE yak_quality_rule SET deleted = 1, enabled = 0"
            + " WHERE id = :id AND deleted = 0",
        new MapSqlParameterSource("id", id)) == 1;
  }

  private MapSqlParameterSource parameters(RuleWrite write) {
    return new MapSqlParameterSource()
        .addValue("name", write.name())
        .addValue("description", write.description())
        .addValue("importance", write.importance().name())
        .addValue("dataSourceId", write.dataSourceId())
        .addValue("dataSourceName", write.dataSourceName())
        .addValue("catalogName", write.catalogName())
        .addValue("schemaName", write.schemaName())
        .addValue("databaseName", write.databaseName())
        .addValue("tableName", write.tableName())
        .addValue("columnName", write.columnName())
        .addValue("scope", write.scope().name())
        .addValue("ruleType", write.ruleType().name())
        .addValue("dimension", write.dimension())
        .addValue("operator", write.operator().symbol())
        .addValue("threshold", write.threshold())
        .addValue("thresholdEnd", write.thresholdEnd())
        .addValue("unit", write.unit())
        .addValue("scheduleMode", write.scheduleMode().name())
        .addValue("schedulePreset", write.schedulePreset())
        .addValue("cronExpression", write.cronExpression())
        .addValue("enabled", write.enabled())
        .addValue("customSql", write.customSql())
        .addValue("owner", write.owner());
  }

  private RuleView mapRule(ResultSet rs, int rowNum) throws SQLException {
    ScheduleMode scheduleMode = ScheduleMode.valueOf(rs.getString("schedule_mode"));
    String cronExpression = rs.getString("cron_expression");
    String schedulePreset = rs.getString("schedule_preset");
    return new RuleView(
        String.valueOf(rs.getLong("id")),
        rs.getString("rule_name"),
        rs.getString("description"),
        rs.getString("data_source_id"),
        rs.getString("data_source_name"),
        rs.getString("catalog_name"),
        rs.getString("schema_name"),
        rs.getString("database_name"),
        rs.getString("table_name"),
        rs.getString("column_name"),
        RuleScope.valueOf(rs.getString("rule_scope")),
        RuleType.valueOf(rs.getString("rule_type")),
        rs.getString("quality_dimension"),
        rs.getString("comparison_operator"),
        rs.getBigDecimal("threshold_value"),
        rs.getBigDecimal("threshold_end"),
        rs.getString("unit"),
        scheduleMode,
        schedulePreset,
        scheduleLabel(scheduleMode, schedulePreset, cronExpression),
        cronExpression,
        rs.getBoolean("enabled"),
        Importance.valueOf(rs.getString("importance")),
        RuleResult.valueOf(rs.getString("last_result")),
        rs.getString("last_metric"),
        localDateTime(rs.getTimestamp("last_run_time")),
        nullableLong(rs, "last_duration_ms"),
        rs.getString("owner"),
        rs.getString("custom_sql"),
        localDateTime(rs.getTimestamp("created_at")),
        localDateTime(rs.getTimestamp("updated_at")));
  }

  private static String scheduleLabel(
      ScheduleMode mode,
      String preset,
      String cronExpression) {
    if (mode == ScheduleMode.MANUAL) {
      return "仅手动执行";
    }
    if (preset == null) {
      return cronExpression == null ? "定时执行" : cronExpression;
    }
    return switch (preset) {
      case "HOURLY" -> "每小时";
      case "DAILY_0200" -> "每天 02:00";
      case "DAILY_0300" -> "每天 03:00";
      case "EVERY_30_MINUTES" -> "每 30 分钟";
      case "CUSTOM" -> cronExpression == null ? "自定义 Cron" : cronExpression;
      default -> "定时执行";
    };
  }

  private static LocalDateTime localDateTime(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toLocalDateTime();
  }

  private static Long nullableLong(ResultSet rs, String column) throws SQLException {
    long value = rs.getLong(column);
    return rs.wasNull() ? null : value;
  }

  private static boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  public record PageResult(List<RuleView> records, long total) {
  }

  public record RuleWrite(
      String name,
      String description,
      Importance importance,
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
      ComparisonOperator operator,
      BigDecimal threshold,
      BigDecimal thresholdEnd,
      String unit,
      ScheduleMode scheduleMode,
      String schedulePreset,
      String cronExpression,
      boolean enabled,
      String customSql,
      String owner) {
  }
}
