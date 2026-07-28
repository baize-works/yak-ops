package io.yak.ops.plugin.database.jdbc;

import io.yak.ops.common.enums.datasource.DataSourceDbType;
import io.yak.ops.spi.datasource.DataSourceConnection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** JDBC 插件解析后的不可变连接参数。 */
public final class JdbcConnectionProperties implements DataSourceConnection {

  private final DataSourceDbType dbType;
  private final String jdbcUrl;
  private final String driverClassName;
  private final String username;
  private final String password;
  private final String database;
  private final String schema;
  private final Map<String, String> properties;
  private final String normalizedJson;

  public JdbcConnectionProperties(
      DataSourceDbType dbType,
      String jdbcUrl,
      String driverClassName,
      String username,
      String password,
      String database,
      String schema,
      Map<String, String> properties,
      String normalizedJson) {
    this.dbType = dbType;
    this.jdbcUrl = jdbcUrl;
    this.driverClassName = driverClassName;
    this.username = username;
    this.password = password;
    this.database = database;
    this.schema = schema;
    this.properties = Collections.unmodifiableMap(new LinkedHashMap<>(properties));
    this.normalizedJson = normalizedJson;
  }

  @Override
  public DataSourceDbType dbType() {
    return dbType;
  }

  @Override
  public String jdbcUrl() {
    return jdbcUrl;
  }

  @Override
  public String driverClassName() {
    return driverClassName;
  }

  @Override
  public String username() {
    return username;
  }

  @Override
  public String password() {
    return password;
  }

  @Override
  public String database() {
    return database;
  }

  @Override
  public String schema() {
    return schema;
  }

  @Override
  public Map<String, String> properties() {
    return properties;
  }

  @Override
  public String normalizedJson() {
    return normalizedJson;
  }
}
