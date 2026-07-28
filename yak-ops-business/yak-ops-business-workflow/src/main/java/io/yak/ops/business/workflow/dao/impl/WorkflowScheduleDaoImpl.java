package io.yak.ops.business.workflow.dao.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.common.entity.workflow.WorkflowSchedule;
import io.yak.ops.business.workflow.common.po.WorkflowSchedulePO;
import io.yak.ops.business.workflow.dao.WorkflowScheduleDao;
import io.yak.ops.business.workflow.dao.mapper.WorkflowScheduleMapper;
import io.yak.ops.business.workflow.util.WorkflowConvertUtils;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** 工作流调度数据访问实现。 */
@ConditionalOnWorkflowEnabled
@Repository
@RequiredArgsConstructor
public class WorkflowScheduleDaoImpl implements WorkflowScheduleDao {

  private final WorkflowScheduleMapper scheduleMapper;

  @Override
  public int saveOrUpdate(WorkflowSchedulePO schedulePO) {
    return scheduleMapper.upsert(schedulePO);
  }

  @Override
  public WorkflowSchedule selectByWorkflowId(Long workflowId) {
    WorkflowSchedulePO schedulePO = scheduleMapper.selectOne(
        Wrappers.<WorkflowSchedulePO>lambdaQuery()
            .eq(WorkflowSchedulePO::getWorkflowId, workflowId));
    return WorkflowConvertUtils.toSchedule(schedulePO);
  }

  @Override
  public List<WorkflowSchedule> selectEnabledList() {
    return scheduleMapper.selectList(
            Wrappers.<WorkflowSchedulePO>lambdaQuery()
                .eq(WorkflowSchedulePO::getEnabled, true)
                .orderByAsc(WorkflowSchedulePO::getId))
        .stream()
        .map(WorkflowConvertUtils::toSchedule)
        .collect(Collectors.toList());
  }

  @Override
  public int deleteByWorkflowId(Long workflowId) {
    return scheduleMapper.delete(
        Wrappers.<WorkflowSchedulePO>lambdaQuery()
            .eq(WorkflowSchedulePO::getWorkflowId, workflowId));
  }
}
