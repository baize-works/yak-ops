package io.yak.ops.business.sync.offline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.sync.offline.dao.OfflineJobDefinitionDao;
import io.yak.ops.business.sync.offline.repository.OfflineDefinitionCatalogRepository;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository;
import io.yak.ops.business.sync.offline.service.OfflineDefinitionSupport.DraftDefinition;
import io.yak.ops.business.sync.offline.service.OfflineDefinitionSupport.PreparedDefinition;
import io.yak.ops.business.sync.offline.worker.OfflineCapabilityRequirementResolver;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerScheduler;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionDTO;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 离线同步基础定义和调度持久化测试。
 *
 * @author weifuwan
 */
@ExtendWith(MockitoExtension.class)
class OfflineJobDefinitionServiceTest {

  private static final long TASK_ID = 1001L;
  private static final String JOB_NAME = "MYSQL → MYSQL 离线同步";
  private static final String SCHEDULE_JSON =
      "{\"cron\":\"0 0 2 * * ?\",\"enabled\":true,\"retryOnFailure\":true}";

  @Mock
  private OfflineJobDefinitionDao definitionDao;
  @Mock
  private OfflineDefinitionCatalogRepository catalogRepository;
  @Mock
  private OfflineScheduleRepository scheduleRepository;
  @Mock
  private OfflineExecutionControlRepository executionRepository;
  @Mock
  private OfflineDefinitionSupport support;
  @Mock
  private OfflineWorkerScheduler workerScheduler;
  @Mock
  private OfflineCapabilityRequirementResolver capabilityResolver;

  private OfflineJobDefinitionService service;

  @BeforeEach
  void setUp() {
    service = new OfflineJobDefinitionService(
        definitionDao,
        catalogRepository,
        scheduleRepository,
        executionRepository,
        support,
        workerScheduler,
        capabilityResolver);
  }

  @Test
  void saveDraftPersistsBaseDefinitionAndSchedule() {
    OfflineJobDefinitionDTO request = request();
    ObjectNode requestJson = JsonNodeFactory.instance.objectNode();
    ObjectNode schedule = schedule(requestJson);
    DraftDefinition draft = new DraftDefinition(
        requestJson,
        JOB_NAME,
        null,
        "GUIDE_SINGLE",
        "{\"id\":1001,\"basic\":{},\"source\":{},\"sink\":{},"
            + "\"channel\":{},\"schedule\":" + SCHEDULE_JSON + "}",
        "MYSQL",
        "MYSQL");

    when(definitionDao.selectById(TASK_ID)).thenReturn(null);
    when(support.prepareDraft(request)).thenReturn(draft);
    when(definitionDao.existsByName(JOB_NAME, TASK_ID)).thenReturn(false);
    when(support.writeNullable(schedule)).thenReturn(SCHEDULE_JSON);

    assertEquals(TASK_ID, service.saveDraft(request));

    ArgumentCaptor<OfflineJobDefinitionPO> captor =
        ArgumentCaptor.forClass(OfflineJobDefinitionPO.class);
    verify(definitionDao).insert(captor.capture());
    OfflineJobDefinitionPO saved = captor.getValue();
    assertEquals(TASK_ID, saved.getId());
    assertEquals(JOB_NAME, saved.getJobName());
    assertEquals("GUIDE_SINGLE", saved.getMode());
    assertEquals("OFFLINE", saved.getReleaseState());
    assertEquals("MYSQL", saved.getSourceType());
    assertEquals("MYSQL", saved.getSinkType());
    assertEquals("AUTO", saved.getWorkerSelectMode());
    assertEquals("{}", saved.getWorkerRequiredLabelsJson());
    assertEquals(SCHEDULE_JSON, saved.getScheduleJson());
    assertEquals(0, saved.getVersion());
    assertNull(saved.getCurrentVersionId());
    assertNull(saved.getEnvJson());
    verify(scheduleRepository).saveSchedule(TASK_ID, schedule);
    verify(catalogRepository, never()).saveVersion(
        anyLong(),
        anyInt(),
        anyString(),
        anyString(),
        anyString(),
        anyString());
  }

  @Test
  void saveGuidePersistsExecutableVersionAndSchedule() {
    OfflineJobDefinitionDTO request = request();
    ObjectNode requestJson = JsonNodeFactory.instance.objectNode();
    ObjectNode schedule = schedule(requestJson);
    DataSourcePO source = dataSource(1L);
    DataSourcePO sink = dataSource(2L);
    PreparedDefinition prepared = new PreparedDefinition(
        requestJson,
        JOB_NAME,
        null,
        "GUIDE_SINGLE",
        "{\"id\":1001,\"schedule\":" + SCHEDULE_JSON + "}",
        "{\"apiVersion\":\"link-up/v1\",\"kind\":\"BatchSyncJob\"}",
        source,
        sink,
        "jdbc",
        "jdbc",
        "source_table",
        "sink_table",
        "digest");

    when(definitionDao.selectById(TASK_ID)).thenReturn(null);
    when(support.prepare(request)).thenReturn(prepared);
    when(capabilityResolver.resolve(prepared.getJobSpecJson())).thenReturn("{}");
    when(definitionDao.existsByName(JOB_NAME, TASK_ID)).thenReturn(false);
    when(support.writeNullable(schedule)).thenReturn(SCHEDULE_JSON);
    when(catalogRepository.saveVersion(
        TASK_ID,
        1,
        prepared.getDefinitionJson(),
        prepared.getJobSpecJson(),
        prepared.getDigest(),
        "{}"))
        .thenReturn(2001L);

    assertEquals(TASK_ID, service.saveGuide(request));

    ArgumentCaptor<OfflineJobDefinitionPO> captor =
        ArgumentCaptor.forClass(OfflineJobDefinitionPO.class);
    verify(definitionDao).insert(captor.capture());
    OfflineJobDefinitionPO saved = captor.getValue();
    assertEquals(TASK_ID, saved.getId());
    assertEquals(SCHEDULE_JSON, saved.getScheduleJson());
    assertEquals(1, saved.getVersion());
    assertEquals(2001L, saved.getCurrentVersionId());
    assertEquals(1L, saved.getSourceDatasourceId());
    assertEquals(2L, saved.getSinkDatasourceId());
    verify(scheduleRepository).saveSchedule(TASK_ID, schedule);
  }

  @Test
  void saveGuideKeepsStrictValidationForIncompleteDefinition() {
    OfflineJobDefinitionDTO request = request();
    IllegalArgumentException expected = new IllegalArgumentException("请选择来源数据源");

    when(definitionDao.selectById(TASK_ID)).thenReturn(null);
    when(support.prepare(request)).thenThrow(expected);

    IllegalArgumentException actual = assertThrows(
        IllegalArgumentException.class,
        () -> service.saveGuide(request));

    assertSame(expected, actual);
    verify(support, never()).prepareDraft(any());
    verify(definitionDao, never()).insert(any());
    verifyNoInteractions(scheduleRepository);
  }

  private ObjectNode schedule(ObjectNode requestJson) {
    ObjectNode schedule = requestJson.putObject("schedule");
    schedule.put("cron", "0 0 2 * * ?");
    schedule.put("enabled", true);
    schedule.put("retryOnFailure", true);
    return schedule;
  }

  private DataSourcePO dataSource(Long id) {
    DataSourcePO value = new DataSourcePO();
    value.setId(id);
    return value;
  }

  private OfflineJobDefinitionDTO request() {
    OfflineJobDefinitionDTO request = new OfflineJobDefinitionDTO();
    request.setId(TASK_ID);
    return request;
  }
}
