package io.yak.ops.business.workflow.dao;

import io.yak.ops.business.workflow.common.entity.workflow.WorkflowDefinition;
import io.yak.ops.business.workflow.common.entity.workflow.WorkflowVersion;
import io.yak.ops.business.workflow.common.po.WorkflowDefinitionPO;
import io.yak.ops.business.workflow.common.po.WorkflowVersionPO;
import java.util.List;

/** 工作流定义数据访问接口。 */
public interface WorkflowDefinitionDao {

  int addDefinition(WorkflowDefinitionPO definitionPO);

  int editDefinition(WorkflowDefinitionPO definitionPO);

  WorkflowDefinition selectDefinitionById(Long workflowId);

  List<WorkflowDefinition> selectAllDefinition();

  int addVersion(WorkflowVersionPO versionPO);

  WorkflowVersion selectVersion(Long workflowId, Integer version);
}
