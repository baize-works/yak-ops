package io.yak.ops.business.quality.repository;

import io.yak.ops.business.quality.api.QualityApi.CheckResult;
import io.yak.ops.business.quality.api.QualityApi.ExecutionStatus;
import io.yak.ops.business.quality.api.QualityApi.RuleType;
import io.yak.ops.business.quality.api.QualityApi.TriggerType;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.ExecutionListItem;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.ExecutionPageRequest;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.ExecutionView;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.RuleExecutionListItem;
import io.yak.ops.business.quality.api.QualityExecutionWorkspaceApi.RuleExecutionView;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@ConditionalOnQualityEnabled
@Repository
public class QualityExecutionWorkspaceRepository {

  private static final String EXECUTION_COLUMNS = """
      e.id, e.execution_no, e.monitor_id, e.monitor_name, e.data_source_id,
      e.data_source_name, e.database_name, e.schema_name, e.table_name,
      e.object_name, e.trigger_type, e.execution_status, e.check_result,
      e.total_rules, e.passed_rules, e.failed_rules, e.error_rules,
      e.operator_name, e.queued_at, e.started_at, e.finished_at,
      e.duration_ms, e.error_message
      """;

  private static final String RULE_EXECUTION_COLUMNS = """
      r.id AS rule_execution_id, r.rule_id, r.rule_name, r.template_code,
      r.rule_type, r.column_name, r.check_result AS rule_check_result,
      r.metric_value, r.expected_value, r.duration_ms AS rule_duration_ms,
      r.error_message AS rule_error_message,
      e.execution_no, e.monitor_id, e.monitor_name, e.data_source_id,
      e.data_source_name, e.database_name, e.schema_name, e.table_name,
      e.object_name, e.trigger_type, e.execution_status, e.operator_name,
      e.queued_at, e.started_at, e.finished_at
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final RowMapper<ExecutionListItem> executionMapper = this::mapExecution;
  private final RowMapper<RuleExecutionListItem> ruleListMapper = this::mapRuleListItem;
  private final RowMapper<RuleExecutionView> ruleExecutionMapper = this::mapRuleExecution;

  public QualityExecutionWorkspaceRepository(
      @Qualifier("qualityJdbcTemplate") NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public PageResult<ExecutionListItem> page(ExecutionPageRequest request) {
    ExecutionPageRequest normalized = normalize(request);
    StringBuilder where = new StringBuilder(" WHERE 1 = 1");
    MapSqlParameterSource params = new MapSqlParameterSource();
    appendFilters(normalized, where, params, false);

    Long total = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM yak_quality_execution e" + where,
        params,
        Long.class);
    appendPagination(normalized, params);

    List<ExecutionListItem> records = jdbcTemplate.query(
        "SELECT " + EXECUTION_COLUMNS
            + " FROM yak_quality_execution e"
            + where
            + " ORDER BY e.queued_at DESC, e.id DESC LIMIT :limit OFFSET :offset",
        params,
        executionMapper);
    return new PageResult<>(records, total == null ? 0L : total);
  }

  public PageResult<RuleExecutionListItem> pageRules(ExecutionPageRequest request) {
    ExecutionPageRequest normalized = normalize(request);
    StringBuilder where = new StringBuilder(" WHERE 1 = 1");
    MapSqlParameterSource params = new MapSqlParameterSource();
    appendFilters(normalized, where, params, true);

    String from = " FROM yak_quality_rule_execution r"
        + " INNER JOIN yak_quality_execution e ON e.id = r.execution_id";
    Long total = jdbcTemplate.queryForObject(
        "SELECT COUNT(*)" + from + where,
        params,
        Long.class);
    appendPagination(normalized, params);

    List<RuleExecutionListItem> records = jdbcTemplate.query(
        "SELECT " + RULE_EXECUTION_COLUMNS
            + from
            + where
            + " ORDER BY e.queued_at DESC, e.id DESC, r.id ASC"
            + " LIMIT :limit OFFSET :offset",
        params,
        ruleListMapper);
    return new PageResult<>(records, total == null ? 0L : total);
  }

  public Optional<ExecutionView> find(String executionNo) {
    try {
      ExecutionRecord record = jdbcTemplate.queryForObject(
          "SELECT " + EXECUTION_COLUMNS
              + " FROM yak_quality_execution e WHERE e.execution_no = :executionNo",
          new MapSqlParameterSource("executionNo", executionNo),
          this::mapRecord);
      if (record == null) {
        return Optional.empty();
      }

      List<RuleExecutionView> rules = jdbcTemplate.query(
          """
          SELECT id, rule_id, rule_name, template_code, rule_type,
                 column_name, check_result, metric_value, expected_value,
                 executed_sql, error_message, duration_ms, created_at
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
          item.dataSourceId(),
          item.dataSourceName(),
          record.databaseName(),
          record.schemaName(),
          record.tableName(),
          item.objectName(),
          item.triggerType(),
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

  private static ExecutionPageRequest normalize(ExecutionPageRequest request) {
    return request == null
        ? new ExecutionPageRequest(
            1, 20, null, null, null, null, null, null, null, null,
            null, null, null, null)
        : request;
  }

  private static void appendPagination(
      ExecutionPageRequest request,
      MapSqlParameterSource params) {
    params.addValue("limit", request.normalizedPageSize());
    params.addValue(
        "offset",
        (request.normalizedCurrent() - 1L) * request.normalizedPageSize());
  }

  private static void appendFilters(
      ExecutionPageRequest request,
      StringBuilder where,
      MapSqlParameterSource params,
      boolean ruleMode) {
    if (QualityRepositorySupport.hasText(request.keyword())) {
      where.append(ruleMode
          ? """
             AND (LOWER(e.execution_no) LIKE :keyword
               OR LOWER(e.monitor_name) LIKE :keyword
               OR LOWER(r.rule_name) LIKE :keyword
               OR LOWER(r.template_code) LIKE :keyword)
            """
          : """
             AND (LOWER(e.execution_no) LIKE :keyword
               OR LOWER(e.monitor_name) LIKE :keyword)
            """);
      params.addValue(
          "keyword", "%" + request.keyword().trim().toLowerCase() + "%");
    }
    if (QualityRepositorySupport.hasText(request.objectKeyword())) {
      where.append("""
           AND (LOWER(e.object_name) LIKE :objectKeyword
             OR LOWER(e.table_name) LIKE :objectKeyword
             OR LOWER(e.data_source_name) LIKE :objectKeyword)
          """);
      params.addValue(
          "objectKeyword",
          "%" + request.objectKeyword().trim().toLowerCase() + "%");
    }
    if (request.dataSourceId() != null) {
      where.append(" AND e.data_source_id = :dataSourceId");
      params.addValue("dataSourceId", request.dataSourceId());
    }
    if (request.monitorId() != null) {
      where.append(" AND e.monitor_id = :monitorId");
      params.addValue("monitorId", request.monitorId());
    }
    if (request.executionStatus() != null) {
      where.append(" AND e.execution_status = :executionStatus");
      params.addValue("executionStatus", request.executionStatus().name());
    }
    if (request.checkResult() != null) {
      where.append(ruleMode
          ? " AND r.check_result = :checkResult"
          : " AND e.check_result = :checkResult");
      params.addValue("checkResult", request.checkResult().name());
    }
    if (request.triggerType() != null) {
      where.append(" AND e.trigger_type = :triggerType");
      params.addValue("triggerType", request.triggerType().name());
    }
    if (request.hasIssues() != null) {
      if (ruleMode) {
        where.append(request.hasIssues()
            ? " AND r.check_result IN ('NOT_PASSED', 'ERROR')"
            : " AND r.check_result NOT IN ('NOT_PASSED', 'ERROR')");
      } else {
        where.append(request.hasIssues()
            ? " AND (e.failed_rules + e.error_rules) > 0"
            : " AND (e.failed_rules + e.error_rules) = 0");
      }
    }
    if (request.queuedAfter() != null) {
      where.append(" AND e.queued_at >= :queuedAfter");
      params.addValue("queuedAfter", Timestamp.valueOf(request.queuedAfter()));
    }
    if (request.queuedBefore() != null) {
      where.append(" AND e.queued_at <= :queuedBefore");
      params.addValue("queuedBefore", Timestamp.valueOf(request.queuedBefore()));
    }

    List<String> ruleTypes = matchingRuleTypes(request);
    boolean hasRuleTypeFilter = QualityRepositorySupport.hasText(request.dimension())
        || request.scope() != null;
    if (hasRuleTypeFilter && ruleTypes.isEmpty()) {
      where.append(" AND 1 = 0");
    } else if (hasRuleTypeFilter) {
      params.addValue("ruleTypes", ruleTypes);
      where.append(ruleMode
          ? " AND r.rule_type IN (:ruleTypes)"
          : """
             AND EXISTS (
               SELECT 1 FROM yak_quality_rule_execution rf
               WHERE rf.execution_id = e.id AND rf.rule_type IN (:ruleTypes)
             )
            """);
    }
  }

  private static List<String> matchingRuleTypes(ExecutionPageRequest request) {
    List<String> types = new ArrayList<>();
    for (RuleType type : RuleType.values()) {
      boolean dimensionMatches = !QualityRepositorySupport.hasText(request.dimension())
          || type.dimension().equals(request.dimension().trim());
      boolean scopeMatches = request.scope() == null || type.scope() == request.scope();
      if (dimensionMatches && scopeMatches) {
        types.add(type.name());
      }
    }
    return types;
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
        rs.getLong("data_source_id"),
        rs.getString("data_source_name"),
        rs.getString("object_name"),
        TriggerType.valueOf(rs.getString("trigger_type")),
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

  private RuleExecutionListItem mapRuleListItem(ResultSet rs, int rowNum)
      throws SQLException {
    RuleType ruleType = RuleType.valueOf(rs.getString("rule_type"));
    return new RuleExecutionListItem(
        rs.getLong("rule_execution_id"),
        rs.getLong("rule_id"),
        rs.getString("execution_no"),
        rs.getLong("monitor_id"),
        rs.getString("monitor_name"),
        rs.getLong("data_source_id"),
        rs.getString("data_source_name"),
        rs.getString("database_name"),
        rs.getString("schema_name"),
        rs.getString("table_name"),
        rs.getString("object_name"),
        rs.getString("rule_name"),
        rs.getString("template_code"),
        ruleType,
        ruleType.scope(),
        ruleType.dimension(),
        rs.getString("column_name"),
        TriggerType.valueOf(rs.getString("trigger_type")),
        ExecutionStatus.valueOf(rs.getString("execution_status")),
        QualityRepositorySupport.checkResult(rs.getString("rule_check_result")),
        rs.getString("metric_value"),
        rs.getString("expected_value"),
        rs.getString("operator_name"),
        QualityRepositorySupport.localDateTime(rs.getTimestamp("queued_at")),
        QualityRepositorySupport.localDateTime(rs.getTimestamp("started_at")),
        QualityRepositorySupport.localDateTime(rs.getTimestamp("finished_at")),
        QualityRepositorySupport.nullableLong(rs, "rule_duration_ms"),
        rs.getString("rule_error_message"));
  }

  private RuleExecutionView mapRuleExecution(ResultSet rs, int rowNum) throws SQLException {
    RuleType ruleType = RuleType.valueOf(rs.getString("rule_type"));
    CheckResult checkResult = QualityRepositorySupport.checkResult(
        rs.getString("check_result"));
    return new RuleExecutionView(
        rs.getLong("id"),
        rs.getLong("rule_id"),
        rs.getString("rule_name"),
        rs.getString("template_code"),
        ruleType,
        ruleType.scope(),
        ruleType.dimension(),
        rs.getString("column_name"),
        checkResult,
        rs.getString("metric_value"),
        rs.getString("expected_value"),
        rs.getString("executed_sql"),
        rs.getString("error_message"),
        QualityRepositorySupport.nullableLong(rs, "duration_ms"),
        QualityRepositorySupport.localDateTime(rs.getTimestamp("created_at")));
  }

  public record PageResult<T>(List<T> records, long total) {
  }

  private record ExecutionRecord(
      long id,
      String databaseName,
      String schemaName,
      String tableName,
      ExecutionListItem item) {
  }
}
