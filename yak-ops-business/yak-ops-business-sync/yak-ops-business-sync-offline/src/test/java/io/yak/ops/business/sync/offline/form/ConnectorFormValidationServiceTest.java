package io.yak.ops.business.sync.offline.form;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.yak.ops.business.sync.offline.form.ConnectorFormValidationService.ValidationRequest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ConnectorFormValidationServiceTest {

  @Test
  void shouldApplyConditionalRequiredAndExclusiveRules() {
    ConnectorFormSchema schema = new ConnectorFormSchema();
    schema.setConnectorId("jdbc");
    schema.setRole("SINK");
    schema.setFields(List.of(
        field("write_mode", "写入方式", true),
        field("primary_keys", "主键字段", false),
        field("custom_sql", "自定义 SQL", false)));

    ConnectorFormSchema.Condition upsert = new ConnectorFormSchema.Condition();
    upsert.setOptionKey("write_mode");
    upsert.setOperator("EQ");
    upsert.setExpectedValue("UPSERT");
    schema.setInteractions(List.of(
        interaction("REQUIRED", List.of("primary_keys"), upsert),
        interaction("EXCLUSIVE", List.of("primary_keys", "custom_sql"), null)));

    ConnectorFormSchemaService schemaService = mock(ConnectorFormSchemaService.class);
    when(schemaService.get("jdbc", "SINK")).thenReturn(schema);
    ConnectorFormValidationService service = new ConnectorFormValidationService(schemaService);

    ValidationRequest request = new ValidationRequest();
    request.setValues(Map.of("write_mode", "UPSERT", "custom_sql", "INSERT INTO t VALUES (?)"));
    var result = service.validate("jdbc", "SINK", request);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getFieldErrors()).containsKey("primary_keys");
  }

  private ConnectorFormSchema.Field field(String key, String label, boolean required) {
    ConnectorFormSchema.Field field = new ConnectorFormSchema.Field();
    field.setKey(key);
    field.setLabel(label);
    field.setValueType("STRING");
    field.setRequired(required);
    return field;
  }

  private ConnectorFormSchema.Interaction interaction(String effect, List<String> keys,
      ConnectorFormSchema.Condition condition) {
    ConnectorFormSchema.Interaction interaction = new ConnectorFormSchema.Interaction();
    interaction.setEffect(effect);
    interaction.setOptionKeys(keys);
    interaction.setCondition(condition);
    return interaction;
  }
}
