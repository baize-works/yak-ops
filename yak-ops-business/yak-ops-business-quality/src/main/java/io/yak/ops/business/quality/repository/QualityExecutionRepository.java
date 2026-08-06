package io.yak.ops.business.quality.repository;

import io.yak.ops.business.quality.api.QualityApi.CheckResult;
import io.yak.ops.business.quality.api.QualityApi.ExecutionListItem;
import io.yak.ops.business.quality.api.QualityApi.ExecutionPageRequest;
import io.yak.ops.business.quality.api.QualityApi.ExecutionStatus;
import io.yak.ops.business.quality.api.QualityApi.ExecutionView;
import io.yak.ops.business.quality.api.QualityApi.MonitorView;
import io.yak.ops.business.quality.api.QualityApi.RuleExecutionView;
import io.yak.ops.business.quality.api.QualityApi.RuleType;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.repository.QualityRepository.PageResult;
import io.yak.ops.business.quality.repository.QualityRepository.RuleExecutionWrite;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@ConditionalOnQualityEnabled
@Repository
class QualityExecutionRepository {

  private static final String EXECUTION_COLUMNS = """
      id, execution_no, monitor_id, monitor_name, data_source_id,
      data_source_name, database_name, schema_name, table_name, object_name,
      execution_status, check_result, total_rules, passed_rules, failed_rules,
      error_rules, operator_name, queued_at, started_at, finished_at,
      duration_ms, error_message
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final RowMapper<ExecutionListItem> executionMapper = this::mapExecution;
  private final RowMapper<RuleExecutionView> ruleExecutionMapper = this::mapRuleExecution;

  QualityExecutionRepository(
      @Qualifier("qualityJdbcTemplate") NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  boolean hasActive(long monitorId) {
    Long count = jdbcTemplate.queryForObject(
        """
        SELECT COUNT(*) FROM yak_quality_execution
        WHERE monitor_id = :monitorId
          AND execution_status IN ('WAITING', 'RUNNING')
        """,
        new MapSqlParameterSource("monitorId", monitorId),
        Long.class);
    return count != null && count > 0;
  }

  long insert(
      String executionNo,
      MonitorView monitor,
      int totalRules,
      String operator,
      LocalDateTime queuedAt) {
    KeyHolder keyHolder = new GeneratedKeyHolder();
    jdbcTemplate.update(
        """
        INSERT INTO yak_quality_execution (
          execution_no, monitor_id, monitor_name, data_source_id,
          data_source_name, database_name, schema_name, table_name,
          object_name, trigger_type, execution_status, check_result,
          total_rules, operator_name, queued_at
        ) VALUES (
          :executionNo, :monitorId, :monitorName, :dataSourceId,
          :dataSourceName, :databaseName, :schemaName, :tableName,
          :objectName, 'MANUAL', 'WAITING', 'RUNNING',
          :totalRules, :operatorName, :queuedAt
        )
        """,
        new MapSqlParameterSource()
            .addValue("executionNo", executionNo)
            .addValue("monitorId", monitor.id())
            .addValue("monitorName", monitor.name())
            .addValue("dataSourceId", monitor.dataSourceId())
            .addValue("dataSourceName", monitor.dataSourceName())
            .addValue("databaseName", monitor.databaseName())
            .addValue("schemaName", monitor.schemaName())
            .addValue("tableName", monitor.tableName())
            .addValue("objectName", QualityRepositorySupport.objectName(
                monitor.databaseName(), monitor.schemaName(), monitor.tableName()))
            .addValue("totalRules", totalRules)
            .addValue("operatorName", operator)
            .addValue("queuedAt", Timestamp.valueOf(queuedAt)),
        keyHolder,
        new String[] {"id"});
    Number key = keyHolder.getKey();
    if (key == null) {
      throw new IllegalStateException("质量检查已创建，但未返回执行编号");
    }
    return key.longValue();
  }

  boolean markRunning(long id, LocalDateTime startedAt) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_execution
        SET execution_status = 'RUNNING', check_result = 'RUNNING',
            started_at = :startedAt, error_message = NULL
        WHERE id = :id AND execution_status = 'WAITING'
        """,
        new MapSqlParameterSource()
            .addValue("id", id)
            .addValue("startedAt", Timestamp.valueOf(startedAt))) == 1;
  }

  void insertRule(RuleExecutionWrite write) {
    jdbcTemplate.update(
        """
        INSERT INTO yak_quality_rule_execution (
          execution_id, rule_id, rule_name, template_code, rule_type,
          column_name, check_result, metric_value, expected_value,
          executed_sql, error_message, duration_ms
        ) VALUES (
          :executionId, :ruleId, :ruleName, :templateCode, :ruleType,
          :columnName, :checkResult, :metricValue, :expectedValue,
          :executedSql, :errorMessage, :durationMs
        )
        """,
        new MapSqlParameterSource()
            .addValue("executionId", write.executionId())
            .addValue("ruleId", write.ruleId())
            .addValue("ruleName", write.ruleName())
            .addValue("templateCode", write.templateCode())
            .addValue("ruleType", write.ruleType().name())
            .addValue("columnName", QualityRepositorySupport.trimToNull(write.columnName()))
            .addValue("checkResult", write.checkResult().name())
            .addValue("metricValue", write.metricValue())
            .addValue("expectedValue", write.expectedValue())
            .addValue("executedSql", write.executedSql())
            .addValue("errorMessage", write.errorMessage())
            .addValue("durationMs", write.durationMs()));
  }

  boolean complete(
      long id,
      CheckResult result,
      int passedRules,
      int failedRules,
      int errorRules,
      LocalDateTime finishedAt,
      long durationMs) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_execution
        SET execution_status = 'SUCCESS', check_result = :checkResult,
            passed_rules = :passedRules, failed_rules = :failedRules,
            error_rules = :errorRules, finished_at = :finishedAt,
            duration_ms = :durationMs, error_message = NULL
        WHERE id = :id AND execution_status = 'RUNNING'
        """,
        new MapSqlParameterSource()
            .addValue("id", id)
            .addValue("checkResult", result.name())
            .addValue("passedRules", passedRules)
            .addValue("failedRules", failedRules)
            .addValue("errorRules", errorRules)
            .addValue("finishedAt", Timestamp.valueOf(finishedAt))
            .addValue("durationMs", durationMs)) == 1;
  }

  boolean fail(
      long id,
      String errorMessage,
      LocalDateTime finishedAt,
      long durationMs) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_execution
        SET execution_status = 'FAILED', check_result = 'ERROR',
            error_message = :errorMessage, finished_at = :finishedAt,
            duration_ms = :durationMs
        WHERE id = :id AND execution_status IN ('WAITING', 'RUNNING')
        """,
        new MapSqlParameterSource()
            .addValue("id", id)
            .addValue("errorMessage", errorMessage)
            .addValue("finishedAt", Timestamp.valueOf(finishedAt))
            .addValue("durationMs", durationMs)) == 1;
  }

  PageResult<ExecutionListItem> page(ExecutionPageRequest request) {
    ExecutionPageRequest normalized = request == null
        ? new ExecutionPageRequest(null, null, null, null, null, null)
        : request;
    StringBuilder where = new StringBuilder(" WHERE 1 = 1");
    MapSqlParameterSource params = new MapSqlParameterSource();
    if (QualityRepositorySupport.hasText(normalized.keyword())) {
      where.append("""
           AND (LOWER(execution_no) LIKE :keyword
             OR LOWER(monitor_name) LIKE :keyword
             OR LOWER(data_source_name) LIKE :keyword
             OR LOWER(object_name) LIKE :keyword)
          """);
      params.addValue(
          "keyword", "%" + normalized.keyword().trim().toLowerCase() + "%");
    }
    if (normalized.monitorId() != null) {
      where.append(" AND monitor_id = :monitorId");
      params.addValue("monitorId", normalized.monitorId());
    }
    if (normalized.executionStatus() != null) {
      where.append(" AND execution_status = :executionStatus");
      params.addValue("executionStatus", normalized.executionStatus().name());
    }
    if (normalized.checkResult() != null) {
      where.append(" AND check_result = :checkResult");
      params.addValue("checkResult", normalized.checkResult().name());
    }
    Long total = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM yak_quality_execution" + where,
        params,
        Long.class);
    params.addValue("limit", normalized.normalizedPageSize());
    params.addValue(
        "offset",
        (normalized.normalizedCurrent() - 1L) * normalized.normalizedPageSize());
    List<ExecutionListItem> records = jdbcTemplate.query(
        "SELECT " + EXECUTION_COLUMNS
            + " FROM yak_quality_execution"
            + where
            + " ORDER BY queued_at DESC, id DESC LIMIT :limit OFFSET :offset",
        params,
        executionMapper);
    return new PageResult<>(records, total == null ? 0L : total);
  }

  Optional<ExecutionView> find(String executionNo) {
    try {
      ExecutionRecord record = jdbcTemplate.queryForObject(
          "SELECT " + EXECUTION_COLUMNS
              + " FROM yak_quality_execution WHERE execution_no = :executionNo",
          new MapSqlParameterSource("executionNo", executionNo),
          this::mapRecord);
      if (record == null) {
        return Optional.empty();
      }
      List<RuleExecutionView> rules = jdbcTemplate.query(
          """
          SELECT id, rule_id, rule_name, template_code, rule_type,
                 column_name, check_result, metric_value, expected_value,
                 executed_sql, error_message, duration_ms
          FROM yak_quality_rule_execution
          WHERE execution_id = :executionId
          ORDER BY id ASC
          """,
          new MapSqlParameterSource("executionId", record.id()),
          ruleExecutionMapper);
      ExecutionListItem item = record.item();
      return Optional.of(new ExecutionView(
          item.executionNo(),
          item.monitorId(),
          item.monitorName(),
          item.dataSourceName(),
          record.databaseName(),
          record.schemaName(),
          record.tableName(),
          item.objectName(),
          item.executionStatus(),
          item.checkResult(),
          item.totalRules(),
          item.passedRules(),
          item.failedRules(),
          item.errorRules(),
          item.operator(),
          item.queuedAt(),
          item.startedAt(),
          item.finishedAt(),
          item.durationMs(),
          item.errorMessage(),
          rules));
    } catch (EmptyResultDataAccessException ignored) {
      return Optional.empty();
    }
  }

  private ExecutionRecord mapRecord(ResultSet rs, int rowNum) throws SQLException {
    return new ExecutionRecord(
        rs.getLong("id"),
        rs.getString("database_name"),
        rs.getString("schema_name"),
        rs.getString("table_name"),
        mapExecution(rs, rowNum));
  }

  private ExecutionListItem mapExecution(ResultSet rs, int rowNum) throws SQLException {
    return new ExecutionListItem(
        rs.getString("execution_no"),
        rs.getLong("monitor_id"),
        rs.getString("monitor_name"),
        rs.getString("data_source_name"),
        rs.getString("object_name"),
        ExecutionStatus.valueOf(rs.getString("execution_status")),
        QualityRepositorySupport.checkResult(rs.getString("check_result")),
        rs.getInt("total_rules"),
        rs.getInt("passed_rules"),
        rs.getInt("failed_rules"),
        rs.getInt("error_rules"),
        rs.getString("operator_name"),
        QualityRepositorySupport.localDateTime(rs.getTimestamp("queued_at")),
        QualityRepositorySupport.localDateTime(rs.getTimestamp("started_at")),
        QualityRepositorySupport.localDateTime(rs.getTimestamp("finished_at")),
        QualityRepositorySupport.nullableLong(rs, "duration_ms"),
        rs.getString("error_message"));
  }

  private RuleExecutionView mapRuleExecution(ResultSet rs, int rowNum) throws SQLException {
    return new RuleExecutionView(
        rs.getLong("id"),
        rs.getLong("rule_id"),
        rs.getString("rule_name"),
        rs.getString("template_code"),
        RuleType.valueOf(rs.getString("rule_type")),
        rs.getString("column_name"),
        QualityRepositorySupport.checkResult(rs.getString("check_result")),
        rs.getString("metric_value"),
        rs.getString("expected_value"),
        rs.getString("executed_sql"),
        rs.getString("error_message"),
        QualityRepositorySupport.nullableLong(rs, "duration_ms"));
  }

  private record ExecutionRecord(
      long id,
      String databaseName,
      String schemaName,
      String tableName,
      ExecutionListItem item) {
  }
}
