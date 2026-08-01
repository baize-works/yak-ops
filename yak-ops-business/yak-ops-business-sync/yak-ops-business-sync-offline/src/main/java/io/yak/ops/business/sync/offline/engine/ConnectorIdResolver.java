package io.yak.ops.business.sync.offline.engine;

import java.util.Locale;
import java.util.Set;
import org.springframework.util.StringUtils;

/** Normalizes product datasource types and legacy connector labels to Link-Up connector IDs. */
public final class ConnectorIdResolver {

  private static final Set<String> JDBC_TYPES = Set.of(
      "JDBC",
      "MYSQL",
      "MARIADB",
      "POSTGRE_SQL",
      "POSTGRESQL",
      "POSTGRES",
      "ORACLE",
      "SQLSERVER",
      "SQL_SERVER",
      "DORIS",
      "STARROCKS",
      "CLICKHOUSE",
      "DB2",
      "HIVE",
      "KINGBASE",
      "DAMENG",
      "DM");

  private ConnectorIdResolver() {
  }

  public static String resolve(String connectorId, String connectorType, String dbType,
      String fallback) {
    String value = firstText(connectorId, connectorType, dbType, fallback);
    if (!StringUtils.hasText(value)) {
      throw new IllegalArgumentException("Connector 类型不能为空");
    }
    String normalized = value.trim().toUpperCase(Locale.ROOT).replace('-', '_');
    if (JDBC_TYPES.contains(normalized)) {
      return "jdbc";
    }
    return normalized.toLowerCase(Locale.ROOT);
  }

  public static boolean isJdbc(String connectorId) {
    return "jdbc".equalsIgnoreCase(connectorId);
  }

  private static String firstText(String... values) {
    for (String value : values) {
      if (StringUtils.hasText(value)) {
        return value;
      }
    }
    return null;
  }
}
