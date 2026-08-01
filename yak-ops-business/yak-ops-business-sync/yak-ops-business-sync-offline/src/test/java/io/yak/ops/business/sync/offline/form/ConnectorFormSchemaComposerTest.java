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
  void shouldComposeJdbcSourceProfileAndHideDatasourceSecrets() throws Exception {
    JsonNode schema = mapper.readTree("""
        {
          "connectorId":"jdbc","role":"SOURCE","schemaVersion":"1",
          "schemaFingerprint":"sha256:source","capabilities":["MULTI_TABLE"],
          "options":[
            {"key":"url","valueType":"STRING","required":true,"semanticType":"JDBC_URL","scope":"DATASOURCE"},
            {"key":"password","valueType":"STRING","required":false,"sensitive":true,"semanticType":"PASSWORD","scope":"DATASOURCE"},
            {"key":"table_path","valueType":"STRING","required":false,"semanticType":"TABLE_PATH","scope":"TASK"},
            {"key":"fetch_size","valueType":"INTEGER","defaultValue":1000,"scope":"RUNTIME"}
          ],
          "rules":[]
        }
        """);

    ConnectorFormSchema result = composer.compose(
        new ConnectorSchemaSnapshot(schema, "REMOTE", false, LocalDateTime.now()));

    assertThat(result.getProfileVersion()).isEqualTo("1");
    assertThat(field(result, "table_path").getWidget()).isEqualTo("table-picker");
    assertThat(field(result, "table_path").getGroupId()).isEqualTo("read");
    assertThat(field(result, "password").isHidden()).isTrue();
    assertThat(field(result, "password").getValueSource()).isEqualTo("DATASOURCE");
    assertThat(field(result, "fetch_size").getImportance()).isEqualTo("ADVANCED");
    assertThat(result.getFormFingerprint()).startsWith("sha256:");
  }

  @Test
  void shouldGenerateUsableFallbackForUnknownConnector() throws Exception {
    JsonNode schema = mapper.readTree("""
        {"connectorId":"http","role":"SOURCE","schemaVersion":"1","schemaFingerprint":"x",
         "options":[
           {"key":"method","valueType":"ENUM","allowedValues":["GET","POST"],"required":true,"scope":"TASK"},
           {"key":"headers","valueType":"MAP","required":false,"scope":"TASK"}
         ],"rules":[],"capabilities":[]}
        """);

    ConnectorFormSchema result = composer.compose(
        new ConnectorSchemaSnapshot(schema, "CACHE", true, LocalDateTime.now()));

    assertThat(result.getProfileVersion()).isEqualTo("auto");
    assertThat(field(result, "method").getWidget()).isEqualTo("select");
    assertThat(field(result, "headers").getWidget()).isEqualTo("key-value");
    assertThat(result.getWarnings()).isNotEmpty();
    assertThat(result.isStale()).isTrue();
  }

  private ConnectorFormSchema.Field field(ConnectorFormSchema schema, String key) {
    return schema.getFields().stream()
        .filter(field -> key.equals(field.getKey()))
        .findFirst().orElseThrow();
  }
}
