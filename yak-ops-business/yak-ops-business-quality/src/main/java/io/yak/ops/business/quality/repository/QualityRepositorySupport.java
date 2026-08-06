package io.yak.ops.business.quality.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.quality.api.QualityApi.CheckResult;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

final class QualityRepositorySupport {

  private final ObjectMapper objectMapper;

  QualityRepositorySupport(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  String writeJson(List<String> values) {
    if (values == null || values.isEmpty()) {
      return null;
    }
    try {
      return objectMapper.writeValueAsString(values);
    } catch (JsonProcessingException exception) {
      throw new IllegalArgumentException("枚举值无法序列化", exception);
    }
  }

  List<String> readJsonList(String json) {
    if (!hasText(json)) {
      return List.of();
    }
    try {
      return objectMapper.readValue(json, new TypeReference<>() { });
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("数据库中的枚举值配置无法解析", exception);
    }
  }

  static void addObjectPath(
      List<String> parts,
      String databaseName,
      String schemaName,
      String tableName) {
    if (hasText(databaseName)) {
      parts.add(databaseName.trim());
    }
    if (hasText(schemaName) && !schemaName.trim().equals(databaseName)) {
      parts.add(schemaName.trim());
    }
    parts.add(tableName);
  }

  static String objectName(String databaseName, String schemaName, String tableName) {
    List<String> parts = new ArrayList<>();
    addObjectPath(parts, databaseName, schemaName, tableName);
    return String.join(".", parts);
  }

  static CheckResult checkResult(String value) {
    return hasText(value) ? CheckResult.valueOf(value) : CheckResult.NOT_RUN;
  }

  static LocalDateTime localDateTime(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toLocalDateTime();
  }

  static Long nullableLong(ResultSet rs, String column) throws SQLException {
    long value = rs.getLong(column);
    return rs.wasNull() ? null : value;
  }

  static boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  static String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
