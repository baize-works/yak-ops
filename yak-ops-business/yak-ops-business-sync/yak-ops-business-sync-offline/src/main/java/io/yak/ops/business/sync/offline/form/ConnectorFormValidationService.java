package io.yak.ops.business.sync.offline.form;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
/**
 * 基于 Form Schema 对任务侧 Connector 参数执行在线校验。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Service
@RequiredArgsConstructor
public class ConnectorFormValidationService {

  private final ConnectorFormSchemaService schemaService;
  private final ConnectorConditionEvaluator conditionEvaluator = new ConnectorConditionEvaluator();


  public ValidationResult validate(String connectorId, String role, ValidationRequest request) {
    ConnectorFormSchema schema = schemaService.get(connectorId, role);
    Map<String, Object> values = request == null || request.getValues() == null
        ? new LinkedHashMap<>() : new LinkedHashMap<>(request.getValues());
    for (ConnectorFormSchema.Field field : schema.getFields()) {
      if (!values.containsKey(field.getKey()) && field.getDefaultValue() != null) {
        values.put(field.getKey(), field.getDefaultValue());
      }
    }
    ValidationResult result = new ValidationResult();
    result.setNormalizedValues(values);

    Map<String, Boolean> visible = new LinkedHashMap<>();
    Map<String, Boolean> required = new LinkedHashMap<>();
    for (ConnectorFormSchema.Field field : schema.getFields()) {
      visible.put(field.getKey(), !field.isHidden());
      required.put(field.getKey(), field.isRequired());
    }

    for (ConnectorFormSchema.Interaction interaction : schema.getInteractions()) {
      boolean active = conditionEvaluator.evaluate(interaction.getCondition(), values);
      switch (normalize(interaction.getEffect())) {
        case "VISIBLE" -> interaction.getOptionKeys().forEach(key ->
            visible.compute(key, (ignored, current) -> Boolean.TRUE.equals(current) && active));
        case "REQUIRED" -> {
          if (active) {
            interaction.getOptionKeys().forEach(key -> required.put(key, true));
          }
        }
        case "EXCLUSIVE" -> {
          if (active) { validateExclusive(interaction, values, result); }
        }
        case "BUNDLED" -> {
          if (active) { validateBundled(interaction, values, result); }
        }
        case "VALIDATE" -> {
          if (!active) { addInteractionError(interaction, result); }
        }
        default -> { }
      }
    }

    for (ConnectorFormSchema.Field field : schema.getFields()) {
      if (!Boolean.TRUE.equals(visible.get(field.getKey()))) {
        if (field.isClearWhenHidden()) {
          values.remove(field.getKey());
        }
        continue;
      }
      Object value = values.get(field.getKey());
      if (Boolean.TRUE.equals(required.get(field.getKey())) && conditionEvaluator.isEmpty(value)) {
        result.addFieldError(field.getKey(), field.getLabel() + "不能为空");
        continue;
      }
      if (!conditionEvaluator.isEmpty(value)) {
        validateType(field, value, result);
        validateAllowedValues(field, value, result);
      }
    }

    result.setValid(result.getFieldErrors().isEmpty() && result.getFormErrors().isEmpty());
    return result;
  }

  private void validateExclusive(ConnectorFormSchema.Interaction interaction,
      Map<String, Object> values, ValidationResult result) {
    long count = interaction.getOptionKeys().stream()
        .map(values::get)
        .filter(value -> !conditionEvaluator.isEmpty(value))
        .count();
    if (count > 1) {
      result.getFormErrors().add(message(interaction, "互斥配置只能填写其中一项"));
    }
  }

  private void validateBundled(ConnectorFormSchema.Interaction interaction,
      Map<String, Object> values, ValidationResult result) {
    long count = interaction.getOptionKeys().stream()
        .map(values::get)
        .filter(value -> !conditionEvaluator.isEmpty(value))
        .count();
    if (count > 0 && count < interaction.getOptionKeys().size()) {
      result.getFormErrors().add(message(interaction, "关联配置必须同时填写或同时留空"));
    }
  }

  private void addInteractionError(ConnectorFormSchema.Interaction interaction,
      ValidationResult result) {
    if (interaction.getOptionKeys().size() == 1) {
      result.addFieldError(interaction.getOptionKeys().get(0),
          message(interaction, "配置不满足 Connector 约束"));
    } else {
      result.getFormErrors().add(message(interaction, "配置不满足 Connector 约束"));
    }
  }

  private void validateType(ConnectorFormSchema.Field field, Object value,
      ValidationResult result) {
    String type = normalize(field.getValueType());
    try {
      switch (type) {
        case "INTEGER", "LONG" -> new BigDecimal(String.valueOf(value)).longValueExact();
        case "DECIMAL", "FLOAT", "DOUBLE" -> new BigDecimal(String.valueOf(value));
        case "BOOLEAN" -> {
          if (!(value instanceof Boolean)
              && !List.of("true", "false", "1", "0").contains(String.valueOf(value).toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("not boolean");
          }
        }
        case "LIST" -> {
          if (!(value instanceof Collection<?>)) { throw new IllegalArgumentException("not list"); }
        }
        case "MAP", "OBJECT" -> {
          if (!(value instanceof Map<?, ?>)) { throw new IllegalArgumentException("not map"); }
        }
        default -> { }
      }
    } catch (RuntimeException exception) {
      result.addFieldError(field.getKey(), field.getLabel() + "的值类型应为 " + type);
    }
  }

  private void validateAllowedValues(ConnectorFormSchema.Field field, Object value,
      ValidationResult result) {
    if (field.getAllowedValues().isEmpty()) {
      return;
    }
    if (value instanceof Collection<?> values) {
      for (Object item : values) {
        if (!containsAllowed(field.getAllowedValues(), item)) {
          result.addFieldError(field.getKey(), field.getLabel() + "包含不支持的选项：" + item);
        }
      }
    } else if (!containsAllowed(field.getAllowedValues(), value)) {
      result.addFieldError(field.getKey(), field.getLabel() + "不是支持的选项");
    }
  }

  private boolean containsAllowed(List<Object> allowedValues, Object value) {
    return allowedValues.stream().anyMatch(allowed ->
        String.valueOf(allowed).equalsIgnoreCase(String.valueOf(value)));
  }

  private String message(ConnectorFormSchema.Interaction interaction, String fallback) {
    return interaction.getMessage() == null || interaction.getMessage().isBlank()
        ? fallback : interaction.getMessage();
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toUpperCase(Locale.ROOT).replace('-', '_');
  }

  public static class ValidationRequest {
    private Map<String, Object> values = new LinkedHashMap<>();
    private Map<String, Object> context = new LinkedHashMap<>();

    public Map<String, Object> getValues() { return values; }
    public void setValues(Map<String, Object> values) { this.values = values; }
    public Map<String, Object> getContext() { return context; }
    public void setContext(Map<String, Object> context) { this.context = context; }
  }

  public static class ValidationResult {
    private boolean valid;
    private Map<String, List<String>> fieldErrors = new LinkedHashMap<>();
    private List<String> formErrors = new ArrayList<>();
    private Map<String, Object> normalizedValues = new LinkedHashMap<>();

    public boolean isValid() { return valid; }
    public void setValid(boolean valid) { this.valid = valid; }
    public Map<String, List<String>> getFieldErrors() { return fieldErrors; }
    public void setFieldErrors(Map<String, List<String>> fieldErrors) { this.fieldErrors = fieldErrors; }
    public List<String> getFormErrors() { return formErrors; }
    public void setFormErrors(List<String> formErrors) { this.formErrors = formErrors; }
    public Map<String, Object> getNormalizedValues() { return normalizedValues; }
    public void setNormalizedValues(Map<String, Object> normalizedValues) {
      this.normalizedValues = normalizedValues;
    }
    public void addFieldError(String key, String message) {
      fieldErrors.computeIfAbsent(key, ignored -> new ArrayList<>()).add(message);
    }
  }
}
