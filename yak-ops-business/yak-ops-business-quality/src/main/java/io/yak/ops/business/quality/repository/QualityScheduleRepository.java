package io.yak.ops.business.quality.repository;

import io.yak.ops.business.quality.api.QualityScheduleApi.ScheduleRule;
import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

public class QualityScheduleRepository {

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public QualityScheduleRepository(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<ScheduleRule> findAllSchedules() {
    return jdbcTemplate.query(
        """
        SELECT id, rule_name, cron_expression, enabled
        FROM yak_quality_rule
        WHERE deleted = 0
          AND schedule_mode = 'SCHEDULE'
          AND cron_expression IS NOT NULL
          AND TRIM(cron_expression) <> ''
        ORDER BY id
        """,
        new MapSqlParameterSource(),
        (rs, rowNum) -> new ScheduleRule(
            rs.getLong("id"),
            rs.getString("rule_name"),
            rs.getString("cron_expression"),
            rs.getBoolean("enabled")));
  }
}
