package io.yak.ops.business.datasource.common.enums;

import io.yak.ops.business.datasource.exception.DataSourceException;
import java.util.Locale;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;

/** 数据源所属环境。 */
@Getter
@RequiredArgsConstructor
public enum DataSourceEnvironment {

  DEVELOP("开发"),
  TEST("测试"),
  PROD("生产");

  private final String displayName;

  public static DataSourceEnvironment parse(String value) {
    if (!StringUtils.hasText(value)) {
      return DEVELOP;
    }

    String normalized = value.trim().toUpperCase(Locale.ROOT);
    if ("DEV".equals(normalized) || "DEVELOPMENT".equals(normalized)) {
      normalized = "DEVELOP";
    }
    if ("PRODUCTION".equals(normalized)) {
      normalized = "PROD";
    }

    try {
      return valueOf(normalized);
    } catch (IllegalArgumentException exception) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_ENVIRONMENT,
          "不支持的运行环境：" + value,
          exception);
    }
  }
}
