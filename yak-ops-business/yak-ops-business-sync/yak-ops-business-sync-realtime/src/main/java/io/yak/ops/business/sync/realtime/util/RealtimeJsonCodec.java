package io.yak.ops.business.sync.realtime.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/** 实时同步模块 JSON 编解码器。 */
@ConditionalOnRealtimeSyncEnabled
@Component
public class RealtimeJsonCodec {

  private static final TypeReference<Map<String, String>> STRING_MAP = new TypeReference<>() {
  };

  private final ObjectMapper objectMapper;

  public RealtimeJsonCodec(@Qualifier("realtimeSyncJsonMapper") ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public String writeMap(Map<String, String> value) {
    try {
      return objectMapper.writeValueAsString(value == null ? Map.of() : value);
    } catch (Exception exception) {
      throw new IllegalArgumentException("运行参数序列化失败", exception);
    }
  }

  public Map<String, String> readMap(String value) {
    if (value == null || value.isBlank()) {
      return new LinkedHashMap<>();
    }
    try {
      return objectMapper.readValue(value, STRING_MAP);
    } catch (Exception exception) {
      throw new IllegalArgumentException("运行参数反序列化失败", exception);
    }
  }

  public String writeList(List<String> value) {
    try {
      return objectMapper.writeValueAsString(value == null ? List.of() : value);
    } catch (Exception exception) {
      throw new IllegalArgumentException("命令序列化失败", exception);
    }
  }
}
