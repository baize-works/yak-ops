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
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.sync.offline.dao.OfflineJobDefinitionDao;
import io.yak.ops.business.sync.offline.repository.OfflineDefinitionCatalogRepository;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository;
import io.yak.ops.business.sync.offline.service.OfflineDefinitionSupport.DraftDefinition;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionDTO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 离线同步任务定义草稿兼容流程测试。
 *
 * @author weifuwan
 */
@ExtendWith(MockitoExtension.class)
class OfflineJobDefinitionServiceTest {

  private static final long TASK_ID = 1001L;
  private static final String JOB_NAME = "MYSQL → MYSQL 离线同步";

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

  private OfflineJobDefinitionService service;

  @BeforeEach
  void setUp() {
    service = new OfflineJobDefinitionService(
        definitionDao,
        catalogRepository,
        scheduleRepository,
        executionRepository,
        support);
  }

  @ParameterizedTest
  @ValueSource(strings = {"请选择来源数据源", "请选择目标数据源"})
  void saveGuideCreatesDraftForLegacyInitialRequest(String validationMessage) {
    OfflineJobDefinitionDTO request = request();
    ObjectNode requestJson = JsonNodeFactory.instance.objectNode();
    DraftDefinition draft = new DraftDefinition(
        requestJson,
        JOB_NAME,
        null,
        "GUIDE_SINGLE",
        "{\"id\":1001}",
        "MYSQL",
        "MYSQL");

    when(definitionDao.selectById(TASK_ID)).thenReturn(null);
    when(support.prepare(request)).thenThrow(new IllegalArgumentException(validationMessage));
    when(support.prepareDraft(request)).thenReturn(draft);
    when(definitionDao.existsByName(JOB_NAME, TASK_ID)).thenReturn(false);

    assertEquals(TASK_ID, service.saveGuide(request));

    ArgumentCaptor<OfflineJobDefinitionPO> captor =
        ArgumentCaptor.forClass(OfflineJobDefinitionPO.class);
    verify(definitionDao).insert(captor.capture());
    OfflineJobDefinitionPO saved = captor.getValue();
    assertEquals(TASK_ID, saved.getId());
    assertEquals(JOB_NAME, saved.getJobName());
    assertEquals("GUIDE_SINGLE", saved.getMode());
    assertEquals("OFFLINE", saved.getReleaseState());
    assertEquals(0, saved.getVersion());
    assertNull(saved.getCurrentVersionId());
    verify(catalogRepository, never()).saveVersion(
        anyLong(), anyInt(), anyString(), anyString(), anyString());
  }

  @Test
  void saveGuideKeepsStrictValidationForExistingDraft() {
    OfflineJobDefinitionDTO request = request();
    OfflineJobDefinitionPO existing = new OfflineJobDefinitionPO();
    existing.setId(TASK_ID);
    existing.setReleaseState("OFFLINE");
    IllegalArgumentException expected = new IllegalArgumentException("请选择来源数据源");

    when(definitionDao.selectById(TASK_ID)).thenReturn(existing);
    when(executionRepository.hasActiveExecution(TASK_ID)).thenReturn(false);
    when(support.prepare(request)).thenThrow(expected);

    IllegalArgumentException actual = assertThrows(
        IllegalArgumentException.class,
        () -> service.saveGuide(request));

    assertSame(expected, actual);
    verify(support, never()).prepareDraft(any());
    verify(definitionDao, never()).insert(any());
  }

  @Test
  void saveGuideDoesNotHideOtherInitialValidationErrors() {
    OfflineJobDefinitionDTO request = request();
    IllegalArgumentException expected = new IllegalArgumentException("请选择或填写来源表");

    when(definitionDao.selectById(TASK_ID)).thenReturn(null);
    when(support.prepare(request)).thenThrow(expected);

    IllegalArgumentException actual = assertThrows(
        IllegalArgumentException.class,
        () -> service.saveGuide(request));

    assertSame(expected, actual);
    verify(support, never()).prepareDraft(any());
    verify(definitionDao, never()).insert(any());
  }

  private OfflineJobDefinitionDTO request() {
    OfflineJobDefinitionDTO request = new OfflineJobDefinitionDTO();
    request.setId(TASK_ID);
    return request;
  }
}
