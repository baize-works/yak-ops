package io.yak.ops.plugin.database.doris;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.common.bean.vo.datasource.DataSourcePluginConfigVO.FormFieldVO;
import io.yak.ops.common.enums.datasource.DataSourceDbType;
import io.yak.ops.plugin.database.jdbc.AbstractJdbcDataSourcePlugin;
import io.yak.ops.plugin.database.jdbc.JdbcConnectionProperties;
import io.yak.ops.spi.datasource.DataSourceCatalog;
import java.util.Collections;
import java.util.List;

/** Doris 独立数据源插件。JDBC 连接复用通用基座，Catalog 行为由 Doris 自己实现。 */
public final class DorisDataSourcePlugin extends AbstractJdbcDataSourcePlugin {

  @Override
  public DataSourceDbType dbType() {
    return DataSourceDbType.DORIS;
  }

  @Override
  protected int defaultPort() {
    return 9030;
  }

  @Override
  protected String defaultDriverClassName() {
    return "com.mysql.cj.jdbc.Driver";
  }

  @Override
  protected String databaseLabel() {
    return "Doris 数据库";
  }

  @Override
  protected String buildJdbcUrl(String host, int port, String database, JsonNode connectionJson) {
    return "jdbc:mysql://" + host + ":" + port + "/" + database;
  }

  @Override
  protected void appendFormFields(List<FormFieldVO> fields) {
    fields.add(
        field(
            "fenodes",
            "FE HTTP 节点",
            "INPUT",
            "可选；例如 doris-fe:8030，供后续 Stream Load 能力复用",
            null,
            Collections.emptyList()));
  }

  @Override
  protected void appendNormalizedFields(JsonNode source, ObjectNode normalized) {
    JsonNode fenodes = source.get("fenodes");
    if (fenodes != null && !fenodes.isNull() && !fenodes.asText().trim().isEmpty()) {
      normalized.put("fenodes", fenodes.asText().trim());
    }
  }

  @Override
  protected DataSourceCatalog createJdbcCatalog(
      JdbcConnectionProperties connection,
      int timeoutSeconds) {
    return new DorisJdbcCatalog(connection, timeoutSeconds);
  }

  @Override
  public boolean acceptsUrl(String jdbcUrl) {
    return jdbcUrl != null && jdbcUrl.startsWith("jdbc:mysql:");
  }
}
