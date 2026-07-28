package io.yak.ops.business.workflow.service;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.model.WorkflowEnums.DefinitionState;
import io.yak.ops.business.workflow.model.WorkflowEnums.TriggerType;
import io.yak.ops.business.workflow.model.WorkflowRecords.Attempt;
import io.yak.ops.business.workflow.model.WorkflowRecords.Definition;
import io.yak.ops.business.workflow.model.WorkflowRecords.Instance;
import io.yak.ops.business.workflow.model.WorkflowRecords.TaskInstance;
import io.yak.ops.business.workflow.model.WorkflowRecords.Version;
import io.yak.ops.business.workflow.repository.JdbcWorkflowRepository;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Workflow instance creation, control and query facade. */
@ConditionalOnWorkflowEnabled
@Service
public class WorkflowExecutionService {

  private final JdbcWorkflowRepository repository;
  private final WorkflowEngine engine;
  private final TransactionTemplate transactions;

  public WorkflowExecutionService(
      JdbcWorkflowRepository repository,
      WorkflowEngine engine,
      @Qualifier("workflowTransactionManager") PlatformTransactionManager transactionManager) {
    this.repository = repository;
    this.engine = engine;
    this.transactions = new TransactionTemplate(transactionManager);
  }

  public long trigger(
      long workflowId,
      TriggerType triggerType,
      Map<String, Object> globalParameters,
      String operator) {
    long instanceId = transactions.execute(status -> {
      Definition definition = repository.findDefinition(workflowId)
          .orElseThrow(() -> new IllegalArgumentException(
              "Workflow definition does not exist: " + workflowId));
      if (definition.state() != DefinitionState.PUBLISHED || definition.currentVersion() == null) {
        throw new IllegalStateException("Workflow must be published before execution: " + workflowId);
      }
      Version version = repository.findVersion(workflowId, definition.currentVersion())
          .orElseThrow(() -> new IllegalStateException(
              "Published workflow version does not exist: " + workflowId + "/" + definition.currentVersion()));
      return repository.createInstance(
          definition,
          version,
          triggerType == null ? TriggerType.MANUAL : triggerType,
          globalParameters == null ? Map.of() : globalParameters,
          operator);
    });
    if (instanceId == 0L) {
      throw new IllegalStateException("Workflow transaction returned no instance id");
    }
    engine.start(instanceId);
    return instanceId;
  }

  public void stop(long workflowInstanceId) {
    transactions.executeWithoutResult(status -> repository.requestStop(workflowInstanceId));
    engine.stop(workflowInstanceId);
  }

  public Instance get(long workflowInstanceId) {
    return repository.findInstance(workflowInstanceId)
        .orElseThrow(() -> new IllegalArgumentException(
            "Workflow instance does not exist: " + workflowInstanceId));
  }

  public List<TaskInstance> tasks(long workflowInstanceId) {
    get(workflowInstanceId);
    return repository.findTasks(workflowInstanceId);
  }

  public List<Attempt> attempts(long taskInstanceId) {
    repository.findTask(taskInstanceId)
        .orElseThrow(() -> new IllegalArgumentException(
            "Workflow task instance does not exist: " + taskInstanceId));
    return repository.findAttempts(taskInstanceId);
  }

  public List<String> logs(long taskInstanceId, int limit) {
    repository.findTask(taskInstanceId)
        .orElseThrow(() -> new IllegalArgumentException(
            "Workflow task instance does not exist: " + taskInstanceId));
    return repository.findLogs(taskInstanceId, limit);
  }

  public List<Instance> list(long workflowId, int limit) {
    return repository.listInstances(workflowId, limit);
  }
}
