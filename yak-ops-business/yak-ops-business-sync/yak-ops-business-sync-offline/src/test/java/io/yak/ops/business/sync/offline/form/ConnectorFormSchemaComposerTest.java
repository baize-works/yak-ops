package io.yak.ops.business.sync.offline.form;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class ConnectorFormSchemaComposerTest {

  private final ObjectMapper mapper = new ObjectMapper();
  private final ConnectorFormSchemaComposer composer =
      new ConnectorFormSchemaComposer(new ConnectorPresentationRegistry(), mapper);

  @Test
  void shouldComposeJdbcInteractionsAndRemoteCatalogSources() throws Exception {
    JsonNode schema = mapper.readTree("""
        {
          "connectorId":"jdbc","role":"SINK","schemaVersion":"1",
          "schemaFingerprint":"sha256:sink","capabilities":["TABLE_SCHEMA_DISCOVERY"],
          "options":[
            {"key":"url","valueType":"STRING","required":true,"semanticType":"JDBC_URL","scope":"DATASOURCE"},
            {"key":"table_path","valueType":"STRING","required":true,"semanticType":"TABLE_PATH","scope":"TASK"},
            {"key":"write_mode","valueType":"ENUM","allowedValues":["INSERT","UPSERT"],"required":true,"scope":"TASK"},
            {"key":"primary_keys","valueType":"LIST","required":false,"scope":"TASK"}
          ],
          "rules":[
            {"type":"RULE_WHEN","optionKeys":["primary_keys"],
             "condition":{"optionKey":"write_mode","operator":"EQ","expectedValue":"UPSERT"},
             "nestedRules":[{"type":"REQUIRED","optionKeys":["primary_keys"]}]}
          ]
        }
        """);

    ConnectorFormSchema result = composer.compose(
        new ConnectorSchemaSnapshot(schema, "REMOTE", false, LocalDateTime.now()));

    assertThat(result.getProfileVersion()).isEqualTo("2");
    assertThat(field(result, "table_path").getOptionSource().getAction()).isEqualTo("LIST_TABLES");
    assertThat(field(result, "primary_keys").getOptionSource().getAction()).isEqualTo("LIST_COLUMNS");
    assertThat(field(result, "primary_keys").getDependsOn()).containsExactly("table_path");
    assertThat(field(result, "url").isHidden()).isTrue();
    assertThat(result.getInteractions()).extracting(ConnectorFormSchema.Interaction::getEffect)
        .contains("VISIBLE", "REQUIRED");
    assertThat(result.getFormFingerprint()).startsWith("sha256:");
  }

  @Test
  void shouldInferRemoteTableAndFieldActionsForUnknownConnector() throws Exception {
    JsonNode schema = mapper.readTree("""
        {"connectorId":"warehouse","role":"SOURCE","schemaVersion":"1","schemaFingerprint":"x",
         "options":[
           {"key":"table","valueType":"STRING","semanticType":"TABLE_PATH","scope":"TASK"},
           {"key":"partition","valueType":"STRING","semanticType":"COLUMN_NAME","scope":"TASK"}
         ],"rules":[],"capabilities":[]}
        """);

    ConnectorFormSchema result = composer.compose(
        new ConnectorSchemaSnapshot(schema, "CACHE", true, LocalDateTime.now()));

    assertThat(result.getProfileVersion()).isEqualTo("auto");
    assertThat(field(result, "table").getOptionSource().getAction()).isEqualTo("LIST_TABLES");
    assertThat(field(result, "partition").getOptionSource().getAction()).isEqualTo("LIST_COLUMNS");
    assertThat(result.getWarnings()).isNotEmpty();
  }

  private ConnectorFormSchema.Field field(ConnectorFormSchema schema, String key) {
    return schema.getFields().stream()
        .filter(field -> key.equals(field.getKey()))
        .findFirst().orElseThrow();
  }
}
