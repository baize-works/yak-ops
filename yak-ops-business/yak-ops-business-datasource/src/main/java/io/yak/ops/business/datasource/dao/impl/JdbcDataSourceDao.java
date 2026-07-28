package io.yak.ops.business.datasource.dao.impl;

import io.yak.ops.business.datasource.common.dto.DataSourceQueryDTO;
import io.yak.ops.business.datasource.common.enums.DataSourceConnStatus;
import io.yak.ops.business.datasource.common.enums.DataSourceDbType;
import io.yak.ops.business.datasource.common.enums.DataSourceEnvironment;
import io.yak.ops.business.datasource.common.po.DataSourcePO;
import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

/** 基于 Spring JDBC 的数据源数据访问实现。 */
@Repository
@ConditionalOnDataSourceEnabled
public class JdbcDataSourceDao implements DataSourceDao {

  private static final String BASE_COLUMNS =
      "id,name,db_type,jdbc_url,environment,conn_status,remark,"
          + "connection_params,original_json,create_time,update_time";

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final RowMapper<DataSourcePO> rowMapper = this::mapRow;

  public JdbcDataSourceDao(
      @Qualifier("opsDataSourceJdbcTemplate")
      NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public int addDataSource(DataSourcePO dataSourcePO) {
    String sql =
        "INSERT INTO yak_ops_data_source "
            + "(name,db_type,jdbc_url,environment,conn_status,remark,"
            + "connection_params,original_json,create_time,update_time) "
            + "VALUES (:name,:dbType,:jdbcUrl,:environment,:connStatus,:remark,"
            + ":connectionParams,:originalJson,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3))";

    MapSqlParameterSource parameters = toParameters(dataSourcePO);
    KeyHolder keyHolder = new GeneratedKeyHolder();
    int rows = jdbcTemplate.update(sql, parameters, keyHolder, new String[] {"id"});
    Number key = keyHolder.getKey();
    if (key != null) {
      dataSourcePO.setId(key.longValue());
    }
    return rows;
  }

  @Override
  public int editDataSource(DataSourcePO dataSourcePO) {
    String sql =
        "UPDATE yak_ops_data_source SET "
            + "name=:name,db_type=:dbType,jdbc_url=:jdbcUrl,environment=:environment,"
            + "conn_status=:connStatus,remark=:remark,connection_params=:connectionParams,"
            + "original_json=:originalJson,update_time=CURRENT_TIMESTAMP(3) "
            + "WHERE id=:id";

    return jdbcTemplate.update(sql, toParameters(dataSourcePO));
  }

  @Override
  public DataSourcePO selectById(Long id) {
    if (id == null) {
      return null;
    }

    List<DataSourcePO> rows =
        jdbcTemplate.query(
            "SELECT " + BASE_COLUMNS + " FROM yak_ops_data_source WHERE id=:id",
            new MapSqlParameterSource("id", id),
            rowMapper);
    return rows.isEmpty() ? null : rows.get(0);
  }

  @Override
  public long count(DataSourceQueryDTO queryDTO) {
    QueryParts parts = buildQueryParts(queryDTO);
    Long total =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(1) FROM yak_ops_data_source" + parts.whereClause,
            parts.parameters,
            Long.class);
    return total == null ? 0L : total;
  }

  @Override
  public List<DataSourcePO> selectPage(DataSourceQueryDTO queryDTO) {
    QueryParts parts = buildQueryParts(queryDTO);
    parts.parameters.addValue("limit", queryDTO.getPageSize());
    parts.parameters.addValue(
        "offset",
        (long) (queryDTO.getPageNo() - 1) * queryDTO.getPageSize());

    return jdbcTemplate.query(
        "SELECT "
            + BASE_COLUMNS
            + " FROM yak_ops_data_source"
            + parts.whereClause
            + " ORDER BY update_time DESC,id DESC LIMIT :limit OFFSET :offset",
        parts.parameters,
        rowMapper);
  }

  @Override
  public List<DataSourcePO> selectAll(String dbType) {
    MapSqlParameterSource parameters = new MapSqlParameterSource();
    String where = "";
    if (StringUtils.hasText(dbType)) {
      where = " WHERE db_type=:dbType";
      parameters.addValue("dbType", dbType);
    }

    return jdbcTemplate.query(
        "SELECT "
            + BASE_COLUMNS
            + " FROM yak_ops_data_source"
            + where
            + " ORDER BY name ASC,id ASC",
        parameters,
        rowMapper);
  }

  @Override
  public boolean existsByName(String name, Long excludeId) {
    StringBuilder sql =
        new StringBuilder("SELECT COUNT(1) FROM yak_ops_data_source WHERE name=:name");
    MapSqlParameterSource parameters = new MapSqlParameterSource("name", name);
    if (excludeId != null) {
      sql.append(" AND id<>:excludeId");
      parameters.addValue("excludeId", excludeId);
    }

    Long count = jdbcTemplate.queryForObject(sql.toString(), parameters, Long.class);
    return count != null && count > 0;
  }

  @Override
  public boolean deleteById(Long id) {
    return id != null
        && jdbcTemplate.update(
                "DELETE FROM yak_ops_data_source WHERE id=:id",
                new MapSqlParameterSource("id", id))
            > 0;
  }

  @Override
  public boolean updateConnectionStatus(Long id, String connStatus) {
    return id != null
        && jdbcTemplate.update(
                "UPDATE yak_ops_data_source SET conn_status=:connStatus,"
                    + "update_time=CURRENT_TIMESTAMP(3) WHERE id=:id",
                new MapSqlParameterSource()
                    .addValue("id", id)
                    .addValue("connStatus", connStatus))
            > 0;
  }

  private QueryParts buildQueryParts(DataSourceQueryDTO queryDTO) {
    StringBuilder where = new StringBuilder(" WHERE 1=1");
    MapSqlParameterSource parameters = new MapSqlParameterSource();

    if (StringUtils.hasText(queryDTO.getName())) {
      where.append(" AND name LIKE :name");
      parameters.addValue("name", "%" + queryDTO.getName().trim() + "%");
    }
    if (StringUtils.hasText(queryDTO.getDbType())) {
      where.append(" AND db_type=:dbType");
      parameters.addValue("dbType", queryDTO.getDbType());
    }
    if (StringUtils.hasText(queryDTO.getEnvironment())) {
      where.append(" AND environment=:environment");
      parameters.addValue("environment", queryDTO.getEnvironment());
    }
    return new QueryParts(where.toString(), parameters);
  }

  private MapSqlParameterSource toParameters(DataSourcePO dataSourcePO) {
    return new MapSqlParameterSource()
        .addValue("id", dataSourcePO.getId())
        .addValue("name", dataSourcePO.getName())
        .addValue("dbType", dataSourcePO.getDbType().name())
        .addValue("jdbcUrl", dataSourcePO.getJdbcUrl())
        .addValue("environment", dataSourcePO.getEnvironment().name())
        .addValue("connStatus", dataSourcePO.getConnStatus().name())
        .addValue("remark", dataSourcePO.getRemark())
        .addValue("connectionParams", dataSourcePO.getConnectionParams())
        .addValue("originalJson", dataSourcePO.getOriginalJson());
  }

  private DataSourcePO mapRow(ResultSet resultSet, int rowNum) throws SQLException {
    DataSourcePO dataSourcePO = new DataSourcePO();
    dataSourcePO.setId(resultSet.getLong("id"));
    dataSourcePO.setName(resultSet.getString("name"));
    dataSourcePO.setDbType(DataSourceDbType.valueOf(resultSet.getString("db_type")));
    dataSourcePO.setJdbcUrl(resultSet.getString("jdbc_url"));
    dataSourcePO.setEnvironment(
        DataSourceEnvironment.valueOf(resultSet.getString("environment")));
    dataSourcePO.setConnStatus(
        DataSourceConnStatus.valueOf(resultSet.getString("conn_status")));
    dataSourcePO.setRemark(resultSet.getString("remark"));
    dataSourcePO.setConnectionParams(resultSet.getString("connection_params"));
    dataSourcePO.setOriginalJson(resultSet.getString("original_json"));
    dataSourcePO.setCreateTime(
        resultSet.getTimestamp("create_time").toLocalDateTime());
    dataSourcePO.setUpdateTime(
        resultSet.getTimestamp("update_time").toLocalDateTime());
    return dataSourcePO;
  }

  private static final class QueryParts {

    private final String whereClause;
    private final MapSqlParameterSource parameters;

    private QueryParts(String whereClause, MapSqlParameterSource parameters) {
      this.whereClause = whereClause;
      this.parameters = parameters;
    }
  }
}
