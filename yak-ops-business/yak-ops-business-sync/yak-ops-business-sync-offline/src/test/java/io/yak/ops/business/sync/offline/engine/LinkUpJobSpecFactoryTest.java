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
  void shouldBuildJdbcJobSpecWithoutHocon() throws Exception {
    DataSourceDao dao = mock(DataSourceDao.class);
    when(dao.selectById(1L)).thenReturn(dataSource(1L, "source"));
    when(dao.selectById(2L)).thenReturn(dataSource(2L, "sink"));

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
                "dataSourceId": 1,
                "table": "sales.orders",
                "fetchSize": 500,
                "connectorOptions": {"partition_column": "id"}
              }}},
              {"data": {"nodeType": "sink", "config": {
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

    LinkUpJobSpecFactory.BuildResult result =
        new LinkUpJobSpecFactory(dao, mapper).build(definition);

    JsonNode spec = result.getJobSpec();
    assertThat(spec.path("apiVersion").asText()).isEqualTo("link-up/v1");
    assertThat(spec.path("source").path("connectorId").asText()).isEqualTo("jdbc");
    assertThat(spec.path("source").path("options").path("table_path").asText())
        .isEqualTo("sales.orders");
    assertThat(spec.path("source").path("options").path("partition_column").asText())
        .isEqualTo("id");
    assertThat(spec.path("sink").path("options").path("primary_keys").size()).isEqualTo(2);
    assertThat(spec.path("runtime").path("sourceParallelism").asInt()).isEqualTo(2);
    assertThat(result.getJobSpecJson()).doesNotContain("job.name", "source {");
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

    JsonNode spec = new LinkUpJobSpecFactory(dao, mapper).build(definition).getJobSpec();

    assertThat(spec.path("source").path("connectorId").asText()).isEqualTo("http");
    assertThat(spec.path("source").path("options").path("method").asText()).isEqualTo("GET");
    assertThat(spec.path("sink").path("connectorId").asText()).isEqualTo("file");
    assertThat(spec.path("sink").path("options").path("path").asText())
        .isEqualTo("/data/result.json");
  }

  private DataSourcePO dataSource(Long id, String name) {
    DataSourcePO value = new DataSourcePO();
    value.setId(id);
    value.setName(name);
    value.setJdbcUrl("jdbc:mysql://127.0.0.1:3306/demo");
    value.setConnectionParams("{\"driver\":\"com.mysql.cj.jdbc.Driver\","
        + "\"username\":\"root\",\"password\":\"secret\"}");
    return value;
  }
}
