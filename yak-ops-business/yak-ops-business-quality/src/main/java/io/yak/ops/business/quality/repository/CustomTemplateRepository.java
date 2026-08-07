package io.yak.ops.business.quality.repository;

import io.yak.ops.business.quality.api.CustomTemplateApi.CheckMethod;
import io.yak.ops.business.quality.api.CustomTemplateApi.CheckType;
import io.yak.ops.business.quality.api.CustomTemplateApi.FolderView;
import io.yak.ops.business.quality.api.CustomTemplateApi.Query;
import io.yak.ops.business.quality.api.CustomTemplateApi.TemplateView;
import io.yak.ops.business.quality.api.QualityApi.RuleScope;
import io.yak.ops.business.quality.api.QualityApi.RuleType;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
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
public class CustomTemplateRepository {

  private static final String SELECT = """
      SELECT t.id, t.template_code, t.template_name, t.description,
             t.rule_type, t.rule_scope, t.quality_dimension,
             t.parameter_schema_json, t.builtin, t.enabled, t.sort_order,
             t.folder_id, f.folder_name, t.template_sql, t.set_flag,
             t.check_type, t.check_method, t.created_by,
             t.created_at, t.updated_at,
             COUNT(r.id) AS rule_count
      FROM yak_quality_rule_template t
      LEFT JOIN yak_quality_template_folder f
        ON f.id = t.folder_id AND f.deleted = 0
      LEFT JOIN yak_quality_rule r
        ON r.template_id = t.id AND r.deleted = 0
      """;

  private static final String GROUP_BY = """
       GROUP BY t.id, t.template_code, t.template_name, t.description,
                t.rule_type, t.rule_scope, t.quality_dimension,
                t.parameter_schema_json, t.builtin, t.enabled, t.sort_order,
                t.folder_id, f.folder_name, t.template_sql, t.set_flag,
                t.check_type, t.check_method, t.created_by,
                t.created_at, t.updated_at
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final RowMapper<TemplateView> templateMapper = this::mapTemplate;
  private final RowMapper<FolderView> folderMapper = this::mapFolder;

  public CustomTemplateRepository(
      @Qualifier("qualityJdbcTemplate") NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<TemplateView> list(Query query) {
    Query normalized = query == null ? new Query(null, null, null) : query;
    StringBuilder where = new StringBuilder(
        " WHERE t.builtin = 0 AND t.enabled = 1 AND t.deleted = 0");
    MapSqlParameterSource params = new MapSqlParameterSource();
    if (hasText(normalized.keyword())) {
      where.append(" AND (LOWER(t.template_name) LIKE :keyword"
          + " OR LOWER(t.template_code) LIKE :keyword"
          + " OR LOWER(COALESCE(t.description, '')) LIKE :keyword)");
      params.addValue("keyword", "%" + normalized.keyword().trim().toLowerCase() + "%");
    }
    if (hasText(normalized.dimension())) {
      where.append(" AND t.quality_dimension = :dimension");
      params.addValue("dimension", normalized.dimension().trim());
    }
    if (normalized.folderId() != null) {
      if (normalized.folderId() == 0L) {
        where.append(" AND t.folder_id IS NULL");
      } else {
        where.append(" AND t.folder_id = :folderId");
        params.addValue("folderId", normalized.folderId());
      }
    }
    return jdbcTemplate.query(
        SELECT + where + GROUP_BY
            + " ORDER BY t.sort_order ASC, t.updated_at DESC, t.id ASC",
        params,
        templateMapper);
  }

  public List<TemplateView> listAllCustom() {
    return list(new Query(null, null, null));
  }

  public long countSystem() {
    Long value = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM yak_quality_rule_template WHERE builtin = 1 AND enabled = 1",
        new MapSqlParameterSource(),
        Long.class);
    return value == null ? 0L : value;
  }

  public Optional<TemplateView> find(long id) {
    try {
      return Optional.ofNullable(jdbcTemplate.queryForObject(
          SELECT + " WHERE t.id = :id AND t.builtin = 0" + GROUP_BY,
          new MapSqlParameterSource("id", id),
          templateMapper));
    } catch (EmptyResultDataAccessException ignored) {
      return Optional.empty();
    }
  }

  public List<FolderView> listFolders() {
    String sql = """
        SELECT f.id, f.parent_id, f.folder_name, f.sort_order,
               COUNT(DISTINCT t.id) AS template_count,
               COUNT(DISTINCT child.id) AS child_count,
               f.created_at, f.updated_at
        FROM yak_quality_template_folder f
        LEFT JOIN yak_quality_rule_template t
          ON t.folder_id = f.id AND t.builtin = 0 AND t.deleted = 0 AND t.enabled = 1
        LEFT JOIN yak_quality_template_folder child
          ON child.parent_id = f.id AND child.deleted = 0
        WHERE f.deleted = 0
        GROUP BY f.id, f.parent_id, f.folder_name, f.sort_order,
                 f.created_at, f.updated_at
        ORDER BY f.sort_order ASC, f.folder_name ASC, f.id ASC
        """;
    return jdbcTemplate.query(sql, new MapSqlParameterSource(), folderMapper);
  }

  public Optional<FolderView> findFolder(long id) {
    return listFolders().stream().filter(folder -> folder.id() == id).findFirst();
  }

  public boolean folderNameExists(Long parentId, String name, Long excludeId) {
    Integer count = jdbcTemplate.queryForObject(
        """
        SELECT COUNT(*) FROM yak_quality_template_folder
        WHERE deleted = 0 AND LOWER(folder_name) = LOWER(:name)
          AND ((:parentId IS NULL AND parent_id IS NULL) OR parent_id = :parentId)
          AND (:excludeId IS NULL OR id <> :excludeId)
        """,
        new MapSqlParameterSource().addValue("name", name)
            .addValue("parentId", parentId).addValue("excludeId", excludeId),
        Integer.class);
    return count != null && count > 0;
  }

  public long insertFolder(FolderWrite write) {
    KeyHolder keyHolder = new GeneratedKeyHolder();
    jdbcTemplate.update(
        """
        INSERT INTO yak_quality_template_folder
        (parent_id, folder_name, sort_order, created_by, updated_by)
        VALUES (:parentId, :name, 10, :operator, :operator)
        """,
        new MapSqlParameterSource().addValue("parentId", write.parentId())
            .addValue("name", write.name()).addValue("operator", write.operator()),
        keyHolder,
        new String[]{"id"});
    return requiredKey(keyHolder, "创建规则模板目录失败");
  }

  public boolean updateFolder(long id, FolderWrite write) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_template_folder
        SET parent_id = :parentId, folder_name = :name,
            updated_by = :operator, updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = :id AND deleted = 0
        """,
        new MapSqlParameterSource("id", id).addValue("parentId", write.parentId())
            .addValue("name", write.name()).addValue("operator", write.operator())) > 0;
  }

  public boolean deleteFolder(long id, String operator) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_template_folder
        SET deleted = 1, updated_by = :operator, updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = :id AND deleted = 0
        """,
        new MapSqlParameterSource("id", id).addValue("operator", operator)) > 0;
  }

  public boolean templateNameExists(Long folderId, String name, Long excludeId) {
    Integer count = jdbcTemplate.queryForObject(
        """
        SELECT COUNT(*) FROM yak_quality_rule_template
        WHERE builtin = 0 AND deleted = 0
          AND LOWER(template_name) = LOWER(:name)
          AND ((:folderId IS NULL AND folder_id IS NULL) OR folder_id = :folderId)
          AND (:excludeId IS NULL OR id <> :excludeId)
        """,
        new MapSqlParameterSource().addValue("name", name)
            .addValue("folderId", folderId).addValue("excludeId", excludeId),
        Integer.class);
    return count != null && count > 0;
  }

  public long insertTemplate(TemplateWrite write) {
    KeyHolder keyHolder = new GeneratedKeyHolder();
    jdbcTemplate.update(
        """
        INSERT INTO yak_quality_rule_template
        (template_code, template_name, description, rule_type, rule_scope,
         quality_dimension, parameter_schema_json, builtin, enabled, sort_order,
         folder_id, template_sql, set_flag, check_type, check_method, created_by, deleted)
        VALUES
        (:code, :name, :description, 'CUSTOM_SQL', 'TABLE',
         :dimension, :parameterSchema, 0, 1, 1000,
         :folderId, :templateSql, :setFlag, :checkType, :checkMethod, :operator, 0)
        """,
        templateParameters(write),
        keyHolder,
        new String[]{"id"});
    return requiredKey(keyHolder, "创建自定义规则模板失败");
  }

  public boolean updateTemplate(long id, TemplateWrite write) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_rule_template
        SET template_name = :name, description = :description,
            quality_dimension = :dimension, parameter_schema_json = :parameterSchema,
            folder_id = :folderId, template_sql = :templateSql, set_flag = :setFlag,
            check_type = :checkType, check_method = :checkMethod,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = :id AND builtin = 0 AND deleted = 0
        """,
        templateParameters(write).addValue("id", id)) > 0;
  }

  public boolean deleteTemplate(long id) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_rule_template
        SET enabled = 0, deleted = 1, updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = :id AND builtin = 0 AND deleted = 0
        """,
        new MapSqlParameterSource("id", id)) > 0;
  }

  private MapSqlParameterSource templateParameters(TemplateWrite write) {
    return new MapSqlParameterSource().addValue("code", write.code())
        .addValue("name", write.name()).addValue("description", write.description())
        .addValue("dimension", write.dimension())
        .addValue("parameterSchema", write.parameterSchema())
        .addValue("folderId", write.folderId()).addValue("templateSql", write.templateSql())
        .addValue("setFlag", write.setFlag()).addValue("checkType", write.checkType().name())
        .addValue("checkMethod", write.checkMethod().name())
        .addValue("operator", write.operator());
  }

  private TemplateView mapTemplate(ResultSet rs, int rowNum) throws SQLException {
    return new TemplateView(
        rs.getLong("id"), rs.getString("template_code"), rs.getString("template_name"),
        rs.getString("description"), RuleType.valueOf(rs.getString("rule_type")),
        RuleScope.valueOf(rs.getString("rule_scope")), rs.getString("quality_dimension"),
        rs.getString("parameter_schema_json"), rs.getBoolean("builtin"),
        rs.getBoolean("enabled"), rs.getLong("rule_count"), rs.getInt("sort_order"),
        nullableLong(rs, "folder_id"), rs.getString("folder_name"),
        rs.getString("template_sql"), rs.getString("set_flag"),
        enumValue(CheckType.class, rs.getString("check_type"), CheckType.NUMERIC),
        enumValue(CheckMethod.class, rs.getString("check_method"), CheckMethod.FIXED_VALUE),
        rs.getString("created_by"), timestamp(rs, "created_at"), timestamp(rs, "updated_at"));
  }

  private FolderView mapFolder(ResultSet rs, int rowNum) throws SQLException {
    return new FolderView(
        rs.getLong("id"), nullableLong(rs, "parent_id"), rs.getString("folder_name"),
        rs.getInt("sort_order"), rs.getLong("template_count"), rs.getLong("child_count"),
        timestamp(rs, "created_at"), timestamp(rs, "updated_at"));
  }

  private static long requiredKey(KeyHolder keyHolder, String message) {
    Number key = keyHolder.getKey();
    if (key == null) {
      throw new IllegalStateException(message + "：未返回编号");
    }
    return key.longValue();
  }

  private static Long nullableLong(ResultSet rs, String column) throws SQLException {
    Number value = (Number) rs.getObject(column);
    return value == null ? null : value.longValue();
  }

  private static java.time.LocalDateTime timestamp(ResultSet rs, String column)
      throws SQLException {
    Timestamp value = rs.getTimestamp(column);
    return value == null ? null : value.toLocalDateTime();
  }

  private static <T extends Enum<T>> T enumValue(
      Class<T> type,
      String value,
      T fallback) {
    return value == null || value.isBlank() ? fallback : Enum.valueOf(type, value);
  }

  private static boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  public record FolderWrite(Long parentId, String name, String operator) {}

  public record TemplateWrite(
      String code,
      String name,
      String description,
      String dimension,
      String parameterSchema,
      Long folderId,
      String templateSql,
      String setFlag,
      CheckType checkType,
      CheckMethod checkMethod,
      String operator) {}
}
