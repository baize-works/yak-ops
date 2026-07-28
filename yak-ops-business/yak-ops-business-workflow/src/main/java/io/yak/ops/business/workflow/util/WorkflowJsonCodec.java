package io.yak.ops.business.workflow.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.workflow.common.entity.workflow.WorkflowDag;
import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/** 工作流 JSON 序列化与版本内容摘要工具。 */
@ConditionalOnWorkflowEnabled
@Component
public class WorkflowJsonCodec {

  private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };

  private final ObjectMapper objectMapper;

  public WorkflowJsonCodec(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public String write(Object value) {
    try {
      return objectMapper.writeValueAsString(value == null ? new LinkedHashMap<>() : value);
    } catch (JsonProcessingException error) {
      throw new IllegalArgumentException("工作流 JSON 序列化失败", error);
    }
  }

  public WorkflowDag readDag(String json) {
    if (json == null || json.isBlank()) {
      return new WorkflowDag();
    }
    try {
      return objectMapper.readValue(json, WorkflowDag.class);
    } catch (JsonProcessingException error) {
      throw new IllegalStateException("工作流 DAG 反序列化失败", error);
    }
  }

  public Map<String, Object> readMap(String json) {
    if (json == null || json.isBlank()) {
      return new LinkedHashMap<>();
    }
    try {
      return objectMapper.readValue(json, MAP_TYPE);
    } catch (JsonProcessingException error) {
      throw new IllegalStateException("工作流参数反序列化失败", error);
    }
  }

  public String sha256(Object value) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256")
          .digest(write(value).getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException error) {
      throw new IllegalStateException("当前运行环境不支持 SHA-256", error);
    }
  }
}
