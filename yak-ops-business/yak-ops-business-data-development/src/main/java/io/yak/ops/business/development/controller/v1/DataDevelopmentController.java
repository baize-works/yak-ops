package io.yak.ops.business.development.controller.v1;

import io.yak.framework.common.Result;
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
import io.yak.ops.business.development.api.DataDevelopmentApi.WorkspaceView;
import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Draft;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Execution;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Project;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Resource;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ResourceKind;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Version;
import io.yak.ops.business.development.service.DataDevelopmentService;
import io.yak.ops.business.development.service.TaskPluginCatalogService;
import io.yak.ops.plugin.task.api.TaskPluginFactory.Descriptor;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Data-development workspace, task authoring, publication and execution-snapshot API. */
@ConditionalOnDataDevelopmentEnabled
@RestController
@RequestMapping("/api/v1/data-development")
public class DataDevelopmentController {

  private final DataDevelopmentService service;
  private final TaskPluginCatalogService pluginCatalogService;

  public DataDevelopmentController(
      DataDevelopmentService service,
      TaskPluginCatalogService pluginCatalogService) {
    this.service = service;
    this.pluginCatalogService = pluginCatalogService;
  }

  @GetMapping("/task-plugins")
  public Result<List<Descriptor>> listTaskPlugins() {
    return Result.success(pluginCatalogService.list());
  }

  @GetMapping("/task-plugins/{taskType}")
  public Result<Descriptor> getTaskPlugin(@PathVariable String taskType) {
    return Result.success(pluginCatalogService.require(taskType));
  }

  @PostMapping("/projects")
  public Result<Project> createProject(
      @Valid @RequestBody CreateProjectRequest request,
      Principal principal) {
    return Result.success(service.createProject(request, operator(principal)));
  }

  @GetMapping("/projects")
  public Result<List<Project>> listProjects() {
    return Result.success(service.listProjects());
  }

  @GetMapping("/projects/{projectId}/resources")
  public Result<List<Resource>> listResources(@PathVariable long projectId) {
    return Result.success(service.listResources(projectId));
  }

  @GetMapping("/projects/{projectId}/workspace")
  public Result<WorkspaceView> getWorkspace(@PathVariable long projectId) {
    Project project = service.listProjects().stream()
        .filter(item -> item.id() == projectId)
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("数据开发项目不存在：" + projectId));
    List<TaskDetailView> tasks = service.listResources(projectId).stream()
        .filter(resource -> resource.resourceKind() == ResourceKind.TASK)
        .map(resource -> service.getTask(resource.id()))
        .toList();
    return Result.success(new WorkspaceView(project, tasks));
  }

  @PostMapping("/projects/{projectId}/folders")
  public Result<Resource> createFolder(
      @PathVariable long projectId,
      @Valid @RequestBody CreateFolderRequest request,
      Principal principal) {
    return Result.success(service.createFolder(projectId, request, operator(principal)));
  }

  @PostMapping("/projects/{projectId}/tasks")
  public Result<TaskDetailView> createTask(
      @PathVariable long projectId,
      @Valid @RequestBody CreateTaskRequest request,
      Principal principal) {
    return Result.success(service.createTask(projectId, request, operator(principal)));
  }

  @GetMapping("/tasks/{taskId}")
  public Result<TaskDetailView> getTask(@PathVariable long taskId) {
    return Result.success(service.getTask(taskId));
  }

  @PutMapping("/tasks/{taskId}/draft")
  public Result<Draft> saveDraft(
      @PathVariable long taskId,
      @Valid @RequestBody SaveDraftRequest request,
      Principal principal) {
    return Result.success(service.saveDraft(taskId, request, operator(principal)));
  }

  @PostMapping("/tasks/{taskId}/validate")
  public Result<ValidationView> validateTask(
      @PathVariable long taskId,
      @RequestBody(required = false) ValidateTaskRequest request) {
    return Result.success(service.validateTask(taskId, request));
  }

  @PostMapping("/tasks/{taskId}/versions")
  public Result<Version> publishTask(
      @PathVariable long taskId,
      @Valid @RequestBody PublishTaskRequest request,
      Principal principal) {
    return Result.success(service.publishTask(taskId, request, operator(principal)));
  }

  @GetMapping("/tasks/{taskId}/versions")
  public Result<List<Version>> listVersions(@PathVariable long taskId) {
    return Result.success(service.listVersions(taskId));
  }

  @GetMapping("/tasks/{taskId}/versions/{versionId}")
  public Result<Version> getVersion(
      @PathVariable long taskId,
      @PathVariable long versionId) {
    return Result.success(service.getVersion(taskId, versionId));
  }

  @PostMapping("/tasks/{taskId}/executions")
  public Result<Execution> createExecution(
      @PathVariable long taskId,
      @Valid @RequestBody CreateExecutionRequest request,
      Principal principal) {
    return Result.success(service.createExecution(taskId, request, operator(principal)));
  }

  @GetMapping("/tasks/{taskId}/executions")
  public Result<List<Execution>> listExecutions(
      @PathVariable long taskId,
      @RequestParam(defaultValue = "50") int limit) {
    return Result.success(service.listExecutions(taskId, limit));
  }

  @GetMapping("/executions/{executionId}")
  public Result<Execution> getExecution(@PathVariable long executionId) {
    return Result.success(service.getExecution(executionId));
  }

  @PostMapping("/executions/{executionId}/cancel")
  public Result<Execution> cancelExecution(@PathVariable long executionId) {
    return Result.success(service.cancelExecution(executionId));
  }

  @PutMapping("/resources/{resourceId}")
  public Result<Resource> updateResource(
      @PathVariable long resourceId,
      @Valid @RequestBody UpdateResourceRequest request,
      Principal principal) {
    return Result.success(service.updateResource(resourceId, request, operator(principal)));
  }

  @PostMapping("/resources/{resourceId}/move")
  public Result<Resource> moveResource(
      @PathVariable long resourceId,
      @Valid @RequestBody MoveResourceRequest request,
      Principal principal) {
    return Result.success(service.moveResource(resourceId, request, operator(principal)));
  }

  @DeleteMapping("/resources/{resourceId}")
  public Result<Map<String, Boolean>> deleteResource(
      @PathVariable long resourceId,
      Principal principal) {
    service.deleteResource(resourceId, operator(principal));
    return Result.success(Map.of("deleted", true));
  }

  private static String operator(Principal principal) {
    return principal == null || principal.getName() == null || principal.getName().isBlank()
        ? "system"
        : principal.getName();
  }
}
