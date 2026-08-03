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
  void shouldBuildLogicalJdbcJobSpecFromFlatDefinition() throws Exception {
    DataSourceDao dao = mock(DataSourceDao.class);
    when(dao.selectById(1L)).thenReturn(dataSource(1L, "source", "source-secret"));
    when(dao.selectById(2L)).thenReturn(dataSource(2L, "sink", "sink-secret"));

    JsonNode definition = mapper.readTree("""
        {
          "basic": {
            "jobName": "orders-sync",
            "mode": "GUIDE_SINGLE"
          },
          "source": {
            "connectorId": "jdbc",
            "pluginName": "JDBC-MYSQL",
            "dbType": "MYSQL",
            "dataSourceId": "1",
            "config": {
              "table": "sales.orders",
              "fetchSize": 500,
              "connectorOptions": {
                "password": "must-not-persist",
                "partition_column": "id"
              }
            }
          },
          "sink": {
            "connectorId": "jdbc",
            "pluginName": "JDBC-MYSQL",
            "dbType": "MYSQL",
            "dataSourceId": "2",
            "config": {
              "targetTableName": "warehouse.orders",
              "writeMode": "upsert",
              "primaryKey": "id,tenant_id",
              "batchSize": 1000
            }
          },
          "channel": {
            "parallelism": 2,
            "speedLimitEnabled": true,
            "recordsPerSecond": 20000,
            "dirtyDataPolicy": "skip",
            "dirtyDataLimit": 10
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
    assertThat(logical.path("sink").path("options").path("dirty_data_max_count").asLong())
        .isEqualTo(10L);
    assertThat(logical.path("runtime").path("sourceParallelism").asInt()).isEqualTo(2);
    assertThat(logical.path("runtime").path("maxRecordsPerSecond").asLong())
        .isEqualTo(20000L);
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
  void shouldBuildMultiTableJobSpecFromPublicPayload() throws Exception {
    DataSourceDao dao = mock(DataSourceDao.class);
    when(dao.selectById(1001L)).thenReturn(dataSource(1001L, "source", "source-secret"));
    when(dao.selectById(1002L)).thenReturn(dataSource(1002L, "sink", "sink-secret"));

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
            "tableNamingRule": "SAME_NAME",
            "tablePrefix": "",
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

    JsonNode buildDefinition = OfflineDefinitionModelAdapter.forJobSpec(definition, mapper);
    LinkUpJobSpecFactory.BuildResult result =
        new LinkUpJobSpecFactory(dao, mapper).build(buildDefinition);
    JsonNode logical = result.getJobSpec();

    assertThat(logical.path("source").path("options").path("table_list").size())
        .isEqualTo(3);
    assertThat(logical.path("source").path("options").path("table_list")
        .get(0).path("table_path").asText())
        .isEqualTo("business.orders");
    assertThat(logical.path("source").path("options").path("fetch_size").asInt())
        .isEqualTo(500);
    assertThat(logical.path("sink").path("options").path("table_path").asText())
        .isEqualTo("ods.${table_name}");
    assertThat(logical.path("sink").path("options").path("batch_size").asInt())
        .isEqualTo(1000);
    assertThat(logical.path("sink").path("options").path("schema_save_mode").asText())
        .isEqualTo("CREATE_SCHEMA_WHEN_NOT_EXIST");
    assertThat(logical.path("sink").path("options").path("dirty_data_policy").asText())
        .isEqualTo("FAIL_FAST");
    assertThat(logical.path("runtime").path("pipelineParallelism").asInt())
        .isEqualTo(3);
    assertThat(logical.path("runtime").has("maxRecordsPerSecond")).isFalse();
    assertThat(result.getSourceTable()).contains("business.orders", "business.customer");
    assertThat(result.getSinkTable()).contains("ods.orders", "ods.customer");
  }

  @Test
  void shouldPassThroughFutureConnectorOptionsWithoutDedicatedBuilder() throws Exception {
    DataSourceDao dao = mock(DataSourceDao.class);
    JsonNode definition = mapper.readTree("""
        {
          "basic": {"jobName": "http-file", "mode": "GUIDE_SINGLE"},
          "source": {
            "connectorId": "http",
            "pluginName": "HTTP",
            "dbType": "HTTP",
            "dataSourceId": "",
            "config": {
              "connectorOptions": {
                "url": "https://example.test/data",
                "method": "GET"
              }
            }
          },
          "sink": {
            "connectorId": "file",
            "pluginName": "FILE",
            "dbType": "FILE",
            "dataSourceId": "",
            "config": {
              "connectorOptions": {
                "path": "/data/result.json",
                "format": "JSON"
              }
            }
          },
          "channel": {"parallelism": 1}
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

  @Test
  void shouldStillBuildHistoricalWorkflowDefinition() throws Exception {
    DataSourceDao dao = mock(DataSourceDao.class);
    when(dao.selectById(1L)).thenReturn(dataSource(1L, "source", "source-secret"));
    when(dao.selectById(2L)).thenReturn(dataSource(2L, "sink", "sink-secret"));
    JsonNode definition = mapper.readTree("""
        {
          "basic": {"jobName": "legacy", "mode": "GUIDE_SINGLE"},
          "env": {"parallelism": 3},
          "workflow": {
            "nodes": [
              {"data": {"nodeType": "source", "config": {
                "connectorId": "jdbc", "dataSourceId": 1, "table": "a.orders"
              }}},
              {"data": {"nodeType": "sink", "config": {
                "connectorId": "jdbc", "dataSourceId": 2, "table": "b.orders"
              }}}
            ]
          }
        }
        """);

    JsonNode logical = new LinkUpJobSpecFactory(dao, mapper).build(definition).getJobSpec();

    assertThat(logical.path("runtime").path("sourceParallelism").asInt()).isEqualTo(3);
    assertThat(logical.path("source").path("options").path("table_path").asText())
        .isEqualTo("a.orders");
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
