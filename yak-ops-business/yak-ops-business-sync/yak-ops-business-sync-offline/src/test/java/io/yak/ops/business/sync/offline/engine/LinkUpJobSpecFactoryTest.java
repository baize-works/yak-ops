package io.yak.ops.business.sync.offline.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import org.junit.jupiter.api.Test;

class LinkUpJobSpecFactoryTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void shouldPersistLogicalJdbcJobSpecAndResolveCredentialsAtExecution() throws Exception {
    DataSourceDao dao = mock(DataSourceDao.class);
    when(dao.selectById(1L)).thenReturn(dataSource(1L, "source", "source-secret"));
    when(dao.selectById(2L)).thenReturn(dataSource(2L, "sink", "sink-secret"));

    JsonNode definition = mapper.readTree("""
        {
          "basic": {
            "jobName": "orders-sync",
            "mode": "GUIDE_SINGLE",
            "sourceDataSourceId": 1,
            "targetDataSourceId": 2
          },
          "env": {"parallelism": 2, "channelCapacity": 32},
          "workflow": {
            "nodes": [
              {"data": {"nodeType": "source", "config": {
                "connectorType": "MYSQL",
                "dataSourceId": 1,
                "table": "sales.orders",
                "fetchSize": 500,
                "connectorOptions": {
                  "password": "must-not-persist",
                  "partition_column": "id"
                }
              }}},
              {"data": {"nodeType": "sink", "config": {
                "connectorType": "Jdbc",
                "dataSourceId": 2,
                "targetTableName": "warehouse.orders",
                "writeMode": "upsert",
                "primaryKey": "id,tenant_id",
                "batchSize": 1000
              }}}
            ],
            "channelConfig": {"dirtyDataPolicy": "skip", "dirtyDataLimit": 10}
          }
        }
        """);

    LinkUpJobSpecFactory factory = new LinkUpJobSpecFactory(dao, mapper);
    LinkUpJobSpecFactory.BuildResult result = factory.build(definition);
    JsonNode logical = result.getJobSpec();

    assertThat(logical.path("source").path("connectorId").asText()).isEqualTo("jdbc");
    assertThat(logical.path("source").path("dataSourceRef").path("id").asLong()).isEqualTo(1L);
    assertThat(logical.path("sink").path("dataSourceRef").path("id").asLong()).isEqualTo(2L);
    assertThat(logical.path("source").path("options").path("table_path").asText())
        .isEqualTo("sales.orders");
    assertThat(logical.path("source").path("options").path("partition_column").asText())
        .isEqualTo("id");
    assertThat(logical.path("sink").path("options").path("primary_keys").size()).isEqualTo(2);
    assertThat(logical.path("runtime").path("sourceParallelism").asInt()).isEqualTo(2);
    assertThat(result.getJobSpecJson()).doesNotContain(
        "source-secret", "sink-secret", "must-not-persist", "jdbc:mysql");

    JsonNode resolved = factory.resolveForExecution(logical);
    assertThat(resolved.path("source").has("dataSourceRef")).isFalse();
    assertThat(resolved.path("source").path("options").path("password").asText())
        .isEqualTo("source-secret");
    assertThat(resolved.path("sink").path("options").path("password").asText())
        .isEqualTo("sink-secret");
    assertThat(resolved.path("source").path("options").path("url").asText())
        .startsWith("jdbc:mysql:");
  }

  @Test
  void shouldPassThroughFutureConnectorOptionsWithoutDedicatedBuilder() throws Exception {
    DataSourceDao dao = mock(DataSourceDao.class);
    JsonNode definition = mapper.readTree("""
        {
          "basic": {"jobName": "http-file", "mode": "GUIDE_SINGLE"},
          "workflow": {
            "nodes": [
              {"data": {"nodeType": "source", "config": {
                "connectorId": "http",
                "connectorOptions": {"url": "https://example.test/data", "method": "GET"}
              }}},
              {"data": {"nodeType": "sink", "config": {
                "connectorId": "file",
                "connectorOptions": {"path": "/data/result.json", "format": "JSON"}
              }}}
            ]
          }
        }
        """);

    LinkUpJobSpecFactory factory = new LinkUpJobSpecFactory(dao, mapper);
    JsonNode logical = factory.build(definition).getJobSpec();
    JsonNode resolved = factory.resolveForExecution(logical);

    assertThat(logical.path("source").path("connectorId").asText()).isEqualTo("http");
    assertThat(logical.path("source").path("options").path("method").asText()).isEqualTo("GET");
    assertThat(logical.path("sink").path("connectorId").asText()).isEqualTo("file");
    assertThat(resolved).isEqualTo(logical);
  }

  private DataSourcePO dataSource(Long id, String name, String password) {
    DataSourcePO value = new DataSourcePO();
    value.setId(id);
    value.setName(name);
    value.setJdbcUrl("jdbc:mysql://127.0.0.1:3306/demo");
    value.setConnectionParams("{\"driver\":\"com.mysql.cj.jdbc.Driver\","
        + "\"username\":\"root\",\"password\":\"" + password + "\"}");
    return value;
  }
}
