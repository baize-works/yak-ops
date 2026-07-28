package io.yak.ops.business.workflow.service;

import io.yak.ops.common.bean.dto.workflow.WorkflowScheduleDTO;
import io.yak.ops.common.bean.vo.workflow.WorkflowScheduleVO;

/** 工作流调度服务接口。 */
public interface WorkflowScheduleService {

  WorkflowScheduleVO saveOrUpdate(Long workflowId, WorkflowScheduleDTO scheduleDTO);

  void delete(Long workflowId);

  WorkflowScheduleVO get(Long workflowId);
}
