package io.yak.ops.business.sync.offline.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.dao.OfflineJobDefinitionDao;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import org.junit.jupiter.api.Test;

class OfflineExecutionSynchronizerTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final OfflineExecutionSynchronizer synchronizer =
      new OfflineExecutionSynchronizer(
          mock(LinkUpClient.class),
          mock(OfflineJobDefinitionDao.class),
          mock(OfflineJobExecutionDao.class),
          objectMapper);

  @Test
  void normalizesEngineActiveStatusesForFrontendActions() throws Exception {
    OfflineJobDefinitionPO definition = new OfflineJobDefinitionPO();
    OfflineJobExecutionPO execution = new OfflineJobExecutionPO();

    synchronizer.apply(
        definition,
        execution,
        objectMapper.readTree("{\"status\":\"INITIALIZING\",\"metrics\":{}}"));

    assertThat(definition.getLastJobStatus()).isEqualTo("RUNNING");
    assertThat(execution.getStatus()).isEqualTo("RUNNING");
    assertThat(synchronizer.isActive("DOING_SAVEPOINT")).isTrue();
    assertThat(synchronizer.isActive("FINISHED")).isFalse();
  }
}
