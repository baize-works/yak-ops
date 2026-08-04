package io.yak.ops.business.development.service;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.ops.business.development.api.DataDevelopmentApi.CreateExecutionRequest;
import io.yak.ops.business.development.api.DataDevelopmentApi.ExecutionDetailView;
import io.yak.ops.business.development.api.DataDevelopmentApi.ExecutionPageView;
import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Draft;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Execution;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ExecutionSourceType;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Task;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Version;
import io.yak.ops.business.development.execution.DataDevelopmentExecutionGateway;
import io.yak.ops.business.development.repository.DataDevelopmentExecutionRepository;
import io.yak.ops.business.development.repository.DataDevelopmentRepository;
import io.yak.ops.plugin.task.api.TaskPluginCatalog;
import io.yak.ops.plugin.task.api.TaskPluginFactory.CompiledDefinition;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Application service for durable execution snapshots and the local execution gateway. */
@ConditionalOnDataDevelopmentEnabled
@Service
public class DataDevelopmentExecutionService {

  private final DataDevelopmentRepository controlRepository;
  private final DataDevelopmentExecutionRepository executionRepository;
  private final TaskPluginCatalog taskPluginCatalog;
  private final DataDevelopmentJsonCodec json;
  private final DataDevelopmentExecutionGateway gateway;
  private final DataDevelopmentPlatformRuntimeResolver platformRuntimeResolver;
  private final DataDevelopmentPlatformAuditService audit;

  public DataDevelopmentExecutionService(
      DataDevelopmentRepository controlRepository,
      DataDevelopmentExecutionRepository executionRepository,
      TaskPluginCatalog taskPluginCatalog,
      DataDevelopmentJsonCodec json,
      DataDevelopmentExecutionGateway gateway,
      DataDevelopmentPlatformRuntimeResolver platformRuntimeResolver,
      DataDevelopmentPlatformAuditService audit) {
    this.controlRepository = controlRepository;
    this.executionRepository = executionRepository;
    this.taskPluginCatalog = taskPluginCatalog;
    this.json = json;
    this.gateway = gateway;
    this.platformRuntimeResolver = platformRuntimeResolver;
    this.audit = audit;
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public Execution createExecution(long taskId, CreateExecutionRequest request, String operator) {
    Task task = requireTask(taskId);
    ExecutionSourceType sourceType = parseSourceType(request.sourceType());
    PreparedExecution prepared = prepareExecution(task, sourceType, request);
    JsonNode runtime = request.runtime() == null
        ? runtimeFromDefinition(prepared.definitionSnapshot()) : request.runtime();
    platformRuntimeResolver.validateReferences(runtime);
    JsonNode input = request.input() == null ? json.objectNode() : request.input();
    long executionId = controlRepository.insertExecution(taskId, sourceType,
        prepared.draftRevision(), prepared.taskVersionId(), task.taskType(),
        prepared.pluginVersion(), json.write(prepared.definitionSnapshot()),
        json.write(prepared.compiledSpec()), json.write(runtime), json.write(input),
        trimToNull(request.idempotencyKey()), actor(operator), LocalDateTime.now());
    audit.record("EXECUTION_CREATED", "EXECUTION", executionId,
        Map.of("taskId", taskId, "taskType", task.taskType(), "sourceType", sourceType.name()),
        operator);
    gateway.dispatchAfterCommit(executionId);
    return requireExecution(executionId);
  }

  public Execution getExecution(long executionId) { return requireExecution(executionId); }

  public List<Execution> listTaskExecutions(long taskId, int limit) {
    requireTask(taskId);
    return controlRepository.listExecutions(taskId, limit);
  }

  public ExecutionDetailView getExecutionDetail(long executionId, long afterSequence) {
    Execution execution = requireExecution(executionId);
    return new ExecutionDetailView(execution,
        executionRepository.findTaskName(execution.taskId()).orElse("task-" + execution.taskId()),
        executionRepository.findEngineType(execution.taskId()).orElse(execution.taskType()),
        executionRepository.listAttempts(executionId),
        executionRepository.listEvents(executionId, Math.max(0L, afterSequence), 5000),
        executionRepository.listResults(executionId));
  }

  public ExecutionPageView listExecutions(
      String status, String taskType, String keyword, int offset, int limit) {
    int safeOffset = Math.max(0, offset);
    int safeLimit = Math.min(500, Math.max(1, limit));
    return new ExecutionPageView(
        executionRepository.listExecutionSummaries(
            status, taskType, keyword, safeOffset, safeLimit),
        executionRepository.countExecutionSummaries(status, taskType, keyword),
        safeOffset, safeLimit);
  }

  public Execution cancelExecution(long executionId) {
    return cancelExecution(executionId, "system");
  }

  public Execution cancelExecution(long executionId, String operator) {
    Execution result = gateway.cancel(executionId);
    audit.record(
        "EXECUTION_CANCELED",
        "EXECUTION",
        executionId,
        Map.of("taskId", result.taskId(), "status", result.status().name()),
        actor(operator));
    return result;
  }

  private PreparedExecution prepareExecution(
      Task task, ExecutionSourceType sourceType, CreateExecutionRequest request) {
    return switch (sourceType) {
      case DRAFT_REVISION -> prepareDraftExecution(task, request);
      case PUBLISHED_VERSION -> prepareVersionExecution(task, request);
      case EPHEMERAL_SNAPSHOT -> prepareEphemeralExecution(task, request);
    };
  }

  private PreparedExecution prepareDraftExecution(Task task, CreateExecutionRequest request) {
    Draft draft = requireDraft(task.id());
    if (request.draftRevision() == null || request.draftRevision() != draft.revision()) {
      throw new IllegalArgumentException(
          "运行草稿时必须提供当前 draftRevision=" + draft.revision());
    }
    CompiledDefinition compiled = taskPluginCatalog.compile(
        task.taskType(), json.toMap(draft.definition()));
    return new PreparedExecution(draft.revision(), null,
        taskPluginCatalog.descriptor(task.taskType()).pluginVersion(),
        json.toTree(compiled.definition()), json.toTree(compiled.compiledSpec()));
  }

  private PreparedExecution prepareVersionExecution(Task task, CreateExecutionRequest request) {
    if (request.taskVersionId() == null) {
      throw new IllegalArgumentException("运行发布版本时必须提供 taskVersionId");
    }
    Version version = requireVersion(task.id(), request.taskVersionId());
    return new PreparedExecution(null, version.id(), version.pluginVersion(),
        version.definitionSnapshot(), version.compiledSpec());
  }

  private PreparedExecution prepareEphemeralExecution(Task task, CreateExecutionRequest request) {
    if (request.definitionSnapshot() == null) {
      throw new IllegalArgumentException("临时运行必须提供 definitionSnapshot");
    }
    CompiledDefinition compiled = taskPluginCatalog.compile(
        task.taskType(), json.toMap(request.definitionSnapshot()));
    return new PreparedExecution(null, null,
        taskPluginCatalog.descriptor(task.taskType()).pluginVersion(),
        json.toTree(compiled.definition()), json.toTree(compiled.compiledSpec()));
  }

  private JsonNode runtimeFromDefinition(JsonNode definition) {
    JsonNode runtime = definition.path("runtime");
    return runtime.isMissingNode() || runtime.isNull() ? json.objectNode() : runtime;
  }

  private Task requireTask(long taskId) {
    return controlRepository.findTask(taskId)
        .orElseThrow(() -> new IllegalArgumentException("数据开发任务不存在：" + taskId));
  }

  private Draft requireDraft(long taskId) {
    return controlRepository.findDraft(taskId)
        .orElseThrow(() -> new IllegalStateException("任务草稿不存在：" + taskId));
  }

  private Version requireVersion(long taskId, long versionId) {
    return controlRepository.findVersion(taskId, versionId)
        .orElseThrow(() -> new IllegalArgumentException("任务版本不存在：" + versionId));
  }

  private Execution requireExecution(long executionId) {
    return controlRepository.findExecution(executionId)
        .orElseThrow(() -> new IllegalArgumentException("任务执行不存在：" + executionId));
  }

  private static ExecutionSourceType parseSourceType(String value) {
    try {
      return ExecutionSourceType.valueOf(
          require(value, "执行来源").toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException error) {
      throw new IllegalArgumentException("不支持的执行来源：" + value, error);
    }
  }

  private static String actor(String value) {
    return StringUtils.hasText(value) ? value.trim() : "system";
  }

  private static String trimToNull(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private static String require(String value, String label) {
    if (!StringUtils.hasText(value)) throw new IllegalArgumentException(label + "不能为空");
    return value.trim();
  }

  private record PreparedExecution(
      Long draftRevision,
      Long taskVersionId,
      String pluginVersion,
      JsonNode definitionSnapshot,
      JsonNode compiledSpec) {
  }
}
