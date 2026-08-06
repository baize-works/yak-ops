package io.yak.ops.business.quality.repository;

import io.yak.ops.business.quality.api.QualityApi.RuleScope;
import io.yak.ops.business.quality.api.QualityApi.RuleType;
import io.yak.ops.business.quality.api.QualityApi.TemplateQuery;
import io.yak.ops.business.quality.api.QualityApi.TemplateView;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import java.sql.ResultSet;
import java.sql.SQLException;
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
class QualityTemplateRepository {

  private static final String SELECT = """
      SELECT t.id, t.template_code, t.template_name, t.description,
             t.rule_type, t.rule_scope, t.quality_dimension,
             t.parameter_schema_json, t.builtin, t.enabled, t.sort_order,
             COUNT(r.id) AS rule_count
      FROM yak_quality_rule_template t
      LEFT JOIN yak_quality_rule r
        ON r.template_id = t.id AND r.deleted = 0
      """;

  private static final String GROUP_BY = """
       GROUP BY t.id, t.template_code, t.template_name, t.description,
                t.rule_type, t.rule_scope, t.quality_dimension,
                t.parameter_schema_json, t.builtin, t.enabled, t.sort_order
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final RowMapper<TemplateView> mapper = this::map;

  QualityTemplateRepository(
      @Qualifier("qualityJdbcTemplate") NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  List<TemplateView> list(TemplateQuery query) {
    TemplateQuery normalized = query == null ? new TemplateQuery(null, null, null) : query;
    StringBuilder where = new StringBuilder(" WHERE t.enabled = 1");
    MapSqlParameterSource params = new MapSqlParameterSource();
    if (QualityRepositorySupport.hasText(normalized.keyword())) {
      where.append(" AND (LOWER(t.template_name) LIKE :keyword"
          + " OR LOWER(COALESCE(t.description, '')) LIKE :keyword)");
      params.addValue(
          "keyword", "%" + normalized.keyword().trim().toLowerCase() + "%");
    }
    if (QualityRepositorySupport.hasText(normalized.dimension())) {
      where.append(" AND t.quality_dimension = :dimension");
      params.addValue("dimension", normalized.dimension().trim());
    }
    if (normalized.scope() != null) {
      where.append(" AND t.rule_scope = :scope");
      params.addValue("scope", normalized.scope().name());
    }
    return jdbcTemplate.query(
        SELECT + where + GROUP_BY + " ORDER BY t.sort_order ASC, t.id ASC",
        params,
        mapper);
  }

  Optional<TemplateView> find(long id) {
    try {
      return Optional.ofNullable(jdbcTemplate.queryForObject(
          SELECT
              + " WHERE t.id = :id AND t.enabled = 1"
              + GROUP_BY,
          new MapSqlParameterSource("id", id),
          mapper));
    } catch (EmptyResultDataAccessException ignored) {
      return Optional.empty();
    }
  }

  private TemplateView map(ResultSet rs, int rowNum) throws SQLException {
    return new TemplateView(
        rs.getLong("id"),
        rs.getString("template_code"),
        rs.getString("template_name"),
        rs.getString("description"),
        RuleType.valueOf(rs.getString("rule_type")),
        RuleScope.valueOf(rs.getString("rule_scope")),
        rs.getString("quality_dimension"),
        rs.getString("parameter_schema_json"),
        rs.getBoolean("builtin"),
        rs.getBoolean("enabled"),
        rs.getLong("rule_count"),
        rs.getInt("sort_order"));
  }
}
