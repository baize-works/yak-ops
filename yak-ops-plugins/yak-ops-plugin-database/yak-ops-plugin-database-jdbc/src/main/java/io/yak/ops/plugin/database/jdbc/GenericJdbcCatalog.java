package io.yak.ops.plugin.database.jdbc;

import io.yak.ops.spi.datasource.DataSourceCatalog;
import io.yak.ops.spi.datasource.DataSourceCatalogQuery;
import io.yak.ops.spi.datasource.DataSourceColumn;
import io.yak.ops.spi.datasource.DataSourcePluginException;
import io.yak.ops.spi.datasource.DataSourcePluginException.Operation;
import io.yak.ops.spi.datasource.DataSourceTable;
import io.yak.ops.spi.datasource.DataSourceTablePath;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Properties;
import java.util.Set;

/** 基于 JDBC {@link DatabaseMetaData} 的通用 Catalog 实现。 */
public class GenericJdbcCatalog implements DataSourceCatalog {

  private final JdbcConnectionProperties connection;
  private final int timeoutSeconds;

  public GenericJdbcCatalog(JdbcConnectionProperties connection, int timeoutSeconds) {
    this.connection = connection;
    this.timeoutSeconds = Math.max(1, timeoutSeconds);
  }

  @Override
  public List<String> listDatabases() {
    try (Connection opened = openConnection()) {
      Set<String> databases = new LinkedHashSet<>();
      try (ResultSet resultSet = opened.getMetaData().getCatalogs()) {
        while (resultSet.next()) {
          String database = resultSet.getString(1);
          if (includeDatabase(database)) {
            databases.add(database);
          }
        }
      }
      if (databases.isEmpty() && includeDatabase(connection.database())) {
        databases.add(connection.database());
      }
      return new ArrayList<>(databases);
    } catch (Exception exception) {
      throw catalogError("读取数据库列表失败", exception);
    }
  }

  @Override
  public List<String> listSchemas(String database) {
    try (Connection opened = openConnection()) {
      Set<String> schemas = new LinkedHashSet<>();
      DatabaseMetaData metadata = opened.getMetaData();
      try (ResultSet resultSet = schemas(metadata, trimToNull(database))) {
        while (resultSet.next()) {
          String schema = resultSet.getString("TABLE_SCHEM");
          if (includeSchema(schema)) {
            schemas.add(schema);
          }
        }
      }
      if (schemas.isEmpty() && includeSchema(connection.schema())) {
        schemas.add(connection.schema());
      }
      return new ArrayList<>(schemas);
    } catch (Exception exception) {
      throw catalogError("读取 Schema 列表失败", exception);
    }
  }

  @Override
  public List<DataSourceTable> listTables(DataSourceCatalogQuery query) {
    String database = firstNonBlank(query == null ? null : query.getDatabase(), connection.database());
    String schema = firstNonBlank(query == null ? null : query.getSchema(), connection.schema());
    String keyword = query == null ? null : trimToNull(query.getKeyword());
    try (Connection opened = openConnection();
         ResultSet resultSet = opened.getMetaData().getTables(database, schema, "%", tableTypes())) {
      List<DataSourceTable> tables = new ArrayList<>();
      while (resultSet.next()) {
        String name = resultSet.getString("TABLE_NAME");
        if (!matchesKeyword(name, keyword)) {
          continue;
        }
        tables.add(
            new DataSourceTable(
                resultSet.getString("TABLE_CAT"),
                resultSet.getString("TABLE_SCHEM"),
                name,
                resultSet.getString("TABLE_TYPE"),
                resultSet.getString("REMARKS")));
      }
      return tables;
    } catch (Exception exception) {
      throw catalogError("读取表列表失败", exception);
    }
  }

  @Override
  public List<DataSourceColumn> listColumns(DataSourceTablePath tablePath) {
    String database = firstNonBlank(tablePath.getDatabase(), connection.database());
    String schema = firstNonBlank(tablePath.getSchema(), connection.schema());
    try (Connection opened = openConnection()) {
      DatabaseMetaData metadata = opened.getMetaData();
      Set<String> primaryKeys = primaryKeys(metadata, database, schema, tablePath.getTable());
      List<DataSourceColumn> columns = new ArrayList<>();
      try (ResultSet resultSet = metadata.getColumns(database, schema, tablePath.getTable(), "%")) {
        while (resultSet.next()) {
          String name = resultSet.getString("COLUMN_NAME");
          columns.add(
              new DataSourceColumn(
                  name,
                  resultSet.getString("TYPE_NAME"),
                  resultSet.getInt("DATA_TYPE"),
                  nullableInteger(resultSet, "COLUMN_SIZE"),
                  nullableInteger(resultSet, "DECIMAL_DIGITS"),
                  resultSet.getInt("NULLABLE") != DatabaseMetaData.columnNoNulls,
                  resultSet.getInt("ORDINAL_POSITION"),
                  primaryKeys.contains(name),
                  resultSet.getString("REMARKS")));
        }
      }
      return columns;
    } catch (Exception exception) {
      throw catalogError("读取字段列表失败", exception);
    }
  }

  protected Connection openConnection() throws Exception {
    Class.forName(connection.driverClassName());
    DriverManager.setLoginTimeout(timeoutSeconds);
    return DriverManager.getConnection(connection.jdbcUrl(), connectionPropertiesInternal());
  }

  protected JdbcConnectionProperties connectionProperties() {
    return connection;
  }

  protected boolean includeDatabase(String database) {
    return database != null && !database.trim().isEmpty();
  }

  protected boolean includeSchema(String schema) {
    return schema != null && !schema.trim().isEmpty();
  }

  protected String[] tableTypes() {
    return new String[] {"TABLE", "VIEW"};
  }

  protected boolean matchesKeyword(String value, String keyword) {
    return keyword == null
        || (value != null
            && value.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT)));
  }

  protected DataSourcePluginException catalogError(String action, Throwable throwable) {
    String message = safeMessage(throwable);
    return new DataSourcePluginException(
        Operation.CATALOG,
        action + (message == null ? "" : "：" + message),
        throwable);
  }

  protected String safeMessage(Throwable throwable) {
    String message = throwable == null ? null : throwable.getMessage();
    if (message == null || message.trim().isEmpty()) {
      return throwable == null ? null : throwable.getClass().getSimpleName();
    }
    String sanitized = message.replaceAll("(?i)(password|pwd)=([^;&\\s]+)", "$1=******");
    return sanitized.length() > 300 ? sanitized.substring(0, 300) : sanitized;
  }

  private ResultSet schemas(DatabaseMetaData metadata, String database) throws SQLException {
    try {
      return metadata.getSchemas(database, null);
    } catch (SQLFeatureNotSupportedException | AbstractMethodError exception) {
      return metadata.getSchemas();
    }
  }

  private Set<String> primaryKeys(
      DatabaseMetaData metadata,
      String database,
      String schema,
      String table) {
    try (ResultSet resultSet = metadata.getPrimaryKeys(database, schema, table)) {
      Set<String> keys = new LinkedHashSet<>();
      while (resultSet.next()) {
        keys.add(resultSet.getString("COLUMN_NAME"));
      }
      return keys;
    } catch (Exception ignored) {
      return Collections.emptySet();
    }
  }

  private Integer nullableInteger(ResultSet resultSet, String column) throws SQLException {
    int value = resultSet.getInt(column);
    return resultSet.wasNull() ? null : value;
  }

  private Properties connectionPropertiesInternal() {
    Properties properties = new Properties();
    properties.putAll(connection.properties());
    if (connection.username() != null && !connection.username().trim().isEmpty()) {
      properties.setProperty("user", connection.username());
    }
    if (connection.password() != null) {
      properties.setProperty("password", connection.password());
    }
    return properties;
  }

  private String firstNonBlank(String value, String fallback) {
    return value == null || value.trim().isEmpty() ? trimToNull(fallback) : value.trim();
  }

  private String trimToNull(String value) {
    return value == null || value.trim().isEmpty() ? null : value.trim();
  }
}
