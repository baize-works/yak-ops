package io.yak.ops.business.sync.offline.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.enums.datasource.DataSourceDbType;
import org.junit.jupiter.api.Test;

class LinkUpHoconBuilderTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final DataSourceDao dataSourceDao = mock(DataSourceDao.class);
  private final LinkUpHoconBuilder builder =
      new LinkUpHoconBuilder(dataSourceDao, objectMapper);

  @Test
  void buildsSingleTableJdbcSourceAndSinkConfig() throws Exception {
    when(dataSourceDao.selectById(1L))
        .thenReturn(dataSource(1L, "source-mysql", "source_db"));
    when(dataSourceDao.selectById(2L))
        .thenReturn(dataSource(2L, "sink-mysql", "target_db"));

    JsonNode definition = objectMapper.readTree(
        """
        {
          "id": "1001",
          "basic": {
            "jobName": "orders-sync",
            "mode": "GUIDE_SINGLE",
            "sourceDataSourceId": "1",
            "targetDataSourceId": "2"
          },
          "workflow": {
            "nodes": [
              {
                "type": "source",
                "data": {
                  "nodeType": "source",
                  "config": {
                    "dataSourceId": "1",
                    "readMode": "table",
                    "table": "source_db.orders",
                    "fetchSize": 500
                  }
                }
              },
              {
                "type": "sink",
                "data": {
                  "nodeType": "sink",
                  "config": {
                    "dataSourceId": "2",
                    "table": "target_db.orders_copy",
                    "autoCreateTable": true,
                    "writeMode": "upsert",
                    "primaryKey": "id",
                    "batchSize": 1000
                  }
                }
              }
            ],
            "channelConfig": {
              "dirtyDataPolicy": "skip",
              "dirtyDataLimit": 10
            }
          },
          "env": {"parallelism": 2}
        }
        """);

    LinkUpHoconBuilder.BuildResult result = builder.build(definition);

    assertThat(result.getHocon())
        .contains("job.name = \"orders-sync\"")
        .contains("source-parallelism = 2")
        .contains("table_path = \"source_db.orders\"")
        .contains("table_path = \"target_db.orders_copy\"")
        .contains("write_mode = UPSERT")
        .contains("primary_keys = [\"id\"]")
        .contains("dirty_data_policy = SKIP")
        .contains("dirty_data_max_count = 10");
    assertThat(result.getSourceTable()).isEqualTo("source_db.orders");
    assertThat(result.getSinkTable()).isEqualTo("target_db.orders_copy");
  }

  private DataSourcePO dataSource(Long id, String name, String database) {
    DataSourcePO dataSource = new DataSourcePO();
    dataSource.setId(id);
    dataSource.setName(name);
    dataSource.setDbType(DataSourceDbType.MYSQL);
    dataSource.setJdbcUrl("jdbc:mysql://127.0.0.1:3306/" + database);
    dataSource.setConnectionParams(
        "{\"url\":\"jdbc:mysql://127.0.0.1:3306/"
            + database
            + "\",\"driver\":\"com.mysql.cj.jdbc.Driver\","
            + "\"username\":\"root\",\"password\":\"secret\"}");
    return dataSource;
  }
}
