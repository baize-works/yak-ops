package io.yak.ops.business.development.service;

import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.PublishedTaskVersionView;
import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.common.port.workflow.PublishedTaskVersionCatalog;
import java.util.Optional;
import org.springframework.stereotype.Component;

/** Bridges the data-development published task library into Workflow's validation port. */
@ConditionalOnDataDevelopmentEnabled
@Component
public final class DataDevelopmentPublishedTaskVersionCatalog
    implements PublishedTaskVersionCatalog {

  private final WorkflowTaskLibraryService taskLibraryService;

  public DataDevelopmentPublishedTaskVersionCatalog(
      WorkflowTaskLibraryService taskLibraryService) {
    this.taskLibraryService = taskLibraryService;
  }

  @Override
  public Optional<PublishedTaskVersion> findPublishedVersion(long taskId, long versionId) {
    try {
      PublishedTaskVersionView source = taskLibraryService.getPublishedVersion(
          taskId, versionId, "workflow-publish-validator");
      return Optional.of(new PublishedTaskVersion(
          Long.parseLong(source.taskId()),
          Long.parseLong(source.versionId()),
          source.versionNumber(),
          source.taskType(),
          source.inputSchema(),
          source.outputSchema(),
          source.contentDigest(),
          source.publishedAt(),
          source.currentVersion()));
    } catch (IllegalArgumentException exception) {
      return Optional.empty();
    }
  }
}
