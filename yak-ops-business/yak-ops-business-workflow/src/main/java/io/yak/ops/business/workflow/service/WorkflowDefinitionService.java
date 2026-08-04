package io.yak.ops.business.workflow.service;

import io.yak.ops.common.bean.dto.workflow.WorkflowDTO;
import io.yak.ops.common.bean.dto.workflow.WorkflowUpdateDTO;
import io.yak.ops.common.bean.dto.workflow.WorkflowV2DTO;
import io.yak.ops.common.bean.dto.workflow.WorkflowV2UpdateDTO;
import io.yak.ops.common.bean.vo.workflow.WorkflowDefinitionVO;
import io.yak.ops.common.bean.vo.workflow.WorkflowVersionVO;
import java.util.List;

/** 工作流定义服务接口。 */
public interface WorkflowDefinitionService {

  Long addWorkflow(WorkflowDTO workflowDTO, String operator);

  Long addWorkflowV2(WorkflowV2DTO workflowDTO, String operator);

  void editWorkflow(Long workflowId, WorkflowUpdateDTO workflowDTO);

  void editWorkflowV2(Long workflowId, WorkflowV2UpdateDTO workflowDTO);

  void deleteWorkflow(Long workflowId);

  WorkflowVersionVO publishWorkflow(Long workflowId, String operator);

  WorkflowDefinitionVO getWorkflow(Long workflowId);

  WorkflowVersionVO getWorkflowVersion(Long workflowId, Integer version);

  List<WorkflowDefinitionVO> getWorkflowList();
}
