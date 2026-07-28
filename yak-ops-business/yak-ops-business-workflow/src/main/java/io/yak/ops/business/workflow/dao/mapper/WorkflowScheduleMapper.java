package io.yak.ops.business.workflow.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.yak.ops.common.bean.po.workflow.WorkflowSchedulePO;
import org.apache.ibatis.annotations.Mapper;

/** 工作流调度 MyBatis 映射接口。 */
@Mapper
public interface WorkflowScheduleMapper extends BaseMapper<WorkflowSchedulePO> {
  int upsert(WorkflowSchedulePO schedulePO);
}
