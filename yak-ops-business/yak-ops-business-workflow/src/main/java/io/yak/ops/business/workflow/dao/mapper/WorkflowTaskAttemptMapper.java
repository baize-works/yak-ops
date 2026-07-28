package io.yak.ops.business.workflow.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.yak.ops.common.bean.po.workflow.WorkflowTaskAttemptPO;
import java.util.Date;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/** 工作流任务执行尝试 MyBatis 映射接口。 */
@Mapper
public interface WorkflowTaskAttemptMapper extends BaseMapper<WorkflowTaskAttemptPO> {

  int finishAttempt(
      @Param("attemptId") Long attemptId,
      @Param("runningState") String runningState,
      @Param("state") String state,
      @Param("externalId") String externalId,
      @Param("errorMessage") String errorMessage,
      @Param("endTime") Date endTime);

  int interruptRunningAttempts(
      @Param("taskInstanceId") Long taskInstanceId,
      @Param("runningState") String runningState,
      @Param("interruptedState") String interruptedState,
      @Param("message") String message,
      @Param("endTime") Date endTime);
}
