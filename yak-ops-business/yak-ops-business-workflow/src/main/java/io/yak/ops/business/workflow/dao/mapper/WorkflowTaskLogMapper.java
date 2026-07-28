package io.yak.ops.business.workflow.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.yak.ops.common.bean.po.workflow.WorkflowTaskLogPO;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/** 工作流任务日志 MyBatis 映射接口。 */
@Mapper
public interface WorkflowTaskLogMapper extends BaseMapper<WorkflowTaskLogPO> {

  List<String> selectContentListByTaskId(
      @Param("taskInstanceId") Long taskInstanceId,
      @Param("limit") int limit);
}
