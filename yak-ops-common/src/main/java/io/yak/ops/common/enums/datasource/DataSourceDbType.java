package io.yak.ops.common.enums.datasource;

import java.util.Locale;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Yak Ops 当前支持的数据源类型。 */
@Getter
@RequiredArgsConstructor
public enum DataSourceDbType {

  MYSQL("MySQL", "org.mariadb.jdbc.Driver", 3306, "jdbc:mariadb"),
  ORACLE("Oracle", "oracle.jdbc.OracleDriver", 1521, "jdbc:oracle:thin:@"),
  POSTGRE_SQL("PostgreSQL", "org.postgresql.Driver", 5432, "jdbc:postgresql"),
  DORIS("Doris", "org.mariadb.jdbc.Driver", 9030, "jdbc:mariadb"),
  KINGBASE("KingbaseES", "com.kingbase8.Driver", 54321, "jdbc:kingbase8"),
  DAMENG("达梦", "dm.jdbc.driver.DmDriver", 5236, "jdbc:dm");

  private final String displayName;
  private final String defaultDriverClassName;
  private final int defaultPort;
  private final String jdbcPrefix;

  public static DataSourceDbType parse(String value) {
    if (value == null || value.trim().isEmpty()) {
      throw new IllegalArgumentException("数据源类型不能为空");
    }

    String normalized = value.trim().toUpperCase(Locale.ROOT).replace('-', '_');
    if ("POSTGRESQL".equals(normalized) || "POSTGRES".equals(normalized)) {
      normalized = "POSTGRE_SQL";
    }

    try {
      return valueOf(normalized);
    } catch (IllegalArgumentException exception) {
      throw new IllegalArgumentException("不支持的数据源类型：" + value, exception);
    }
  }
}
