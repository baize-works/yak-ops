package io.yak.ops.business.quality.repository;

import io.yak.ops.business.quality.api.QualityApi.TableAssetPageRequest;
import io.yak.ops.business.quality.api.QualityApi.TableAssetView;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.repository.QualityRepository.PageResult;
import io.yak.ops.business.quality.repository.QualityRepository.TableAssetTarget;
import io.yak.ops.business.quality.repository.QualityRepository.TableAssetWrite;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@ConditionalOnQualityEnabled
@Repository
class QualityTableAssetRepository {

  private final NamedParameterJdbcTemplate jdbcTemplate;

  QualityTableAssetRepository(
      @Qualifier("qualityJdbcTemplate") NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  PageResult<TableAssetView> page(TableAssetPageRequest request) {
    StringBuilder where = new StringBuilder(
        " WHERE asset.deleted = 0 AND asset.data_source_id = :dataSourceId");
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("dataSourceId", request.dataSourceId());
    appendNullableFilter(
        where, params, "asset.database_name", "databaseName", request.databaseName());
    appendNullableFilter(
        where, params, "asset.schema_name", "schemaName", request.schemaName());
    if (QualityRepositorySupport.hasText(request.keyword())) {
      where.append("""
           AND (LOWER(asset.table_name) LIKE :keyword
             OR LOWER(COALESCE(asset.remarks, '')) LIKE :keyword)
          """);
      params.addValue("keyword", "%" + request.keyword().trim().toLowerCase() + "%");
    }

    Long total = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM yak_quality_table_asset asset" + where,
        params,
        Long.class);
    params.addValue("limit", request.normalizedPageSize());
    params.addValue(
        "offset", (request.normalizedCurrent() - 1L) * request.normalizedPageSize());

    List<TableAssetView> records = jdbcTemplate.query(
        """
        SELECT asset.id,
               asset.data_source_id,
               asset.data_source_name,
               asset.database_name,
               asset.schema_name,
               asset.table_name,
               asset.table_type,
               asset.remarks,
               asset.registered_by,
               asset.registered_at,
               MIN(monitor.id) AS monitor_id,
               MIN(monitor.monitor_name) AS monitor_name,
               COUNT(DISTINCT monitor.id) AS monitor_count,
               COUNT(DISTINCT rule_row.id) AS rule_count,
               SUBSTRING_INDEX(
                 GROUP_CONCAT(
                   monitor.last_result
                   ORDER BY monitor.last_run_time DESC, monitor.id DESC),
                 ',', 1) AS last_result,
               MAX(monitor.last_run_time) AS last_run_time
        FROM yak_quality_table_asset asset
        LEFT JOIN yak_quality_monitor monitor
          ON monitor.data_source_id = asset.data_source_id
         AND COALESCE(monitor.database_name, '') = asset.database_name
         AND COALESCE(monitor.schema_name, '') = asset.schema_name
         AND monitor.table_name = asset.table_name
         AND monitor.deleted = 0
        LEFT JOIN yak_quality_rule rule_row
          ON rule_row.monitor_id = monitor.id
         AND rule_row.deleted = 0
        """ + where
            + """
             GROUP BY asset.id,
                      asset.data_source_id,
                      asset.data_source_name,
                      asset.database_name,
                      asset.schema_name,
                      asset.table_name,
                      asset.table_type,
                      asset.remarks,
                      asset.registered_by,
                      asset.registered_at
             ORDER BY asset.table_name ASC, asset.id ASC
             LIMIT :limit OFFSET :offset
            """,
        params,
        this::mapAsset);
    return new PageResult<>(records, total == null ? 0L : total);
  }

  List<TableAssetTarget> listTargets(long dataSourceId, String databaseName) {
    StringBuilder where = new StringBuilder(
        " WHERE deleted = 0 AND data_source_id = :dataSourceId");
    MapSqlParameterSource params = new MapSqlParameterSource("dataSourceId", dataSourceId);
    appendNullableFilter(
        where, params, "database_name", "databaseName", databaseName);
    return jdbcTemplate.query(
        "SELECT database_name, schema_name, table_name"
            + " FROM yak_quality_table_asset"
            + where,
        params,
        (rs, rowNum) -> new TableAssetTarget(
            blankToNull(rs.getString("database_name")),
            blankToNull(rs.getString("schema_name")),
            rs.getString("table_name")));
  }

  boolean existsTarget(
      long dataSourceId,
      String databaseName,
      String schemaName,
      String tableName) {
    Integer count = jdbcTemplate.queryForObject(
        """
        SELECT COUNT(*)
        FROM yak_quality_table_asset
        WHERE deleted = 0
          AND data_source_id = :dataSourceId
          AND database_name = :databaseName
          AND schema_name = :schemaName
          AND table_name = :tableName
        """,
        new MapSqlParameterSource()
            .addValue("dataSourceId", dataSourceId)
            .addValue("databaseName", blankToEmpty(databaseName))
            .addValue("schemaName", blankToEmpty(schemaName))
            .addValue("tableName", tableName),
        Integer.class);
    return count != null && count > 0;
  }

  int register(List<TableAssetWrite> writes) {
    int registered = 0;
    for (TableAssetWrite write : writes) {
      jdbcTemplate.update(
          """
          INSERT INTO yak_quality_table_asset (
            data_source_id,
            data_source_name,
            database_name,
            schema_name,
            table_name,
            table_type,
            remarks,
            registered_by,
            registered_at,
            deleted
          ) VALUES (
            :dataSourceId,
            :dataSourceName,
            :databaseName,
            :schemaName,
            :tableName,
            :tableType,
            :remarks,
            :registeredBy,
            CURRENT_TIMESTAMP(3),
            0
          )
          ON DUPLICATE KEY UPDATE
            data_source_name = VALUES(data_source_name),
            table_type = VALUES(table_type),
            remarks = VALUES(remarks),
            registered_by = VALUES(registered_by),
            registered_at = CURRENT_TIMESTAMP(3),
            deleted = 0,
            updated_at = CURRENT_TIMESTAMP(3)
          """,
          new MapSqlParameterSource()
              .addValue("dataSourceId", write.dataSourceId())
              .addValue("dataSourceName", write.dataSourceName())
              .addValue("databaseName", blankToEmpty(write.databaseName()))
              .addValue("schemaName", blankToEmpty(write.schemaName()))
              .addValue("tableName", write.tableName())
              .addValue("tableType", QualityRepositorySupport.trimToNull(write.tableType()))
              .addValue("remarks", QualityRepositorySupport.trimToNull(write.remarks()))
              .addValue("registeredBy", write.registeredBy()));
      registered++;
    }
    return registered;
  }

  int countMonitors(long assetId) {
    Integer count = jdbcTemplate.queryForObject(
        """
        SELECT COUNT(*)
        FROM yak_quality_table_asset asset
        JOIN yak_quality_monitor monitor
          ON monitor.data_source_id = asset.data_source_id
         AND COALESCE(monitor.database_name, '') = asset.database_name
         AND COALESCE(monitor.schema_name, '') = asset.schema_name
         AND monitor.table_name = asset.table_name
         AND monitor.deleted = 0
        WHERE asset.id = :id
          AND asset.deleted = 0
        """,
        new MapSqlParameterSource("id", assetId),
        Integer.class);
    return count == null ? 0 : count;
  }

  boolean delete(long assetId) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_table_asset
        SET deleted = 1,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = :id
          AND deleted = 0
        """,
        new MapSqlParameterSource("id", assetId)) == 1;
  }

  private TableAssetView mapAsset(ResultSet rs, int rowNum) throws SQLException {
    return new TableAssetView(
        rs.getLong("id"),
        rs.getLong("data_source_id"),
        rs.getString("data_source_name"),
        blankToNull(rs.getString("database_name")),
        blankToNull(rs.getString("schema_name")),
        rs.getString("table_name"),
        rs.getString("table_type"),
        rs.getString("remarks"),
        QualityRepositorySupport.nullableLong(rs, "monitor_id"),
        rs.getString("monitor_name"),
        rs.getInt("monitor_count"),
        rs.getInt("rule_count"),
        QualityRepositorySupport.checkResult(rs.getString("last_result")),
        QualityRepositorySupport.localDateTime(rs.getTimestamp("last_run_time")),
        rs.getString("registered_by"),
        QualityRepositorySupport.localDateTime(rs.getTimestamp("registered_at")));
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
      where.append(" AND ").append(column).append(" = ''");
    } else {
      where.append(" AND ").append(column).append(" = :").append(parameter);
      params.addValue(parameter, normalized);
    }
  }

  private static String blankToEmpty(String value) {
    String normalized = QualityRepositorySupport.trimToNull(value);
    return normalized == null ? "" : normalized;
  }

  private static String blankToNull(String value) {
    return QualityRepositorySupport.trimToNull(value);
  }
}
