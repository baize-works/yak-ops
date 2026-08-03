package io.yak.ops.business.sync.offline.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class OfflineDefinitionModelAdapterTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void shouldAdaptMultiTableDefinitionWithoutMutatingPersistedContract() throws Exception {
    JsonNode definition = mapper.readTree("""
        {
          "basic": {
            "jobName": "业务库批量同步",
            "jobDesc": "",
            "mode": "GUIDE_MULTI"
          },
          "source": {
            "connectorId": "jdbc",
            "dbType": "MYSQL",
            "dataSourceId": "1001",
            "database": "business",
            "tables": ["orders", "order_item", "customer"],
            "tablePattern": "",
            "options": {"fetch_size": 500}
          },
          "sink": {
            "connectorId": "jdbc",
            "dbType": "MYSQL",
            "dataSourceId": "1002",
            "database": "ods",
            "tableNamingRule": "PREFIX",
            "tablePrefix": "dw_",
            "tableSuffix": "",
            "autoCreateTable": true,
            "writeMode": "APPEND",
            "options": {"batch_size": 1000}
          },
          "channel": {
            "parallelism": 3,
            "speedLimitEnabled": false,
            "recordsPerSecond": 10000,
            "dirtyDataPolicy": "STOP",
            "dirtyDataLimit": 0
          }
        }
        """);

    JsonNode adapted = OfflineDefinitionModelAdapter.forJobSpec(definition, mapper);

    assertThat(definition.path("source").has("config")).isFalse();
    assertThat(definition.path("sink").has("config")).isFalse();
    assertThat(definition.path("source").path("tables").get(0).asText())
        .isEqualTo("orders");

    assertThat(adapted.path("source").path("config").path("tables").get(0).asText())
        .isEqualTo("business.orders");
    assertThat(adapted.path("source").path("config")
        .path("connectorOptions").path("fetch_size").asInt())
        .isEqualTo(500);
    assertThat(adapted.path("source").path("config").path("fetchSize").asInt())
        .isEqualTo(500);
    assertThat(adapted.path("sink").path("config").path("targetTableName").asText())
        .isEqualTo("ods.dw_${table_name}");
    assertThat(adapted.path("sink").path("config").path("batchSize").asInt())
        .isEqualTo(1000);
    assertThat(adapted.path("sink").path("config").path("autoCreateTable").asBoolean())
        .isTrue();
    assertThat(adapted.path("sink").path("config").path("writeMode").asText())
        .isEqualTo("append");
    assertThat(adapted.path("channel").path("parallelism").asInt()).isEqualTo(3);
  }

  @Test
  void shouldRejectIncompleteMultiTableNamingConfiguration() throws Exception {
    JsonNode definition = mapper.readTree("""
        {
          "basic": {"jobName": "invalid", "mode": "GUIDE_MULTI"},
          "source": {
            "connectorId": "jdbc",
            "database": "business",
            "tables": ["orders"]
          },
          "sink": {
            "connectorId": "jdbc",
            "database": "ods",
            "tableNamingRule": "PREFIX",
            "tablePrefix": "",
            "writeMode": "APPEND"
          },
          "channel": {"parallelism": 1}
        }
        """);

    assertThatThrownBy(() -> OfflineDefinitionModelAdapter.forJobSpec(definition, mapper))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("tablePrefix");
  }

  @Test
  void shouldKeepLegacyWorkflowDefinitionUntouched() throws Exception {
    JsonNode definition = mapper.readTree("""
        {
          "basic": {"jobName": "legacy", "mode": "GUIDE_SINGLE"},
          "workflow": {
            "nodes": [
              {"data": {"nodeType": "source", "config": {"table": "orders"}}},
              {"data": {"nodeType": "sink", "config": {"table": "orders"}}}
            ]
          }
        }
        """);

    JsonNode adapted = OfflineDefinitionModelAdapter.forJobSpec(definition, mapper);

    assertThat(adapted).isEqualTo(definition);
  }
}
