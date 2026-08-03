package io.yak.ops.common.bean.dto.sync.offline;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class OfflineJobDefinitionDTOTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void shouldPreserveTopLevelMappingDuringRequestBindingAndSerialization() throws Exception {
    OfflineJobDefinitionDTO definition = mapper.readValue("""
        {
          "id": 1785737278040000,
          "basic": {
            "jobName": "MYSQL → MYSQL 离线同步",
            "mode": "GUIDE_SINGLE"
          },
          "source": {
            "connectorId": "jdbc",
            "dataSourceId": "2",
            "config": {"table": "sink_user_info"}
          },
          "sink": {
            "connectorId": "jdbc",
            "dataSourceId": "2",
            "config": {
              "targetTableName": "test1234",
              "autoCreateTable": true
            }
          },
          "channel": {"parallelism": 1},
          "mapping": {
            "columns": [
              {"source": "username", "target": "username"},
              {"sourceField": "id", "targetField": "age"}
            ]
          }
        }
        """, OfflineJobDefinitionDTO.class);

    assertThat(definition.getMapping()).isNotNull();
    assertThat(definition.getMapping().getColumns()).hasSize(2);
    assertThat(definition.getMapping().getColumns().get(0).getSource())
        .isEqualTo("username");
    assertThat(definition.getMapping().getColumns().get(1).getSource())
        .isEqualTo("id");
    assertThat(definition.getMapping().getColumns().get(1).getTarget())
        .isEqualTo("age");

    JsonNode persisted = mapper.valueToTree(definition);
    assertThat(persisted.path("mapping").path("columns")).hasSize(2);
    assertThat(persisted.path("mapping").path("columns").get(1).path("source").asText())
        .isEqualTo("id");
    assertThat(persisted.path("mapping").path("columns").get(1).path("target").asText())
        .isEqualTo("age");
    assertThat(persisted.path("mapping").path("columns").get(1).has("sourceField"))
        .isFalse();
  }
}
