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
import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Draft;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Execution;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Project;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Resource;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Version;
import io.yak.ops.business.development.service.DataDevelopmentService;
import io.yak.ops.business.development.service.TaskPluginCatalogService;
import io.yak.ops.plugin.task.api.TaskPluginFactory.Descriptor;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Data-development workspace, task authoring, publication and execution-snapshot API. */
@ConditionalOnDataDevelopmentEnabled
@RestController
@RequestMapping("/api/v1/data-development")
public class DataDevelopmentController {

  private static final String OPERATOR_HEADER = "X-Operator";

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
      @RequestHeader(name = OPERATOR_HEADER, defaultValue = "system") String operator) {
    return Result.success(service.createProject(request, operator));
  }

  @GetMapping("/projects")
  public Result<List<Project>> listProjects() {
    return Result.success(service.listProjects());
  }

  @GetMapping("/projects/{projectId}/resources")
  public Result<List<Resource>> listResources(@PathVariable long projectId) {
    return Result.success(service.listResources(projectId));
  }

  @PostMapping("/projects/{projectId}/folders")
  public Result<Resource> createFolder(
      @PathVariable long projectId,
      @Valid @RequestBody CreateFolderRequest request,
      @RequestHeader(name = OPERATOR_HEADER, defaultValue = "system") String operator) {
    return Result.success(service.createFolder(projectId, request, operator));
  }

  @PostMapping("/projects/{projectId}/tasks")
  public Result<TaskDetailView> createTask(
      @PathVariable long projectId,
      @Valid @RequestBody CreateTaskRequest request,
      @RequestHeader(name = OPERATOR_HEADER, defaultValue = "system") String operator) {
    return Result.success(service.createTask(projectId, request, operator));
  }

  @GetMapping("/tasks/{taskId}")
  public Result<TaskDetailView> getTask(@PathVariable long taskId) {
    return Result.success(service.getTask(taskId));
  }

  @PutMapping("/tasks/{taskId}/draft")
  public Result<Draft> saveDraft(
      @PathVariable long taskId,
      @Valid @RequestBody SaveDraftRequest request,
      @RequestHeader(name = OPERATOR_HEADER, defaultValue = "system") String operator) {
    return Result.success(service.saveDraft(taskId, request, operator));
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
      @RequestHeader(name = OPERATOR_HEADER, defaultValue = "system") String operator) {
    return Result.success(service.publishTask(taskId, request, operator));
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
      @RequestHeader(name = OPERATOR_HEADER, defaultValue = "system") String operator) {
    return Result.success(service.createExecution(taskId, request, operator));
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
      @RequestHeader(name = OPERATOR_HEADER, defaultValue = "system") String operator) {
    return Result.success(service.updateResource(resourceId, request, operator));
  }

  @PostMapping("/resources/{resourceId}/move")
  public Result<Resource> moveResource(
      @PathVariable long resourceId,
      @Valid @RequestBody MoveResourceRequest request,
      @RequestHeader(name = OPERATOR_HEADER, defaultValue = "system") String operator) {
    return Result.success(service.moveResource(resourceId, request, operator));
  }

  @DeleteMapping("/resources/{resourceId}")
  public Result<Map<String, Boolean>> deleteResource(
      @PathVariable long resourceId,
      @RequestHeader(name = OPERATOR_HEADER, defaultValue = "system") String operator) {
    service.deleteResource(resourceId, operator);
    return Result.success(Map.of("deleted", true));
  }
}
