package io.yak.ops.plugin.database.jdbc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.common.bean.vo.datasource.DataSourcePluginConfigVO;
import io.yak.ops.common.bean.vo.datasource.DataSourcePluginConfigVO.FormFieldVO;
import io.yak.ops.common.bean.vo.datasource.DataSourcePluginConfigVO.RuleVO;
import io.yak.ops.common.enums.datasource.DataSourceDbType;
import io.yak.ops.spi.datasource.DataSourceCatalog;
import io.yak.ops.spi.datasource.DataSourceConnection;
import io.yak.ops.spi.datasource.DataSourcePlugin;
import io.yak.ops.spi.datasource.DataSourcePluginException;
import io.yak.ops.spi.datasource.DataSourcePluginException.Operation;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/** JDBC 数据源插件基座，统一负责参数解析、表单配置和连接测试。 */
public abstract class AbstractJdbcDataSourcePlugin implements DataSourcePlugin {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  @Override
  public DataSourcePluginConfigVO pluginConfig() {
    List<FormFieldVO> fields = new ArrayList<>();
    fields.add(field("host", "主机地址", "INPUT", "请输入数据库主机地址", "127.0.0.1", required("请输入主机地址")));
    fields.add(field("port", "端口", "NUMBER", "请输入数据库端口", defaultPort(), rangeRule(1, 65535, "端口必须在 1 到 65535 之间")));
    fields.add(field("database", databaseLabel(), "INPUT", "请输入数据库名称", null, required("请输入数据库名称")));
    fields.add(field("schema", "Schema", "INPUT", "可选；不填写时使用数据库默认 Schema", null, Collections.emptyList()));
    fields.add(field("username", "用户名", "INPUT", "请输入数据库用户名", null, required("请输入数据库用户名")));
    fields.add(field("password", "密码", "PASSWORD", "请输入数据库密码", null, Collections.emptyList()));
    fields.add(field("jdbcUrl", "JDBC 地址", "INPUT", "可选；留空时由插件根据主机、端口和数据库生成", null, Collections.emptyList()));
    fields.add(field("driverClassName", "驱动类", "INPUT", "请输入 JDBC Driver Class", defaultDriverClassName(), required("请输入 JDBC 驱动类")));
    fields.add(field("properties", "扩展属性", "TEXTAREA", "可选；请输入 JSON 对象，例如 {\"useSSL\":\"false\"}", null, Collections.emptyList()));
    appendFormFields(fields);
    return DataSourcePluginConfigVO.builder()
        .pluginType(dbType().name())
        .formFields(fields)
        .installRequired(false)
        .build();
  }

  @Override
  public DataSourceConnection parseConnection(String connectionJson) {
    try {
      JsonNode root = OBJECT_MAPPER.readTree(connectionJson);
      if (root == null || !root.isObject()) {
        throw parameterError("连接参数必须是 JSON 对象", null);
      }

      validateDeclaredType(root);
      String explicitUrl = firstText(root, "jdbcUrl", "url");
      String host = firstText(root, "host", "hostname");
      int port = intValue(root, defaultPort(), "port");
      String database = firstText(root, "database", "databaseName", "serviceName");
      String schema = firstText(root, "schema", "schemaName");
      String username = firstText(root, "username", "user");
      String password = firstText(root, "password");
      String driver = defaultIfBlank(firstText(root, "driverClassName", "driver"), defaultDriverClassName());

      if (isBlank(username)) {
        throw parameterError("username 不能为空", null);
      }

      String jdbcUrl = explicitUrl;
      if (isBlank(jdbcUrl)) {
        if (isBlank(host)) {
          throw parameterError("host 不能为空", null);
        }
        if (isBlank(database)) {
          throw parameterError("database 不能为空", null);
        }
        jdbcUrl = buildJdbcUrl(host.trim(), port, database.trim(), root);
      } else {
        jdbcUrl = jdbcUrl.trim();
      }

      if (isBlank(database)) {
        database = inferDatabase(jdbcUrl);
      }

      Map<String, String> properties = parseProperties(root.get("properties"));
      ObjectNode normalized = OBJECT_MAPPER.createObjectNode();
      normalized.put("dbType", dbType().name());
      putIfText(normalized, "host", host);
      normalized.put("port", port);
      putIfText(normalized, "database", database);
      putIfText(normalized, "schema", schema);
      putIfText(normalized, "username", username);
      if (password != null) {
        normalized.put("password", password);
      }
      normalized.put("jdbcUrl", jdbcUrl);
      normalized.put("driverClassName", driver);
      ObjectNode propertiesNode = normalized.putObject("properties");
      properties.forEach(propertiesNode::put);
      appendNormalizedFields(root, normalized);

      return new JdbcConnectionProperties(
          dbType(),
          jdbcUrl,
          driver,
          username.trim(),
          password,
          trimToNull(database),
          trimToNull(schema),
          properties,
          OBJECT_MAPPER.writeValueAsString(normalized));
    } catch (DataSourcePluginException exception) {
      throw exception;
    } catch (Exception exception) {
      throw parameterError("连接参数解析失败：" + safeMessage(exception), exception);
    }
  }

  @Override
  public void testConnection(DataSourceConnection connection, int timeoutSeconds) {
    JdbcConnectionProperties jdbcConnection = requireJdbcConnection(connection);
    try {
      Class.forName(jdbcConnection.driverClassName());
      DriverManager.setLoginTimeout(Math.max(1, timeoutSeconds));
      try (Connection opened = DriverManager.getConnection(jdbcConnection.jdbcUrl(), connectionProperties(jdbcConnection))) {
        if (opened == null || opened.isClosed() || !opened.isValid(Math.max(1, timeoutSeconds))) {
          throw new DataSourcePluginException(Operation.CONNECTIVITY, "数据库连接不可用");
        }
      }
    } catch (DataSourcePluginException exception) {
      throw exception;
    } catch (ClassNotFoundException exception) {
      throw new DataSourcePluginException(
          Operation.CONNECTIVITY,
          "数据库驱动未安装：" + jdbcConnection.driverClassName(),
          exception);
    } catch (Exception exception) {
      throw new DataSourcePluginException(
          Operation.CONNECTIVITY,
          safeMessage(exception),
          exception);
    }
  }

  @Override
  public DataSourceCatalog createCatalog(DataSourceConnection connection, int timeoutSeconds) {
    return createJdbcCatalog(requireJdbcConnection(connection), Math.max(1, timeoutSeconds));
  }

  protected DataSourceCatalog createJdbcCatalog(
      JdbcConnectionProperties connection,
      int timeoutSeconds) {
    return new GenericJdbcCatalog(connection, timeoutSeconds);
  }

  protected abstract int defaultPort();

  protected abstract String defaultDriverClassName();

  protected abstract String buildJdbcUrl(
      String host,
      int port,
      String database,
      JsonNode connectionJson);

  protected String databaseLabel() {
    return "数据库";
  }

  protected void appendFormFields(List<FormFieldVO> fields) {
  }

  protected void appendNormalizedFields(JsonNode source, ObjectNode normalized) {
  }

  protected String inferDatabase(String jdbcUrl) {
    if (isBlank(jdbcUrl)) {
      return null;
    }
    String value = jdbcUrl;
    int queryIndex = value.indexOf('?');
    if (queryIndex >= 0) {
      value = value.substring(0, queryIndex);
    }
    int slashIndex = value.lastIndexOf('/');
    return slashIndex >= 0 && slashIndex < value.length() - 1
        ? value.substring(slashIndex + 1)
        : null;
  }

  protected JdbcConnectionProperties requireJdbcConnection(DataSourceConnection connection) {
    if (!(connection instanceof JdbcConnectionProperties jdbcConnection)
        || connection.dbType() != dbType()) {
      throw parameterError("连接参数与插件类型不匹配", null);
    }
    return jdbcConnection;
  }

  protected Properties connectionProperties(JdbcConnectionProperties connection) {
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

  protected String safeMessage(Throwable throwable) {
    String message = throwable == null ? null : throwable.getMessage();
    if (isBlank(message)) {
      return throwable == null ? "未知错误" : throwable.getClass().getSimpleName();
    }
    String sanitized = message.replaceAll("(?i)(password|pwd)=([^;&\\s]+)", "$1=******");
    return sanitized.length() > 300 ? sanitized.substring(0, 300) : sanitized;
  }

  private void validateDeclaredType(JsonNode root) {
    String declaredType = firstText(root, "dbType", "type", "pluginType");
    if (isBlank(declaredType)) {
      return;
    }
    try {
      if (DataSourceDbType.parse(declaredType) != dbType()) {
        throw parameterError("连接参数中的数据源类型与插件不匹配", null);
      }
    } catch (IllegalArgumentException exception) {
      throw parameterError(exception.getMessage(), exception);
    }
  }

  private Map<String, String> parseProperties(JsonNode node) {
    if (node == null || node.isNull() || (node.isTextual() && isBlank(node.asText()))) {
      return Collections.emptyMap();
    }
    JsonNode objectNode = node;
    try {
      if (node.isTextual()) {
        objectNode = OBJECT_MAPPER.readTree(node.asText());
      }
      if (objectNode == null || !objectNode.isObject()) {
        throw parameterError("properties 必须是 JSON 对象", null);
      }
      Map<String, String> values = new LinkedHashMap<>();
      Iterator<Map.Entry<String, JsonNode>> fields = objectNode.fields();
      while (fields.hasNext()) {
        Map.Entry<String, JsonNode> field = fields.next();
        if (field.getValue() != null && !field.getValue().isNull()) {
          values.put(field.getKey(), field.getValue().asText());
        }
      }
      return values;
    } catch (DataSourcePluginException exception) {
      throw exception;
    } catch (Exception exception) {
      throw parameterError("properties 不是合法 JSON", exception);
    }
  }

  private int intValue(JsonNode root, int defaultValue, String key) {
    JsonNode value = root.get(key);
    if (value == null || value.isNull() || isBlank(value.asText())) {
      return defaultValue;
    }
    int port = value.asInt(-1);
    if (port < 1 || port > 65535) {
      throw parameterError("port 必须在 1 到 65535 之间", null);
    }
    return port;
  }

  private String firstText(JsonNode node, String... keys) {
    for (String key : keys) {
      JsonNode value = node.get(key);
      if (value != null && !value.isNull()) {
        return value.asText();
      }
    }
    return null;
  }

  private void putIfText(ObjectNode target, String key, String value) {
    if (!isBlank(value)) {
      target.put(key, value.trim());
    }
  }

  private String defaultIfBlank(String value, String defaultValue) {
    return isBlank(value) ? defaultValue : value.trim();
  }

  private String trimToNull(String value) {
    return isBlank(value) ? null : value.trim();
  }

  private boolean isBlank(String value) {
    return value == null || value.trim().isEmpty();
  }

  private DataSourcePluginException parameterError(String message, Throwable cause) {
    return cause == null
        ? new DataSourcePluginException(Operation.PARAMETER, message)
        : new DataSourcePluginException(Operation.PARAMETER, message, cause);
  }

  private FormFieldVO field(
      String key,
      String label,
      String type,
      String placeholder,
      Object defaultValue,
      List<RuleVO> rules) {
    return FormFieldVO.builder()
        .key(key)
        .label(label)
        .type(type)
        .placeholder(placeholder)
        .defaultValue(defaultValue)
        .rules(rules)
        .build();
  }

  private List<RuleVO> required(String message) {
    return Collections.singletonList(
        RuleVO.builder().required(true).message(message).build());
  }

  private List<RuleVO> rangeRule(int min, int max, String message) {
    return Collections.singletonList(
        RuleVO.builder().required(true).min(min).max(max).message(message).build());
  }
}
