package io.yak.ops.business.workflow.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.workflow.dag.WorkflowDagCompiler;
import io.yak.ops.business.workflow.dag.WorkflowV2DagValidator;
import io.yak.ops.business.workflow.dag.WorkflowV2PublicationValidator;
import io.yak.ops.business.workflow.dao.WorkflowDefinitionDao;
import io.yak.ops.business.workflow.dao.WorkflowExecutionDao;
import io.yak.ops.business.workflow.service.WorkflowScheduleService;
import io.yak.ops.business.workflow.util.WorkflowJsonCodec;
import io.yak.ops.common.bean.dto.workflow.WorkflowV2DTO;
import io.yak.ops.common.bean.dto.workflow.WorkflowV2UpdateDTO;
import io.yak.ops.common.bean.entity.workflow.WorkflowDefinition;
import io.yak.ops.common.bean.entity.workflow.WorkflowVersion;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Dag;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Edge;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Node;
import io.yak.ops.common.bean.po.workflow.WorkflowDefinitionPO;
import io.yak.ops.common.bean.po.workflow.WorkflowVersionPO;
import io.yak.ops.common.enums.workflow.DefinitionState;
import io.yak.ops.common.enums.workflow.FailureStrategy;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class WorkflowDefinitionServiceV2Test {

  private final WorkflowDefinitionDao definitionDao = mock(WorkflowDefinitionDao.class);
  private final WorkflowExecutionDao executionDao = mock(WorkflowExecutionDao.class);
  private final WorkflowScheduleService scheduleService = mock(WorkflowScheduleService.class);
  private final WorkflowDagCompiler v1Compiler = mock(WorkflowDagCompiler.class);
  private final WorkflowV2PublicationValidator publicationValidator =
      new WorkflowV2PublicationValidator(
          List.of((taskId, versionId) -> java.util.Optional.empty()));
  private final WorkflowJsonCodec codec = new WorkflowJsonCodec(new ObjectMapper());
  private final WorkflowDefinitionServiceImpl service = new WorkflowDefinitionServiceImpl(
      definitionDao,
      executionDao,
      scheduleService,
      v1Compiler,
      new WorkflowV2DagValidator(new ObjectMapper()),
      publicationValidator,
      codec);

  @Test
  void writesV2DraftWithSchemaMarker() {
    when(definitionDao.existsDefinitionByCode("flow-v2")).thenReturn(false);
    doAnswer(invocation -> {
      invocation.<WorkflowDefinitionPO>getArgument(0).setId(88L);
      return 1;
    }).when(definitionDao).addDefinition(any(WorkflowDefinitionPO.class));

    WorkflowV2DTO request = new WorkflowV2DTO();
    request.setCode(" flow-v2 ");
    request.setName(" V2 Flow ");
    request.setMaxParallelism(4);
    request.setDag(minimalDag());

    assertEquals(88L, service.addWorkflowV2(request, "tester"));
    ArgumentCaptor<WorkflowDefinitionPO> captor =
        ArgumentCaptor.forClass(WorkflowDefinitionPO.class);
    org.mockito.Mockito.verify(definitionDao).addDefinition(captor.capture());
    assertEquals(2, captor.getValue().getDraftSchemaVersion());
    assertEquals(true, captor.getValue().getDraftJson().contains("\"schemaVersion\":2"));
  }

  @Test
  void preventsV2WriterFromSilentlyConvertingV1Definition() {
    WorkflowDefinition v1 = new WorkflowDefinition();
    v1.setId(88L);
    v1.setSchemaVersion(1);
    when(definitionDao.selectDefinitionById(88L)).thenReturn(v1);

    WorkflowV2UpdateDTO request = new WorkflowV2UpdateDTO();
    request.setName("V2 Flow");
    request.setMaxParallelism(4);
    request.setDag(minimalDag());

    assertThrows(IllegalStateException.class, () -> service.editWorkflowV2(88L, request));
  }

  @Test
  void publishesV2VersionWithSchemaMarker() {
    WorkflowDefinition definition = new WorkflowDefinition();
    definition.setId(88L);
    definition.setCode("flow-v2");
    definition.setName("V2 Flow");
    definition.setState(DefinitionState.DRAFT);
    definition.setFailureStrategy(FailureStrategy.FAIL_FAST);
    definition.setMaxParallelism(4);
    definition.setSchemaVersion(2);
    definition.setDraftV2(minimalDag());
    when(definitionDao.selectDefinitionById(88L)).thenReturn(definition);

    AtomicReference<WorkflowVersionPO> inserted = new AtomicReference<>();
    doAnswer(invocation -> {
      WorkflowVersionPO value = invocation.getArgument(0);
      value.setId(101L);
      inserted.set(value);
      return 1;
    }).when(definitionDao).addVersion(any(WorkflowVersionPO.class));
    when(definitionDao.selectVersion(88L, 1)).thenAnswer(ignored -> {
      WorkflowVersionPO value = inserted.get();
      WorkflowVersion result = new WorkflowVersion();
      result.setId(value.getId());
      result.setWorkflowId(value.getWorkflowId());
      result.setVersion(value.getVersion());
      result.setSchemaVersion(value.getSchemaVersion());
      result.setDagV2(codec.readV2Dag(value.getDagJson()));
      result.setContentHash(value.getContentHash());
      result.setPublishedBy(value.getPublishedBy());
      result.setPublishedAt(value.getPublishedAt());
      return result;
    });

    assertEquals(2, service.publishWorkflow(88L, "tester").getSchemaVersion());
    assertEquals(2, inserted.get().getSchemaVersion());
  }

  private static WorkflowV2Dag minimalDag() {
    WorkflowV2Node start = node("start", WorkflowV2Node.Kind.START);
    WorkflowV2Node end = node("end", WorkflowV2Node.Kind.END);
    return new WorkflowV2Dag(
        List.of(start, end),
        List.of(new WorkflowV2Edge("start", WorkflowV2Edge.Port.SUCCESS, "end")));
  }

  private static WorkflowV2Node node(String key, WorkflowV2Node.Kind kind) {
    WorkflowV2Node node = new WorkflowV2Node();
    node.setKey(key);
    node.setName(key);
    node.setKind(kind);
    return node;
  }
}
