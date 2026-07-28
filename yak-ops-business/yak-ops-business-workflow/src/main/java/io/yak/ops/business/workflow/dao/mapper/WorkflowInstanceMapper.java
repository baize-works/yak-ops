package io.yak.ops.business.workflow.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.yak.ops.business.workflow.common.po.WorkflowInstanceDetailPO;
import io.yak.ops.business.workflow.common.po.WorkflowInstancePO;
import java.util.Date;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/** 工作流实例 MyBatis 映射接口。 */
@Mapper
public interface WorkflowInstanceMapper extends BaseMapper<WorkflowInstancePO> {

  WorkflowInstanceDetailPO selectDetailById(@Param("instanceId") Long instanceId);

  List<WorkflowInstancePO> selectListByWorkflowId(
      @Param("workflowId") Long workflowId,
      @Param("limit") int limit);

  List<Long> selectRecoverableInstanceIds(
      @Param("states") List<String> states,
      @Param("limit") int limit);

  int countRunningByWorkflowId(
      @Param("workflowId") Long workflowId,
      @Param("states") List<String> states);

  int markRunning(
      @Param("instanceId") Long instanceId,
      @Param("pendingState") String pendingState,
      @Param("runningState") String runningState,
      @Param("startTime") Date startTime);

  int requestStop(
      @Param("instanceId") Long instanceId,
      @Param("activeStates") List<String> activeStates,
      @Param("terminalStates") List<String> terminalStates,
      @Param("stoppingState") String stoppingState);

  int finishInstance(
      @Param("instanceId") Long instanceId,
      @Param("state") String state,
      @Param("terminalStates") List<String> terminalStates,
      @Param("endTime") Date endTime);
}
