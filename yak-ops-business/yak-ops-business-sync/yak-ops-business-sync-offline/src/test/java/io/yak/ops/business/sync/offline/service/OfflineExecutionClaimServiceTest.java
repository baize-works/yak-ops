package io.yak.ops.business.sync.offline.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.service.OfflineExecutionClaimService.ClaimResult;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OfflineExecutionClaimServiceTest {

  @Mock private OfflineJobDefinitionService definitionService;
  @Mock private OfflineJobExecutionDao executionDao;
  @Mock private OfflineExecutionControlRepository repository;

  private OfflineExecutionClaimService service;

  @BeforeEach
  void setUp() {
    service = new OfflineExecutionClaimService(
        definitionService,
        executionDao,
        repository,
        new OfflineSyncProperties());
  }

  @Test
  void shouldPersistCreatedExecutionBeforeAnyEngineProbe() {
    OfflineJobDefinitionPO definition = new OfflineJobDefinitionPO();
    definition.setId(10L);
    definition.setReleaseState("ONLINE");
    definition.setVersion(3);
    definition.setConfigDigest("digest");
    definition.setDefinitionJson("{}");

    when(definitionService.require(10L)).thenReturn(definition);
    when(definitionService.resolveLogicalJobSpec(definition)).thenReturn("{\"job\":\"spec\"}");
    when(executionDao.insert(any(OfflineJobExecutionPO.class)))
        .thenAnswer(invocation -> {
          OfflineJobExecutionPO execution = invocation.getArgument(0);
          execution.setId(99L);
          return true;
        });

    ClaimResult result = service.claim(10L, "WORKFLOW", null, 1);

    assertThat(result.getExecution().getId()).isEqualTo(99L);
    assertThat(result.getExecution().getStatus()).isEqualTo("CREATED");
    assertThat(result.getExecution().getWorkerInstanceId()).isNull();
    assertThat(result.getExecution().getEngineBaseUrl()).isEqualTo("http://127.0.0.1:18080");
    verify(repository).lockDefinition(10L);
    verify(repository).hasActiveExecution(10L);
    verify(executionDao).insert(result.getExecution());
  }
}
