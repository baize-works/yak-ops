package io.yak.ops.business.quality.repository;

import io.yak.ops.business.quality.api.QualityWorkspaceApi.ColumnReport;
import io.yak.ops.business.quality.api.QualityWorkspaceApi.DimensionReport;
import io.yak.ops.business.quality.api.QualityWorkspaceApi.OperationLogItem;
import io.yak.ops.business.quality.api.QualityWorkspaceApi.ReportOverview;
import io.yak.ops.business.quality.api.QualityWorkspaceApi.TrendPoint;
import io.yak.ops.business.quality.api.QualityWorkspaceApi.WorkspaceStats;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@ConditionalOnQualityEnabled
@Repository
public class QualityWorkspaceRepository {

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public QualityWorkspaceRepository(
      @Qualifier("qualityJdbcTemplate") NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public WorkspaceStats stats(long monitorId) {
    MapSqlParameterSource params = new MapSqlParameterSource("monitorId", monitorId);
    return jdbcTemplate.queryForObject(
        """
        SELECT
          (SELECT COUNT(*) FROM yak_quality_rule r
             WHERE r.monitor_id = :monitorId AND r.deleted = 0) AS rule_count,
          (SELECT COUNT(*) FROM yak_quality_rule r
             WHERE r.monitor_id = :monitorId AND r.deleted = 0 AND r.enabled = 1)
             AS enabled_rule_count,
          (SELECT COUNT(*) FROM yak_quality_execution e
             WHERE e.monitor_id = :monitorId) AS execution_count,
          (SELECT COUNT(*) FROM yak_quality_execution e
             WHERE e.monitor_id = :monitorId
               AND e.check_result IN ('NOT_PASSED', 'ERROR')) AS issue_execution_count,
          (SELECT MAX(e.queued_at) FROM yak_quality_execution e
             WHERE e.monitor_id = :monitorId) AS latest_execution_time
        """,
        params,
        (rs, rowNum) -> new WorkspaceStats(
            rs.getInt("rule_count"),
            rs.getInt("enabled_rule_count"),
            rs.getInt("execution_count"),
            rs.getInt("issue_execution_count"),
            localDateTime(rs.getTimestamp("latest_execution_time"))));
  }

  public ReportOverview overview(
      long monitorId,
      LocalDateTime reportStart,
      LocalDateTime reportEnd) {
    MapSqlParameterSource params = reportParams(monitorId, reportStart, reportEnd);
    return jdbcTemplate.queryForObject(
        """
        SELECT
          (SELECT COUNT(*) FROM yak_quality_rule r
             WHERE r.monitor_id = :monitorId AND r.deleted = 0) AS total_rules,
          (SELECT COUNT(*) FROM yak_quality_rule r
             WHERE r.monitor_id = :monitorId AND r.deleted = 0 AND r.enabled = 1)
             AS enabled_rules,
          SUM(CASE WHEN re.check_result <> 'NOT_RUN' THEN 1 ELSE 0 END)
             AS executed_rules,
          SUM(CASE WHEN re.check_result = 'NOT_PASSED' THEN 1 ELSE 0 END)
             AS issue_rules,
          SUM(CASE WHEN re.check_result = 'ERROR' THEN 1 ELSE 0 END)
             AS error_rules,
          SUM(CASE WHEN re.check_result = 'PASSED' THEN 1 ELSE 0 END)
             AS passed_rules
        FROM yak_quality_execution e
        LEFT JOIN yak_quality_rule_execution re ON re.execution_id = e.id
        WHERE e.monitor_id = :monitorId
          AND e.queued_at >= :reportStart
          AND e.queued_at < :reportEnd
        """,
        params,
        (rs, rowNum) -> {
          int executed = rs.getInt("executed_rules");
          int passed = rs.getInt("passed_rules");
          return new ReportOverview(
              rs.getInt("total_rules"),
              rs.getInt("enabled_rules"),
              executed,
              rs.getInt("issue_rules"),
              rs.getInt("error_rules"),
              rate(passed, executed));
        });
  }

  public List<DimensionReport> dimensions(
      long monitorId,
      LocalDateTime reportStart,
      LocalDateTime reportEnd) {
    return jdbcTemplate.query(
        """
        SELECT d.dimension,
               COALESCE(a.total_count, 0) AS total_count,
               COALESCE(a.passed_count, 0) AS passed_count,
               COALESCE(a.not_passed_count, 0) AS not_passed_count,
               COALESCE(a.error_count, 0) AS error_count
        FROM (
          SELECT DISTINCT COALESCE(NULLIF(quality_dimension, ''), '其他') AS dimension
          FROM yak_quality_rule
          WHERE monitor_id = :monitorId AND deleted = 0
        ) d
        LEFT JOIN (
          SELECT COALESCE(NULLIF(r.quality_dimension, ''), '其他') AS dimension,
                 SUM(CASE WHEN re.check_result <> 'NOT_RUN' THEN 1 ELSE 0 END)
                    AS total_count,
                 SUM(CASE WHEN re.check_result = 'PASSED' THEN 1 ELSE 0 END)
                    AS passed_count,
                 SUM(CASE WHEN re.check_result = 'NOT_PASSED' THEN 1 ELSE 0 END)
                    AS not_passed_count,
                 SUM(CASE WHEN re.check_result = 'ERROR' THEN 1 ELSE 0 END)
                    AS error_count
          FROM yak_quality_rule_execution re
          JOIN yak_quality_execution e ON e.id = re.execution_id
          LEFT JOIN yak_quality_rule r ON r.id = re.rule_id
          WHERE e.monitor_id = :monitorId
            AND e.queued_at >= :reportStart
            AND e.queued_at < :reportEnd
          GROUP BY COALESCE(NULLIF(r.quality_dimension, ''), '其他')
        ) a ON a.dimension = d.dimension
        ORDER BY FIELD(d.dimension, '完整性', '准确性', '一致性', '唯一性', '时效性', '有效性'),
                 d.dimension
        """,
        reportParams(monitorId, reportStart, reportEnd),
        (rs, rowNum) -> {
          int total = rs.getInt("total_count");
          int passed = rs.getInt("passed_count");
          return new DimensionReport(
              rs.getString("dimension"),
              total,
              passed,
              rs.getInt("not_passed_count"),
              rs.getInt("error_count"),
              rate(passed, total));
        });
  }

  public List<TrendPoint> trend(
      long monitorId,
      LocalDateTime trendStart,
      LocalDateTime reportEnd) {
    return jdbcTemplate.query(
        """
        SELECT DATE(e.queued_at) AS report_date,
               COALESCE(NULLIF(r.quality_dimension, ''), '其他') AS dimension,
               SUM(CASE WHEN re.check_result <> 'NOT_RUN' THEN 1 ELSE 0 END)
                  AS total_count,
               SUM(CASE WHEN re.check_result = 'PASSED' THEN 1 ELSE 0 END)
                  AS passed_count,
               SUM(CASE WHEN re.check_result IN ('NOT_PASSED', 'ERROR') THEN 1 ELSE 0 END)
                  AS issue_count
        FROM yak_quality_rule_execution re
        JOIN yak_quality_execution e ON e.id = re.execution_id
        LEFT JOIN yak_quality_rule r ON r.id = re.rule_id
        WHERE e.monitor_id = :monitorId
          AND e.queued_at >= :trendStart
          AND e.queued_at < :reportEnd
        GROUP BY DATE(e.queued_at),
                 COALESCE(NULLIF(r.quality_dimension, ''), '其他')
        ORDER BY report_date ASC, dimension ASC
        """,
        new MapSqlParameterSource()
            .addValue("monitorId", monitorId)
            .addValue("trendStart", Timestamp.valueOf(trendStart))
            .addValue("reportEnd", Timestamp.valueOf(reportEnd)),
        (rs, rowNum) -> {
          int total = rs.getInt("total_count");
          int passed = rs.getInt("passed_count");
          return new TrendPoint(
              rs.getDate("report_date").toLocalDate(),
              rs.getString("dimension"),
              total,
              passed,
              rs.getInt("issue_count"),
              rate(passed, total));
        });
  }

  public List<ColumnReport> columns(
      long monitorId,
      LocalDateTime reportStart,
      LocalDateTime reportEnd) {
    return jdbcTemplate.query(
        """
        SELECT COALESCE(NULLIF(re.column_name, ''), '表级') AS column_name,
               COALESCE(NULLIF(r.quality_dimension, ''), '其他') AS dimension,
               SUM(CASE WHEN re.check_result <> 'NOT_RUN' THEN 1 ELSE 0 END)
                  AS total_count,
               SUM(CASE WHEN re.check_result = 'PASSED' THEN 1 ELSE 0 END)
                  AS passed_count,
               SUM(CASE WHEN re.check_result IN ('NOT_PASSED', 'ERROR') THEN 1 ELSE 0 END)
                  AS issue_count
        FROM yak_quality_rule_execution re
        JOIN yak_quality_execution e ON e.id = re.execution_id
        LEFT JOIN yak_quality_rule r ON r.id = re.rule_id
        WHERE e.monitor_id = :monitorId
          AND e.queued_at >= :reportStart
          AND e.queued_at < :reportEnd
        GROUP BY COALESCE(NULLIF(re.column_name, ''), '表级'),
                 COALESCE(NULLIF(r.quality_dimension, ''), '其他')
        ORDER BY issue_count DESC, column_name ASC
        """,
        reportParams(monitorId, reportStart, reportEnd),
        (rs, rowNum) -> {
          int total = rs.getInt("total_count");
          int passed = rs.getInt("passed_count");
          return new ColumnReport(
              rs.getString("column_name"),
              rs.getString("dimension"),
              total,
              passed,
              rs.getInt("issue_count"),
              rate(passed, total));
        });
  }

  public long countOperationLogs(long monitorId) {
    Long total = jdbcTemplate.queryForObject(
        """
        SELECT
          1
          + CASE WHEN m.updated_at > DATE_ADD(m.created_at, INTERVAL 1 SECOND)
              THEN 1 ELSE 0 END
          + (SELECT COUNT(*) FROM yak_quality_rule r WHERE r.monitor_id = m.id)
          + (SELECT COUNT(*) FROM yak_quality_execution e WHERE e.monitor_id = m.id)
        FROM yak_quality_monitor m
        WHERE m.id = :monitorId AND m.deleted = 0
        """,
        new MapSqlParameterSource("monitorId", monitorId),
        Long.class);
    return total == null ? 0L : total;
  }

  public List<OperationLogItem> operationLogs(
      long monitorId,
      int current,
      int pageSize) {
    return jdbcTemplate.query(
        """
        SELECT log_id, operator_name, operation_time, action_type, action_content
        FROM (
          SELECT CONCAT('monitor-create-', m.id) AS log_id,
                 m.owner AS operator_name,
                 m.created_at AS operation_time,
                 'CREATE_MONITOR' AS action_type,
                 CONCAT('创建质量监控「', m.monitor_name, '」，监控对象：',
                        COALESCE(NULLIF(m.database_name, ''), ''),
                        CASE WHEN m.database_name IS NULL OR m.database_name = '' THEN '' ELSE '.' END,
                        COALESCE(NULLIF(m.schema_name, ''), ''),
                        CASE WHEN m.schema_name IS NULL OR m.schema_name = '' THEN '' ELSE '.' END,
                        m.table_name) AS action_content
          FROM yak_quality_monitor m
          WHERE m.id = :monitorId AND m.deleted = 0

          UNION ALL

          SELECT CONCAT('monitor-update-', m.id),
                 m.owner,
                 m.updated_at,
                 'UPDATE_MONITOR',
                 CONCAT('更新质量监控「', m.monitor_name, '」的基础配置、运行设置或问题处理策略')
          FROM yak_quality_monitor m
          WHERE m.id = :monitorId
            AND m.deleted = 0
            AND m.updated_at > DATE_ADD(m.created_at, INTERVAL 1 SECOND)

          UNION ALL

          SELECT CONCAT('rule-', r.id),
                 m.owner,
                 r.created_at,
                 'SAVE_RULE',
                 CONCAT('保存质量规则「', r.rule_name, '」，规则模板：', r.template_code,
                        '，关联范围：', CASE WHEN r.rule_scope = 'TABLE' THEN '表级' ELSE '字段级' END,
                        CASE WHEN r.column_name IS NULL OR r.column_name = ''
                             THEN '' ELSE CONCAT('，字段：', r.column_name) END)
          FROM yak_quality_rule r
          JOIN yak_quality_monitor m ON m.id = r.monitor_id
          WHERE r.monitor_id = :monitorId

          UNION ALL

          SELECT CONCAT('execution-', e.id),
                 e.operator_name,
                 e.queued_at,
                 'RUN_MONITOR',
                 CONCAT('触发质量检查，执行编号：', e.execution_no,
                        '，触发方式：', e.trigger_type,
                        '，检查结果：', e.check_result)
          FROM yak_quality_execution e
          WHERE e.monitor_id = :monitorId
        ) logs
        ORDER BY operation_time DESC, log_id DESC
        LIMIT :limit OFFSET :offset
        """,
        new MapSqlParameterSource()
            .addValue("monitorId", monitorId)
            .addValue("limit", pageSize)
            .addValue("offset", (current - 1L) * pageSize),
        this::mapOperationLog);
  }

  private OperationLogItem mapOperationLog(ResultSet rs, int rowNum) throws SQLException {
    return new OperationLogItem(
        rs.getString("log_id"),
        rs.getString("operator_name"),
        localDateTime(rs.getTimestamp("operation_time")),
        rs.getString("action_type"),
        rs.getString("action_content"));
  }

  private MapSqlParameterSource reportParams(
      long monitorId,
      LocalDateTime reportStart,
      LocalDateTime reportEnd) {
    return new MapSqlParameterSource()
        .addValue("monitorId", monitorId)
        .addValue("reportStart", Timestamp.valueOf(reportStart))
        .addValue("reportEnd", Timestamp.valueOf(reportEnd));
  }

  private static LocalDateTime localDateTime(Timestamp value) {
    return value == null ? null : value.toLocalDateTime();
  }

  private static double rate(int passed, int total) {
    if (total <= 0) {
      return 0D;
    }
    return Math.round((passed * 10000D) / total) / 100D;
  }
}
