package io.yak.ops.business.sync.offline.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import org.junit.jupiter.api.Test;

class ColumnMappingLinkUpJobSpecFactoryTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void shouldCompileTopLevelEditorMappingIntoJobSpec() throws Exception {
    ColumnMappingLinkUpJobSpecFactory factory = factory();
    JsonNode definition = mapper.readTree("""
        {
          "basic": {"jobName": "mapped-users", "mode": "GUIDE_SINGLE"},
          "source": {
            "connectorId": "jdbc",
            "dataSourceId": 1,
            "config": {"table": "demo.users"}
          },
          "sink": {
            "connectorId": "jdbc",
            "dataSourceId": 2,
            "config": {
              "table": "demo.users_copy",
              "writeMode": "append"
            }
          },
          "channel": {"parallelism": 1},
          "mapping": {
            "columns": [
              {"source": "name", "target": "user_name"},
              {"sourceField": "id", "targetField": "user_id"}
            ]
          }
        }
        """);

    LinkUpJobSpecFactory.BuildResult result = factory.build(definition);

    assertThat(result.getJobSpec().path("mapping").path("columns")).hasSize(2);
    assertThat(result.getJobSpec().path("mapping").path("columns").get(0).path("source").asText())
        .isEqualTo("name");
    assertThat(result.getJobSpec().path("mapping").path("columns").get(1).path("target").asText())
        .isEqualTo("user_id");
    assertThat(result.getJobSpec().path("source").path("options").has("mapping")).isFalse();
  }

  @Test
  void shouldPromoteLegacySourceConfigMapping() throws Exception {
    ColumnMappingLinkUpJobSpecFactory factory = factory();
    JsonNode definition = mapper.readTree("""
        {
          "basic": {"jobName": "legacy-mapped-users", "mode": "GUIDE_SINGLE"},
          "source": {
            "connectorId": "jdbc",
            "dataSourceId": 1,
            "config": {
              "table": "demo.users",
              "mapping": {
                "columns": [
                  {"source": "id", "target": "user_id"}
                ]
              }
            }
          },
          "sink": {
            "connectorId": "jdbc",
            "dataSourceId": 2,
            "config": {"table": "demo.users_copy"}
          },
          "channel": {"parallelism": 1}
        }
        """);

    LinkUpJobSpecFactory.BuildResult result = factory.build(definition);

    assertThat(result.getJobSpec().path("mapping").path("columns")).hasSize(1);
    assertThat(result.getJobSpec().path("mapping").path("columns").get(0).path("target").asText())
        .isEqualTo("user_id");
    assertThat(result.getJobSpec().path("source").path("options").has("mapping")).isFalse();
  }

  @Test
  void shouldRejectTopLevelMappingForMultiTableJobs() throws Exception {
    ColumnMappingLinkUpJobSpecFactory factory = factory();
    JsonNode definition = mapper.readTree("""
        {
          "basic": {"jobName": "mapped-users", "mode": "GUIDE_MULTI"},
          "source": {
            "connectorId": "jdbc",
            "dataSourceId": 1,
            "database": "demo",
            "tables": ["users"]
          },
          "sink": {
            "connectorId": "jdbc",
            "dataSourceId": 2,
            "database": "demo",
            "tableNamingRule": "SAME_NAME",
            "autoCreateTable": true,
            "writeMode": "APPEND"
          },
          "channel": {"parallelism": 1},
          "mapping": {
            "columns": [{"source": "id", "target": "user_id"}]
          }
        }
        """);

    assertThatThrownBy(() -> factory.build(definition))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("多表同步暂不支持");
  }

  private ColumnMappingLinkUpJobSpecFactory factory() {
    DataSourceDao dao = mock(DataSourceDao.class);
    when(dao.selectById(1L)).thenReturn(dataSource(1L, "source"));
    when(dao.selectById(2L)).thenReturn(dataSource(2L, "sink"));
    return new ColumnMappingLinkUpJobSpecFactory(dao, mapper);
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
