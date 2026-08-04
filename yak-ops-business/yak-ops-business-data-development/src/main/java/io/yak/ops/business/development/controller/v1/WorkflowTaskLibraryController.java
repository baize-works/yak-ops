package io.yak.ops.business.development.controller.v1;

import io.yak.framework.common.Result;
import io.yak.framework.security.web.RequiresPermission;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.PublishedTaskPage;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.PublishedTaskVersionView;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.SortBy;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.TaskLibraryQuery;
import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.service.WorkflowTaskLibraryService;
import java.security.Principal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only published task resources consumed by the Workflow designer. */
@ConditionalOnDataDevelopmentEnabled
@RestController
@RequestMapping("/api/v1/data-development/tasks/library")
@RequiresPermission("workflow:definition:read")
public final class WorkflowTaskLibraryController {

  private final WorkflowTaskLibraryService service;

  public WorkflowTaskLibraryController(WorkflowTaskLibraryService service) {
    this.service = service;
  }

  @GetMapping
  public Result<PublishedTaskPage> search(
      @RequestParam(required = false) Long projectId,
      @RequestParam(required = false) Long folderId,
      @RequestParam(required = false) String taskType,
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) Boolean favoriteOnly,
      @RequestParam(required = false) Boolean recentlyUsed,
      @RequestParam(required = false) SortBy sortBy,
      @RequestParam(required = false) Integer offset,
      @RequestParam(required = false) Integer limit,
      Principal principal) {
    return Result.success(service.search(
        new TaskLibraryQuery(
            projectId,
            folderId,
            taskType,
            keyword,
            favoriteOnly,
            recentlyUsed,
            sortBy,
            offset,
            limit),
        operator(principal)));
  }

  @GetMapping("/{taskId}/versions/{versionId}")
  public Result<PublishedTaskVersionView> getPublishedVersion(
      @PathVariable long taskId,
      @PathVariable long versionId,
      Principal principal) {
    return Result.success(
        service.getPublishedVersion(taskId, versionId, operator(principal)));
  }

  private static String operator(Principal principal) {
    return principal == null || principal.getName() == null || principal.getName().isBlank()
        ? "system"
        : principal.getName();
  }
}
