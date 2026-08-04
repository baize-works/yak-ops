package io.yak.ops.business.development.repository;

import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.PublishedTaskItem;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.PublishedTaskVersionView;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.SortBy;
import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.service.DataDevelopmentJsonCodec;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** JDBC projection over published task versions for the Workflow designer. */
@ConditionalOnDataDevelopmentEnabled
@Repository
public final class JdbcWorkflowTaskLibraryRepository implements WorkflowTaskLibraryRepository {

  private static final String BASE_FROM = """
      FROM yak_dev_task t
      JOIN yak_dev_resource r
        ON r.id=t.id AND r.deleted=0 AND r.resource_kind='TASK'
      JOIN yak_dev_project p ON p.id=t.project_id
      JOIN yak_dev_task_version v
        ON v.id=t.published_version_id AND v.task_id=t.id
      LEFT JOIN yak_dev_resource folder
        ON folder.id=r.parent_id AND folder.deleted=0 AND folder.resource_kind='FOLDER'
      LEFT JOIN yak_dev_user_favorite favorite
        ON favorite.resource_id=t.id AND favorite.user_id=:operator
      LEFT JOIN (
        SELECT task_id,MAX(created_at) AS last_used_at
        FROM yak_dev_execution
        WHERE created_by=:operator
        GROUP BY task_id
      ) recent ON recent.task_id=t.id
      """;

  private final NamedParameterJdbcTemplate jdbc;
  private final DataDevelopmentJsonCodec json;

  public JdbcWorkflowTaskLibraryRepository(
      @Qualifier("dataDevelopmentJdbcTemplate") NamedParameterJdbcTemplate jdbc,
      DataDevelopmentJsonCodec json) {
    this.jdbc = jdbc;
    this.json = json;
  }

  @Override
  public SearchResult search(SearchCriteria criteria) {
    MapSqlParameterSource parameters = parameters(criteria);
    String where = where(criteria);
    Long total = jdbc.queryForObject(
        "SELECT COUNT(1) " + BASE_FROM + where,
        parameters,
        Long.class);

    parameters.addValue("offset", criteria.offset());
    parameters.addValue("limit", criteria.limit());
    List<PublishedTaskItem> items = jdbc.query(
        """
        SELECT
          t.id AS task_id,
          r.name AS task_name,
          r.description AS task_description,
          p.id AS project_id,
          p.code AS project_code,
          p.name AS project_name,
          folder.id AS folder_id,
          folder.name AS folder_name,
          v.task_type,
          t.engine_type,
          v.id AS published_version_id,
          v.version_no,
          v.plugin_version,
          v.schema_version,
          v.input_schema,
          v.output_schema,
          v.content_digest,
          v.published_by,
          v.published_at,
          r.updated_at,
          CASE WHEN favorite.resource_id IS NULL THEN 0 ELSE 1 END AS favorite,
          recent.last_used_at
        """ + BASE_FROM + where + orderBy(criteria.sortBy()) + " LIMIT :limit OFFSET :offset",
        parameters,
        this::publishedTask);
    return new SearchResult(items, total == null ? 0L : total);
  }

  @Override
  public Optional<PublishedTaskVersionView> findPublishedVersion(
      long taskId,
      long versionId,
      String operator) {
    List<PublishedTaskVersionView> items = jdbc.query("""
        SELECT
          t.id AS task_id,
          r.name AS task_name,
          p.id AS project_id,
          p.name AS project_name,
          v.task_type,
          t.engine_type,
          v.id AS version_id,
          v.version_no,
          v.plugin_version,
          v.schema_version,
          v.input_schema,
          v.output_schema,
          v.content_digest,
          v.published_by,
          v.published_at,
          CASE WHEN t.published_version_id=v.id THEN 1 ELSE 0 END AS current_version
        FROM yak_dev_task t
        JOIN yak_dev_resource r
          ON r.id=t.id AND r.deleted=0 AND r.resource_kind='TASK'
        JOIN yak_dev_project p ON p.id=t.project_id
        JOIN yak_dev_task_version v ON v.task_id=t.id
        WHERE t.id=:taskId
          AND v.id=:versionId
          AND t.status='PUBLISHED'
          AND t.published_version_id IS NOT NULL
        """, new MapSqlParameterSource()
        .addValue("taskId", taskId)
        .addValue("versionId", versionId)
        .addValue("operator", operator), this::publishedVersion);
    return items.stream().findFirst();
  }

  private static MapSqlParameterSource parameters(SearchCriteria criteria) {
    return new MapSqlParameterSource()
        .addValue("operator", criteria.operator())
        .addValue("projectId", criteria.projectId())
        .addValue("folderId", criteria.folderId())
        .addValue("taskType", criteria.taskType())
        .addValue("keyword", criteria.keyword());
  }

  private static String where(SearchCriteria criteria) {
    StringBuilder sql = new StringBuilder("""
        WHERE t.status='PUBLISHED'
          AND t.published_version_id IS NOT NULL
        """);
    if (criteria.projectId() != null) {
      sql.append(" AND t.project_id=:projectId");
    }
    if (criteria.folderId() != null) {
      sql.append(" AND r.parent_id=:folderId");
    }
    if (criteria.taskType() != null) {
      sql.append(" AND v.task_type=:taskType");
    }
    if (criteria.keyword() != null) {
      sql.append("""
           AND (
             LOCATE(:keyword,LOWER(r.name))>0
             OR LOCATE(:keyword,LOWER(COALESCE(r.description,'')))>0
             OR LOCATE(:keyword,LOWER(p.name))>0
             OR LOCATE(:keyword,LOWER(p.code))>0
             OR LOCATE(:keyword,LOWER(v.task_type))>0
           )
          """);
    }
    if (criteria.favoriteOnly()) {
      sql.append(" AND favorite.resource_id IS NOT NULL");
    }
    if (criteria.recentlyUsed()) {
      sql.append(" AND recent.last_used_at IS NOT NULL");
    }
    return sql.toString();
  }

  private static String orderBy(SortBy sortBy) {
    return switch (sortBy) {
      case PUBLISHED_AT -> " ORDER BY v.published_at DESC,r.updated_at DESC,t.id DESC";
      case RECENTLY_USED -> " ORDER BY recent.last_used_at DESC,r.updated_at DESC,t.id DESC";
      case UPDATED_AT -> " ORDER BY r.updated_at DESC,t.id DESC";
    };
  }

  private PublishedTaskItem publishedTask(ResultSet resultSet, int row) throws SQLException {
    return new PublishedTaskItem(
        id(resultSet, "task_id"),
        resultSet.getString("task_name"),
        resultSet.getString("task_description"),
        id(resultSet, "project_id"),
        resultSet.getString("project_code"),
        resultSet.getString("project_name"),
        nullableId(resultSet, "folder_id"),
        resultSet.getString("folder_name"),
        resultSet.getString("task_type"),
        resultSet.getString("engine_type"),
        id(resultSet, "published_version_id"),
        resultSet.getInt("version_no"),
        resultSet.getString("plugin_version"),
        resultSet.getInt("schema_version"),
        json.readTree(resultSet.getString("input_schema")),
        json.readTree(resultSet.getString("output_schema")),
        resultSet.getString("content_digest"),
        resultSet.getString("published_by"),
        time(resultSet, "published_at"),
        time(resultSet, "updated_at"),
        resultSet.getBoolean("favorite"),
        time(resultSet, "last_used_at"));
  }

  private PublishedTaskVersionView publishedVersion(ResultSet resultSet, int row)
      throws SQLException {
    return new PublishedTaskVersionView(
        id(resultSet, "task_id"),
        resultSet.getString("task_name"),
        id(resultSet, "project_id"),
        resultSet.getString("project_name"),
        resultSet.getString("task_type"),
        resultSet.getString("engine_type"),
        id(resultSet, "version_id"),
        resultSet.getInt("version_no"),
        resultSet.getString("plugin_version"),
        resultSet.getInt("schema_version"),
        json.readTree(resultSet.getString("input_schema")),
        json.readTree(resultSet.getString("output_schema")),
        resultSet.getString("content_digest"),
        resultSet.getString("published_by"),
        time(resultSet, "published_at"),
        resultSet.getBoolean("current_version"));
  }

  private static String id(ResultSet resultSet, String column) throws SQLException {
    return Long.toString(resultSet.getLong(column));
  }

  private static String nullableId(ResultSet resultSet, String column) throws SQLException {
    long value = resultSet.getLong(column);
    return resultSet.wasNull() || value == 0L ? null : Long.toString(value);
  }

  private static LocalDateTime time(ResultSet resultSet, String column) throws SQLException {
    Timestamp value = resultSet.getTimestamp(column);
    return value == null ? null : value.toLocalDateTime();
  }
}
