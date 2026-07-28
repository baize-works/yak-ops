package io.yak.ops.business.workflow.service;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.dag.WorkflowDagCompiler;
import io.yak.ops.business.workflow.model.WorkflowDag;
import io.yak.ops.business.workflow.model.WorkflowEnums.FailureStrategy;
import io.yak.ops.business.workflow.model.WorkflowRecords.Definition;
import io.yak.ops.business.workflow.model.WorkflowRecords.Version;
import io.yak.ops.business.workflow.repository.JdbcWorkflowRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Definition, draft and immutable publication use cases. */
@ConditionalOnWorkflowEnabled
@Service
public class WorkflowDefinitionService {

  private final JdbcWorkflowRepository repository;
  private final WorkflowDagCompiler compiler;

  public WorkflowDefinitionService(
      JdbcWorkflowRepository repository,
      WorkflowDagCompiler compiler) {
    this.repository = repository;
    this.compiler = compiler;
  }

  @Transactional(transactionManager = "workflowTransactionManager")
  public long create(
      String code,
      String name,
      String description,
      FailureStrategy failureStrategy,
      int maxParallelism,
      WorkflowDag draft,
      String operator) {
    requireText(code, "code");
    requireText(name, "name");
    validateParallelism(maxParallelism);
    return repository.createDefinition(
        code.trim(),
        name.trim(),
        description,
        failureStrategy == null ? FailureStrategy.FAIL_FAST : failureStrategy,
        maxParallelism,
        draft == null ? new WorkflowDag(List.of(), List.of()) : draft,
        operator);
  }

  @Transactional(transactionManager = "workflowTransactionManager")
  public void updateDraft(
      long workflowId,
      String name,
      String description,
      FailureStrategy failureStrategy,
      int maxParallelism,
      WorkflowDag draft) {
    requireText(name, "name");
    validateParallelism(maxParallelism);
    repository.updateDraft(
        workflowId,
        name.trim(),
        description,
        failureStrategy == null ? FailureStrategy.FAIL_FAST : failureStrategy,
        maxParallelism,
        draft == null ? new WorkflowDag(List.of(), List.of()) : draft);
  }

  @Transactional(transactionManager = "workflowTransactionManager")
  public Version publish(long workflowId, String operator) {
    Definition definition = get(workflowId);
    compiler.compile(definition.draft());
    return repository.publishVersion(workflowId, definition.draft(), operator);
  }

  public Definition get(long workflowId) {
    return repository.findDefinition(workflowId)
        .orElseThrow(() -> new IllegalArgumentException(
            "Workflow definition does not exist: " + workflowId));
  }

  public List<Definition> list() {
    return repository.listDefinitions();
  }

  private static void validateParallelism(int maxParallelism) {
    if (maxParallelism < 1 || maxParallelism > 256) {
      throw new IllegalArgumentException("maxParallelism must be between 1 and 256");
    }
  }

  private static void requireText(String value, String field) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException(field + " must not be blank");
    }
  }
}
