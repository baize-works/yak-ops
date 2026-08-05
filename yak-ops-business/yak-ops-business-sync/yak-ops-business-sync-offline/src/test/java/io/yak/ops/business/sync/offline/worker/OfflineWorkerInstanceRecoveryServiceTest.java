package io.yak.ops.business.sync.offline.worker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerInstanceRecoveryRepository;
import io.yak.ops.business.sync.offline.service.OfflineJobExecutionService;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.util.Collections;
import org.junit.jupiter.api.Test;

class OfflineWorkerInstanceRecoveryServiceTest {

  @Test
  void marksOldInstanceExecutionLost() {
    OfflineWorkerInstanceRecoveryRepository repository =
        mock(OfflineWorkerInstanceRecoveryRepository.class);
    OfflineJobExecutionDao executionDao = mock(OfflineJobExecutionDao.class);
    OfflineJobExecutionService executionService = mock(OfflineJobExecutionService.class);

    OfflineJobExecutionPO execution = new OfflineJobExecutionPO();
    execution.setId(10L);
    execution.setEngineNodeId("worker-a");
    execution.setWorkerInstanceId("instance-old");
    execution.setStatus("RUNNING");
    when(repository.findActiveExecutionIds("worker-a", "instance-old"))
        .thenReturn(Collections.singletonList(10L));
    when(executionDao.selectById(10L)).thenReturn(execution);

    OfflineWorkerInstanceRecoveryService recovery = new OfflineWorkerInstanceRecoveryService(
        repository, executionDao, executionService);

    assertThat(recovery.recover("worker-a", "instance-old", "instance-new")).isEqualTo(1);
    verify(executionService).markLost(execution, contains("instance-new"));
  }
}
