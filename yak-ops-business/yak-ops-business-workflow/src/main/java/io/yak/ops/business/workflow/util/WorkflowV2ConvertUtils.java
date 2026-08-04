package io.yak.ops.business.workflow.util;

import io.yak.ops.common.bean.entity.workflow.WorkflowDag;
import io.yak.ops.common.bean.entity.workflow.WorkflowDefinition;
import io.yak.ops.common.bean.entity.workflow.WorkflowVersion;
import io.yak.ops.common.bean.po.workflow.WorkflowDefinitionPO;
import io.yak.ops.common.bean.po.workflow.WorkflowVersionPO;
import io.yak.ops.common.bean.vo.workflow.WorkflowDefinitionVO;
import io.yak.ops.common.bean.vo.workflow.WorkflowVersionVO;
import io.yak.ops.common.enums.workflow.DefinitionState;
import io.yak.ops.common.enums.workflow.FailureStrategy;

/** Schema-aware conversion support kept separate from the legacy V1 converter. */
public final class WorkflowV2ConvertUtils {

  private WorkflowV2ConvertUtils() {
  }

  public static WorkflowDefinition toDefinition(
      WorkflowDefinitionPO source,
      WorkflowJsonCodec codec) {
    if (source == null) return null;
    int schemaVersion = schema(source.getDraftSchemaVersion());
    if (schemaVersion == 1) {
      WorkflowDefinition target = WorkflowConvertUtils.toDefinition(source, codec);
      target.setSchemaVersion(1);
      return target;
    }
    if (schemaVersion != 2) {
      throw new IllegalStateException("不支持的工作流草稿 schemaVersion：" + schemaVersion);
    }
    WorkflowDefinition target = new WorkflowDefinition();
    target.setId(source.getId());
    target.setCode(source.getCode());
    target.setName(source.getName());
    target.setDescription(source.getDescription());
    target.setState(DefinitionState.valueOf(source.getState()));
    target.setCurrentVersion(source.getCurrentVersion());
    target.setFailureStrategy(FailureStrategy.valueOf(source.getFailureStrategy()));
    target.setMaxParallelism(source.getMaxParallelism() == null ? 0 : source.getMaxParallelism());
    target.setSchemaVersion(2);
    target.setDraft(new WorkflowDag());
    target.setDraftV2(codec.readV2Dag(source.getDraftJson()));
    target.setCreatedBy(source.getCreatedBy());
    target.setCreatedAt(source.getCreatedAt());
    target.setUpdatedAt(source.getUpdatedAt());
    return target;
  }

  public static WorkflowVersion toVersion(
      WorkflowVersionPO source,
      WorkflowJsonCodec codec) {
    if (source == null) return null;
    int schemaVersion = schema(source.getSchemaVersion());
    if (schemaVersion == 1) {
      WorkflowVersion target = WorkflowConvertUtils.toVersion(source, codec);
      target.setSchemaVersion(1);
      return target;
    }
    if (schemaVersion != 2) {
      throw new IllegalStateException("不支持的工作流版本 schemaVersion：" + schemaVersion);
    }
    WorkflowVersion target = new WorkflowVersion();
    target.setId(source.getId());
    target.setWorkflowId(source.getWorkflowId());
    target.setVersion(source.getVersion() == null ? 0 : source.getVersion());
    target.setSchemaVersion(2);
    target.setDag(new WorkflowDag());
    target.setDagV2(codec.readV2Dag(source.getDagJson()));
    target.setContentHash(source.getContentHash());
    target.setPublishedBy(source.getPublishedBy());
    target.setPublishedAt(source.getPublishedAt());
    return target;
  }

  public static WorkflowDefinitionVO toVO(WorkflowDefinition source) {
    if (source.getSchemaVersion() == 1) {
      WorkflowDefinitionVO target = WorkflowConvertUtils.toVO(source);
      target.setSchemaVersion(1);
      return target;
    }
    WorkflowDefinitionVO target = new WorkflowDefinitionVO();
    target.setId(source.getId());
    target.setCode(source.getCode());
    target.setName(source.getName());
    target.setDescription(source.getDescription());
    target.setState(source.getState());
    target.setCurrentVersion(source.getCurrentVersion());
    target.setFailureStrategy(source.getFailureStrategy());
    target.setMaxParallelism(source.getMaxParallelism());
    target.setSchemaVersion(2);
    target.setDraft(source.getDraft());
    target.setDraftV2(source.getDraftV2());
    target.setCreatedBy(source.getCreatedBy());
    target.setCreatedAt(source.getCreatedAt());
    target.setUpdatedAt(source.getUpdatedAt());
    return target;
  }

  public static WorkflowVersionVO toVO(WorkflowVersion source) {
    if (source.getSchemaVersion() == 1) {
      WorkflowVersionVO target = WorkflowConvertUtils.toVO(source);
      target.setSchemaVersion(1);
      return target;
    }
    WorkflowVersionVO target = new WorkflowVersionVO();
    target.setId(source.getId());
    target.setWorkflowId(source.getWorkflowId());
    target.setVersion(source.getVersion());
    target.setSchemaVersion(2);
    target.setDag(source.getDag());
    target.setDagV2(source.getDagV2());
    target.setContentHash(source.getContentHash());
    target.setPublishedBy(source.getPublishedBy());
    target.setPublishedAt(source.getPublishedAt());
    return target;
  }

  private static int schema(Integer value) {
    return value == null ? 1 : value;
  }
}
