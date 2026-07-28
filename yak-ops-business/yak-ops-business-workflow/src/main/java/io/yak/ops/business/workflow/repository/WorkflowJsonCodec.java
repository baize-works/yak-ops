package io.yak.ops.business.workflow.repository;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.workflow.model.WorkflowDag;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Central JSON serialization and content hashing for immutable workflow snapshots. */
@ConditionalOnWorkflowEnabled
@Component
public final class WorkflowJsonCodec {

  private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };

  private final ObjectMapper objectMapper;

  public WorkflowJsonCodec(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public String write(Object value) {
    try {
      return objectMapper.writeValueAsString(value == null ? Map.of() : value);
    } catch (JsonProcessingException error) {
      throw new IllegalArgumentException("Cannot serialize workflow JSON", error);
    }
  }

  public WorkflowDag readDag(String json) {
    try {
      return objectMapper.readValue(json, WorkflowDag.class);
    } catch (JsonProcessingException error) {
      throw new IllegalStateException("Cannot deserialize workflow DAG", error);
    }
  }

  public Map<String, Object> readMap(String json) {
    if (json == null || json.isBlank()) {
      return Map.of();
    }
    try {
      return objectMapper.readValue(json, MAP_TYPE);
    } catch (JsonProcessingException error) {
      throw new IllegalStateException("Cannot deserialize workflow map", error);
    }
  }

  public String sha256(Object value) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256")
          .digest(write(value).getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException error) {
      throw new IllegalStateException("SHA-256 is unavailable", error);
    }
  }
}
