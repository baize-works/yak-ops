package io.yak.ops.business.development.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.LinkedHashMap;
import java.util.Map;

/** Canonical JSON serialization and SHA-256 digest support. */
public final class DataDevelopmentJsonCodec {

  private final ObjectMapper objectMapper = new ObjectMapper()
      .findAndRegisterModules()
      .enable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY)
      .enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);

  public JsonNode readTree(String json) {
    if (json == null || json.isBlank()) {
      return objectMapper.createObjectNode();
    }
    try {
      return objectMapper.readTree(json);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Stored data-development JSON is invalid", exception);
    }
  }

  public String write(JsonNode value) {
    try {
      return objectMapper.writeValueAsString(value == null
          ? objectMapper.createObjectNode()
          : value);
    } catch (JsonProcessingException exception) {
      throw new IllegalArgumentException("Unable to serialize data-development JSON", exception);
    }
  }

  public JsonNode toTree(Object value) {
    return objectMapper.valueToTree(value);
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> toMap(JsonNode value) {
    if (value == null || value.isNull()) {
      return new LinkedHashMap<>();
    }
    if (!value.isObject()) {
      throw new IllegalArgumentException("Task definition must be a JSON object");
    }
    return objectMapper.convertValue(value, LinkedHashMap.class);
  }

  public ObjectNode objectNode() {
    return objectMapper.createObjectNode();
  }

  public String digest(JsonNode value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] bytes = write(value).getBytes(StandardCharsets.UTF_8);
      byte[] hash = digest.digest(bytes);
      StringBuilder result = new StringBuilder(hash.length * 2);
      for (byte item : hash) {
        result.append(String.format("%02x", item));
      }
      return result.toString();
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is not available", exception);
    }
  }
}
