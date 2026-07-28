package io.yak.ops.plugin.database.jdbc;

import io.yak.ops.common.enums.datasource.DataSourceDbType;
import io.yak.ops.spi.datasource.DataSourceCatalog;
import io.yak.ops.spi.datasource.DataSourceCatalogQuery;
import io.yak.ops.spi.datasource.DataSourceColumn;
import io.yak.ops.spi.datasource.DataSourcePluginException;
import io.yak.ops.spi.datasource.DataSourcePluginException.Operation;
import io.yak.ops.spi.datasource.DataSourceQueryColumn;
import io.yak.ops.spi.datasource.DataSourceQueryResult;
import io.yak.ops.spi.datasource.DataSourceTable;
import io.yak.ops.spi.datasource.DataSourceTablePath;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/** 基于 JDBC {@link DatabaseMetaData} 的通用 Catalog 和轻量预览实现。 */
public class GenericJdbcCatalog implements DataSourceCatalog {

  private static final Pattern PLUGIN_VARIABLE_PATTERN =
      Pattern.compile("\\$\\{var:([^}]+)}");
  private static final DateTimeFormatter DATETIME_FORMATTER =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

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
    String database =
        firstNonBlank(query == null ? null : query.getDatabase(), connection.database());
    String schema =
        firstNonBlank(query == null ? null : query.getSchema(), connection.schema());
    String keyword = query == null ? null : trimToNull(query.getKeyword());
    try (Connection opened = openConnection();
        ResultSet resultSet =
            opened.getMetaData().getTables(database, schema, "%", tableTypes())) {
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
      Set<String> primaryKeys =
          primaryKeys(metadata, database, schema, tablePath.getTable());
      List<DataSourceColumn> columns = new ArrayList<>();
      try (ResultSet resultSet =
          metadata.getColumns(database, schema, tablePath.getTable(), "%")) {
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

  @Override
  public List<DataSourceColumn> describe(Map<String, Object> request) {
    CatalogRequest catalogRequest = resolveRequest(request);
    if (!catalogRequest.sqlMode()) {
      return listColumns(resolveTablePath(catalogRequest.tablePath()));
    }

    String query = resolveSql(catalogRequest.query(), request);
    try (Connection opened = openConnection();
        PreparedStatement statement = opened.prepareStatement(stripTrailingSemicolon(query))) {
      ResultSetMetaData metadata = statement.getMetaData();
      if (metadata != null) {
        return columnsFromMetadata(metadata);
      }
      statement.setMaxRows(1);
      try (ResultSet resultSet = statement.executeQuery()) {
        return columnsFromMetadata(resultSet.getMetaData());
      }
    } catch (Exception exception) {
      throw catalogError("解析 SQL 字段失败", exception);
    }
  }

  @Override
  public DataSourceQueryResult preview(Map<String, Object> request, int limit) {
    int safeLimit = Math.max(1, Math.min(limit, 200));
    String query = buildQuery(request);
    try (Connection opened = openConnection();
        PreparedStatement statement = opened.prepareStatement(query)) {
      statement.setMaxRows(safeLimit);
      try (ResultSet resultSet = statement.executeQuery()) {
        ResultSetMetaData metadata = resultSet.getMetaData();
        List<DataSourceQueryColumn> columns = previewColumns(metadata);
        List<Map<String, Object>> rows = new ArrayList<>();
        while (resultSet.next() && rows.size() < safeLimit) {
          Map<String, Object> row = new LinkedHashMap<>();
          for (int index = 1; index <= metadata.getColumnCount(); index++) {
            String key = columnKey(metadata, index);
            row.put(key, resultSet.getObject(index));
          }
          rows.add(row);
        }
        return new DataSourceQueryResult(columns, rows, count(request));
      }
    } catch (Exception exception) {
      throw catalogError("查询预览数据失败", exception);
    }
  }

  @Override
  public long count(Map<String, Object> request) {
    String query = buildQuery(request);
    String countSql = "SELECT COUNT(*) FROM (" + query + ") yak_ops_count";
    try (Connection opened = openConnection();
        PreparedStatement statement = opened.prepareStatement(countSql);
        ResultSet resultSet = statement.executeQuery()) {
      return resultSet.next() ? resultSet.getLong(1) : 0L;
    } catch (Exception exception) {
      throw catalogError("统计查询结果失败", exception);
    }
  }

  @Override
  public String buildSqlTemplate(String tablePath) {
    DataSourceTablePath resolvedPath = resolveTablePath(tablePath);
    List<DataSourceColumn> columns = listColumns(resolvedPath);
    if (columns.isEmpty()) {
      throw catalogError("未找到表字段：" + tablePath, null);
    }
    String columnSql =
        columns.stream()
            .map(DataSourceColumn::getName)
            .map(this::quoteIdentifier)
            .collect(Collectors.joining(", "));
    return "SELECT " + columnSql + "\nFROM " + buildTableReference(resolvedPath);
  }

  @Override
  public String resolveSql(String sql, Map<String, Object> request) {
    if (isBlank(sql)) {
      return sql;
    }

    String resolved = sql;
    for (Map.Entry<String, String> variable : requestVariables(request).entrySet()) {
      resolved = resolved.replace("${" + variable.getKey() + "}", variable.getValue());
      resolved =
          resolved.replace("${var:" + variable.getKey() + "}", variable.getValue());
    }

    Matcher matcher = PLUGIN_VARIABLE_PATTERN.matcher(resolved);
    StringBuffer buffer = new StringBuffer();
    while (matcher.find()) {
      String replacement = builtInVariable(matcher.group(1));
      if (replacement == null) {
        matcher.appendReplacement(buffer, Matcher.quoteReplacement(matcher.group(0)));
      } else {
        matcher.appendReplacement(buffer, Matcher.quoteReplacement(replacement));
      }
    }
    matcher.appendTail(buffer);
    return buffer.toString();
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
    return !isBlank(database);
  }

  protected boolean includeSchema(String schema) {
    return !isBlank(schema);
  }

  protected String[] tableTypes() {
    return new String[] {"TABLE", "VIEW"};
  }

  protected boolean matchesKeyword(String value, String keyword) {
    return keyword == null
        || (value != null
            && value.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT)));
  }

  protected String quoteIdentifier(String identifier) {
    if (isBlank(identifier)) {
      throw new IllegalArgumentException("数据库标识符不能为空");
    }
    String quote = usesBacktick() ? "`" : "\"";
    return quote + identifier.trim().replace(quote, quote + quote) + quote;
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
    if (isBlank(message)) {
      return throwable == null ? null : throwable.getClass().getSimpleName();
    }
    String sanitized =
        message.replaceAll("(?i)(password|pwd)=([^;&\\s]+)", "$1=******");
    return sanitized.length() > 300 ? sanitized.substring(0, 300) : sanitized;
  }

  private String buildQuery(Map<String, Object> request) {
    CatalogRequest catalogRequest = resolveRequest(request);
    if (catalogRequest.sqlMode()) {
      return stripTrailingSemicolon(resolveSql(catalogRequest.query(), request));
    }
    return "SELECT * FROM " + buildTableReference(resolveTablePath(catalogRequest.tablePath()));
  }

  private CatalogRequest resolveRequest(Map<String, Object> request) {
    if (request == null) {
      throw catalogError("requestBody 不能为空", null);
    }
    String readMode = text(request, "read_mode", "readMode");
    String tablePath = text(request, "table_path", "tablePath", "table");
    String query = text(request, "query", "sql");
    boolean sqlMode = "sql".equalsIgnoreCase(readMode) || (!isBlank(query) && isBlank(tablePath));
    if (sqlMode && isBlank(query)) {
      throw catalogError("SQL 模式下 query 不能为空", null);
    }
    if (!sqlMode && isBlank(tablePath)) {
      throw catalogError("表模式下 table_path 不能为空", null);
    }
    return new CatalogRequest(sqlMode, trimToNull(tablePath), trimToNull(query));
  }

  private DataSourceTablePath resolveTablePath(String tablePath) {
    if (isBlank(tablePath)) {
      throw catalogError("table_path 不能为空", null);
    }
    String[] parts =
        java.util.Arrays.stream(tablePath.split("\\."))
            .map(String::trim)
            .filter(part -> !part.isEmpty())
            .map(this::removeIdentifierQuotes)
            .toArray(String[]::new);
    if (parts.length == 1) {
      return new DataSourceTablePath(connection.database(), connection.schema(), parts[0]);
    }
    if (parts.length == 2) {
      if (usesCatalogAsNamespace()) {
        return new DataSourceTablePath(parts[0], null, parts[1]);
      }
      return new DataSourceTablePath(connection.database(), parts[0], parts[1]);
    }
    if (parts.length == 3) {
      return new DataSourceTablePath(parts[0], parts[1], parts[2]);
    }
    throw catalogError("table_path 格式不正确：" + tablePath, null);
  }

  private String buildTableReference(DataSourceTablePath tablePath) {
    List<String> parts = new ArrayList<>();
    if (usesCatalogAsNamespace()) {
      String database = firstNonBlank(tablePath.getDatabase(), connection.database());
      if (!isBlank(database)) {
        parts.add(quoteIdentifier(database));
      }
    } else {
      String schema = firstNonBlank(tablePath.getSchema(), connection.schema());
      if (!isBlank(schema)) {
        parts.add(quoteIdentifier(schema));
      }
    }
    parts.add(quoteIdentifier(tablePath.getTable()));
    return String.join(".", parts);
  }

  private List<DataSourceColumn> columnsFromMetadata(ResultSetMetaData metadata)
      throws SQLException {
    List<DataSourceColumn> columns = new ArrayList<>();
    for (int index = 1; index <= metadata.getColumnCount(); index++) {
      columns.add(
          new DataSourceColumn(
              columnKey(metadata, index),
              metadata.getColumnTypeName(index),
              metadata.getColumnType(index),
              metadata.getPrecision(index),
              metadata.getScale(index),
              metadata.isNullable(index) != ResultSetMetaData.columnNoNulls,
              index,
              false,
              null));
    }
    return columns;
  }

  private List<DataSourceQueryColumn> previewColumns(ResultSetMetaData metadata)
      throws SQLException {
    List<DataSourceQueryColumn> columns = new ArrayList<>();
    for (int index = 1; index <= metadata.getColumnCount(); index++) {
      String key = columnKey(metadata, index);
      columns.add(new DataSourceQueryColumn(key, key, key, true));
    }
    return columns;
  }

  private String columnKey(ResultSetMetaData metadata, int index) throws SQLException {
    String label = metadata.getColumnLabel(index);
    return isBlank(label) ? metadata.getColumnName(index) : label;
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
    if (!isBlank(connection.username())) {
      properties.setProperty("user", connection.username());
    }
    if (connection.password() != null) {
      properties.setProperty("password", connection.password());
    }
    return properties;
  }

  private Map<String, String> requestVariables(Map<String, Object> request) {
    if (request == null || !(request.get("paramsList") instanceof Iterable<?> items)) {
      return Collections.emptyMap();
    }
    Map<String, String> variables = new LinkedHashMap<>();
    for (Object item : items) {
      if (!(item instanceof Map<?, ?> value)) {
        continue;
      }
      String name = mapText(value, "paramName", "name");
      String variableValue = mapText(value, "paramValue", "value");
      if (!isBlank(name) && variableValue != null) {
        variables.put(name.trim(), variableValue);
      }
    }
    return variables;
  }

  private String builtInVariable(String name) {
    LocalDate today = LocalDate.now();
    LocalDateTime value =
        switch (name.toLowerCase(Locale.ROOT)) {
          case "now", "current_time" -> LocalDateTime.now();
          case "today_start" -> today.atStartOfDay();
          case "today_end" -> today.atTime(LocalTime.MAX.withNano(0));
          case "yesterday_start" -> today.minusDays(1).atStartOfDay();
          case "yesterday_end" -> today.minusDays(1).atTime(LocalTime.MAX.withNano(0));
          default -> null;
        };
    return value == null ? null : "'" + DATETIME_FORMATTER.format(value) + "'";
  }

  private String text(Map<String, Object> request, String... keys) {
    for (String key : keys) {
      Object value = request.get(key);
      if (value != null) {
        return String.valueOf(value);
      }
    }
    return null;
  }

  private String mapText(Map<?, ?> request, String... keys) {
    for (String key : keys) {
      Object value = request.get(key);
      if (value != null) {
        return String.valueOf(value);
      }
    }
    return null;
  }

  private boolean usesCatalogAsNamespace() {
    return connection.dbType() == DataSourceDbType.MYSQL
        || connection.dbType() == DataSourceDbType.DORIS;
  }

  private boolean usesBacktick() {
    return usesCatalogAsNamespace();
  }

  private String removeIdentifierQuotes(String identifier) {
    String value = identifier.trim();
    if (value.length() >= 2
        && ((value.startsWith("`") && value.endsWith("`"))
            || (value.startsWith("\"") && value.endsWith("\"")))) {
      return value.substring(1, value.length() - 1);
    }
    return value;
  }

  private String stripTrailingSemicolon(String sql) {
    String value = sql == null ? null : sql.trim();
    while (value != null && value.endsWith(";")) {
      value = value.substring(0, value.length() - 1).trim();
    }
    return value;
  }

  private String firstNonBlank(String value, String fallback) {
    return isBlank(value) ? trimToNull(fallback) : value.trim();
  }

  private String trimToNull(String value) {
    return isBlank(value) ? null : value.trim();
  }

  private boolean isBlank(String value) {
    return value == null || value.trim().isEmpty();
  }

  private record CatalogRequest(boolean sqlMode, String tablePath, String query) {
  }
}
