package io.yak.ops.business.development.service;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.ops.business.development.api.DataDevelopmentApi.CreateExecutionRequest;
import io.yak.ops.business.development.api.DataDevelopmentApi.CreateFolderRequest;
import io.yak.ops.business.development.api.DataDevelopmentApi.CreateProjectRequest;
import io.yak.ops.business.development.api.DataDevelopmentApi.CreateTaskRequest;
import io.yak.ops.business.development.api.DataDevelopmentApi.MoveResourceRequest;
import io.yak.ops.business.development.api.DataDevelopmentApi.PublishTaskRequest;
import io.yak.ops.business.development.api.DataDevelopmentApi.SaveDraftRequest;
import io.yak.ops.business.development.api.DataDevelopmentApi.TaskDetailView;
import io.yak.ops.business.development.api.DataDevelopmentApi.UpdateResourceRequest;
import io.yak.ops.business.development.api.DataDevelopmentApi.ValidateTaskRequest;
import io.yak.ops.business.development.api.DataDevelopmentApi.ValidationView;
import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Draft;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Execution;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ExecutionSourceType;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Project;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Resource;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ResourceKind;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Task;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Version;
import io.yak.ops.business.development.repository.DataDevelopmentRepository;
import io.yak.ops.plugin.task.api.TaskPluginCatalog;
import io.yak.ops.plugin.task.api.TaskPluginFactory.CompiledDefinition;
import io.yak.ops.plugin.task.api.TaskPluginFactory.Descriptor;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Application service for workspace resources, task drafts, immutable versions and execution
 * snapshots.
 */
@ConditionalOnDataDevelopmentEnabled
@Service
public class DataDevelopmentService {

  private final DataDevelopmentRepository repository;
  private final TaskPluginCatalog taskPluginCatalog;
  private final DataDevelopmentJsonCodec jsonCodec;

  public DataDevelopmentService(
      DataDevelopmentRepository repository,
      TaskPluginCatalog taskPluginCatalog,
      DataDevelopmentJsonCodec jsonCodec) {
    this.repository = repository;
    this.taskPluginCatalog = taskPluginCatalog;
    this.jsonCodec = jsonCodec;
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public Project createProject(CreateProjectRequest request, String operator) {
    LocalDateTime now = LocalDateTime.now();
    long id = repository.insertProject(
        requireText(request.code(), "项目编码"),
        requireText(request.name(), "项目名称"),
        trimToNull(request.description()),
        operator(operator),
        now);
    return repository.findProject(id).orElseThrow();
  }

  public List<Project> listProjects() {
    return repository.listProjects();
  }

  public List<Resource> listResources(long projectId) {
    requireProject(projectId);
    return repository.listResources(projectId);
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public Resource createFolder(long projectId, CreateFolderRequest request, String operator) {
    requireProject(projectId);
    requireParent(projectId, request.parentId());
    long id = repository.insertResource(
        projectId,
        request.parentId(),
        ResourceKind.FOLDER,
        requireText(request.name(), "目录名称"),
        trimToNull(request.description()),
        valueOrZero(request.sortOrder()),
        operator(operator),
        LocalDateTime.now());
    return requireResource(id);
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public TaskDetailView createTask(
      long projectId,
      CreateTaskRequest request,
      String operator) {
    requireProject(projectId);
    requireParent(projectId, request.parentId());
    Descriptor descriptor = taskPluginCatalog.descriptor(request.taskType());
    String currentOperator = operator(operator);
    LocalDateTime now = LocalDateTime.now();

    long taskId = repository.insertResource(
        projectId,
        request.parentId(),
        ResourceKind.TASK,
        requireText(request.name(), "任务名称"),
        trimToNull(request.description()),
        valueOrZero(request.sortOrder()),
        currentOperator,
        now);
    repository.insertTask(
        taskId,
        projectId,
        descriptor.taskType(),
        descriptor.pluginVersion(),
        descriptor.schemaVersion(),
        StringUtils.hasText(request.engineType())
            ? request.engineType().trim()
            : descriptor.taskType(),
        now);

    JsonNode initialDefinition = jsonCodec.toTree(
        taskPluginCatalog.defaultDefinition(descriptor.taskType()));
    repository.insertDraft(
        taskId,
        descriptor.pluginVersion(),
        descriptor.schemaVersion(),
        jsonCodec.write(initialDefinition),
        jsonCodec.digest(initialDefinition),
        currentOperator,
        now);
    return getTask(taskId);
  }

  public TaskDetailView getTask(long taskId) {
    return new TaskDetailView(
        requireResource(taskId),
        requireTask(taskId),
        requireDraft(taskId));
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public Resource updateResource(
      long resourceId,
      UpdateResourceRequest request,
      String operator) {
    Resource resource = requireResource(resourceId);
    int updated = repository.updateResource(
        resourceId,
        requireText(request.name(), "资源名称"),
        trimToNull(request.description()),
        request.sortOrder() == null ? resource.sortOrder() : request.sortOrder(),
        resource.lockVersion(),
        operator(operator),
        LocalDateTime.now());
    requireOptimisticUpdate(updated, "资源已经被其他用户修改，请刷新后重试");
    return requireResource(resourceId);
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public Resource moveResource(
      long resourceId,
      MoveResourceRequest request,
      String operator) {
    Resource resource = requireResource(resourceId);
    requireParent(resource.projectId(), request.parentId());
    if (resource.resourceKind() == ResourceKind.FOLDER) {
      ensureNotDescendant(resource, request.parentId());
    }
    int updated = repository.moveResource(
        resourceId,
        request.parentId(),
        request.sortOrder() == null ? resource.sortOrder() : request.sortOrder(),
        resource.lockVersion(),
        operator(operator),
        LocalDateTime.now());
    requireOptimisticUpdate(updated, "资源已经被其他用户移动，请刷新后重试");
    return requireResource(resourceId);
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public void deleteResource(long resourceId, String operator) {
    Resource resource = requireResource(resourceId);
    if (resource.resourceKind() == ResourceKind.FOLDER && repository.hasChildren(resourceId)) {
      throw new IllegalStateException("目录不为空，不能删除");
    }
    int updated = repository.softDeleteResource(
        resourceId,
        operator(operator),
        LocalDateTime.now());
    if (updated != 1) {
      throw new IllegalStateException("资源删除失败或已经删除");
    }
    if (resource.resourceKind() == ResourceKind.TASK) {
      repository.archiveTask(resourceId, LocalDateTime.now());
    }
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public Draft saveDraft(long taskId, SaveDraftRequest request, String operator) {
    Task task = requireTask(taskId);
    Descriptor descriptor = taskPluginCatalog.descriptor(task.taskType());
    Map<String, Object> normalized = taskPluginCatalog.normalizeDefinition(
        task.taskType(),
        jsonCodec.toMap(request.definition()));
    taskPluginCatalog.validateDefinition(task.taskType(), normalized);

    JsonNode normalizedDefinition = jsonCodec.toTree(normalized);
    long nextRevision = request.baseRevision() + 1L;
    LocalDateTime now = LocalDateTime.now();
    int updated = repository.updateDraft(
        taskId,
        request.baseRevision(),
        nextRevision,
        descriptor.pluginVersion(),
        descriptor.schemaVersion(),
        jsonCodec.write(normalizedDefinition),
        jsonCodec.digest(normalizedDefinition),
        operator(operator),
        now);
    requireOptimisticUpdate(updated, "草稿版本冲突，请刷新后重新保存");
    repository.updateTaskDraftMetadata(
        taskId,
        nextRevision,
        descriptor.pluginVersion(),
        descriptor.schemaVersion(),
        now);
    return requireDraft(taskId);
  }

  public ValidationView validateTask(long taskId, ValidateTaskRequest request) {
    Task task = requireTask(taskId);
    JsonNode source = request != null && request.definition() != null
        ? request.definition()
        : requireDraft(taskId).definition();
    Map<String, Object> normalized = taskPluginCatalog.normalizeDefinition(
        task.taskType(),
        jsonCodec.toMap(source));
    taskPluginCatalog.validateDefinition(task.taskType(), normalized);
    JsonNode normalizedDefinition = jsonCodec.toTree(normalized);
    return new ValidationView(
        true,
        normalizedDefinition,
        jsonCodec.digest(normalizedDefinition),
        List.of());
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public Version publishTask(long taskId, PublishTaskRequest request, String operator) {
    Task task = repository.findTaskForUpdate(taskId)
        .orElseThrow(() -> new IllegalArgumentException("数据开发任务不存在：" + taskId));
    Draft draft = repository.findDraftForUpdate(taskId)
        .orElseThrow(() -> new IllegalStateException("任务草稿不存在：" + taskId));
    if (draft.revision() != request.draftRevision()) {
      throw new IllegalStateException(
          "草稿已经更新，当前 revision=" + draft.revision()
              + "，请求 revision=" + request.draftRevision());
    }

    CompiledDefinition compiled = taskPluginCatalog.compile(
        task.taskType(),
        jsonCodec.toMap(draft.definition()));
    Descriptor descriptor = taskPluginCatalog.descriptor(task.taskType());
    JsonNode definitionSnapshot = jsonCodec.toTree(compiled.definition());
    JsonNode compiledSpec = jsonCodec.toTree(compiled.compiledSpec());
    JsonNode inputSchema = jsonCodec.toTree(compiled.inputSchema());
    JsonNode outputSchema = jsonCodec.toTree(compiled.outputSchema());
    LocalDateTime now = LocalDateTime.now();
    int versionNumber = repository.nextVersionNumber(taskId);
    long versionId = repository.insertVersion(
        taskId,
        versionNumber,
        descriptor.taskType(),
        descriptor.pluginVersion(),
        descriptor.schemaVersion(),
        jsonCodec.write(definitionSnapshot),
        jsonCodec.write(compiledSpec),
        jsonCodec.write(inputSchema),
        jsonCodec.write(outputSchema),
        jsonCodec.digest(definitionSnapshot),
        trimToNull(request.comment()),
        operator(operator),
        now);
    repository.updateTaskPublished(taskId, versionId, now);
    return requireVersion(taskId, versionId);
  }

  public List<Version> listVersions(long taskId) {
    requireTask(taskId);
    return repository.listVersions(taskId);
  }

  public Version getVersion(long taskId, long versionId) {
    return requireVersion(taskId, versionId);
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public Execution createExecution(
      long taskId,
      CreateExecutionRequest request,
      String operator) {
    Task task = requireTask(taskId);
    ExecutionSourceType sourceType = parseSourceType(request.sourceType());
    PreparedExecution prepared = prepareExecution(task, sourceType, request);
    JsonNode runtime = request.runtime() == null
        ? runtimeFromDefinition(prepared.definitionSnapshot())
        : request.runtime();
    JsonNode input = request.input() == null ? jsonCodec.objectNode() : request.input();
    long executionId = repository.insertExecution(
        taskId,
        sourceType,
        prepared.draftRevision(),
        prepared.taskVersionId(),
        task.taskType(),
        prepared.pluginVersion(),
        jsonCodec.write(prepared.definitionSnapshot()),
        jsonCodec.write(prepared.compiledSpec()),
        jsonCodec.write(runtime),
        jsonCodec.write(input),
        trimToNull(request.idempotencyKey()),
        operator(operator),
        LocalDateTime.now());
    return requireExecution(executionId);
  }

  public Execution getExecution(long executionId) {
    return requireExecution(executionId);
  }

  public List<Execution> listExecutions(long taskId, int limit) {
    requireTask(taskId);
    return repository.listExecutions(taskId, limit);
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public Execution cancelExecution(long executionId) {
    Execution execution = requireExecution(executionId);
    if (execution.status().terminal()) {
      return execution;
    }
    int updated = repository.cancelExecution(executionId, LocalDateTime.now());
    if (updated != 1) {
      throw new IllegalStateException("执行状态已经变化，无法取消");
    }
    return requireExecution(executionId);
  }

  private PreparedExecution prepareExecution(
      Task task,
      ExecutionSourceType sourceType,
      CreateExecutionRequest request) {
    return switch (sourceType) {
      case DRAFT_REVISION -> prepareDraftExecution(task, request);
      case PUBLISHED_VERSION -> prepareVersionExecution(task, request);
      case EPHEMERAL_SNAPSHOT -> prepareEphemeralExecution(task, request);
    };
  }

  private PreparedExecution prepareDraftExecution(Task task, CreateExecutionRequest request) {
    Draft draft = requireDraft(task.id());
    if (request.draftRevision() == null || request.draftRevision() != draft.revision()) {
      throw new IllegalArgumentException("运行草稿时必须提供当前 draftRevision=" + draft.revision());
    }
    CompiledDefinition compiled = taskPluginCatalog.compile(
        task.taskType(),
        jsonCodec.toMap(draft.definition()));
    return new PreparedExecution(
        draft.revision(),
        null,
        taskPluginCatalog.descriptor(task.taskType()).pluginVersion(),
        jsonCodec.toTree(compiled.definition()),
        jsonCodec.toTree(compiled.compiledSpec()));
  }

  private PreparedExecution prepareVersionExecution(Task task, CreateExecutionRequest request) {
    if (request.taskVersionId() == null) {
      throw new IllegalArgumentException("运行发布版本时必须提供 taskVersionId");
    }
    Version version = requireVersion(task.id(), request.taskVersionId());
    return new PreparedExecution(
        null,
        version.id(),
        version.pluginVersion(),
        version.definitionSnapshot(),
        version.compiledSpec());
  }

  private PreparedExecution prepareEphemeralExecution(Task task, CreateExecutionRequest request) {
    if (request.definitionSnapshot() == null) {
      throw new IllegalArgumentException("临时运行必须提供 definitionSnapshot");
    }
    CompiledDefinition compiled = taskPluginCatalog.compile(
        task.taskType(),
        jsonCodec.toMap(request.definitionSnapshot()));
    return new PreparedExecution(
        null,
        null,
        taskPluginCatalog.descriptor(task.taskType()).pluginVersion(),
        jsonCodec.toTree(compiled.definition()),
        jsonCodec.toTree(compiled.compiledSpec()));
  }

  private JsonNode runtimeFromDefinition(JsonNode definition) {
    JsonNode runtime = definition.path("runtime");
    return runtime.isMissingNode() || runtime.isNull() ? jsonCodec.objectNode() : runtime;
  }

  private void ensureNotDescendant(Resource resource, Long targetParentId) {
    if (targetParentId == null) {
      return;
    }
    if (resource.id().equals(targetParentId)) {
      throw new IllegalArgumentException("目录不能移动到自身下面");
    }
    Map<Long, Long> parentById = new LinkedHashMap<>();
    repository.listResources(resource.projectId())
        .forEach(item -> parentById.put(item.id(), item.parentId()));
    Long cursor = targetParentId;
    while (cursor != null) {
      if (resource.id().equals(cursor)) {
        throw new IllegalArgumentException("目录不能移动到自己的子目录下面");
      }
      cursor = parentById.get(cursor);
    }
  }

  private void requireParent(long projectId, Long parentId) {
    if (parentId == null) {
      return;
    }
    Resource parent = requireResource(parentId);
    if (parent.projectId() != projectId || parent.resourceKind() != ResourceKind.FOLDER) {
      throw new IllegalArgumentException("父资源必须是当前项目中的目录");
    }
  }

  private Project requireProject(long projectId) {
    return repository.findProject(projectId)
        .orElseThrow(() -> new IllegalArgumentException("数据开发项目不存在：" + projectId));
  }

  private Resource requireResource(long resourceId) {
    return repository.findResource(resourceId)
        .orElseThrow(() -> new IllegalArgumentException("数据开发资源不存在：" + resourceId));
  }

  private Task requireTask(long taskId) {
    return repository.findTask(taskId)
        .orElseThrow(() -> new IllegalArgumentException("数据开发任务不存在：" + taskId));
  }

  private Draft requireDraft(long taskId) {
    return repository.findDraft(taskId)
        .orElseThrow(() -> new IllegalStateException("任务草稿不存在：" + taskId));
  }

  private Version requireVersion(long taskId, long versionId) {
    return repository.findVersion(taskId, versionId)
        .orElseThrow(() -> new IllegalArgumentException("任务版本不存在：" + versionId));
  }

  private Execution requireExecution(long executionId) {
    return repository.findExecution(executionId)
        .orElseThrow(() -> new IllegalArgumentException("任务执行不存在：" + executionId));
  }

  private static ExecutionSourceType parseSourceType(String value) {
    try {
      return ExecutionSourceType.valueOf(requireText(value, "执行来源").toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw new IllegalArgumentException("不支持的执行来源：" + value, exception);
    }
  }

  private static int valueOrZero(Integer value) {
    return value == null ? 0 : value;
  }

  private static String operator(String operator) {
    return StringUtils.hasText(operator) ? operator.trim() : "system";
  }

  private static String requireText(String value, String label) {
    if (!StringUtils.hasText(value)) {
      throw new IllegalArgumentException(label + "不能为空");
    }
    return value.trim();
  }

  private static String trimToNull(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private static void requireOptimisticUpdate(int updated, String message) {
    if (updated != 1) {
      throw new IllegalStateException(message);
    }
  }

  private record PreparedExecution(
      Long draftRevision,
      Long taskVersionId,
      String pluginVersion,
      JsonNode definitionSnapshot,
      JsonNode compiledSpec) {
  }
}
