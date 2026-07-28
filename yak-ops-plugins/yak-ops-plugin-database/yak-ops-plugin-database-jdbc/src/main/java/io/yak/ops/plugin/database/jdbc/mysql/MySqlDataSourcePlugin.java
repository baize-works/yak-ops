package io.yak.ops.plugin.database.jdbc.mysql;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.ops.common.enums.datasource.DataSourceDbType;
import io.yak.ops.plugin.database.jdbc.AbstractJdbcDataSourcePlugin;

/** MySQL/MariaDB JDBC 数据源插件。 */
public final class MySqlDataSourcePlugin extends AbstractJdbcDataSourcePlugin {

  @Override
  public DataSourceDbType dbType() {
    return DataSourceDbType.MYSQL;
  }

  @Override
  protected int defaultPort() {
    return 3306;
  }

  @Override
  protected String defaultDriverClassName() {
    return "org.mariadb.jdbc.Driver";
  }

  @Override
  protected String buildJdbcUrl(String host, int port, String database, JsonNode connectionJson) {
    return "jdbc:mariadb://" + host + ":" + port + "/" + database;
  }

  @Override
  public boolean acceptsUrl(String jdbcUrl) {
    return jdbcUrl != null
        && (jdbcUrl.startsWith("jdbc:mysql:") || jdbcUrl.startsWith("jdbc:mariadb:"));
  }
}
