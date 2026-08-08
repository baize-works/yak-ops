package io.yak.ops.business.sync.offline.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.dao.OfflineJobDefinitionDao;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpTransportException;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository;
import io.yak.ops.business.sync.offline.service.OfflineExecutionClaimService.ClaimResult;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.net.ConnectException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OfflineExecutionOrchestratorTest {

  @Mock private OfflineJobDefinitionService definitionService;
  @Mock private OfflineExecutionClaimService claimService;
  @Mock private OfflineJobDefinitionDao definitionDao;
  @Mock private OfflineJobExecutionDao executionDao;
  @Mock private OfflineExecutionControlRepository executionRepository;
  @Mock private OfflineScheduleRepository scheduleRepository;
  @Mock private LinkUpClient linkUpClient;

  private OfflineExecutionOrchestrator service;

  @BeforeEach
  void setUp() {
    service = new OfflineExecutionOrchestrator(
        definitionService,
        claimService,
        definitionDao,
        executionDao,
        executionRepository,
        scheduleRepository,
        linkUpClient,
        new OfflineSyncProperties(),
        new ObjectMapper());
  }

  @Test
  void shouldPersistFailureWhenLinkUpCannotBeReached() {
    OfflineJobDefinitionPO definition = new OfflineJobDefinitionPO();
    definition.setId(10L);

    OfflineJobExecutionPO execution = new OfflineJobExecutionPO();
    execution.setId(99L);
    execution.setJobDefinitionId(10L);
    execution.setStatus("CREATED");
    execution.setStateVersion(1L);
    execution.setAttemptNo(1);

    when(claimService.claim(10L, "WORKFLOW", null, 1))
        .thenReturn(new ClaimResult(definition, "{}", execution));
    when(definitionDao.selectById(10L)).thenReturn(definition);
    when(linkUpClient.node())
        .thenThrow(new LinkUpTransportException(
            "无法连接 Link-Up Server：http://127.0.0.1:18080",
            new ConnectException(),
            false));

    assertThatThrownBy(() -> service.execute(10L, "WORKFLOW", null, 1))
        .isInstanceOf(LinkUpTransportException.class)
        .hasMessage("无法连接 Link-Up Server：http://127.0.0.1:18080");

    assertThat(execution.getStatus()).isEqualTo("FAILED");
    assertThat(execution.getErrorMessage())
        .isEqualTo("无法连接 Link-Up Server：http://127.0.0.1:18080");
    assertThat(execution.getEndTime()).isNotNull();
    verify(executionDao, atLeastOnce()).updateById(execution);
    verify(executionRepository).recordExecutionEvent(
        eq(99L),
        eq(1L),
        eq(null),
        eq("CREATED"),
        eq("EXECUTION_CREATED"),
        eq("使用 application.yml 中的固定 Link-Up 地址"),
        eq(null));
    verify(executionRepository).recordExecutionEvent(
        eq(99L),
        eq(2L),
        eq("CREATED"),
        eq("FAILED"),
        eq("FAILED"),
        eq("无法连接 Link-Up Server：http://127.0.0.1:18080"),
        eq(null));
  }
}
