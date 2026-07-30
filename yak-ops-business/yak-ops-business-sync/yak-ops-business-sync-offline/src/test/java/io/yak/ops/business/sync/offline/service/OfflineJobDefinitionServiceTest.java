package io.yak.ops.business.sync.offline.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.sync.offline.dao.OfflineJobDefinitionDao;
import io.yak.ops.business.sync.offline.engine.LinkUpHoconBuilder;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionDTO;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.enums.datasource.DataSourceDbType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class OfflineJobDefinitionServiceTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private OfflineJobDefinitionDao definitionDao;
  private DataSourceDao dataSourceDao;
  private LinkUpHoconBuilder hoconBuilder;
  private OfflineExecutionSynchronizer synchronizer;
  private OfflineJobDefinitionService service;

  @BeforeEach
  void setUp() {
    definitionDao = mock(OfflineJobDefinitionDao.class);
    dataSourceDao = mock(DataSourceDao.class);
    hoconBuilder = new LinkUpHoconBuilder(dataSourceDao, objectMapper);
    synchronizer = mock(OfflineExecutionSynchronizer.class);
    service = new OfflineJobDefinitionService(
        definitionDao, dataSourceDao, hoconBuilder, synchronizer, objectMapper);
  }

  @Test
  void savesEditorDraftBeforeConnectionsAndTablesAreConfigured() throws Exception {
    OfflineJobDefinitionDTO request = definition(
        """
        {
          "id": 1001,
          "basic": {
            "jobName": "orders-draft",
            "jobDesc": "draft task",
            "mode": "GUIDE_SINGLE",
            "sourceDataSourceId": "",
            "targetDataSourceId": ""
          },
          "workflow": {
            "nodes": [
              {
                "type": "source",
                "data": {
                  "nodeType": "source",
                  "config": {
                    "dataSourceId": "",
                    "readMode": "table",
                    "table": "",
                    "tables": []
                  }
                }
              },
              {
                "type": "sink",
                "data": {
                  "nodeType": "sink",
                  "config": {
                    "dataSourceId": "",
                    "table": "",
                    "targetTableName": ""
                  }
                }
              }
            ]
          },
          "schedule": {},
          "env": {"parallelism": 1}
        }
        """);

    service.saveGuide(request);

    ArgumentCaptor<OfflineJobDefinitionPO> captor =
        ArgumentCaptor.forClass(OfflineJobDefinitionPO.class);
    verify(definitionDao).insert(captor.capture());
    OfflineJobDefinitionPO saved = captor.getValue();
    assertThat(saved.getId()).isEqualTo(1001L);
    assertThat(saved.getHoconConfig()).isEmpty();
    assertThat(saved.getSourceDatasourceId()).isNull();
    assertThat(saved.getSinkDatasourceId()).isNull();
    assertThat(saved.getDefinitionJson()).contains("\"workflow\"");
    verify(dataSourceDao, never()).selectById(any(Long.class));
  }

  @Test
  void buildsHoconWhenGuideConfigurationIsComplete() throws Exception {
    when(dataSourceDao.selectById(1L)).thenReturn(dataSource(1L, "source"));
    when(dataSourceDao.selectById(2L)).thenReturn(dataSource(2L, "sink"));
    OfflineJobDefinitionDTO request = definition(
        """
        {
          "id": 1002,
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
                    "table": "source_db.orders"
                  }
                }
              },
              {
                "type": "sink",
                "data": {
                  "nodeType": "sink",
                  "config": {
                    "dataSourceId": "2",
                    "table": "target_db.orders",
                    "writeMode": "append"
                  }
                }
              }
            ]
          },
          "schedule": {},
          "env": {"parallelism": 1}
        }
        """);

    service.saveGuide(request);

    ArgumentCaptor<OfflineJobDefinitionPO> captor =
        ArgumentCaptor.forClass(OfflineJobDefinitionPO.class);
    verify(definitionDao).insert(captor.capture());
    OfflineJobDefinitionPO saved = captor.getValue();
    assertThat(saved.getHoconConfig())
        .contains("job.name = \"orders-sync\"")
        .contains("table_path = \"source_db.orders\"")
        .contains("table_path = \"target_db.orders\"");
    assertThat(saved.getSourceDatasourceId()).isEqualTo(1L);
    assertThat(saved.getSinkDatasourceId()).isEqualTo(2L);
  }

  private OfflineJobDefinitionDTO definition(String json) throws Exception {
    return objectMapper.treeToValue(
        objectMapper.readTree(json), OfflineJobDefinitionDTO.class);
  }

  private DataSourcePO dataSource(Long id, String name) {
    DataSourcePO dataSource = new DataSourcePO();
    dataSource.setId(id);
    dataSource.setName(name);
    dataSource.setDbType(DataSourceDbType.MYSQL);
    dataSource.setJdbcUrl("jdbc:mysql://127.0.0.1:3306/test");
    dataSource.setConnectionParams(
        "{\"url\":\"jdbc:mysql://127.0.0.1:3306/test\","
            + "\"driver\":\"com.mysql.cj.jdbc.Driver\","
            + "\"username\":\"root\",\"password\":\"secret\"}");
    return dataSource;
  }
}
