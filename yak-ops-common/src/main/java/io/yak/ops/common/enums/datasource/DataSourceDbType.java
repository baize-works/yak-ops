package io.yak.ops.common.enums.datasource;

import java.util.Locale;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Yak Ops 当前支持的数据源类型。具体驱动、端口和 URL 规则由插件提供。 */
@Getter
@RequiredArgsConstructor
public enum DataSourceDbType {

  MYSQL("MySQL"),
  ORACLE("Oracle"),
  POSTGRE_SQL("PostgreSQL"),
  DORIS("Doris"),
  KINGBASE("KingbaseES"),
  DAMENG("达梦");

  private final String displayName;

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
