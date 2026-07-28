package io.yak.ops.business.workflow.dao;

import io.yak.ops.business.workflow.common.entity.workflow.WorkflowSchedule;
import io.yak.ops.business.workflow.common.po.WorkflowSchedulePO;
import java.util.List;

/** 工作流调度数据访问接口。 */
public interface WorkflowScheduleDao {

  int saveOrUpdate(WorkflowSchedulePO schedulePO);

  WorkflowSchedule selectByWorkflowId(Long workflowId);

  List<WorkflowSchedule> selectEnabledList();

  int deleteByWorkflowId(Long workflowId);
}
