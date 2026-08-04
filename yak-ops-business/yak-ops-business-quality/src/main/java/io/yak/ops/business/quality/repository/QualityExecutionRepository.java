package io.yak.ops.business.quality.repository;

import io.yak.ops.business.quality.api.QualityExecutionApi.CheckResult;
import io.yak.ops.business.quality.api.QualityExecutionApi.ExecutionPageRequest;
import io.yak.ops.business.quality.api.QualityExecutionApi.ExecutionStatus;
import io.yak.ops.business.quality.api.QualityExecutionApi.ExecutionSummary;
import io.yak.ops.business.quality.api.QualityExecutionApi.ExecutionView;
import io.yak.ops.business.quality.api.QualityExecutionApi.TriggerType;
import io.yak.ops.business.quality.api.QualityRuleApi.ComparisonOperator;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleType;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleView;
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

public class QualityExecutionRepository {

  private static final String SELECT_COLUMNS = """
      id, execution_no, rule_id, rule_name, data_source_id, data_source_name,
      catalog_name, schema_name, database_name, table_name, column_name,
      object_name, rule_type, comparison_operator, threshold_value,
      threshold_end, unit, custom_sql, trigger_type, execution_status,
      check_result, metric_value, metric_value_end, metric_display,
      expected_display, executed_sql, error_message, operator_name,
      queued_at, started_at, finished_at, duration_ms, created_at, updated_at
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final RowMapper<ExecutionView> viewMapper = this::mapView;
  private final RowMapper<ExecutionRuntime> runtimeMapper = this::mapRuntime;

  public QualityExecutionRepository(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public PageResult page(ExecutionPageRequest request) {
    StringBuilder where = new StringBuilder(" WHERE 1 = 1");
    MapSqlParameterSource params = new MapSqlParameterSource();
    if (hasText(request.keyword())) {
      where.append("""
           AND (
             LOWER(execution_no) LIKE :keyword
             OR LOWER(rule_name) LIKE :keyword
             OR LOWER(data_source_name) LIKE :keyword
             OR LOWER(object_name) LIKE :keyword
           )
          """);
      params.addValue("keyword", "%" + request.keyword().trim().toLowerCase() + "%");
    }
    if (request.status() != null) {
      where.append(" AND execution_status = :executionStatus");
      params.addValue("executionStatus", request.status().name());
    }
    if (request.checkResult() != null) {
      where.append(" AND check_result = :checkResult");
      params.addValue("checkResult", request.checkResult().name());
    }
    if (request.triggerType() != null) {
      where.append(" AND trigger_type = :triggerType");
      params.addValue("triggerType", request.triggerType().name());
    }

    Long total = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM yak_quality_execution" + where,
        params,
        Long.class);
    params.addValue("limit", request.normalizedPageSize());
    params.addValue(
        "offset",
        (request.normalizedCurrent() - 1L) * request.normalizedPageSize());
    List<ExecutionView> records = jdbcTemplate.query(
        "SELECT " + SELECT_COLUMNS
            + " FROM yak_quality_execution"
            + where
            + " ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset",
        params,
        viewMapper);
    return new PageResult(records, total == null ? 0L : total);
  }

  public ExecutionSummary summary() {
    return jdbcTemplate.queryForObject(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN check_result = 'PASSED' THEN 1 ELSE 0 END) AS passed_count,
               SUM(CASE WHEN check_result = 'NOT_PASSED'
                              OR execution_status = 'FAILED'
                        THEN 1 ELSE 0 END) AS attention_count,
               SUM(CASE WHEN execution_status IN ('WAITING', 'RUNNING')
                        THEN 1 ELSE 0 END) AS running_count
        FROM yak_quality_execution
        """,
        new MapSqlParameterSource(),
        (rs, rowNum) -> new ExecutionSummary(
            rs.getLong("total"),
            rs.getLong("passed_count"),
            rs.getLong("attention_count"),
            rs.getLong("running_count")));
  }

  public Optional<ExecutionView> findByExecutionNo(String executionNo) {
    try {
      return Optional.ofNullable(jdbcTemplate.queryForObject(
          "SELECT " + SELECT_COLUMNS
              + " FROM yak_quality_execution WHERE execution_no = :executionNo",
          new MapSqlParameterSource("executionNo", executionNo),
          viewMapper));
    } catch (EmptyResultDataAccessException ignored) {
      return Optional.empty();
    }
  }

  public Optional<ExecutionRuntime> findRuntimeById(long id) {
    try {
      return Optional.ofNullable(jdbcTemplate.queryForObject(
          "SELECT " + SELECT_COLUMNS
              + " FROM yak_quality_execution WHERE id = :id",
          new MapSqlParameterSource("id", id),
          runtimeMapper));
    } catch (EmptyResultDataAccessException ignored) {
      return Optional.empty();
    }
  }

  public boolean hasActiveExecution(long ruleId) {
    Long count = jdbcTemplate.queryForObject(
        """
        SELECT COUNT(*)
        FROM yak_quality_execution
        WHERE rule_id = :ruleId
          AND execution_status IN ('WAITING', 'RUNNING')
        """,
        new MapSqlParameterSource("ruleId", ruleId),
        Long.class);
    return count != null && count > 0;
  }

  public long insert(
      String executionNo,
      RuleView rule,
      TriggerType triggerType,
      String operator,
      String objectName,
      String expectedDisplay,
      LocalDateTime queuedAt) {
    String sql = """
        INSERT INTO yak_quality_execution (
          execution_no, rule_id, rule_name, data_source_id, data_source_name,
          catalog_name, schema_name, database_name, table_name, column_name,
          object_name, rule_type, comparison_operator, threshold_value,
          threshold_end, unit, custom_sql, trigger_type, execution_status,
          check_result, expected_display, operator_name, queued_at
        ) VALUES (
          :executionNo, :ruleId, :ruleName, :dataSourceId, :dataSourceName,
          :catalogName, :schemaName, :databaseName, :tableName, :columnName,
          :objectName, :ruleType, :operator, :threshold,
          :thresholdEnd, :unit, :customSql, :triggerType, 'WAITING',
          'UNKNOWN', :expectedDisplay, :operatorName, :queuedAt
        )
        """;
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("executionNo", executionNo)
        .addValue("ruleId", Long.parseLong(rule.id()))
        .addValue("ruleName", rule.name())
        .addValue("dataSourceId", rule.dataSourceId())
        .addValue("dataSourceName", rule.dataSourceName())
        .addValue("catalogName", rule.catalogName())
        .addValue("schemaName", rule.schemaName())
        .addValue("databaseName", rule.databaseName())
        .addValue("tableName", rule.tableName())
        .addValue("columnName", rule.columnName())
        .addValue("objectName", objectName)
        .addValue("ruleType", rule.ruleType().name())
        .addValue("operator", rule.operator())
        .addValue("threshold", rule.threshold())
        .addValue("thresholdEnd", rule.thresholdEnd())
        .addValue("unit", rule.unit())
        .addValue("customSql", rule.customSql())
        .addValue("triggerType", triggerType.name())
        .addValue("expectedDisplay", expectedDisplay)
        .addValue("operatorName", operator)
        .addValue("queuedAt", Timestamp.valueOf(queuedAt));
    KeyHolder keyHolder = new GeneratedKeyHolder();
    jdbcTemplate.update(sql, params, keyHolder, new String[] {"id"});
    Number key = keyHolder.getKey();
    if (key == null) {
      throw new IllegalStateException("质量检查已入队，但未返回执行编号");
    }
    return key.longValue();
  }

  public boolean markRunning(long id, LocalDateTime startedAt) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_execution
        SET execution_status = 'RUNNING', started_at = :startedAt,
            error_message = NULL
        WHERE id = :id AND execution_status = 'WAITING'
        """,
        new MapSqlParameterSource()
            .addValue("id", id)
            .addValue("startedAt", Timestamp.valueOf(startedAt))) == 1;
  }

  public boolean complete(
      long id,
      CheckResult checkResult,
      BigDecimal metricValue,
      BigDecimal metricValueEnd,
      String metricDisplay,
      String expectedDisplay,
      String executedSql,
      LocalDateTime finishedAt,
      long durationMs) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_execution
        SET execution_status = 'SUCCESS',
            check_result = :checkResult,
            metric_value = :metricValue,
            metric_value_end = :metricValueEnd,
            metric_display = :metricDisplay,
            expected_display = :expectedDisplay,
            executed_sql = :executedSql,
            error_message = NULL,
            finished_at = :finishedAt,
            duration_ms = :durationMs
        WHERE id = :id AND execution_status = 'RUNNING'
        """,
        new MapSqlParameterSource()
            .addValue("id", id)
            .addValue("checkResult", checkResult.name())
            .addValue("metricValue", metricValue)
            .addValue("metricValueEnd", metricValueEnd)
            .addValue("metricDisplay", metricDisplay)
            .addValue("expectedDisplay", expectedDisplay)
            .addValue("executedSql", executedSql)
            .addValue("finishedAt", Timestamp.valueOf(finishedAt))
            .addValue("durationMs", durationMs)) == 1;
  }

  public boolean fail(
      long id,
      String executedSql,
      String errorMessage,
      LocalDateTime finishedAt,
      long durationMs) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_execution
        SET execution_status = 'FAILED',
            check_result = 'UNKNOWN',
            executed_sql = :executedSql,
            error_message = :errorMessage,
            finished_at = :finishedAt,
            duration_ms = :durationMs
        WHERE id = :id AND execution_status IN ('WAITING', 'RUNNING')
        """,
        new MapSqlParameterSource()
            .addValue("id", id)
            .addValue("executedSql", executedSql)
            .addValue("errorMessage", errorMessage)
            .addValue("finishedAt", Timestamp.valueOf(finishedAt))
            .addValue("durationMs", durationMs)) == 1;
  }

  public List<Long> findWaitingIds(int limit) {
    return jdbcTemplate.queryForList(
        """
        SELECT id
        FROM yak_quality_execution
        WHERE execution_status = 'WAITING'
        ORDER BY queued_at ASC, id ASC
        LIMIT :limit
        """,
        new MapSqlParameterSource("limit", Math.max(1, limit)),
        Long.class);
  }

  public List<Long> findRunningRuleIds() {
    return jdbcTemplate.queryForList(
        """
        SELECT DISTINCT rule_id
        FROM yak_quality_execution
        WHERE execution_status = 'RUNNING'
        """,
        new MapSqlParameterSource(),
        Long.class);
  }

  public int recoverRunningAsFailed(String message, LocalDateTime finishedAt) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_execution
        SET execution_status = 'FAILED',
            check_result = 'UNKNOWN',
            error_message = :message,
            finished_at = :finishedAt,
            duration_ms = CASE
              WHEN started_at IS NULL THEN 0
              ELSE TIMESTAMPDIFF(MICROSECOND, started_at, :finishedAt) DIV 1000
            END
        WHERE execution_status = 'RUNNING'
        """,
        new MapSqlParameterSource()
            .addValue("message", message)
            .addValue("finishedAt", Timestamp.valueOf(finishedAt)));
  }

  private ExecutionView mapView(ResultSet rs, int rowNum) throws SQLException {
    return new ExecutionView(
        rs.getString("execution_no"),
        String.valueOf(rs.getLong("rule_id")),
        rs.getString("rule_name"),
        rs.getString("data_source_name"),
        rs.getString("object_name"),
        RuleType.valueOf(rs.getString("rule_type")),
        TriggerType.valueOf(rs.getString("trigger_type")),
        ExecutionStatus.valueOf(rs.getString("execution_status")),
        CheckResult.valueOf(rs.getString("check_result")),
        rs.getString("metric_display"),
        rs.getString("expected_display"),
        localDateTime(rs.getTimestamp("queued_at")),
        localDateTime(rs.getTimestamp("started_at")),
        localDateTime(rs.getTimestamp("finished_at")),
        nullableLong(rs, "duration_ms"),
        rs.getString("operator_name"),
        rs.getString("executed_sql"),
        rs.getString("error_message"));
  }

  private ExecutionRuntime mapRuntime(ResultSet rs, int rowNum) throws SQLException {
    return new ExecutionRuntime(
        rs.getLong("id"),
        rs.getString("execution_no"),
        rs.getLong("rule_id"),
        rs.getString("data_source_id"),
        rs.getString("catalog_name"),
        rs.getString("schema_name"),
        rs.getString("database_name"),
        rs.getString("table_name"),
        rs.getString("column_name"),
        RuleType.valueOf(rs.getString("rule_type")),
        ComparisonOperator.fromSymbol(rs.getString("comparison_operator")),
        rs.getBigDecimal("threshold_value"),
        rs.getBigDecimal("threshold_end"),
        rs.getString("unit"),
        rs.getString("custom_sql"),
        rs.getString("expected_display"));
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

  public record PageResult(List<ExecutionView> records, long total) {
  }

  public record ExecutionRuntime(
      long id,
      String executionNo,
      long ruleId,
      String dataSourceId,
      String catalogName,
      String schemaName,
      String databaseName,
      String tableName,
      String columnName,
      RuleType ruleType,
      ComparisonOperator operator,
      BigDecimal threshold,
      BigDecimal thresholdEnd,
      String unit,
      String customSql,
      String expectedDisplay) {
  }
}
