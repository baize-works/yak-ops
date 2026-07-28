package io.yak.ops.business.workflow.service;

import io.yak.ops.business.workflow.common.dto.workflow.WorkflowDTO;
import io.yak.ops.business.workflow.common.dto.workflow.WorkflowUpdateDTO;
import io.yak.ops.business.workflow.common.vo.workflow.WorkflowDefinitionVO;
import io.yak.ops.business.workflow.common.vo.workflow.WorkflowVersionVO;
import java.util.List;

/** 工作流定义服务接口。 */
public interface WorkflowDefinitionService {

  Long addWorkflow(WorkflowDTO workflowDTO, String operator);

  void editWorkflow(Long workflowId, WorkflowUpdateDTO workflowDTO);

  WorkflowVersionVO publishWorkflow(Long workflowId, String operator);

  WorkflowDefinitionVO getWorkflow(Long workflowId);

  List<WorkflowDefinitionVO> getWorkflowList();
}
