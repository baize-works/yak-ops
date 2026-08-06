package io.yak.ops.business.quality.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.quality.api.QualityApi.CheckResult;
import io.yak.ops.business.quality.api.QualityApi.ComparisonOperator;
import io.yak.ops.business.quality.api.QualityApi.MonitorListItem;
import io.yak.ops.business.quality.api.QualityApi.MonitorPageRequest;
import io.yak.ops.business.quality.api.QualityApi.MonitorView;
import io.yak.ops.business.quality.api.QualityApi.RuleScope;
import io.yak.ops.business.quality.api.QualityApi.RuleType;
import io.yak.ops.business.quality.api.QualityApi.RuleView;
import io.yak.ops.business.quality.api.QualityApi.TableMonitorSummary;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.execution.QualityRuntime.ExecutionJob;
import io.yak.ops.business.quality.execution.QualityRuntime.MonitorSnapshot;
import io.yak.ops.business.quality.execution.QualityRuntime.RuleSnapshot;
import io.yak.ops.business.quality.repository.QualityRepository.MonitorWrite;
import io.yak.ops.business.quality.repository.QualityRepository.PageResult;
import io.yak.ops.business.quality.repository.QualityRepository.RuleWrite;
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
class QualityMonitorRepository {

  private static final String MONITOR_COLUMNS = """
      m.id, m.monitor_name, m.description, m.data_source_id, m.data_source_name,
      m.database_name, m.schema_name, m.table_name, m.where_clause, m.owner,
      m.enabled, m.last_result, m.last_execution_no, m.last_run_time,
      m.created_at, m.updated_at,
      (SELECT COUNT(*) FROM yak_quality_rule r
         WHERE r.monitor_id = m.id AND r.deleted = 0) AS rule_count
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final QualityRepositorySupport support;
  private final RowMapper<MonitorListItem> monitorMapper = this::mapMonitor;
  private final RowMapper<RuleView> ruleMapper = this::mapRule;

  QualityMonitorRepository(
      @Qualifier("qualityJdbcTemplate") NamedParameterJdbcTemplate jdbcTemplate,
      ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.support = new QualityRepositorySupport(objectMapper);
  }

  PageResult<MonitorListItem> page(MonitorPageRequest request) {
    MonitorPageRequest normalized = request == null
        ? new MonitorPageRequest(null, null, null, null, null, null, null, null, null)
        : request;
    StringBuilder where = new StringBuilder(" WHERE m.deleted = 0");
    MapSqlParameterSource params = new MapSqlParameterSource();
    if (QualityRepositorySupport.hasText(normalized.keyword())) {
      where.append("""
           AND (LOWER(m.monitor_name) LIKE :keyword
             OR LOWER(COALESCE(m.description, '')) LIKE :keyword
             OR LOWER(m.data_source_name) LIKE :keyword
             OR LOWER(m.table_name) LIKE :keyword
             OR LOWER(m.owner) LIKE :keyword)
          """);
      params.addValue(
          "keyword", "%" + normalized.keyword().trim().toLowerCase() + "%");
    }
    if (normalized.dataSourceId() != null) {
      where.append(" AND m.data_source_id = :dataSourceId");
      params.addValue("dataSourceId", normalized.dataSourceId());
    }
    appendNullableFilter(
        where, params, "m.database_name", "databaseName", normalized.databaseName());
    appendNullableFilter(
        where, params, "m.schema_name", "schemaName", normalized.schemaName());
    if (QualityRepositorySupport.hasText(normalized.tableName())) {
      where.append(" AND m.table_name = :tableName");
      params.addValue("tableName", normalized.tableName().trim());
    }
    if (normalized.enabled() != null) {
      where.append(" AND m.enabled = :enabled");
      params.addValue("enabled", normalized.enabled());
    }
    if (normalized.lastResult() != null) {
      where.append(" AND m.last_result = :lastResult");
      params.addValue("lastResult", normalized.lastResult().name());
    }

    Long total = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM yak_quality_monitor m" + where,
        params,
        Long.class);
    params.addValue("limit", normalized.normalizedPageSize());
    params.addValue(
        "offset",
        (normalized.normalizedCurrent() - 1L) * normalized.normalizedPageSize());
    List<MonitorListItem> records = jdbcTemplate.query(
        "SELECT " + MONITOR_COLUMNS
            + " FROM yak_quality_monitor m"
            + where
            + " ORDER BY m.updated_at DESC, m.id DESC LIMIT :limit OFFSET :offset",
        params,
        monitorMapper);
    return new PageResult<>(records, total == null ? 0L : total);
  }

  Optional<MonitorView> find(long id) {
    try {
      MonitorListItem monitor = jdbcTemplate.queryForObject(
          "SELECT " + MONITOR_COLUMNS
              + " FROM yak_quality_monitor m WHERE m.id = :id AND m.deleted = 0",
          new MapSqlParameterSource("id", id),
          monitorMapper);
      if (monitor == null) {
        return Optional.empty();
      }
      String whereClause = jdbcTemplate.queryForObject(
          "SELECT where_clause FROM yak_quality_monitor WHERE id = :id AND deleted = 0",
          new MapSqlParameterSource("id", id),
          String.class);
      return Optional.of(new MonitorView(
          monitor.id(),
          monitor.name(),
          monitor.description(),
          monitor.dataSourceId(),
          monitor.dataSourceName(),
          monitor.databaseName(),
          monitor.schemaName(),
          monitor.tableName(),
          whereClause,
          monitor.owner(),
          monitor.enabled(),
          monitor.lastResult(),
          monitor.lastExecutionNo(),
          monitor.lastRunTime(),
          monitor.createTime(),
          monitor.updateTime(),
          listRules(id)));
    } catch (EmptyResultDataAccessException ignored) {
      return Optional.empty();
    }
  }

  List<TableMonitorSummary> tableSummaries(
      long dataSourceId,
      String databaseName,
      String schemaName) {
    StringBuilder where = new StringBuilder(
        " WHERE m.deleted = 0 AND m.data_source_id = :dataSourceId");
    MapSqlParameterSource params = new MapSqlParameterSource("dataSourceId", dataSourceId);
    appendNullableFilter(where, params, "m.database_name", "databaseName", databaseName);
    appendNullableFilter(where, params, "m.schema_name", "schemaName", schemaName);
    return jdbcTemplate.query(
        """
        SELECT m.table_name,
               MIN(m.id) AS monitor_id,
               MIN(m.monitor_name) AS monitor_name,
               COUNT(DISTINCT m.id) AS monitor_count,
               COUNT(r.id) AS rule_count,
               SUBSTRING_INDEX(
                 GROUP_CONCAT(m.last_result ORDER BY m.last_run_time DESC, m.id DESC),
                 ',', 1) AS last_result,
               MAX(m.last_run_time) AS last_run_time
        FROM yak_quality_monitor m
        LEFT JOIN yak_quality_rule r
          ON r.monitor_id = m.id AND r.deleted = 0
        """ + where
            + " GROUP BY m.table_name ORDER BY m.table_name ASC",
        params,
        (rs, rowNum) -> new TableMonitorSummary(
            rs.getString("table_name"),
            QualityRepositorySupport.nullableLong(rs, "monitor_id"),
            rs.getString("monitor_name"),
            rs.getInt("monitor_count"),
            rs.getInt("rule_count"),
            QualityRepositorySupport.checkResult(rs.getString("last_result")),
            QualityRepositorySupport.localDateTime(rs.getTimestamp("last_run_time"))));
  }

  boolean existsForTarget(
      Long excludeId,
      long dataSourceId,
      String databaseName,
      String schemaName,
      String tableName) {
    StringBuilder sql = new StringBuilder("""
        SELECT COUNT(*) FROM yak_quality_monitor
        WHERE deleted = 0
          AND data_source_id = :dataSourceId
          AND COALESCE(database_name, '') = COALESCE(:databaseName, '')
          AND COALESCE(schema_name, '') = COALESCE(:schemaName, '')
          AND table_name = :tableName
        """);
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("dataSourceId", dataSourceId)
        .addValue("databaseName", QualityRepositorySupport.trimToNull(databaseName))
        .addValue("schemaName", QualityRepositorySupport.trimToNull(schemaName))
        .addValue("tableName", tableName);
    if (excludeId != null) {
      sql.append(" AND id <> :excludeId");
      params.addValue("excludeId", excludeId);
    }
    Long count = jdbcTemplate.queryForObject(sql.toString(), params, Long.class);
    return count != null && count > 0;
  }

  long insert(MonitorWrite write) {
    KeyHolder keyHolder = new GeneratedKeyHolder();
    jdbcTemplate.update(
        """
        INSERT INTO yak_quality_monitor (
          monitor_name, description, data_source_id, data_source_name,
          database_name, schema_name, table_name, where_clause, owner, enabled
        ) VALUES (
          :name, :description, :dataSourceId, :dataSourceName,
          :databaseName, :schemaName, :tableName, :whereClause, :owner, :enabled
        )
        """,
        monitorParameters(write),
        keyHolder,
        new String[] {"id"});
    Number key = keyHolder.getKey();
    if (key == null) {
      throw new IllegalStateException("质量监控创建成功，但未返回监控编号");
    }
    return key.longValue();
  }

  boolean update(long id, MonitorWrite write) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_monitor
        SET monitor_name = :name,
            description = :description,
            data_source_id = :dataSourceId,
            data_source_name = :dataSourceName,
            database_name = :databaseName,
            schema_name = :schemaName,
            table_name = :tableName,
            where_clause = :whereClause,
            owner = :owner,
            enabled = :enabled
        WHERE id = :id AND deleted = 0
        """,
        monitorParameters(write).addValue("id", id)) == 1;
  }

  boolean delete(long id) {
    int affected = jdbcTemplate.update(
        "UPDATE yak_quality_monitor SET deleted = 1, enabled = 0"
            + " WHERE id = :id AND deleted = 0",
        new MapSqlParameterSource("id", id));
    if (affected == 1) {
      jdbcTemplate.update(
          "UPDATE yak_quality_rule SET deleted = 1, enabled = 0"
              + " WHERE monitor_id = :id AND deleted = 0",
          new MapSqlParameterSource("id", id));
    }
    return affected == 1;
  }

  void replaceRules(long monitorId, List<RuleWrite> rules) {
    jdbcTemplate.update(
        "UPDATE yak_quality_rule SET deleted = 1, enabled = 0"
            + " WHERE monitor_id = :monitorId AND deleted = 0",
        new MapSqlParameterSource("monitorId", monitorId));
    int order = 10;
    for (RuleWrite rule : rules) {
      jdbcTemplate.update(
          """
          INSERT INTO yak_quality_rule (
            monitor_id, template_id, template_code, rule_name, rule_type,
            rule_scope, quality_dimension, column_name, comparison_operator,
            threshold_value, threshold_end, enum_values_json, custom_sql,
            enabled, sort_order
          ) VALUES (
            :monitorId, :templateId, :templateCode, :name, :ruleType,
            :scope, :dimension, :columnName, :operator,
            :threshold, :thresholdEnd, :enumValuesJson, :customSql,
            :enabled, :sortOrder
          )
          """,
          new MapSqlParameterSource()
              .addValue("monitorId", monitorId)
              .addValue("templateId", rule.templateId())
              .addValue("templateCode", rule.templateCode())
              .addValue("name", rule.name())
              .addValue("ruleType", rule.ruleType().name())
              .addValue("scope", rule.scope().name())
              .addValue("dimension", rule.dimension())
              .addValue("columnName", QualityRepositorySupport.trimToNull(rule.columnName()))
              .addValue("operator", rule.operator().symbol())
              .addValue("threshold", rule.threshold())
              .addValue("thresholdEnd", rule.thresholdEnd())
              .addValue("enumValuesJson", support.writeJson(rule.enumValues()))
              .addValue("customSql", QualityRepositorySupport.trimToNull(rule.customSql()))
              .addValue("enabled", rule.enabled())
              .addValue("sortOrder", order));
      order += 10;
    }
  }

  List<RuleView> listRules(long monitorId) {
    return jdbcTemplate.query(
        """
        SELECT id, monitor_id, template_id, template_code, rule_name,
               rule_type, rule_scope, quality_dimension, column_name,
               comparison_operator, threshold_value, threshold_end,
               enum_values_json, custom_sql, enabled, sort_order
        FROM yak_quality_rule
        WHERE monitor_id = :monitorId AND deleted = 0
        ORDER BY sort_order ASC, id ASC
        """,
        new MapSqlParameterSource("monitorId", monitorId),
        ruleMapper);
  }

  ExecutionJob executionJob(long monitorId, long executionId, String executionNo) {
    MonitorView monitor = find(monitorId)
        .orElseThrow(() -> new IllegalArgumentException("质量监控不存在：" + monitorId));
    MonitorSnapshot snapshot = new MonitorSnapshot(
        monitor.id(),
        monitor.name(),
        monitor.dataSourceId(),
        monitor.dataSourceName(),
        monitor.databaseName(),
        monitor.schemaName(),
        monitor.tableName(),
        monitor.whereClause(),
        monitor.owner());
    List<RuleSnapshot> rules = monitor.rules().stream()
        .filter(RuleView::enabled)
        .map(rule -> new RuleSnapshot(
            rule.id(),
            rule.templateId(),
            rule.templateCode(),
            rule.name(),
            rule.ruleType(),
            rule.scope(),
            rule.dimension(),
            rule.columnName(),
            ComparisonOperator.fromValue(rule.operator()),
            rule.threshold(),
            rule.thresholdEnd(),
            rule.enumValues(),
            rule.customSql()))
        .toList();
    return new ExecutionJob(executionId, executionNo, snapshot, rules);
  }

  void lock(long monitorId) {
    try {
      jdbcTemplate.queryForObject(
          "SELECT id FROM yak_quality_monitor"
              + " WHERE id = :id AND deleted = 0 FOR UPDATE",
          new MapSqlParameterSource("id", monitorId),
          Long.class);
    } catch (EmptyResultDataAccessException exception) {
      throw new IllegalArgumentException("质量监控不存在：" + monitorId);
    }
  }

  boolean updateResult(
      long monitorId,
      String executionNo,
      CheckResult result,
      LocalDateTime runTime) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_monitor
        SET last_result = :lastResult,
            last_execution_no = :executionNo,
            last_run_time = :lastRunTime
        WHERE id = :monitorId AND deleted = 0
        """,
        new MapSqlParameterSource()
            .addValue("monitorId", monitorId)
            .addValue("lastResult", result.name())
            .addValue("executionNo", executionNo)
            .addValue("lastRunTime", Timestamp.valueOf(runTime))) == 1;
  }

  private MonitorListItem mapMonitor(ResultSet rs, int rowNum) throws SQLException {
    return new MonitorListItem(
        rs.getLong("id"),
        rs.getString("monitor_name"),
        rs.getString("description"),
        rs.getLong("data_source_id"),
        rs.getString("data_source_name"),
        rs.getString("database_name"),
        rs.getString("schema_name"),
        rs.getString("table_name"),
        rs.getString("owner"),
        rs.getBoolean("enabled"),
        rs.getInt("rule_count"),
        QualityRepositorySupport.checkResult(rs.getString("last_result")),
        rs.getString("last_execution_no"),
        QualityRepositorySupport.localDateTime(rs.getTimestamp("last_run_time")),
        QualityRepositorySupport.localDateTime(rs.getTimestamp("created_at")),
        QualityRepositorySupport.localDateTime(rs.getTimestamp("updated_at")));
  }

  private RuleView mapRule(ResultSet rs, int rowNum) throws SQLException {
    return new RuleView(
        rs.getLong("id"),
        rs.getLong("monitor_id"),
        rs.getLong("template_id"),
        rs.getString("template_code"),
        rs.getString("rule_name"),
        RuleType.valueOf(rs.getString("rule_type")),
        RuleScope.valueOf(rs.getString("rule_scope")),
        rs.getString("quality_dimension"),
        rs.getString("column_name"),
        rs.getString("comparison_operator"),
        rs.getBigDecimal("threshold_value"),
        rs.getBigDecimal("threshold_end"),
        support.readJsonList(rs.getString("enum_values_json")),
        rs.getString("custom_sql"),
        rs.getBoolean("enabled"),
        rs.getInt("sort_order"));
  }

  private MapSqlParameterSource monitorParameters(MonitorWrite write) {
    return new MapSqlParameterSource()
        .addValue("name", write.name())
        .addValue("description", QualityRepositorySupport.trimToNull(write.description()))
        .addValue("dataSourceId", write.dataSourceId())
        .addValue("dataSourceName", write.dataSourceName())
        .addValue("databaseName", QualityRepositorySupport.trimToNull(write.databaseName()))
        .addValue("schemaName", QualityRepositorySupport.trimToNull(write.schemaName()))
        .addValue("tableName", write.tableName())
        .addValue("whereClause", QualityRepositorySupport.trimToNull(write.whereClause()))
        .addValue("owner", write.owner())
        .addValue("enabled", write.enabled());
  }

  private void appendNullableFilter(
      StringBuilder where,
      MapSqlParameterSource params,
      String column,
      String parameter,
      String value) {
    if (value == null) {
      return;
    }
    String normalized = QualityRepositorySupport.trimToNull(value);
    if (normalized == null) {
      where.append(" AND COALESCE(").append(column).append(", '') = ''");
    } else {
      where.append(" AND ").append(column).append(" = :").append(parameter);
      params.addValue(parameter, normalized);
    }
  }
}
