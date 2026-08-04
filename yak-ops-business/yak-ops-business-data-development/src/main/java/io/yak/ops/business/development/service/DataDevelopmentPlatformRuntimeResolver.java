package io.yak.ops.business.development.service;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.Environment;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.ParameterTemplate;
import io.yak.ops.business.development.repository.DataDevelopmentPlatformRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Resolves non-persisted platform parameters and secrets immediately before execution. */
@ConditionalOnDataDevelopmentEnabled
@Service
public final class DataDevelopmentPlatformRuntimeResolver {

  private final DataDevelopmentPlatformRepository repository;
  private final DataDevelopmentSecretCipher cipher;
  private final DataDevelopmentJsonCodec json;

  public DataDevelopmentPlatformRuntimeResolver(
      DataDevelopmentPlatformRepository repository,
      DataDevelopmentSecretCipher cipher,
      DataDevelopmentJsonCodec json) {
    this.repository = repository;
    this.cipher = cipher;
    this.json = json;
  }

  public void validateReferences(JsonNode runtime) {
    JsonNode common = common(runtime);
    long environmentId = positiveLong(common.path("environmentId"));
    long templateId = positiveLong(common.path("parameterTemplateId"));
    if (environmentId > 0) requireEnabledEnvironment(environmentId);
    if (templateId > 0) requireEnabledTemplate(templateId);
    JsonNode secretKeys = common.path("secretKeys");
    if (secretKeys.isArray() && !secretKeys.isEmpty() && environmentId <= 0) {
      throw new IllegalArgumentException("使用平台密钥时必须选择运行环境");
    }
  }

  public Map<String, Object> resolve(JsonNode runtime) {
    JsonNode common = common(runtime);
    Map<String, Object> values = new LinkedHashMap<>();
    long templateId = positiveLong(common.path("parameterTemplateId"));
    if (templateId > 0) {
      ParameterTemplate template = requireEnabledTemplate(templateId);
      values.putAll(json.toMap(template.parameters()));
      values.put("template", json.toMap(template.parameters()));
    }
    long environmentId = positiveLong(common.path("environmentId"));
    if (environmentId > 0) {
      Environment environment = requireEnabledEnvironment(environmentId);
      Map<String, Object> environmentValues = json.toMap(environment.variables());
      values.putAll(environmentValues);
      values.put("env", environmentValues);
      Map<String, Object> secrets = new LinkedHashMap<>();
      JsonNode secretKeys = common.path("secretKeys");
      if (secretKeys.isArray()) {
        for (JsonNode item : secretKeys) {
          String key = item.asText("").trim();
          if (key.isEmpty()) continue;
          String encrypted = repository.findEncryptedSecret(environmentId, key)
              .or(() -> repository.findEncryptedSecret(0L, key))
              .orElseThrow(() -> new IllegalArgumentException("运行环境缺少密钥：" + key));
          secrets.put(key, cipher.decrypt(encrypted));
        }
      }
      values.put("secret", secrets);
    }
    return values;
  }

  private Environment requireEnabledEnvironment(long id) {
    Environment value = repository.findEnvironment(id)
        .orElseThrow(() -> new IllegalArgumentException("运行环境不存在：" + id));
    if (!value.enabled()) throw new IllegalStateException("运行环境已停用：" + value.name());
    return value;
  }

  private ParameterTemplate requireEnabledTemplate(long id) {
    ParameterTemplate value = repository.findParameterTemplate(id)
        .orElseThrow(() -> new IllegalArgumentException("参数模板不存在：" + id));
    if (!value.enabled()) throw new IllegalStateException("参数模板已停用：" + value.name());
    return value;
  }

  private static JsonNode common(JsonNode runtime) {
    return runtime == null || runtime.isNull() ? nullNode() : runtime.path("common");
  }

  private static JsonNode nullNode() {
    return com.fasterxml.jackson.databind.node.MissingNode.getInstance();
  }

  private static long positiveLong(JsonNode value) {
    if (value == null || value.isMissingNode() || value.isNull()) return 0L;
    if (value.isNumber()) return Math.max(0L, value.asLong());
    try { return Math.max(0L, Long.parseLong(value.asText("0"))); }
    catch (NumberFormatException ignored) { return 0L; }
  }
}
