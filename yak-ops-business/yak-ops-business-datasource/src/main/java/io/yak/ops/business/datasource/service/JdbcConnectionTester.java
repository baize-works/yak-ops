package io.yak.ops.business.datasource.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.datasource.common.enums.DataSourceDbType;
import io.yak.ops.business.datasource.common.enums.DataSourceErrorCode;
import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.config.DataSourceProperties;
import io.yak.ops.business.datasource.exception.DataSourceException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Iterator;
import java.util.Map;
import java.util.Properties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** JDBC 连接地址解析和连通性测试组件。 */
@Component
@ConditionalOnDataSourceEnabled
@RequiredArgsConstructor
public class JdbcConnectionTester {

  private final ObjectMapper objectMapper;
  private final DataSourceProperties properties;

  public JsonNode parseConnectionParams(String json) {
    if (!StringUtils.hasText(json)) {
      throw new DataSourceException(DataSourceErrorCode.INVALID_CONNECTION_PARAMS);
    }

    try {
      JsonNode node = objectMapper.readTree(json);
      if (node == null || !node.isObject()) {
        throw new DataSourceException(
            DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
            "连接参数必须是 JSON 对象");
      }
      return node;
    } catch (DataSourceException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
          "连接参数不是合法 JSON",
          exception);
    }
  }

  public String normalize(JsonNode node) {
    try {
      return objectMapper.writeValueAsString(node);
    } catch (Exception exception) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
          "连接参数序列化失败",
          exception);
    }
  }

  public DataSourceDbType resolveDbType(JsonNode node, String fallback) {
    String value = firstText(node, "dbType", "type", "pluginType");
    return DataSourceDbType.parse(StringUtils.hasText(value) ? value : fallback);
  }

  public String resolveJdbcUrl(DataSourceDbType dbType, JsonNode node) {
    String explicitUrl = firstText(node, "jdbcUrl", "url");
    if (StringUtils.hasText(explicitUrl)) {
      return explicitUrl.trim();
    }

    String host = firstText(node, "host", "hostname");
    String database = firstText(node, "database", "databaseName", "serviceName");
    int port = intValue(node, dbType.getDefaultPort(), "port");

    if (!StringUtils.hasText(host)) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
          "host 不能为空");
    }
    if (!StringUtils.hasText(database)) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
          "database 不能为空");
    }

    if (dbType == DataSourceDbType.ORACLE) {
      return dbType.getJdbcPrefix()
          + "//"
          + host.trim()
          + ":"
          + port
          + "/"
          + database.trim();
    }

    return dbType.getJdbcPrefix()
        + "://"
        + host.trim()
        + ":"
        + port
        + "/"
        + database.trim();
  }

  public boolean test(DataSourceDbType dbType, JsonNode node) {
    String jdbcUrl = resolveJdbcUrl(dbType, node);
    String driverClassName =
        defaultIfBlank(
            firstText(node, "driverClassName", "driver"),
            dbType.getDefaultDriverClassName());

    try {
      Class.forName(driverClassName);
    } catch (ClassNotFoundException exception) {
      throw new DataSourceException(
          DataSourceErrorCode.CONNECT_FAILED,
          "数据库驱动未安装：" + driverClassName,
          exception);
    }

    Properties connectionProperties = new Properties();
    String username = firstText(node, "username", "user");
    String password = firstText(node, "password");

    if (StringUtils.hasText(username)) {
      connectionProperties.setProperty("user", username);
    }
    if (password != null) {
      connectionProperties.setProperty("password", password);
    }
    appendCustomProperties(node.get("properties"), connectionProperties);

    int timeoutSeconds = Math.max(1, properties.getConnectionTest().getTimeoutSeconds());
    try {
      DriverManager.setLoginTimeout(timeoutSeconds);
      try (Connection connection =
          DriverManager.getConnection(jdbcUrl, connectionProperties)) {
        if (connection == null || connection.isClosed()) {
          throw new DataSourceException(
              DataSourceErrorCode.CONNECT_FAILED,
              "数据库连接未建立");
        }
        return true;
      }
    } catch (DataSourceException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new DataSourceException(
          DataSourceErrorCode.CONNECT_FAILED,
          safeMessage(exception),
          exception);
    }
  }

  private void appendCustomProperties(JsonNode node, Properties target) {
    if (node == null || node.isNull()) {
      return;
    }

    JsonNode propertiesNode = node;
    if (node.isTextual() && StringUtils.hasText(node.asText())) {
      propertiesNode = parseConnectionParams(node.asText());
    }
    if (!propertiesNode.isObject()) {
      return;
    }

    Iterator<Map.Entry<String, JsonNode>> fields = propertiesNode.fields();
    while (fields.hasNext()) {
      Map.Entry<String, JsonNode> field = fields.next();
      if (field.getValue() != null && !field.getValue().isNull()) {
        target.setProperty(field.getKey(), field.getValue().asText());
      }
    }
  }

  private String firstText(JsonNode node, String... keys) {
    if (node == null) {
      return null;
    }
    for (String key : keys) {
      JsonNode value = node.get(key);
      if (value != null && !value.isNull()) {
        return value.asText();
      }
    }
    return null;
  }

  private int intValue(JsonNode node, int defaultValue, String key) {
    JsonNode value = node == null ? null : node.get(key);
    if (value == null || value.isNull() || value.asText().trim().isEmpty()) {
      return defaultValue;
    }
    int port = value.asInt(-1);
    if (port < 1 || port > 65535) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
          "port 必须在 1 到 65535 之间");
    }
    return port;
  }

  private String defaultIfBlank(String value, String defaultValue) {
    return StringUtils.hasText(value) ? value.trim() : defaultValue;
  }

  private String safeMessage(Exception exception) {
    String message = exception.getMessage();
    if (!StringUtils.hasText(message)) {
      return exception.getClass().getSimpleName();
    }
    String sanitized =
        message.replaceAll(
            "(?i)(password|pwd)=([^;&\\s]+)",
            "$1=******");
    return sanitized.length() > 300 ? sanitized.substring(0, 300) : sanitized;
  }
}
