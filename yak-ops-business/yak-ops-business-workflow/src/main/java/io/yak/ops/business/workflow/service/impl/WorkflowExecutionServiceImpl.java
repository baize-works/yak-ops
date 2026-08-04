package io.yak.ops.business.workflow.service.impl;

import io.yak.ops.common.bean.entity.workflow.WorkflowDefinition;
import io.yak.ops.common.bean.entity.workflow.WorkflowInstanceDetail;
import io.yak.ops.common.bean.entity.workflow.WorkflowNode;
import io.yak.ops.common.bean.entity.workflow.WorkflowTaskInstance;
import io.yak.ops.common.bean.entity.workflow.WorkflowVersion;
import io.yak.ops.common.enums.workflow.DefinitionState;
import io.yak.ops.common.enums.workflow.TaskState;
import io.yak.ops.common.enums.workflow.TriggerType;
import io.yak.ops.common.enums.workflow.WorkflowState;
import io.yak.ops.common.bean.po.workflow.WorkflowInstancePO;
import io.yak.ops.common.bean.po.workflow.WorkflowTaskInstancePO;
import io.yak.ops.common.bean.vo.workflow.WorkflowInstanceDetailVO;
import io.yak.ops.common.bean.vo.workflow.WorkflowInstanceVO;
import io.yak.ops.common.bean.vo.workflow.WorkflowTaskAttemptVO;
import io.yak.ops.common.bean.vo.workflow.WorkflowTaskInstanceVO;
import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.dao.WorkflowDefinitionDao;
import io.yak.ops.business.workflow.dao.WorkflowExecutionDao;
import io.yak.ops.business.workflow.engine.WorkflowEngine;
import io.yak.ops.business.workflow.service.WorkflowExecutionService;
import io.yak.ops.business.workflow.util.WorkflowConvertUtils;
import io.yak.ops.business.workflow.util.WorkflowJsonCodec;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** 工作流运行实例服务实现。 */
@ConditionalOnWorkflowEnabled
@Service
public class WorkflowExecutionServiceImpl implements WorkflowExecutionService {

  private final WorkflowDefinitionDao definitionDao;
  private final WorkflowExecutionDao executionDao;
  private final WorkflowEngine workflowEngine;
  private final WorkflowJsonCodec jsonCodec;
  private final TransactionTemplate transactionTemplate;

  public WorkflowExecutionServiceImpl(
      WorkflowDefinitionDao definitionDao,
      WorkflowExecutionDao executionDao,
      WorkflowEngine workflowEngine,
      WorkflowJsonCodec jsonCodec,
      @Qualifier("workflowTransactionManager") PlatformTransactionManager transactionManager) {
    this.definitionDao = definitionDao;
    this.executionDao = executionDao;
    this.workflowEngine = workflowEngine;
    this.jsonCodec = jsonCodec;
    this.transactionTemplate = new TransactionTemplate(transactionManager);
  }

  @Override
  public Long triggerWorkflow(
      Long workflowId,
      TriggerType triggerType,
      Map<String, Object> globalParameters,
      String operator) {
    Long instanceId = transactionTemplate.execute(status -> createInstance(
        workflowId,
        triggerType == null ? TriggerType.MANUAL : triggerType,
        globalParameters == null ? new LinkedHashMap<>() : globalParameters,
        operator));
    if (instanceId == null) {
      throw new IllegalStateException("工作流实例事务未返回主键");
    }
    workflowEngine.start(instanceId);
    return instanceId;
  }

  private Long createInstance(
      Long workflowId,
      TriggerType triggerType,
      Map<String, Object> globalParameters,
      String operator) {
    WorkflowDefinition definition = definitionDao.selectDefinitionById(workflowId);
    if (definition == null) {
      throw new IllegalArgumentException("工作流定义不存在：" + workflowId);
    }
    if (definition.getState() != DefinitionState.PUBLISHED
        || definition.getCurrentVersion() == null) {
      throw new IllegalStateException("工作流发布后才能运行：" + workflowId);
    }
    WorkflowVersion version = definitionDao.selectVersion(
        workflowId,
        definition.getCurrentVersion());
    if (version == null) {
      throw new IllegalStateException(
          "已发布的工作流版本不存在：" + workflowId + "/" + definition.getCurrentVersion());
    }
    if (version.getSchemaVersion() != 1) {
      throw new IllegalStateException(
          "Workflow V2 执行将在统一 Task Execution Gateway 阶段启用：" + workflowId);
    }

    Date now = new Date();
    WorkflowInstancePO instancePO = new WorkflowInstancePO();
    instancePO.setWorkflowId(workflowId);
    instancePO.setWorkflowVersion(version.getVersion());
    instancePO.setTriggerType(triggerType.name());
    instancePO.setState(WorkflowState.PENDING.name());
    instancePO.setGlobalParamsJson(jsonCodec.write(globalParameters));
    instancePO.setFailureStrategy(definition.getFailureStrategy().name());
    instancePO.setMaxParallelism(definition.getMaxParallelism());
    instancePO.setStopRequested(false);
    instancePO.setCreatedBy(operator);
    instancePO.setCreatedAt(now);
    instancePO.setLockVersion(0);

    List<WorkflowTaskInstancePO> taskPOList = new ArrayList<>();
    for (WorkflowNode node : version.getDag().getNodes()) {
      WorkflowTaskInstancePO taskPO = new WorkflowTaskInstancePO();
      taskPO.setNodeKey(node.getKey());
      taskPO.setNodeName(node.getName());
      taskPO.setTaskType(node.getType());
      TaskState initialState = node.isEnabled() ? TaskState.WAITING : TaskState.SKIPPED;
      taskPO.setState(initialState.name());
      taskPO.setConfigJson(jsonCodec.write(node.getConfig()));
      taskPO.setMaxRetryTimes(node.getRetryTimes());
      taskPO.setRetryCount(0);
      taskPO.setRetryIntervalSeconds(node.getRetryIntervalSeconds());
      taskPO.setTimeoutSeconds(node.getTimeoutSeconds());
      taskPO.setIdempotent(node.isIdempotent());
      taskPO.setRetryOnRestart(node.isRetryOnRestart());
      taskPO.setEndTime(initialState == TaskState.SKIPPED ? now : null);
      taskPO.setLockVersion(0);
      taskPOList.add(taskPO);
    }
    return executionDao.addInstance(instancePO, taskPOList);
  }

  @Override
  public void stopWorkflow(Long workflowInstanceId) {
    if (!executionDao.requestStop(workflowInstanceId)) {
      throw new IllegalArgumentException("工作流实例不存在或已经结束：" + workflowInstanceId);
    }
    workflowEngine.stop(workflowInstanceId);
  }

  @Override
  public WorkflowInstanceDetailVO getWorkflowInstance(Long workflowInstanceId) {
    WorkflowInstanceDetail detail =
        executionDao.selectInstanceDetailById(workflowInstanceId);
    if (detail == null) {
      throw new IllegalArgumentException("工作流实例不存在：" + workflowInstanceId);
    }
    return WorkflowConvertUtils.toVO(detail);
  }

  @Override
  public List<WorkflowTaskInstanceVO> getTaskList(Long workflowInstanceId) {
    getWorkflowInstance(workflowInstanceId);
    return executionDao.selectTaskListByInstanceId(workflowInstanceId).stream()
        .map(WorkflowConvertUtils::toVO)
        .collect(Collectors.toList());
  }

  @Override
  public List<WorkflowTaskAttemptVO> getAttemptList(Long taskInstanceId) {
    WorkflowTaskInstance task = executionDao.selectTaskById(taskInstanceId);
    if (task == null) {
      throw new IllegalArgumentException("工作流任务实例不存在：" + taskInstanceId);
    }
    return executionDao.selectAttemptListByTaskId(taskInstanceId).stream()
        .map(WorkflowConvertUtils::toVO)
        .collect(Collectors.toList());
  }

  @Override
  public List<String> getLogList(Long taskInstanceId, int limit) {
    if (executionDao.selectTaskById(taskInstanceId) == null) {
      throw new IllegalArgumentException("工作流任务实例不存在：" + taskInstanceId);
    }
    return executionDao.selectLogContentList(taskInstanceId, limit);
  }

  @Override
  public List<WorkflowInstanceVO> getWorkflowInstanceList(Long workflowId, int limit) {
    return executionDao.selectInstanceListByWorkflowId(workflowId, limit).stream()
        .map(WorkflowConvertUtils::toVO)
        .collect(Collectors.toList());
  }
}
