package io.yak.ops.business.datasource.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.exception.DataSourceException;
import io.yak.ops.common.bean.vo.datasource.DataSourcePluginConfigVO.FormFieldVO;
import io.yak.ops.common.enums.datasource.DataSourceErrorCode;
import io.yak.ops.spi.datasource.DataSourcePlugin;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** 连接参数敏感字段的脱敏和编辑合并工具。 */
@Component
@ConditionalOnDataSourceEnabled
@RequiredArgsConstructor
public class DataSourceSecretCodec {

  public static final String MASKED_VALUE = "******";

  private static final Set<String> COMMON_SECRET_KEYS =
      Set.of("password", "pwd", "secret", "secretKey", "accessToken");

  private final ObjectMapper objectMapper;

  /** 返回仅用于前端回显的脱敏 JSON。 */
  public String maskConnectionJson(DataSourcePlugin plugin, String connectionJson) {
    if (connectionJson == null || connectionJson.trim().isEmpty()) {
      return null;
    }
    ObjectNode root = readObject(connectionJson);
    for (String key : secretKeys(plugin)) {
      JsonNode value = root.get(key);
      if (value != null && !value.isNull()) {
        root.put(key, MASKED_VALUE);
      }
    }
    return write(root);
  }

  /**
   * 编辑或测试已有数据源时，前端传回掩码、空值或缺失字段都表示沿用已保存密钥。
   */
  public String mergeStoredSecrets(
      DataSourcePlugin plugin,
      String submittedJson,
      String storedJson) {
    ObjectNode submitted = readObject(submittedJson);
    ObjectNode stored = readObject(storedJson);
    for (String key : secretKeys(plugin)) {
      JsonNode submittedValue = submitted.get(key);
      if (shouldPreserve(submittedValue) && stored.has(key)) {
        submitted.set(key, stored.get(key).deepCopy());
      }
    }
    return write(submitted);
  }

  /** 对展示用连接地址中的常见凭据参数进行兜底脱敏。 */
  public String maskSensitiveText(String value) {
    if (value == null || value.isEmpty()) {
      return value;
    }
    String masked =
        value.replaceAll(
            "(?i)((?:^|[?&;])(?:password|pwd|token|secret)=)[^&;\\s]*",
            "$1" + MASKED_VALUE);
    return masked.replaceAll(
        "(?i)(://[^:/?#\\s]+:)[^@/?#\\s]+@",
        "$1" + MASKED_VALUE + "@");
  }

  private Set<String> secretKeys(DataSourcePlugin plugin) {
    Set<String> keys = new LinkedHashSet<>(COMMON_SECRET_KEYS);
    if (plugin == null || plugin.pluginConfig() == null) {
      return keys;
    }
    List<FormFieldVO> fields = plugin.pluginConfig().getFormFields();
    if (fields == null) {
      return keys;
    }
    for (FormFieldVO field : fields) {
      if (field != null
          && field.getKey() != null
          && "PASSWORD".equalsIgnoreCase(field.getType())) {
        keys.add(field.getKey());
      }
    }
    return keys;
  }

  private boolean shouldPreserve(JsonNode value) {
    if (value == null || value.isNull()) {
      return true;
    }
    if (!value.isTextual()) {
      return false;
    }
    String text = value.asText();
    return text == null || text.trim().isEmpty() || MASKED_VALUE.equals(text.trim());
  }

  private ObjectNode readObject(String value) {
    try {
      JsonNode root = objectMapper.readTree(value);
      if (root == null || !root.isObject()) {
        throw invalidJson("连接参数必须是 JSON 对象", null);
      }
      return (ObjectNode) root;
    } catch (DataSourceException exception) {
      throw exception;
    } catch (Exception exception) {
      throw invalidJson("连接参数不是合法 JSON", exception);
    }
  }

  private String write(ObjectNode value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (Exception exception) {
      throw invalidJson("连接参数序列化失败", exception);
    }
  }

  private DataSourceException invalidJson(String message, Throwable cause) {
    return new DataSourceException(
        DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
        message,
        cause);
  }
}
