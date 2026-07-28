package io.yak.ops.plugin.database.doris;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.ops.common.enums.datasource.DataSourceDbType;
import io.yak.ops.plugin.database.jdbc.AbstractJdbcDataSourcePlugin;
import io.yak.ops.plugin.database.jdbc.JdbcConnectionProperties;
import io.yak.ops.spi.datasource.DataSourceCatalog;

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
    return "org.mariadb.jdbc.Driver";
  }

  @Override
  protected String databaseLabel() {
    return "Doris 数据库";
  }

  @Override
  protected String buildJdbcUrl(String host, int port, String database, JsonNode connectionJson) {
    return "jdbc:mariadb://" + host + ":" + port + "/" + database;
  }

  @Override
  protected DataSourceCatalog createJdbcCatalog(
      JdbcConnectionProperties connection,
      int timeoutSeconds) {
    return new DorisJdbcCatalog(connection, timeoutSeconds);
  }

  @Override
  public boolean acceptsUrl(String jdbcUrl) {
    return jdbcUrl != null
        && (jdbcUrl.startsWith("jdbc:mysql:") || jdbcUrl.startsWith("jdbc:mariadb:"));
  }
}
