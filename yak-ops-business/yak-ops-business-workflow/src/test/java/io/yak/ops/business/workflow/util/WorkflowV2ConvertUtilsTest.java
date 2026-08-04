package io.yak.ops.business.workflow.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.common.bean.entity.workflow.WorkflowDefinition;
import io.yak.ops.common.bean.entity.workflow.WorkflowVersion;
import io.yak.ops.common.bean.po.workflow.WorkflowDefinitionPO;
import io.yak.ops.common.bean.po.workflow.WorkflowVersionPO;
import java.util.Date;
import org.junit.jupiter.api.Test;

class WorkflowV2ConvertUtilsTest {

  private final WorkflowJsonCodec codec = new WorkflowJsonCodec(new ObjectMapper());

  @Test
  void readsV2DraftWithoutParsingItAsLegacyDag() {
    WorkflowDefinitionPO source = new WorkflowDefinitionPO();
    source.setId(10L);
    source.setCode("flow-v2");
    source.setName("Flow V2");
    source.setState("DRAFT");
    source.setFailureStrategy("FAIL_FAST");
    source.setMaxParallelism(4);
    source.setDraftSchemaVersion(2);
    source.setDraftJson("{\"schemaVersion\":2,\"nodes\":[],\"edges\":[],"
        + "\"viewport\":{\"x\":0,\"y\":0,\"zoom\":1}}");
    source.setCreatedAt(new Date());
    source.setUpdatedAt(new Date());

    WorkflowDefinition result = WorkflowV2ConvertUtils.toDefinition(source, codec);

    assertEquals(2, result.getSchemaVersion());
    assertNotNull(result.getDraftV2());
    assertEquals(2, result.getDraftV2().getSchemaVersion());
    assertNotNull(result.getDraft());
  }

  @Test
  void readsV2PublishedVersionIntoDagV2() {
    WorkflowVersionPO source = new WorkflowVersionPO();
    source.setId(20L);
    source.setWorkflowId(10L);
    source.setVersion(3);
    source.setSchemaVersion(2);
    source.setDagJson("{\"schemaVersion\":2,\"nodes\":[],\"edges\":[],"
        + "\"viewport\":{\"x\":0,\"y\":0,\"zoom\":1}}");

    WorkflowVersion result = WorkflowV2ConvertUtils.toVersion(source, codec);

    assertEquals(2, result.getSchemaVersion());
    assertNotNull(result.getDagV2());
    assertEquals(3, result.getVersion());
    assertNotNull(result.getDag());
  }

  @Test
  void treatsMissingSchemaMarkerAsV1() {
    WorkflowVersionPO source = new WorkflowVersionPO();
    source.setId(20L);
    source.setWorkflowId(10L);
    source.setVersion(1);
    source.setDagJson("{\"nodes\":[],\"edges\":[],"
        + "\"viewport\":{\"x\":0,\"y\":0,\"zoom\":1}}");

    WorkflowVersion result = WorkflowV2ConvertUtils.toVersion(source, codec);

    assertEquals(1, result.getSchemaVersion());
    assertNotNull(result.getDag());
    assertNull(result.getDagV2());
  }
}
